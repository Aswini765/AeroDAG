import React, { useState } from 'react';
import {
  TripPlan,
  TripPreferences,
  FlightItem,
  HotelItem,
  TransferItem,
  ActivityDayItem,
  PlanUpgradeOption,
  BalancingOption,
  ConcreteBudgetFix
} from '../../types/travelBooking';
import { getTripSummary } from '../../services/tripSummaryHelper';
import { TripPlanningEngine } from '../../services/tripPlanningEngine';
import { PlanHeader } from './plan/PlanHeader';
import { BookedItems } from './plan/BookedItems';
import { FeasibilityNote } from './plan/FeasibilityNote';
import { DayByDay } from './plan/DayByDay';
import { RefineBar } from './plan/RefineBar';
import { BudgetCard } from './plan/BudgetCard';
import { StaySelector } from './plan/StaySelector';
import { InfeasiblePlanCard } from './plan/InfeasiblePlanCard';
import { MoreOptionsModal } from './plan/MoreOptionsModal';

interface PlanScreenProps {
  plan: TripPlan;
  preferences: TripPreferences;
  onPlanChange: (updatedPlan: TripPlan) => void;
  onProceedToReview: () => void;
  onDescribeAgain: () => void;
  onUpdateItineraryDay?: (dayNumber: number, modificationType: 'relaxed' | 'food' | 'budget') => void;
}

