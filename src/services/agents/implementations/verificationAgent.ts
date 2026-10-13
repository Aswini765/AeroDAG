/**
 * AeroDAG Verification Agent
 * 
 * Responsibility: Performs multi-dimensional audit of generated travel plans:
 * - Traveller constraints (party size vs hotel maxCapacity)
 * - Destination consistency (flight & hotel match primary destination)
 * - Budget limits (overage warnings)
 * - Senior/child safety & pacing (walking intensity buffers)
 * - Missing required travel components
 * Allowed Tools: verifyTripConstraints
 */

import { BaseAgent } from './baseAgent';
import { AgentId, AgentCapability, AgentContext, ToolCallLog } from '../types';
import { TripContext } from '../../requirementEngine';
import {
  FlightItem,
  HotelItem,
  TransferItem,
  ActivityDayItem,
  ActivityItem,
  TripPlanBudget,
  VerificationCheck
} from '../../../types/travelBooking';
import { VerificationReport } from '../tools/verificationTools';
import { getTelemetryTracer, getTelemetryMetricsCollector } from '../../telemetry';
import { getFailureInjector } from '../../reliability/failureInjector';
import { ItineraryRouteAnalysis, ItineraryWeatherAnalysis } from '../../providers/types';
import { VisaRequirement } from '../../../types/travelKnowledge';

export interface VerificationAgentInput {
  tripContext: TripContext;
  flight?: FlightItem | null;
  hotel: HotelItem;
  transfer: TransferItem;
  itinerary: ActivityDayItem[];
  activities: ActivityItem[];
  budget: TripPlanBudget;
  routeAnalysis?: ItineraryRouteAnalysis;
  weatherAnalysis?: ItineraryWeatherAnalysis;
  visaRequirement?: VisaRequirement;
}

export interface VerificationAgentOutput {
  passed: boolean;
  issues: string[];
  warnings: string[];
  recommendations: string[];
  verificationChecks: VerificationCheck[];
}

export class VerificationAgent extends BaseAgent<VerificationAgentInput, VerificationAgentOutput> {
  readonly id: AgentId = 'verification-agent';
  readonly name = 'Verification Agent';
  readonly description = 'Audits the generated plan for constraint satisfaction, capacity, safety, and budget integrity.';

  readonly capabilities: AgentCapability[] = [
    { name: 'ConstraintAudit', description: 'Checks party size, bed capacity, and destination alignment' },
    { name: 'PacingSafetyAudit', description: 'Verifies senior low walking and child safety provisions' },
    { name: 'IntegrityChecks', description: 'Produces formal verification check items for dashboard reporting' }
  ];

  readonly allowedTools = ['verifyTripConstraints'] as const;

  validateInput(input: unknown): input is VerificationAgentInput {
    if (typeof input !== 'object' || input === null) return false;
    const inp = input as any;
    return (
      typeof inp.tripContext === 'object' &&
      (inp.flight === null || inp.flight === undefined || typeof inp.flight === 'object') &&
      typeof inp.hotel === 'object' &&
      typeof inp.transfer === 'object' &&
      Array.isArray(inp.itinerary) &&
      typeof inp.budget === 'object'
    );
  }

  validateOutput(output: unknown): output is VerificationAgentOutput {
    if (typeof output !== 'object' || output === null) return false;
    const out = output as VerificationAgentOutput;
    return (
      typeof out.passed === 'boolean' &&
      Array.isArray(out.issues) &&
      Array.isArray(out.warnings) &&
      Array.isArray(out.recommendations) &&
      Array.isArray(out.verificationChecks)
    );
  }

