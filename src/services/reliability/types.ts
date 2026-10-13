/**
 * AeroDAG Phase 7.2 — Reliability Engineering & Failure Injection Types
 * 
 * Defines domain abstractions for deterministic failure injection,
 * error classification, bounded retry policies, booking state safety,
 * and reliability metrics.
 */

import { BookingState } from '../../types/travelBooking';
import { ErrorCategory, TraceContext } from '../telemetry/types';

export type FailurePoint =
  | 'API'
  | 'ORCHESTRATOR'
  | 'AGENT'
  | 'TOOL'
  | 'MCP'
  | 'GEMINI'
  | 'RAG'
  | 'GUARDRAIL'
  | 'VERIFICATION'
  | 'BOOKING'
  | 'PAYMENT';

export type FailureMode =
  | 'ERROR'
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'QUOTA_EXHAUSTED'
  | 'INVALID_OUTPUT'
  | 'MALFORMED_RESPONSE'
  | 'UNAVAILABLE'
  | 'CONSTRAINT_FAILURE';

export interface FailureScenarioConfig {
  point: FailurePoint;
  mode: FailureMode;
  target?: string; // e.g. 'searchFlights', 'flight-agent', 'gemini', 'booking'
  failuresBeforeSuccess?: number; // 1 = attempt 1 fails, attempt 2 succeeds. Infinity = permanent.
  delayMs?: number;
  customError?: Error | string;
  malformedData?: unknown;
  metadata?: Record<string, unknown>;
}

export interface FailureScenarioRecord {
  id: string;
  name: string;
  description: string;
  point: FailurePoint;
  mode: FailureMode;
  config: FailureScenarioConfig;
}

export interface InjectedFailureHistoryItem {
  timestamp: string;
  point: FailurePoint;
  target?: string;
  mode: FailureMode;
  attemptNumber: number;
  exhausted: boolean;
  errorCategory: ErrorCategory;
  message: string;
  traceId?: string;
}

export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ErrorClassification {
  category: ErrorCategory;
  isRetryable: boolean;
  severity: ErrorSeverity;
  reason: string;
}

export interface ReliabilityRetryPolicy {
  maxRetries: number;
  backoffMs: number;
  maxBackoffMs?: number;
  retryableCategories: readonly ErrorCategory[];
}

export interface ReliabilityMetrics {
  totalScenarios: number;
  passed: number;
  failed: number;
  retryRecoveryRate: number; // percentage of transient failures recovered via retry
  failureContainmentRate: number; // percentage of non-recoverable failures safely contained
  unsafeStateTransitions: number; // must be 0 (e.g. FAILED -> CONFIRMED)
  infiniteRetryIncidents: number; // must be 0
  duplicateExecutionIncidents: number; // must be 0
  telemetryIntegrityFailures: number; // must be 0
}

export interface IdempotencyRecord {
  idempotencyKey: string;
  resourceId: string;
  operation: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  responsePayload?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSimulationRequest {
  idempotencyKey: string;
  orderId: string;
  amountINR: number;
  currency: string;
  paymentMethod: 'UPI' | 'CREDIT_CARD' | 'NET_BANKING' | 'MOCK_SANDBOX';
  cardLastFour?: string;
  traceContext?: TraceContext;
}

export interface PaymentSimulationResponse {
  success: boolean;
  transactionId?: string;
  orderId: string;
  status: 'SUCCESS' | 'DECLINED' | 'TIMEOUT' | 'ERROR';
  errorMessage?: string;
  errorCode?: string;
  idempotentReplay?: boolean;
  timestamp: string;
}

export interface BookingHoldRequest {
  bookingId: string;
  tripPlanId: string;
  items: Array<{
    type: 'FLIGHT' | 'HOTEL' | 'TRANSFER' | 'ACTIVITY';
    itemId: string;
    priceINR: number;
  }>;
  holdDurationSeconds: number;
  traceContext?: TraceContext;
}

export interface BookingHoldResponse {
  success: boolean;
  holdId?: string;
  bookingState: BookingState;
  expiresAt?: string;
  errorMessage?: string;
}

export interface BookingConfirmationRequest {
  holdId: string;
  bookingId: string;
  paymentTransactionId: string;
  idempotencyKey: string;
  traceContext?: TraceContext;
}

export interface BookingConfirmationResponse {
  success: boolean;
  bookingId: string;
  confirmationNumber?: string;
  bookingState: BookingState;
  pnr?: string;
  hotelVoucher?: string;
  errorMessage?: string;
  idempotentReplay?: boolean;
}