export const PlanScreen: React.FC<PlanScreenProps> = ({
  plan,
  preferences,
  onPlanChange,
  onProceedToReview,
  onDescribeAgain,
  onUpdateItineraryDay
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [moreOptionsView, setMoreOptionsView] = useState<'flights' | 'hotels' | 'dining' | 'map' | null>(null);

  // Authoritative Trip Summary (sum of line items === totalINR)
  const summary = getTripSummary({
    tripPlan: plan,
    preferences,
    flight: plan.flight,
    hotel: plan.hotel,
    transfer: plan.transfer,
    visa: plan.visa,
    itinerary: plan.itinerary
  });

  if (!summary) return null;

  const nightsCount = Math.max(1, plan.durationDays - 1);
  const targetBudget = plan.budget.targetINR || preferences.budgetTotalINR || 60000;
  const isPlanInfeasible = plan.status === 'infeasible' && plan.shortfallINR && plan.shortfallINR > 0;

  // Handle Upgrade Selection
  const handleSelectUpgrade = (upgrade: PlanUpgradeOption) => {
    const upgraded = TripPlanningEngine.applyUpgrade(plan, upgrade);
    onPlanChange(upgraded);
  };

  // Handle reverting back to standard stay
  const handleRevertToStandard = async () => {
    try {
      const basePlan = await TripPlanningEngine.buildDeterministicPlan({
        ...preferences,
        dates: plan.dates || (preferences as any).targetDates || '14–20 Nov 2026',
        durationDays: plan.durationDays || 7,
        budgetTotalINR: targetBudget || 60000
      } as any);
      onPlanChange(basePlan);
    } catch (err) {
      console.error('Failed to revert to standard stay:', err);
    }
  };

  // Handle Balancing Option Application
  const handleApplyBalancingOption = async (option: BalancingOption) => {
    if (option.title.toLowerCase().includes('days') || option.title.toLowerCase().includes('reduce')) {
      // Re-run plan with fewer days
      const updatedContext = {
        ...preferences,
        durationDays: 5,
        budgetTotalINR: targetBudget
      };
      const newPlan = await TripPlanningEngine.buildDeterministicPlan(updatedContext as any);
      onPlanChange(newPlan);
    } else if (option.title.toLowerCase().includes('train') || option.title.toLowerCase().includes('rail') || option.title.toLowerCase().includes('vande')) {
      // Switch flight to scenic train
      const updatedPlan = {
        ...plan,
        budget: {
          ...plan.budget,
          flightsCostINR: plan.budget.flightsCostINR - option.rupeeImpactINR,
          grandTotalINR: plan.budget.grandTotalINR - option.rupeeImpactINR,
          isOverBudget: plan.budget.grandTotalINR - option.rupeeImpactINR > targetBudget,
          overBudgetAmountINR: Math.max(0, plan.budget.grandTotalINR - option.rupeeImpactINR - targetBudget)
        }
      };
      onPlanChange(updatedPlan);
    }
  };

  // Handle Infeasible Concrete Fix Application
  const handleApplyConcreteFix = async (fix: ConcreteBudgetFix) => {
    if (fix.actionType === 'fewer_nights') {
      const updatedContext = {
        ...preferences,
        durationDays: Math.max(3, preferences.durationDays - 2),
        budgetTotalINR: targetBudget
      };
      const newPlan = await TripPlanningEngine.buildDeterministicPlan(updatedContext as any);
      onPlanChange(newPlan);
    } else if (fix.actionType === 'mode_switch') {
      const updatedContext = {
        ...preferences,
        transportMode: 'Train',
        budgetTotalINR: targetBudget
      };
      const newPlan = await TripPlanningEngine.buildDeterministicPlan(updatedContext as any);
      onPlanChange(newPlan);
    } else if (fix.actionType === 'budget_hotel') {
      const updatedContext = {
        ...preferences,
        budgetTier: 'Frugal',
        budgetTotalINR: targetBudget
      };
      const newPlan = await TripPlanningEngine.buildDeterministicPlan(updatedContext as any);
      onPlanChange(newPlan);
    }
  };

  // Handle Natural Language Refine
  const handleRefinePlan = async (userChangeRequest: string) => {
    setIsRefining(true);
    const lower = userChangeRequest.toLowerCase();

    // Check if user asked for train
    if (lower.includes('train') || lower.includes('rail')) {
      const updatedContext = {
        ...preferences,
        transportMode: 'Train',
        budgetTotalINR: targetBudget
      };
      const newPlan = await TripPlanningEngine.buildDeterministicPlan(updatedContext as any);
      onPlanChange(newPlan);
    } else if (lower.includes('cheaper') || lower.includes('budget hotel') || lower.includes('save money')) {
      const updatedContext = {
        ...preferences,
        budgetTier: 'Frugal',
        budgetTotalINR: targetBudget
      };
      const newPlan = await TripPlanningEngine.buildDeterministicPlan(updatedContext as any);
      onPlanChange(newPlan);
    } else if (lower.includes('fewer days') || lower.includes('shorten') || lower.includes('4 days')) {
      const updatedContext = {
        ...preferences,
        durationDays: 4,
        budgetTotalINR: targetBudget
      };
      const newPlan = await TripPlanningEngine.buildDeterministicPlan(updatedContext as any);
      onPlanChange(newPlan);
    }

    setTimeout(() => {
      setIsRefining(false);
    }, 600);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-fade-in-slide">
      {/* 1. Plan Header (Eyebrow, title, meta line, buttons) */}
      <PlanHeader
        plan={plan}
        preferences={preferences}
        onSaveTrip={() => setIsSaved(!isSaved)}
        onProceedToReview={onProceedToReview}
        isSaved={isSaved}
      />

      {/* 2. INFEASIBLE STATE CHECK: Replaces the plan body with a clear shortfall card */}
      {isPlanInfeasible && plan.concreteFixes && plan.concreteFixes.length > 0 ? (
        <InfeasiblePlanCard
          destination={plan.destination}
          targetBudgetINR={targetBudget}
          calculatedCostINR={plan.budget.grandTotalINR}
          shortfallINR={plan.shortfallINR || 0}
          concreteFixes={plan.concreteFixes}
          onApplyFix={handleApplyConcreteFix}
          onModifyPrompt={onDescribeAgain}
        />
      ) : (
        /* 3. TWO-COLUMN PLAN LAYOUT (≥1024px; stacked on mobile) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: 7 Columns on Desktop */}
          <div className="lg:col-span-7 space-y-6">
            {/* 3 Summary Cards: Flights / Stay / Transfers */}
            <BookedItems
              flight={plan.flight}
              hotel={plan.hotel}
              transfer={plan.transfer}
              nightsCount={nightsCount}
              onOpenFlightsModal={() => setMoreOptionsView('flights')}
              onOpenStaysModal={() => setMoreOptionsView('hotels')}
            />

            {/* Feasibility Notes & Green Airport Reason Note */}
            <FeasibilityNote
              airportSelectionReason={plan.airportSelectionReason}
              verificationChecks={plan.verificationChecks || []}
            />

            {/* "Day by day" Itinerary Card */}
            <DayByDay
              itinerary={plan.itinerary}
              onAdjustDay={onUpdateItineraryDay}
            />

            {/* Refine Bar */}
            <RefineBar
              onRefinePlan={handleRefinePlan}
              isUpdating={isRefining}
            />
          </div>

          {/* RIGHT COLUMN: 5 Columns on Desktop */}
          <div className="lg:col-span-5 space-y-6 sticky top-24">
            {/* "Total trip cost" Card */}
            <BudgetCard
              summary={summary}
              targetBudgetINR={targetBudget}
            />

            {/* "Your stay" Selector (budget option vs upgrades) */}
            <StaySelector
              currentHotel={plan.hotel}
              upgradeOptions={plan.upgradeOptions}
              isOverBudget={plan.budget.isOverBudget}
              overBudgetAmountINR={plan.budget.overBudgetAmountINR}
              onSelectUpgrade={handleSelectUpgrade}
              onApplyBalancingOption={handleApplyBalancingOption}
              onRevertToStandard={handleRevertToStandard}
            />
          </div>
        </div>
      )}

      {/* Secondary Options Modal (Alternative flights, stays, dining, route map) */}
      <MoreOptionsModal
        isOpen={moreOptionsView !== null}
        onClose={() => setMoreOptionsView(null)}
        activeView={moreOptionsView || 'flights'}
        availableFlights={plan.availableFlights}
        availableHotels={plan.availableHotels}
        availableTrains={plan.availableTrains}
        diningSuggestions={plan.diningSuggestions}
        selectedFlightId={plan.flight?.id || ''}
        selectedHotelId={plan.hotel.id}
        onSelectFlight={(fl) => onPlanChange({ ...plan, flight: fl })}
        onSelectHotel={(ht) => onPlanChange({ ...plan, hotel: ht })}
      />
    </div>
  );
};
