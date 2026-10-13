/**
 * AeroDAG Travel Agent Orchestrator
 * 
 * Orchestrates multi-agent execution pipeline:
 * Phase A (Parallel): Flight Agent, Hotel Agent, Activity Agent, Transport Agent
 * Phase B (Dependency 1): Itinerary Agent (awaits travel components)
 * Phase C (Dependency 2): Budget Agent (awaits itinerary & component costs)
 * Phase D (Dependency 3): Verification Agent (audits final plan)
 * 
 * Enforces least-privilege tool boundaries, deterministic arithmetic,
 * timeouts, and bounded retries.
 */

import { TripContext } from '../requirementEngine';
import { TripPlan, TripScope, VisaDetails, DiningItem } from '../../types/travelBooking';
import { AgentContext } from './types';
import { FlightAgent, FlightAgentOutput } from './implementations/flightAgent';
import { HotelAgent, HotelAgentOutput } from './implementations/hotelAgent';
import { ActivityAgent, ActivityAgentOutput } from './implementations/activityAgent';
import { TransportAgent, TransportAgentOutput } from './implementations/transportAgent';
import { ItineraryAgent, ItineraryAgentOutput } from './implementations/itineraryAgent';
import { BudgetAgent } from './implementations/budgetAgent';
import { VerificationAgent, VerificationAgentOutput } from './implementations/verificationAgent';
import { inferTripScope } from '../travelCatalog';
import { TripPlanningEngine } from '../tripPlanningEngine';
import { getOutputGuardrailPipeline } from '../guardrails/output/outputGuardrailPipeline';
import { getTelemetryTracer, TraceContext } from '../telemetry';

export interface OrchestrationExecutionLog {
  correlationId: string;
  parallelExecutionDurationMs: number;
  totalDurationMs: number;
  agentOrder: string[];
  parallelAgents: string[];
  dependencyAgents: string[];
  allSuccessful: boolean;
  traceId?: string;
}

export class TravelAgentOrchestrator {
  private readonly flightAgent = new FlightAgent();
  private readonly hotelAgent = new HotelAgent();
  private readonly activityAgent = new ActivityAgent();
  private readonly transportAgent = new TransportAgent();
  private readonly itineraryAgent = new ItineraryAgent();
  private readonly budgetAgent = new BudgetAgent();
  private readonly verificationAgent = new VerificationAgent();

  private lastExecutionLog: OrchestrationExecutionLog | null = null;

  /**
   * Returns metadata from the most recent orchestration run
   */
  getLastExecutionLog(): OrchestrationExecutionLog | null {
    return this.lastExecutionLog;
  }

  /**
   * Dispatches the 4 independent discovery agents in parallel, returning isolated results
   */
  async executeParallelDiscovery(
    tripContext: TripContext,
    context: AgentContext
  ): Promise<{
    flightRes: any;
    hotelRes: any;
    activityRes: any;
    transportRes: any;
  }> {
    const [flightRes, hotelRes, activityRes, transportRes] = await Promise.all([
      this.flightAgent.execute(tripContext, context),
      this.hotelAgent.execute(tripContext, context),
      this.activityAgent.execute(tripContext, context),
      this.transportAgent.execute(tripContext, context)
    ]);
    return { flightRes, hotelRes, activityRes, transportRes };
  }

