/**
 * AeroDAG Central Telemetry Tracer
 * 
 * Provides lifecycle management for traces, root and child spans, context propagation,
 * automatic metadata sanitization, duration calculation, and metrics dispatch.
 * Fully thread-safe and concurrency-safe for parallel agent pipelines.
 */

import {
  TraceContext,
  TraceHandle,
  TelemetrySpan,
  SpanStatus,
  ErrorCategory,
  TelemetryTokenUsage
} from './types';
import { sanitizeTelemetryMetadata } from './sanitizer';
import { defaultTelemetryStore, TelemetryStore } from './telemetryStore';
import { defaultTelemetryMetrics, TelemetryMetricsCollector } from './telemetryMetrics';

function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export class TelemetryTracer {
  private store: TelemetryStore;
  private metrics: TelemetryMetricsCollector;
  private activeSpans = new Map<string, TelemetrySpan>();

  constructor(
    customStore?: TelemetryStore,
    customMetrics?: TelemetryMetricsCollector
  ) {
    this.store = customStore || defaultTelemetryStore;
    this.metrics = customMetrics || defaultTelemetryMetrics;
  }

  /**
   * Initializes a new root trace with a traceId and root span
   */
  startTrace(
    operationName: string,
    component: string,
    metadata?: Record<string, unknown>,
    incomingTraceId?: string,
    requestId?: string
  ): TraceHandle {
    const traceId = incomingTraceId || generateId('trc');
    const spanId = generateId('spn');

    const context: TraceContext = {
      traceId,
      spanId,
      requestId: requestId || generateId('req')
    };

    const span: TelemetrySpan = {
      traceId,
      spanId,
      requestId: context.requestId,
      operationName,
      component,
      startTime: Date.now(),
      status: 'SUCCESS',
      metadata: sanitizeTelemetryMetadata(metadata),
      events: []
    };

    this.activeSpans.set(spanId, span);
    return {
      context,
      span,
      spanId,
      traceId
    };
  }

  /**
   * Starts a child span nested under a parent context with the SAME traceId
   */
  startSpan(
    operationName: string,
    component: string,
    parentContext: TraceContext,
    metadata?: Record<string, unknown>
  ): TraceHandle {
    const spanId = generateId('spn');

    const context: TraceContext = {
      traceId: parentContext.traceId,
      spanId,
      parentSpanId: parentContext.spanId,
      requestId: parentContext.requestId
    };

    const span: TelemetrySpan = {
      traceId: parentContext.traceId,
      spanId,
      parentSpanId: parentContext.spanId,
      requestId: parentContext.requestId,
      operationName,
      component,
      startTime: Date.now(),
      status: 'SUCCESS',
      metadata: sanitizeTelemetryMetadata(metadata),
      events: []
    };

    this.activeSpans.set(spanId, span);
    return {
      context,
      span,
      spanId,
      traceId: parentContext.traceId
    };
  }

  /**
   * Concludes a span, records its duration, classifies any errors, and commits to storage & metrics
   */
  endSpan(
    target: TelemetrySpan | string | { span: TelemetrySpan },
    status: SpanStatus = 'SUCCESS',
    details?: Record<string, unknown>
  ): TelemetrySpan {
    let span: TelemetrySpan | undefined;

    if (typeof target === 'string') {
      span = this.activeSpans.get(target);
      if (!span) {
        // Fallback placeholder span if not found in active map
        span = {
          traceId: generateId('trc'),
          spanId: target,
          operationName: 'unknown_operation',
          component: 'unknown',
          startTime: Date.now(),
          status,
          metadata: {},
          events: []
        };
      }
      this.activeSpans.delete(target);
    } else if (typeof target === 'object' && target !== null && 'span' in target) {
      span = (target as { span: TelemetrySpan }).span;
      this.activeSpans.delete(span.spanId);
    } else {
      span = target as TelemetrySpan;
      this.activeSpans.delete(span.spanId);
    }

    const endTime = Date.now();
    span.endTime = endTime;
    span.durationMs = Math.max(0, endTime - span.startTime);
    span.status = status;

    if (details) {
      const {
        errorCategory,
        errorMessage,
        error,
        tokenUsage,
        estimatedCostUSD,
        retryCount,
        ...restMetadata
      } = details as any;

      if (errorCategory) {
        span.errorCategory = errorCategory as ErrorCategory;
      } else if (error) {
        span.errorCategory = 'INTERNAL_ERROR';
      }

      if (errorMessage) {
        span.errorMessage = String(errorMessage);
      } else if (error) {
        span.errorMessage = typeof error === 'string' ? error : (error?.message || String(error));
      }

      if (tokenUsage) {
        span.tokenUsage = tokenUsage;
      }
      if (estimatedCostUSD !== undefined) {
        span.estimatedCostUSD = estimatedCostUSD;
      }

      if (typeof retryCount === 'number') {
        span.metadata.retryCount = retryCount;
      }

      if (Object.keys(restMetadata).length > 0) {
        span.metadata = {
          ...span.metadata,
          ...sanitizeTelemetryMetadata(restMetadata)
        };
      }
    }

    // Record to store
    this.store.recordSpan(span);

    // Record to metrics
    const isSuccess = status === 'SUCCESS';
    const duration = span.durationMs;

    if (span.component === 'api') {
      this.metrics.recordRequest(duration, isSuccess);
    } else if (span.component === 'agent') {
      this.metrics.recordAgentExecution(duration, isSuccess);
    } else if (span.component === 'tool' || span.component === 'mcp') {
      this.metrics.recordToolExecution(duration, isSuccess);
    } else if (span.component === 'llm' || span.component === 'gemini') {
      const tokens = typeof span.tokenUsage === 'object' && span.tokenUsage !== null ? (span.tokenUsage.totalTokens || 0) : null;
      const cost = typeof span.estimatedCostUSD === 'number' ? span.estimatedCostUSD : null;
      this.metrics.recordGeminiCall(duration, isSuccess, tokens, cost);
    } else if (span.component === 'guardrail' && status === 'ERROR') {
      this.metrics.recordGuardrailBlock();
    } else if (span.component === 'verification' && !isSuccess) {
      this.metrics.recordVerificationFailure();
    }

    if (status === 'TIMEOUT') {
      this.metrics.recordTimeout();
    }
    const rCount = (details as any)?.retryCount;
    if (typeof rCount === 'number' && rCount > 0) {
      for (let i = 0; i < rCount; i++) {
        this.metrics.recordRetry();
      }
    }

    return span;
  }

  /**
   * Helper that wraps an async function execution in a managed span
   */
  async withSpan<T>(
    operationName: string,
    component: string,
    parentContext: TraceContext,
    fn: (ctx: TraceContext) => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const { context, span } = this.startSpan(operationName, component, parentContext, metadata);
    try {
      const result = await fn(context);
      this.endSpan(span, 'SUCCESS');
      return result;
    } catch (err: any) {
      const isTimeout = String(err?.message || '').toLowerCase().includes('timeout') || String(err?.message || '').toLowerCase().includes('timed out');
      this.endSpan(span, isTimeout ? 'TIMEOUT' : 'ERROR', {
        errorMessage: err?.message || String(err),
        errorCategory: isTimeout ? 'TIMEOUT' : 'INTERNAL_ERROR'
      });
      throw err;
    }
  }

  getStore(): TelemetryStore {
    return this.store;
  }

  getMetrics(): TelemetryMetricsCollector {
    return this.metrics;
  }
}

// Global default tracer instance
export const defaultTracer = new TelemetryTracer();
export const defaultTelemetryTracer = defaultTracer;

export function getTelemetryTracer(): TelemetryTracer {
  return defaultTracer;
}
