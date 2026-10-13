/**
 * AeroDAG AI Safety & Guardrails Contract (Phase 5)
 * 
 * Defines standard contracts for input guardrails, tool guardrails,
 * output guardrails, claim auditing, and human-in-the-loop decisions.
 */

import { AgentId } from '../agents/types';
import { BookingState } from '../../types/travelBooking';

export type GuardrailStage = 'input' | 'tool' | 'output' | 'audit' | 'final';

export type GuardrailSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type GuardrailAction =
  | 'ALLOW'
  | 'WARN'
  | 'BLOCK'
  | 'REQUIRE_REVIEW'
  | 'RETRY'
  | 'REPLAN';

export interface GuardrailDecision {
  decision: GuardrailAction;
  guardrailId: string;
  severity: GuardrailSeverity;
  reason?: string;
  safeMessage?: string;
  metadata?: Record<string, unknown>;
}

import { TraceContext } from '../telemetry';

export interface GuardrailContext {
  requestId?: string;
  correlationId?: string;
  userId?: string;
  timestamp: string;
  agentId?: AgentId;
  toolName?: string;
  metadata?: Record<string, unknown>;
  traceContext?: TraceContext;
  traceId?: string;
}

export interface Guardrail<TInput = unknown, TOutput = unknown> {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly stage: GuardrailStage;
  readonly severity: GuardrailSeverity;
  readonly enabled: boolean;
  evaluate(input: TInput, context?: GuardrailContext): Promise<GuardrailDecision> | GuardrailDecision;
}

// =============================================================================
// Claim Auditing & Grounding Types
// =============================================================================

export type ClaimStatus = 'SUPPORTED' | 'UNSUPPORTED' | 'CONTRADICTED' | 'UNCERTAIN' | 'STALE' | 'CONFLICTING';

export type ClaimCategory =
  | 'visa'
  | 'passport'
  | 'entry'
  | 'fee'
  | 'cancellation'
  | 'baggage'
  | 'health'
  | 'restriction'
  | 'booking_status'
  | 'price'
  | 'availability'
  | 'general';

export interface ClaimItem {
  id: string;
  text: string;
  category: ClaimCategory;
  destination?: string;
  claimedValue?: string | number;
}

export interface ClaimVerificationDetail {
  claim: ClaimItem;
  status: ClaimStatus;
  evidenceSource?: string;
  confidence: number;
  reason: string;
  correctedText?: string;
}

export interface ClaimAuditResult {
  auditedClaims: ClaimVerificationDetail[];
  allSupported: boolean;
  unsupportedClaims: ClaimVerificationDetail[];
  disclaimers: string[];
  safeOutputText?: string;
}

// =============================================================================
// Human-In-The-Loop Foundation
// =============================================================================

export type ConsequentialActionType =
  | 'payment'
  | 'booking'
  | 'cancellation'
  | 'price_increase_replan';

export type ConfirmationStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export interface HumanConfirmationRequest {
  id: string;
  actionType: ConsequentialActionType;
  title: string;
  description: string;
  financialImpactINR?: number;
  requiresConfirmation: boolean;
  status: ConfirmationStatus;
  createdAt: string;
  resolvedAt?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// LLM-as-Judge Foundation Interface (Phase 6 Preparation)
// =============================================================================

export interface LLMJudgeInput {
  query: string;
  expected?: string | Record<string, unknown>;
  actual: string | Record<string, unknown>;
  criteria: string[];
}

export interface LLMJudgeResult {
  score: number; // 0.0 - 1.0
  reasoning: string;
  criteria: Record<string, boolean>;
  confidence: number;
}

export interface LLMJudge {
  readonly id: string;
  readonly name: string;
  evaluate(input: LLMJudgeInput): Promise<LLMJudgeResult>;
}

// =============================================================================
// Safe Observability & Telemetry Types
// =============================================================================

export interface GuardrailEvent {
  requestId: string;
  traceId?: string;
  guardrailId: string;
  stage: GuardrailStage;
  decision: GuardrailAction;
  severity: GuardrailSeverity;
  timestamp: string;
  agentId?: string;
  toolName?: string;
  latencyMs: number;
  // Non-sensitive metadata ONLY (no PII, no card numbers, no prompt secrets)
  safeMetadata?: Record<string, unknown>;
}