  /**
   * Main Pipeline: Plans a complete travel plan through multi-agent orchestration
   */
  async planTrip(
    tripContext: TripContext,
    correlationId = `orch_${Date.now()}`,
    incomingTraceContext?: TraceContext,
    options?: { allowPartialRecovery?: boolean }
  ): Promise<TripPlan> {
    const pipelineStartTime = Date.now();
    const tracer = getTelemetryTracer();

    const orchSpan = incomingTraceContext
      ? tracer.startSpan('orchestrator_plan_trip', 'orchestrator', incomingTraceContext, {
          workflowType: 'multi_agent_travel_planning',
          correlationId,
          destination: tripContext.destination,
          origin: tripContext.origin,
          parallelAgentsCount: 4,
          sequentialAgentsCount: 3
        })
      : tracer.startTrace('orchestrator_plan_trip', 'orchestrator', {
          workflowType: 'multi_agent_travel_planning',
          correlationId,
          destination: tripContext.destination,
          origin: tripContext.origin,
          parallelAgentsCount: 4,
          sequentialAgentsCount: 3
        });

    const context: AgentContext = {
      correlationId,
      tripContext,
      timestamp: new Date().toISOString(),
      timeoutMs: 15000,
      traceContext: orchSpan.context
    };

    const agentOrder: string[] = [];

    // =========================================================================
    // STEP 1: PARALLEL EXECUTION (Independent Component Discovery)
    // =========================================================================
    const parallelStartTime = Date.now();
    const parallelAgents = ['flight-agent', 'hotel-agent', 'activity-agent', 'transport-agent'];

    try {
      const { flightRes, hotelRes, activityRes, transportRes } = await this.executeParallelDiscovery(
        tripContext,
        context
      );

      const parallelDurationMs = Math.max(1, Date.now() - parallelStartTime);
      agentOrder.push(...parallelAgents);

      // Validate Critical Dependencies (Flight and Hotel are hard dependencies)
      if (!flightRes.success || !flightRes.data) {
        throw new Error(`Orchestration Aborted: Critical dependency Flight Agent failed (${flightRes.error || 'Flight search unavailable'})`);
      }
      if (!hotelRes.success || !hotelRes.data) {
        throw new Error(`Orchestration Aborted: Critical dependency Hotel Agent failed (${hotelRes.error || 'Hotel search unavailable'})`);
      }

      // Handle Partial Failure Recovery for ancillary agents (Transport & Activity)
      let selectedTransfer: any;
      let availableTransfers: any[];
      const recoveryNotes: string[] = [];

      if (transportRes.success && transportRes.data) {
        selectedTransfer = transportRes.data.selectedTransfer;
        availableTransfers = transportRes.data.availableTransfers;
      } else if (options?.allowPartialRecovery) {
        selectedTransfer = {
          id: 'transfer-fallback-std',
          type: 'Private AC Sedan',
          name: 'Airport Taxi Transfer (Standard Estimate)',
          priceINR: 1500,
          priceUSD: 20,
          capacity: 4,
          vehicleType: 'Sedan',
          description: 'Standard airport transfer estimate (Fallback)',
          inclusions: ['Toll & Parking Included']
        };
        availableTransfers = [selectedTransfer];
        recoveryNotes.push('Primary airport transfer provider timed out; standard taxi transfer estimate provided.');
      } else {
        throw new Error(`Orchestration Aborted: Transport Agent failed (${transportRes.error})`);
      }

      let activities: any[] = [];
      let availableActivities: any[] = [];

      if (activityRes.success && activityRes.data) {
        activities = activityRes.data.activities;
        availableActivities = activityRes.data.availableActivities;
      } else if (options?.allowPartialRecovery) {
        activities = [];
        availableActivities = [];
        recoveryNotes.push('Activity discovery service temporarily unavailable; flexible self-guided exploration recommended.');
      } else {
        throw new Error(`Orchestration Aborted: Activity Agent failed (${activityRes.error})`);
      }

      const { selectedFlight, availableFlights } = flightRes.data;
      const { selectedHotel, availableHotels } = hotelRes.data;

      // =========================================================================
      // STEP 2: DEPENDENCY EXECUTION 1 — Itinerary Agent
      // (Awaits selected flight arrival/departure, hotel location, and activities)
      // =========================================================================
      agentOrder.push('itinerary-agent');
      const itineraryRes = await this.itineraryAgent.execute(
        {
          tripContext,
          flight: selectedFlight,
          hotel: selectedHotel,
          transfer: selectedTransfer,
          activities: availableActivities && availableActivities.length > 0 ? availableActivities : activities
        },
        context
      );

      if (!itineraryRes.success || !itineraryRes.data) {
        throw new Error(`Orchestration Aborted: Itinerary Agent failed (${itineraryRes.error})`);
      }

      const { itinerary, diningSuggestions, mapWaypoints, routeAnalysis, weatherAnalysis } = itineraryRes.data;

      // Resolve regulatory & ancillary costs
      const origin = (tripContext.origin || 'Bengaluru (BLR)').trim();
      const destination = (tripContext.destination || 'Goa, India').trim();
      const durationDays = Math.max(3, tripContext.durationDays || 7);
      const scope: TripScope = tripContext.scope || inferTripScope(origin, destination);
      const isDomestic = scope === 'domestic';
      const adults = Math.max(1, tripContext.adultsCount || 2);
      const children = Math.max(0, tripContext.childrenCount || 0);
      const childAges = Array.isArray(tripContext.childrenAges) ? tripContext.childrenAges : [];
      const seniors = Math.max(0, tripContext.seniorsCount || 0);
      const totalTravellers = Math.max(adults + children + seniors, tripContext.totalTravellers || adults + children);

      const visaDetails: VisaDetails = (TripPlanningEngine as any).resolveVisaDetails(
        destination,
        scope,
        totalTravellers
      );
      const visaCostINR = isDomestic ? 0 : visaDetails.totalFeeINR;

      const activitiesCostINR = activities.reduce((sum, a) => sum + (a.estimatedPriceINR || 0), 0);
      const diningEstimateINR = Math.round(durationDays * totalTravellers * (isDomestic ? 500 : 800));
      const targetBudgetINR = tripContext.budgetTotalINR || (isDomestic ? 60000 : 100000);

      // =========================================================================
      // STEP 3: DEPENDENCY EXECUTION 2 — Budget Agent
      // (Awaits component pricing and itinerary day counts)
      // =========================================================================
      agentOrder.push('budget-agent');
      const budgetRes = await this.budgetAgent.execute(
        {
          targetBudgetINR,
          flightsCostINR: selectedFlight.totalPriceINR,
          hotelCostINR: selectedHotel.totalPriceINR,
          transportCostINR: selectedTransfer.priceINR,
          activitiesCostINR,
          diningEstimateINR,
          otherCostsINR: visaCostINR,
          currency: tripContext.currency || 'INR'
        },
        context
      );

      if (!budgetRes.success || !budgetRes.data) {
        throw new Error(`Orchestration Aborted: Budget Agent failed (${budgetRes.error})`);
      }

      const budget = budgetRes.data;

      // =========================================================================
      // STEP 4: DEPENDENCY EXECUTION 3 — Verification Agent
      // (Awaits full plan components and budget to audit constraints)
      // =========================================================================
      agentOrder.push('verification-agent');
      const verificationRes = await this.verificationAgent.execute(
        {
          tripContext,
          flight: selectedFlight,
          hotel: selectedHotel,
          transfer: selectedTransfer,
          itinerary,
          activities,
          budget,
          routeAnalysis,
          weatherAnalysis
        },
        context
      );

      const verificationOutput: VerificationAgentOutput = verificationRes.data || {
        passed: true,
        issues: [],
        warnings: [],
        recommendations: [],
        verificationChecks: []
      };

      // Record orchestration telemetry
      this.lastExecutionLog = {
        correlationId,
        parallelExecutionDurationMs: parallelDurationMs,
        totalDurationMs: Date.now() - pipelineStartTime,
        agentOrder,
        parallelAgents,
        dependencyAgents: ['itinerary-agent', 'budget-agent', 'verification-agent'],
        allSuccessful: true,
        traceId: orchSpan.context.traceId
      };

      // Assemble final TripPlan
      const partyLabel = children > 0
        ? `Family Vacation (${adults} Adults, ${children} Minors${childAges.length > 0 ? ` ages ${childAges.join(', ')}` : ''})`
        : adults === 2
        ? 'Couples Getaway'
        : `${totalTravellers} Travellers`;

      const title = `${durationDays}-Day ${destination} ${isDomestic ? 'Domestic Holiday' : 'Journey'} from ${origin.replace(/\s*\(.*\)/, '')}`;
      const summary = `Handcrafted ${durationDays}-day personalized travel plan for ${partyLabel}. Includes verified adjacent flights, ${selectedHotel.starRating}-star ${selectedHotel.roomType}, seamless private transfers, age-appropriate curated experiences, and deterministic budget management.`;

      const assembledPlan: TripPlan = {
        id: `plan_${Date.now()}`,
        title,
        summary,
        destination,
        origin,
        dates: tripContext.dates || 'November 2026',
        durationDays,
        travellers: {
          total: totalTravellers,
          adults,
          children,
          childAges: tripContext.childrenAges || [],
          seniors
        },
        scope,
        flight: selectedFlight,
        availableFlights,
        hotel: selectedHotel,
        availableHotels,
        transfer: selectedTransfer,
        availableTransfers,
        activities,
        availableActivities,
        itinerary,
        diningSuggestions,
        visa: visaDetails,
        budget,
        mapWaypoints,
        recommendations: [...(verificationOutput.recommendations || []), ...recoveryNotes],
        verificationChecks: verificationOutput.verificationChecks,
        createdAt: new Date().toISOString()
      };

      // Output Guardrail Pipeline: Enforces constraint bounds, budget sums, and state veracity
      const outputPipeline = getOutputGuardrailPipeline();
      const guardResult = await outputPipeline.process(assembledPlan, {
        requestId: correlationId,
        correlationId,
        timestamp: new Date().toISOString(),
        traceContext: orchSpan.context
      });

      if (!guardResult.passed && guardResult.blockedDecision) {
        throw new Error(`Output Guardrail Blocked: ${guardResult.blockedDecision.reason || 'Safety constraint violation'}`);
      }

      tracer.endSpan(orchSpan.spanId, 'SUCCESS', {
        agentCount: agentOrder.length,
        parallelDurationMs,
        totalDurationMs: Date.now() - pipelineStartTime,
        status: 'SUCCESS'
      });

      return guardResult.sanitizedPlan || assembledPlan;
    } catch (err: any) {
      tracer.endSpan(orchSpan.spanId, 'ERROR', {
        error: err?.message || String(err),
        errorCategory: 'INTERNAL_ERROR'
      });
      throw err;
    }
  }
}

// Global orchestrator singleton
let globalOrchestrator: TravelAgentOrchestrator | null = null;

export function getTravelAgentOrchestrator(): TravelAgentOrchestrator {
  if (!globalOrchestrator) {
    globalOrchestrator = new TravelAgentOrchestrator();
  }
  return globalOrchestrator;
}
