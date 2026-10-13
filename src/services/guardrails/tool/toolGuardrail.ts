/**
 * AeroDAG Tool Guardrail
 * 
 * Intercepts tool calls at the agent-tool boundary to enforce least-privilege
 * agent permissions, argument parameter sanity, and operation-type constraints.
 */

import { AgentId } from '../../agents/types';
import { Guardrail, GuardrailDecision, GuardrailContext } from '../types';
import { GuardrailTelemetry } from '../telemetry';

export interface ToolCallInvocation {
  agentId: AgentId;
  toolName: string;
  args: Record<string, unknown>;
  allowedTools: readonly string[];
}

export class ToolGuardrail implements Guardrail<ToolCallInvocation, void> {
  readonly id = 'tool-execution-guardrail';
  readonly name = 'Tool Security & Permission Guardrail';
  readonly description = 'Enforces agent permission boundaries, argument bounds, and operation safety.';
  readonly stage = 'tool' as const;
  readonly severity = 'CRITICAL' as const;
  readonly enabled = true;

  // Static definition of forbidden tool boundaries by agent role
  private static readonly RESTRICTED_AGENT_BOUNDARIES: Record<string, string[]> = {
    'flight-agent': ['createPayment', 'confirmBooking', 'refundPayment', 'searchHotels', 'searchActivities'],
    'hotel-agent': ['createPayment', 'confirmBooking', 'refundPayment', 'searchFlights', 'estimateTransfer'],
    'activity-agent': ['createPayment', 'confirmBooking', 'refundPayment', 'searchFlights', 'searchHotels'],
    'transport-agent': ['createPayment', 'confirmBooking', 'refundPayment', 'searchHotels'],
    'itinerary-agent': ['createPayment', 'confirmBooking', 'refundPayment', 'searchFlights'],
    'budget-agent': ['searchFlights', 'searchHotels', 'createPayment', 'confirmBooking', 'refundPayment', 'bookAnything'],
    'verification-agent': ['modifyBooking', 'createPayment', 'confirmBooking', 'refundPayment', 'searchFlights']
  };

  evaluate(invocation: ToolCallInvocation, context?: GuardrailContext): GuardrailDecision {
    const { agentId, toolName, args, allowedTools } = invocation;
    const startTime = Date.now();

    // 1. Role-based Boundary Check
    const restrictedForAgent = ToolGuardrail.RESTRICTED_AGENT_BOUNDARIES[agentId] || [];
    if (restrictedForAgent.includes(toolName)) {
      const decision: GuardrailDecision = {
        decision: 'BLOCK',
        guardrailId: this.id,
        severity: 'CRITICAL',
        reason: `Explicit Boundary Violation: Agent '${agentId}' is strictly forbidden from invoking '${toolName}'.`,
        safeMessage: 'Unauthorized tool invocation blocked.',
        metadata: { agentId, toolName, forbiddenBoundary: true }
      };
      this.recordTelemetry(decision, context, Date.now() - startTime);
      return decision;
    }

    // 2. Allowed Tools Permission Verification
    if (!allowedTools.includes(toolName)) {
      const decision: GuardrailDecision = {
        decision: 'BLOCK',
        guardrailId: this.id,
        severity: 'CRITICAL',
        reason: `Permission Violation: Agent '${agentId}' is not authorized to invoke tool '${toolName}'. Allowed: [${allowedTools.join(', ')}]`,
        safeMessage: 'Tool permission denied.',
        metadata: { agentId, toolName, allowedTools }
      };
      this.recordTelemetry(decision, context, Date.now() - startTime);
      return decision;
    }

    // 3. Argument Parameter Sanity Validation
    if (args && typeof args === 'object') {
      // Traveller count sanity
      if ('travellerCount' in args) {
        const count = Number(args.travellerCount);
        if (isNaN(count) || count < 1 || count > 50) {
          const decision: GuardrailDecision = {
            decision: 'BLOCK',
            guardrailId: this.id,
            severity: 'HIGH',
            reason: `Invalid parameter 'travellerCount': ${args.travellerCount}. Must be between 1 and 50.`,
            metadata: { agentId, toolName, invalidArg: 'travellerCount' }
          };
          this.recordTelemetry(decision, context, Date.now() - startTime);
          return decision;
        }
      }

      // Budget sanity
      if ('targetBudgetINR' in args) {
        const budget = Number(args.targetBudgetINR);
        if (isNaN(budget) || budget <= 0) {
          const decision: GuardrailDecision = {
            decision: 'BLOCK',
            guardrailId: this.id,
            severity: 'HIGH',
            reason: `Invalid parameter 'targetBudgetINR': ${args.targetBudgetINR}. Must be positive.`,
            metadata: { agentId, toolName, invalidArg: 'targetBudgetINR' }
          };
          this.recordTelemetry(decision, context, Date.now() - startTime);
          return decision;
        }
      }

      // Dangerous payload pattern check inside tool args
      for (const [key, val] of Object.entries(args)) {
        if (typeof val === 'string') {
          if (/(\bdrop\s+table\b|<script|;\s*rm\s+-rf)/i.test(val)) {
            const decision: GuardrailDecision = {
              decision: 'BLOCK',
              guardrailId: this.id,
              severity: 'CRITICAL',
              reason: `Malicious pattern detected in tool parameter '${key}'.`,
              metadata: { agentId, toolName, field: key }
            };
            this.recordTelemetry(decision, context, Date.now() - startTime);
            return decision;
          }
        }
      }
    }

    const allowDecision: GuardrailDecision = {
      decision: 'ALLOW',
      guardrailId: this.id,
      severity: 'LOW',
      metadata: { agentId, toolName }
    };
    this.recordTelemetry(allowDecision, context, Date.now() - startTime);
    return allowDecision;
  }

  private recordTelemetry(decision: GuardrailDecision, context?: GuardrailContext, latencyMs = 0): void {
    GuardrailTelemetry.record({
      requestId: context?.requestId || `tool_${Date.now()}`,
      guardrailId: this.id,
      stage: 'tool',
      decision: decision.decision,
      severity: decision.severity,
      timestamp: new Date().toISOString(),
      agentId: context?.agentId,
      toolName: context?.toolName,
      latencyMs,
      safeMetadata: {
        reason: decision.reason
      }
    });
  }
}

let globalToolGuardrail: ToolGuardrail | null = null;

export function getToolGuardrail(): ToolGuardrail {
  if (!globalToolGuardrail) {
    globalToolGuardrail = new ToolGuardrail();
  }
  return globalToolGuardrail;
}
