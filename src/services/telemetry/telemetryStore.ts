/**
 * AeroDAG In-Memory Development Telemetry Store
 * 
 * Provides centralized storage and query capabilities for traces, spans, and metrics.
 * Designed for developer inspection, test verification, and future OpenTelemetry forwarding.
 * Isolated completely from the public consumer API.
 */

import { TelemetrySpan, TraceSummary, SpanStatus } from './types';

export class TelemetryStore {
  private spans: TelemetrySpan[] = [];
  private static readonly MAX_SPANS = 5000;

  /**
   * Appends an ended span to storage
   */
  recordSpan(span: TelemetrySpan): void {
    this.spans.push(span);
    if (this.spans.length > TelemetryStore.MAX_SPANS) {
      this.spans.shift();
    }
  }

  /**
   * Retrieves all spans for a specific traceId
   */
  getSpansByTraceId(traceId: string): TelemetrySpan[] {
    return this.spans.filter((s) => s.traceId === traceId);
  }

  /**
   * Retrieves structured TraceSummary for a specific traceId
   */
  getTrace(traceId: string): TraceSummary | null {
    const traceSpans = this.getSpansByTraceId(traceId);
    if (traceSpans.length === 0) return null;

    const rootSpan = traceSpans.find((s) => !s.parentSpanId) || traceSpans[0];
    const startTime = Math.min(...traceSpans.map((s) => s.startTime));
    const endTime = Math.max(...traceSpans.map((s) => s.endTime || s.startTime));
    const hasError = traceSpans.some((s) => s.status === 'ERROR');
    const hasTimeout = traceSpans.some((s) => s.status === 'TIMEOUT');

    let overallStatus: SpanStatus = 'SUCCESS';
    if (hasTimeout) overallStatus = 'TIMEOUT';
    else if (hasError) overallStatus = 'ERROR';

    return {
      traceId,
      requestId: rootSpan.requestId,
      rootSpan,
      spanCount: traceSpans.length,
      startTime,
      endTime,
      durationMs: endTime - startTime,
      status: overallStatus,
      spans: traceSpans
    };
  }

  /**
   * Retrieves summary of recent traces up to limit
   */
  getRecentTraces(limit = 20): TraceSummary[] {
    const seenTraceIds = new Set<string>();
    const recentTraces: TraceSummary[] = [];

    // Traverse spans in reverse to find latest traces
    for (let i = this.spans.length - 1; i >= 0; i--) {
      const s = this.spans[i];
      if (!seenTraceIds.has(s.traceId)) {
        seenTraceIds.add(s.traceId);
        const trace = this.getTrace(s.traceId);
        if (trace) recentTraces.push(trace);
        if (recentTraces.length >= limit) break;
      }
    }

    return recentTraces;
  }

  /**
   * Returns all recorded spans
   */
  getAllSpans(): TelemetrySpan[] {
    return [...this.spans];
  }

  /**
   * Clears the store (useful for clean test isolation)
   */
  clear(): void {
    this.spans = [];
  }
}

// Global singleton instance for in-memory development runtime
export const defaultTelemetryStore = new TelemetryStore();
