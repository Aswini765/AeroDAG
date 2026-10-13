/**
 * AeroDAG Provider-Neutral Telemetry & Tracing Domain Model
 * 
 * Defines standard data structures for traces, spans, events, metrics,
 * and error classifications without coupling to specific backends like OpenTelemetry.
 */

export type SpanStatus = 'SUCCESS' | 'ERROR' | 'TIMEOUT' | 'CANCELLED';

export type ErrorCategory =
  | 'VALIDATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'TOOL_ERROR'
  | 'PROVIDER_ERROR'
  | 'LLM_ERROR'
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'QUOTA_EXCEEDED'
  | 'QUOTA_EXHAUSTED'
  | 'GUARDRAIL_BLOCK'
  | 'RAG_ERROR'
  | 'BOOKING_ERROR'
  | 'PAYMENT_ERROR'
  | 'INTERNAL_ERROR'
  | 'UNKNOWN_ERROR';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  requestId?: string;
}

export interface TraceHandle {
  context: TraceContext;
  span: TelemetrySpan;
  spanId: string;
  traceId: string;
}

export interface TelemetryTokenUsage {
  inputTokens?: number | null;
  outputTokens?: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
}

export interface TelemetryEvent {
  name: string;
  timestamp: string;
  attributes?: Record<string, unknown>;
}

export interface TelemetrySpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  requestId?: string;
  operationName: string;
  component: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: SpanStatus;
  errorCategory?: ErrorCategory;
  errorMessage?: string;
  metadata: Record<string, unknown>;
  events: TelemetryEvent[];
  tokenUsage?: TelemetryTokenUsage | 'unavailable';
  estimatedCostUSD?: number | 'unavailable';
}

export interface TraceSummary {
  traceId: string;
  requestId?: string;
  rootSpan?: TelemetrySpan;
  spanCount: number;
  startTime: number;
  endTime: number;
  durationMs: number;
  status: SpanStatus;
  spans: TelemetrySpan[];
}

export interface MetricAggregation {
  count: number;
  total: number;
  average: number;
  min: number;
  max: number;
  errorCount: number;
}

export interface TelemetryMetricsSnapshot {
  requestCount: number;
  requestSuccessCount: number;
  requestFailureCount: number;
  requestLatency: MetricAggregation;
  agentLatency: MetricAggregation;
  toolLatency: MetricAggregation;
  geminiLatency: MetricAggregation;
  retryCount: number;
  timeoutCount: number;
  guardrailBlocks: number;
  verificationFailures: number;
  totalTokens: number | 'unavailable';
  totalEstimatedCostUSD: number | 'unavailable';
}
