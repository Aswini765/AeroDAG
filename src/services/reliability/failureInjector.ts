/**
 * AeroDAG Failure Injector
 * 
 * Deterministic test-only failure injection framework.
 * Allows reproducible simulation of timeouts, rate limits, quota exhaustion,
 * provider unavailabilities, invalid outputs, and constraint failures across all
 * architecture points.
 * 
 * CRITICAL: Zero Math.random(). Operates ONLY when explicitly configured by tests.
 */

import { ErrorCategory } from '../telemetry/types';
import {
  FailurePoint,
  FailureMode,
  FailureScenarioConfig,
  InjectedFailureHistoryItem
} from './types';

export class InjectedError extends Error {
  readonly point: FailurePoint;
  readonly mode: FailureMode;
  readonly target?: string;
  readonly category: ErrorCategory;

  constructor(message: string, point: FailurePoint, mode: FailureMode, category: ErrorCategory, target?: string) {
    super(message);
    this.name = 'InjectedError';
    this.point = point;
    this.mode = mode;
    this.category = category;
    this.target = target;
  }
}

export class InjectedTimeoutError extends InjectedError {
  constructor(message: string, point: FailurePoint, target?: string) {
    super(message, point, 'TIMEOUT', 'TIMEOUT', target);
    this.name = 'InjectedTimeoutError';
  }
}

export class InjectedRateLimitError extends InjectedError {
  constructor(message: string, point: FailurePoint, target?: string) {
    super(message, point, 'RATE_LIMIT', 'RATE_LIMIT', target);
    this.name = 'InjectedRateLimitError';
  }
}

export class InjectedQuotaError extends InjectedError {
  constructor(message: string, point: FailurePoint, target?: string) {
    super(message, point, 'QUOTA_EXHAUSTED', 'QUOTA_EXHAUSTED', target);
    this.name = 'InjectedQuotaError';
  }
}

export class InjectedUnavailableError extends InjectedError {
  constructor(message: string, point: FailurePoint, target?: string) {
    super(message, point, 'UNAVAILABLE', 'PROVIDER_ERROR', target);
    this.name = 'InjectedUnavailableError';
  }
}

export class FailureInjector {
  private static instance: FailureInjector | null = null;

  private enabled = false;
  // Key: `${point}:${target || '*'}`
  private activeConfigs: Map<string, { config: FailureScenarioConfig; attempts: number }> = new Map();
  private history: InjectedFailureHistoryItem[] = [];

  private constructor() {}

  static getInstance(): FailureInjector {
    if (!FailureInjector.instance) {
      FailureInjector.instance = new FailureInjector();
    }
    return FailureInjector.instance;
  }

  /**
   * Enables the failure injector for testing
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disables the failure injector
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Returns whether failure injection is active
   */
  isEnabled(): boolean {
    return this.enabled && this.activeConfigs.size > 0;
  }

  /**
   * Configures a deterministic failure scenario
   */
  configure(config: FailureScenarioConfig): void {
    this.enabled = true;
    const key = this.buildKey(config.point, config.target);
    this.activeConfigs.set(key, {
      config: {
        ...config,
        failuresBeforeSuccess: config.failuresBeforeSuccess ?? 1
      },
      attempts: 0
    });
  }

  /**
   * Clears all configured failure rules
   */
  clear(): void {
    this.activeConfigs.clear();
  }

  /**
   * Clears configs and resets history
   */
  reset(): void {
    this.activeConfigs.clear();
    this.history = [];
    this.enabled = false;
  }

  /**
   * Checks if an execution point should trigger an injected failure
   */
  shouldFail(point: FailurePoint, target?: string): boolean {
    if (!this.enabled) return false;
    const match = this.findMatch(point, target);
    if (!match) return false;

    const { config, attempts } = match;
    const maxFailures = config.failuresBeforeSuccess ?? 1;
    return attempts < maxFailures;
  }

