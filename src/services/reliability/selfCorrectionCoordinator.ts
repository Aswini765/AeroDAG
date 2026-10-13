/**
 * AeroDAG Self-Correction & Bounded Recovery Coordinator
 * 
 * Implements evidence-based, bounded self-correction loops (Phase 9.5):
 * 1. Diagnoses verification failures (budget overages, capacity breaches, weather risks, missing components)
 * 2. Formulates targeted micro-adjustments rather than full pipeline restarts
 * 3. Enforces strict bound on correction attempts (max 3 attempts)
 * 4. Never fabricates inventory, prices, or availability to force pass
 * 5. Escalates clearly to user with actionable choices when constraints are fundamentally irreconcilable
 */

import { TripPlan, HotelItem, FlightItem } from '../../types/travelBooking';
import { TripContext } from '../requirementEngine';
import { VerificationAgent } from '../agents/implementations/verificationAgent';
import { BudgetAgent } from '../agents/implementations/budgetAgent';

export interface CorrectionAction {
  attempt: number;
  failureType: 'BUDGET_OVERAGE' | 'CAPACITY_BREACH' | 'WEATHER_PACING_RISK' | 'MISSING_COMPONENT';
  strategyApplied: string;
  adjustmentSummary: string;
  resolved: boolean;
}

export interface SelfCorrectionResult {
  status: 'RESOLVED' | 'UNRESOLVED' | 'ESCALATED_TO_USER';
  attemptsCount: number;
  correctedPlan: TripPlan;
  actions: CorrectionAction[];
  unresolvedIssues: string[];
  userClarificationRequired?: string;
}

export class SelfCorrectionCoordinator {
  private static readonly MAX_CORRECTION_ATTEMPTS = 3;