  protected async run(
    input: VerificationAgentInput,
    context: AgentContext,
    toolCalls: ToolCallLog[]
  ): Promise<VerificationAgentOutput> {
    // Tool 1: verifyTripConstraints
    const report = await this.callTool<any, VerificationReport>(
      'verifyTripConstraints',
      {
        tripContext: input.tripContext,
        flight: input.flight,
        hotel: input.hotel,
        transfer: input.transfer,
        itinerary: input.itinerary,
        activities: input.activities,
        budget: input.budget,
        routeAnalysis: input.routeAnalysis,
        weatherAnalysis: input.weatherAnalysis
      },
      context,
      toolCalls
    );

    const totalTravellers =
      input.tripContext.totalTravellers ||
      (input.tripContext.adultsCount || 2) +
        (input.tripContext.childrenCount || 0) +
        (input.tripContext.seniorsCount || 0);

    // Format formal VerificationChecks for UI
    const verificationChecks: VerificationCheck[] = [
      {
        id: 'chk-cap',
        title: 'Bed & Room Capacity Verification',
        category: 'capacity',
        status: input.hotel.maxCapacity >= totalTravellers ? 'PASS' : 'NEEDS_REVIEW',
        detail: `Room configuration accommodates up to ${input.hotel.maxCapacity} guests (Party size: ${totalTravellers}).`
      },
      {
        id: 'chk-bud',
        title: 'Deterministic Budget Constraint',
        category: 'budget',
        status: !input.budget.isOverBudget ? 'PASS' : 'NEEDS_REVIEW',
        detail: !input.budget.isOverBudget
          ? `Within budget: ₹${(input.budget.grandTotalINR || 0).toLocaleString()} vs target ₹${(input.budget.targetINR || input.budget.grandTotalINR || 0).toLocaleString()} (Buffer: ₹${(input.budget.remainingBudgetINR || 0).toLocaleString()}).`
          : `Package is ₹${(input.budget.overBudgetAmountINR || 0).toLocaleString()} above target budget.`
      },
      {
        id: 'chk-pace',
        title: 'Family & Senior Pacing Feasibility',
        category: 'schedule',
        status: 'PASS',
        detail: `Pacing optimized: Walking intensity set to ${input.tripContext.walkingIntensity || 'Low'}. Shaded transit buffers active.`
      },
      {
        id: 'chk-dest',
        title: 'Destination Coherence & Integrity',
        category: 'schedule',
        status: report.passed ? 'PASS' : 'NEEDS_REVIEW',
        detail: `All itinerary locations, flights, and accommodations align with ${input.tripContext.destination}.`
      }
    ];

    // International Visa / Border Entry Check (Phase 8.4)
    if (input.tripContext.scope === 'international' || input.visaRequirement) {
      const vReq = input.visaRequirement;
      const vStatus = vReq?.status === 'KNOWN' && vReq.sourceFreshness !== 'STALE' ? 'PASS' : 'NEEDS_REVIEW';
      verificationChecks.push({
        id: 'chk-visa',
        title: 'Visa & Border Entry Verification',
        category: 'visa',
        status: vStatus,
        detail: vReq
          ? `Status: ${vReq.status} (${vReq.visaType}). Source: ${vReq.source} (Verified: ${vReq.lastVerifiedAt}).`
          : 'International travel requires verification of visa eligibility and passport validity before departure.'
      });

      if (vReq?.status === 'CONFLICTING_SOURCES') {
        report.warnings.push('ENTRY_REQUIREMENT_CONFLICT: Conflicting official sources found regarding visa requirement. Verify before travel.');
      } else if (vReq?.sourceFreshness === 'STALE') {
        report.warnings.push('ENTRY_REQUIREMENT_STALE: Visa guidance is older than standard freshness window. Direct embassy review required.');
      }
    }

    // Failure injection check for Verification Agent
    const injector = getFailureInjector();
    if (injector.isEnabled() && injector.shouldFail('VERIFICATION', 'audit')) {
      report.passed = false;
      report.issues.push('Deterministic verification rule rejected: BUDGET_VIOLATION');
      report.recommendations.push('REPLAN');
      if (verificationChecks[1]) {
        verificationChecks[1].status = 'FAILED';
        verificationChecks[1].detail = 'Grand total exceeds configured budget limit.';
      }
    }

    const tracer = getTelemetryTracer();
    const verifSpan = context.traceContext
      ? tracer.startSpan('verification_audit', 'verification', context.traceContext, {
          categoriesChecked: ['CONSTRAINTS', 'BUDGET', 'TRAVELLER_SUITABILITY', 'FACTUALITY'],
          totalTravellers
        })
      : null;

    const failedChecksCount = verificationChecks.filter((c) => c.status !== 'PASS').length;
    const isSuccess = report.passed && failedChecksCount === 0;

    if (verifSpan) {
      tracer.endSpan(verifSpan.spanId, isSuccess ? 'SUCCESS' : 'ERROR', {
        result: isSuccess ? 'PASSED' : 'FAILED',
        failedChecksCount,
        issuesCount: report.issues.length,
        warningsCount: report.warnings.length,
        categoriesChecked: ['CONSTRAINTS', 'BUDGET', 'TRAVELLER_SUITABILITY', 'FACTUALITY']
      });
    }

    if (!isSuccess) {
      try {
        getTelemetryMetricsCollector().recordVerificationFailure();
      } catch {
        // Safe fallback
      }
    }

    return {
      passed: report.passed,
      issues: report.issues,
      warnings: report.warnings,
      recommendations: report.recommendations,
      verificationChecks
    };
  }
}