  /**
   * Returns configured malformed output data, if any
   */
  getMalformedOutput(point: FailurePoint, target?: string): unknown | undefined {
    if (!this.enabled) return undefined;
    const match = this.findMatch(point, target);
    if (!match) return undefined;
    if (match.config.mode === 'MALFORMED_RESPONSE' || match.config.mode === 'INVALID_OUTPUT') {
      const maxFailures = match.config.failuresBeforeSuccess ?? 1;
      if (match.attempts < maxFailures) {
        match.attempts++;
        return match.config.malformedData;
      }
    }
    return undefined;
  }

  /**
   * Injects the configured failure (delays if timeout, then throws deterministic InjectedError)
   */
  async inject(point: FailurePoint, target?: string, traceId?: string): Promise<void> {
    if (!this.enabled) return;
    const key = this.buildKey(point, target);
    const match = this.findMatch(point, target);
    if (!match) return;

    const { config } = match;
    const maxFailures = config.failuresBeforeSuccess ?? 1;

    if (match.attempts >= maxFailures) {
      return; // Failure count exhausted; subsequent attempts succeed
    }

    match.attempts++;
    const isExhausted = match.attempts >= maxFailures;

    // Optional deterministic simulation delay
    if (config.delayMs && config.delayMs > 0) {
      await new Promise((r) => setTimeout(r, config.delayMs));
    }

    const error = this.createError(config, point, target);

    this.history.push({
      timestamp: new Date().toISOString(),
      point,
      target,
      mode: config.mode,
      attemptNumber: match.attempts,
      exhausted: isExhausted,
      errorCategory: (error as InjectedError).category || 'PROVIDER_ERROR',
      message: error.message,
      traceId
    });

    throw error;
  }

  /**
   * Returns historical log of injected failures
   */
  getHistory(): readonly InjectedFailureHistoryItem[] {
    return this.history;
  }

  /**
   * Returns active attempt count for a point and target
   */
  getAttemptCount(point: FailurePoint, target?: string): number {
    const match = this.findMatch(point, target);
    return match ? match.attempts : 0;
  }

  private buildKey(point: FailurePoint, target?: string): string {
    return `${point}:${target || '*'}`;
  }

  private findMatch(point: FailurePoint, target?: string): { config: FailureScenarioConfig; attempts: number } | undefined {
    // 1. Exact match on target
    if (target) {
      const specific = this.activeConfigs.get(this.buildKey(point, target));
      if (specific) return specific;
    }
    // 2. Wildcard match on point
    return this.activeConfigs.get(this.buildKey(point, '*'));
  }

  private createError(config: FailureScenarioConfig, point: FailurePoint, target?: string): Error {
    if (config.customError) {
      return typeof config.customError === 'string' ? new Error(config.customError) : config.customError;
    }

    const label = target ? `${point} [${target}]` : point;

    switch (config.mode) {
      case 'TIMEOUT':
        return new InjectedTimeoutError(`Simulated timeout failure in ${label}`, point, target);
      case 'RATE_LIMIT':
        return new InjectedRateLimitError(`Simulated 429 rate limit in ${label}`, point, target);
      case 'QUOTA_EXHAUSTED':
        return new InjectedQuotaError(`Simulated quota exhaustion in ${label}`, point, target);
      case 'UNAVAILABLE':
        return new InjectedUnavailableError(`Simulated provider unavailable in ${label}`, point, target);
      case 'CONSTRAINT_FAILURE':
        return new InjectedError(`Simulated constraint violation in ${label}`, point, 'CONSTRAINT_FAILURE', 'GUARDRAIL_BLOCK', target);
      case 'INVALID_OUTPUT':
        return new InjectedError(`Simulated invalid output in ${label}`, point, 'INVALID_OUTPUT', 'VALIDATION_ERROR', target);
      case 'MALFORMED_RESPONSE':
        return new InjectedError(`Simulated malformed response in ${label}`, point, 'MALFORMED_RESPONSE', 'VALIDATION_ERROR', target);
      case 'ERROR':
      default:
        return new InjectedError(`Simulated error in ${label}`, point, 'ERROR', 'PROVIDER_ERROR', target);
    }
  }
}

export function getFailureInjector(): FailureInjector {
  return FailureInjector.getInstance();
}