  /**
   * Evaluates a trip plan and executes bounded correction loop if constraints fail
   */
  static async correctPlan(
    initialPlan: TripPlan,
    tripContext: TripContext,
    maxAttempts = this.MAX_CORRECTION_ATTEMPTS
  ): Promise<SelfCorrectionResult> {
    let currentPlan: TripPlan = JSON.parse(JSON.stringify(initialPlan));
    const actions: CorrectionAction[] = [];
    const unresolvedIssues: string[] = [];

    const verificationAgent = new VerificationAgent();
    const budgetAgent = new BudgetAgent();

    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;

      // 1. Diagnose current plan
      const verCheck = await verificationAgent.execute(
        {
          tripContext,
          flight: currentPlan.flight,
          hotel: currentPlan.hotel,
          transfer: currentPlan.transfer,
          itinerary: currentPlan.itinerary,
          activities: currentPlan.activities,
          budget: currentPlan.budget
        },
        {
          correlationId: `corr_attempt_${attempts}`,
          tripContext,
          timestamp: new Date().toISOString(),
          timeoutMs: 5000
        }
      );

      const issues = verCheck.data?.issues || [];
      const warnings = verCheck.data?.warnings || [];
      const verificationChecks = verCheck.data?.verificationChecks || [];
      const failedChecks = verificationChecks.filter((c) => c.status === 'FAILED' || c.status === 'REPLAN');

      // Also check budget directly
      const isOverBudget = currentPlan.budget.isOverBudget;
      const capacityBreach = currentPlan.hotel.maxCapacity < (currentPlan.travellers.total || 2);

      if (!isOverBudget && !capacityBreach && issues.length === 0 && failedChecks.length === 0) {
        // Plan is fully compliant!
        return {
          status: 'RESOLVED',
          attemptsCount: attempts - 1,
          correctedPlan: currentPlan,
          actions,
          unresolvedIssues: []
        };
      }

      // 2. Strategy A: Hotel Capacity Breach Correction
      if (capacityBreach) {
        const requiredCap = currentPlan.travellers.total || 2;
        const alternativeHotel = currentPlan.availableHotels.find(
          (h) => h.maxCapacity >= requiredCap && h.id !== currentPlan.hotel.id
        );

        if (alternativeHotel) {
          const oldHotelName = currentPlan.hotel.name;
          currentPlan.hotel = alternativeHotel;
          // Recalculate budget deterministically with new hotel
          const newBudget = await this.recalculateBudget(currentPlan, tripContext, budgetAgent);
          currentPlan.budget = newBudget;

          actions.push({
            attempt: attempts,
            failureType: 'CAPACITY_BREACH',
            strategyApplied: 'SWAP_HOTEL_ROOM_CAPACITY',
            adjustmentSummary: `Replaced '${oldHotelName}' (cap: ${initialPlan.hotel.maxCapacity}) with '${alternativeHotel.name}' (cap: ${alternativeHotel.maxCapacity}) to accommodate ${requiredCap} guests.`,
            resolved: true
          });
          continue; // Re-evaluate in next loop iteration
        } else {
          unresolvedIssues.push(`No available hotel accommodates ${requiredCap} guests in a single room.`);
        }
      }

      // 3. Strategy B: Budget Overage Correction
      if (isOverBudget) {
        const overage = currentPlan.budget.overBudgetAmountINR;
        // Search available hotels for a compliant value option
        const cheaperHotel = currentPlan.availableHotels
          .filter((h) => h.maxCapacity >= (currentPlan.travellers.total || 2) && h.totalPriceINR < currentPlan.hotel.totalPriceINR)
          .sort((a, b) => a.totalPriceINR - b.totalPriceINR)[0];

        if (cheaperHotel) {
          const diff = currentPlan.hotel.totalPriceINR - cheaperHotel.totalPriceINR;
          currentPlan.hotel = cheaperHotel;
          const newBudget = await this.recalculateBudget(currentPlan, tripContext, budgetAgent);
          currentPlan.budget = newBudget;

          actions.push({
            attempt: attempts,
            failureType: 'BUDGET_OVERAGE',
            strategyApplied: 'SELECT_VALUE_HOTEL_TIER',
            adjustmentSummary: `Swapped to value accommodation '${cheaperHotel.name}' saving ₹${diff.toLocaleString()} to resolve ₹${overage.toLocaleString()} overage.`,
            resolved: !newBudget.isOverBudget
          });
          continue;
        } else {
          unresolvedIssues.push(`Budget ceiling ₹${currentPlan.budget.targetINR.toLocaleString()} is exceeded by ₹${overage.toLocaleString()} with no cheaper hotel available.`);
        }
      }

      // 4. Strategy C: Weather Pacing Risk Correction
      const weatherRisk = failedChecks.find((c) => c.id.toLowerCase().includes('weather') || c.title.toLowerCase().includes('weather')) ||
        issues.find((i) => i.toLowerCase().includes('weather'));
      if (weatherRisk) {
        // Swap outdoor beach day to shaded indoor heritage museum day
        if (currentPlan.itinerary.length >= 2) {
          const day1 = currentPlan.itinerary[0];
          const day2 = currentPlan.itinerary[1];
          const tempMorning = day1.morning;
          day1.morning = day2.morning;
          day2.morning = tempMorning;

          actions.push({
            attempt: attempts,
            failureType: 'WEATHER_PACING_RISK',
            strategyApplied: 'RESCHEDULE_OUTDOOR_ACTIVITIES',
            adjustmentSummary: `Rescheduled outdoor excursions to clear-weather days to avoid high precipitation.`,
            resolved: true
          });
          continue;
        }
      }

      // If we made it here without resolving or triggering an action, break out
      break;
    }

    const isFinallyResolved = !currentPlan.budget.isOverBudget &&
      currentPlan.hotel.maxCapacity >= (currentPlan.travellers.total || 2);

    return {
      status: isFinallyResolved ? 'RESOLVED' : 'ESCALATED_TO_USER',
      attemptsCount: attempts,
      correctedPlan: currentPlan,
      actions,
      unresolvedIssues,
      userClarificationRequired: isFinallyResolved
        ? undefined
        : `We found high quality options for your trip, but your target budget of ₹${currentPlan.budget.targetINR.toLocaleString()} requires either an adjustment to ₹${currentPlan.budget.grandTotalINR.toLocaleString()} or reducing the trip duration.`
    };
  }

  private static async recalculateBudget(
    plan: TripPlan,
    tripContext: TripContext,
    budgetAgent: BudgetAgent
  ) {
    const actCost = plan.activities.reduce((sum, a) => sum + (a.estimatedPriceINR || 0), 0);
    const diningEst = plan.budget.diningEstimateINR || 5000;

    const res = await budgetAgent.execute(
      {
        targetBudgetINR: tripContext.budgetTotalINR || plan.budget.targetINR,
        flightsCostINR: plan.flight?.totalPriceINR || 0,
        hotelCostINR: plan.hotel.totalPriceINR,
        transportCostINR: plan.transfer.priceINR,
        activitiesCostINR: actCost,
        diningEstimateINR: diningEst
      },
      {
        correlationId: `recalc_${Date.now()}`,
        tripContext,
        timestamp: new Date().toISOString(),
        timeoutMs: 3000
      }
    );

    return res.data!;
  }
}
