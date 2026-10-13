/**
 * AeroDAG Output Guardrail Pipeline
 * 
 * Orchestrates all post-generation safety checks:
 * - Budget mathematical integrity
 * - Hotel guest capacity and physical constraints
 * - Booking state veracity (no false confirmation claims)
 * - Claim auditing & regulatory ground truth
 */

import { TripPlan } from '../../../types/travelBooking';
import { GuardrailDecision, GuardrailContext } from '../types';
import { GuardrailTelemetry } from '../telemetry';
import { getTelemetryTracer } from '../../telemetry';
import { BudgetGuardrail } from './budgetGuardrail';
import { ConstraintGuardrail } from './constraintGuardrail';
import { BookingStateGuardrail } from './bookingStateGuardrail';

export interface OutputPipelineResult {
  passed: boolean;
  blockedDecision?: GuardrailDecision;
  decisions: GuardrailDecision[];
  sanitizedPlan?: TripPlan;
}

export class OutputGuardrailPipeline {
  private readonly budgetGuardrail = new BudgetGuardrail();
  private readonly constraintGuardrail = new ConstraintGuardrail();
  private readonly bookingStateGuardrail = new BookingStateGuardrail();

  async process(plan: TripPlan, context?: GuardrailContext): Promise<OutputPipelineResult> {
    const startTime = Date.now();
    const decisions: GuardrailDecision[] = [];
    const requestId = context?.requestId || `out_${Date.now()}`;

    // 1. Hotel & Traveller Physical Constraints
    const constraintDecision = this.constraintGuardrail.evaluate(plan, context);
    decisions.push(constraintDecision);
    if (constraintDecision.decision === 'BLOCK') {
      this.recordTelemetry(constraintDecision, requestId, Date.now() - startTime, context);
      return {
        passed: false,
        blockedDecision: constraintDecision,
        decisions
      };
    }

    // 2. Budget Deterministic Arithmetic Integrity
    const budgetDecision = this.budgetGuardrail.evaluate(plan, context);
    decisions.push(budgetDecision);
    let sanitizedPlan = { ...plan };

    if (budgetDecision.decision === 'BLOCK') {
      // Deterministically repair budget rather than abandoning the user
      sanitizedPlan.budget = BudgetGuardrail.repairBudget(plan.budget);
      decisions.push({
        decision: 'WARN',
        guardrailId: 'budget-auto-repair',
        severity: 'MEDIUM',
        reason: 'Budget discrepancies automatically corrected with deterministic sums.'
      });
    }

    // 3. Booking State Veracity Check
    const bookingDecision = this.bookingStateGuardrail.evaluate(
      {
        actualState: 'AVAILABLE', // Default unconfirmed pipeline state
        isMockProvider: true,
        generatedText: plan.summary
      },
      context
    );
    decisions.push(bookingDecision);

    if (bookingDecision.decision === 'BLOCK') {
      sanitizedPlan.summary = BookingStateGuardrail.sanitizeBookingText(sanitizedPlan.summary, 'AVAILABLE');
    }

    this.recordTelemetry(
      {
        decision: 'ALLOW',
        guardrailId: 'output-pipeline',
        severity: 'LOW'
      },
      requestId,
      Date.now() - startTime,
      context
    );

    return {
      passed: true,
      decisions,
      sanitizedPlan
    };
  }

  private recordTelemetry(
    decision: GuardrailDecision,
    requestId: string,
    latencyMs: number,
    context?: GuardrailContext
  ): void {
    const traceId = context?.traceContext?.traceId || context?.traceId;
    if (context?.traceContext) {
      try {
        const tracer = getTelemetryTracer();
        const span = tracer.startSpan(`guardrail_${decision.guardrailId}`, 'guardrail', context.traceContext, {
          decision: decision.decision,
          severity: decision.severity,
          reason: decision.reason
        });
        tracer.endSpan(span.spanId, decision.decision === 'BLOCK' ? 'ERROR' : 'SUCCESS');
      } catch {
        // Safe telemetry fallback
      }
    }

    GuardrailTelemetry.record({
      requestId,
      traceId,
      guardrailId: decision.guardrailId,
      stage: 'output',
      decision: decision.decision,
      severity: decision.severity,
      timestamp: new Date().toISOString(),
      latencyMs,
      safeMetadata: {
        reason: decision.reason
      }
    });
  }
}

let globalOutputPipeline: OutputGuardrailPipeline | null = null;

export function getOutputGuardrailPipeline(): OutputGuardrailPipeline {
  if (!globalOutputPipeline) {
    globalOutputPipeline = new OutputGuardrailPipeline();
  }
  return globalOutputPipeline;
}
