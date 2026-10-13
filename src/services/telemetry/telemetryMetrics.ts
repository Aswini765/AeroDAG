/**
 * AeroDAG Provider-Neutral Telemetry Metrics Collector
 * 
 * Aggregates runtime latencies, success/failure counts, retry frequency,
 * guardrail interceptions, and token costs without external dependencies.
 */

import { MetricAggregation, TelemetryMetricsSnapshot } from './types';

class LatencyAccumulator {
  private values: number[] = [];
  private errors = 0;

  record(latencyMs: number, isError = false): void {
    if (typeof latencyMs === 'number' && !isNaN(latencyMs) && latencyMs >= 0) {
      this.values.push(latencyMs);
    }
    if (isError) this.errors++;
  }

  getAggregation(): MetricAggregation {
    if (this.values.length === 0) {
      return { count: 0, total: 0, average: 0, min: 0, max: 0, errorCount: this.errors };
    }

    const count = this.values.length;
    const total = this.values.reduce((a, b) => a + b, 0);
    const average = Number((total / count).toFixed(2));
    const min = Math.min(...this.values);
    const max = Math.max(...this.values);

    return {
      count,
      total,
      average,
      min,
      max,
      errorCount: this.errors
    };
  }

  clear(): void {
    this.values = [];
    this.errors = 0;
  }
}

export class TelemetryMetricsCollector {
  private requestCount = 0;
  private requestSuccessCount = 0;
  private requestFailureCount = 0;

  private requestLatencyAcc = new LatencyAccumulator();
  private agentLatencyAcc = new LatencyAccumulator();
  private toolLatencyAcc = new LatencyAccumulator();
  private geminiLatencyAcc = new LatencyAccumulator();

  private retryCount = 0;
  private timeoutCount = 0;
  private guardrailBlocks = 0;
  private verificationFailures = 0;

  private totalTokensCount: number | null = null;
  private totalCostUSD: number | null = null;

  recordRequest(arg1: boolean | number, arg2?: boolean | number): void {
    let success = true;
    let durationMs = 0;
    if (typeof arg1 === 'boolean') {
      success = arg1;
      durationMs = typeof arg2 === 'number' ? arg2 : 0;
    } else {
      durationMs = arg1;
      success = typeof arg2 === 'boolean' ? arg2 : true;
    }
    this.requestCount++;
    if (success) this.requestSuccessCount++;
    else this.requestFailureCount++;
    this.requestLatencyAcc.record(durationMs, !success);
  }

  recordAgentExecution(durationMs: number, success: boolean): void {
    this.agentLatencyAcc.record(durationMs, !success);
  }

  recordToolExecution(durationMs: number, success: boolean): void {
    this.toolLatencyAcc.record(durationMs, !success);
  }

  recordGeminiLatency(durationMs: number, success = true): void {
    this.geminiLatencyAcc.record(durationMs, !success);
  }

  recordTokens(inputTokens: number, outputTokens: number): void {
    const total = (inputTokens || 0) + (outputTokens || 0);
    if (total > 0) {
      this.totalTokensCount = (this.totalTokensCount || 0) + total;
    }
  }

  recordCost(costUSD: number): void {
    if (typeof costUSD === 'number' && costUSD > 0) {
      this.totalCostUSD = Number(((this.totalCostUSD || 0) + costUSD).toFixed(6));
    }
  }

  recordGeminiCall(durationMs: number, success: boolean, tokens?: number | null, costUSD?: number | null): void {
    this.geminiLatencyAcc.record(durationMs, !success);
    if (typeof tokens === 'number' && tokens > 0) {
      this.totalTokensCount = (this.totalTokensCount || 0) + tokens;
    }
    if (typeof costUSD === 'number' && costUSD > 0) {
      this.totalCostUSD = Number(((this.totalCostUSD || 0) + costUSD).toFixed(6));
    }
  }

  recordRetry(): void {
    this.retryCount++;
  }

  recordTimeout(): void {
    this.timeoutCount++;
  }

  recordGuardrailBlock(): void {
    this.guardrailBlocks++;
  }

  recordVerificationFailure(): void {
    this.verificationFailures++;
  }

  getSnapshot(): TelemetryMetricsSnapshot {
    return {
      requestCount: this.requestCount,
      requestSuccessCount: this.requestSuccessCount,
      requestFailureCount: this.requestFailureCount,
      requestLatency: this.requestLatencyAcc.getAggregation(),
      agentLatency: this.agentLatencyAcc.getAggregation(),
      toolLatency: this.toolLatencyAcc.getAggregation(),
      geminiLatency: this.geminiLatencyAcc.getAggregation(),
      retryCount: this.retryCount,
      timeoutCount: this.timeoutCount,
      guardrailBlocks: this.guardrailBlocks,
      verificationFailures: this.verificationFailures,
      totalTokens: this.totalTokensCount !== null ? this.totalTokensCount : 'unavailable',
      totalEstimatedCostUSD: this.totalCostUSD !== null ? this.totalCostUSD : 'unavailable'
    };
  }

  clear(): void {
    this.requestCount = 0;
    this.requestSuccessCount = 0;
    this.requestFailureCount = 0;
    this.requestLatencyAcc.clear();
    this.agentLatencyAcc.clear();
    this.toolLatencyAcc.clear();
    this.geminiLatencyAcc.clear();
    this.retryCount = 0;
    this.timeoutCount = 0;
    this.guardrailBlocks = 0;
    this.verificationFailures = 0;
    this.totalTokensCount = null;
    this.totalCostUSD = null;
  }

  reset(): void {
    this.clear();
  }
}

export const defaultTelemetryMetrics = new TelemetryMetricsCollector();
export const defaultTelemetryMetricsCollector = defaultTelemetryMetrics;

export function getTelemetryMetricsCollector(): TelemetryMetricsCollector {
  return defaultTelemetryMetrics;
}
