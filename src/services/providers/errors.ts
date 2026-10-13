/**
 * AeroDAG Provider-Neutral Error Taxonomy
 * 
 * Maps external vendor errors (Amadeus, Google Maps, Stripe, Gemini, etc.)
 * to domain-neutral provider errors integrated with Phase 7.2 ErrorCategory.
 * Ensures agents and business logic never depend on vendor-specific error types.
 */

import { ErrorCategory } from '../telemetry/types';

export class ProviderError extends Error {
  public readonly providerName: string;
  public readonly operation: string;
  public readonly category: ErrorCategory;
  public readonly rawError?: unknown;

  public get code(): ErrorCategory {
    return this.category;
  }

  constructor(
    message: string,
    providerName: string,
    operation: string,
    category: ErrorCategory = 'PROVIDER_ERROR',
    rawError?: unknown
  ) {
    super(`[${providerName}:${operation}] ${message}`);
    this.name = 'ProviderError';
    this.providerName = providerName;
    this.operation = operation;
    this.category = category;
    this.rawError = rawError;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor(providerName: string, operation: string, timeoutMs?: number, rawError?: unknown) {
    super(
      `Operation timed out${timeoutMs ? ` after ${timeoutMs}ms` : ''}`,
      providerName,
      operation,
      'TIMEOUT',
      rawError
    );
    this.name = 'ProviderTimeoutError';
  }
}

export class ProviderRateLimitError extends ProviderError {
  public readonly retryAfterSeconds?: number;

  constructor(providerName: string, operation: string, retryAfterSeconds?: number, rawError?: unknown) {
    super(
      `Rate limit exceeded${retryAfterSeconds ? `, retry after ${retryAfterSeconds}s` : ''}`,
      providerName,
      operation,
      'RATE_LIMIT',
      rawError
    );
    this.name = 'ProviderRateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class ProviderAuthenticationError extends ProviderError {
  constructor(providerName: string, operation: string, reason?: string, rawError?: unknown) {
    super(
      `Authentication / authorization failed: ${reason || 'invalid credentials'}`,
      providerName,
      operation,
      'AUTHORIZATION_ERROR',
      rawError
    );
    this.name = 'ProviderAuthenticationError';
  }
}

export class ProviderUnavailableError extends ProviderError {
  constructor(providerName: string, operation: string, reason?: string, rawError?: unknown) {
    super(
      `Provider service unavailable: ${reason || 'service unreachable or unhealthy'}`,
      providerName,
      operation,
      'PROVIDER_ERROR',
      rawError
    );
    this.name = 'ProviderUnavailableError';
  }
}

export class ProviderValidationError extends ProviderError {
  constructor(providerName: string, operation: string, reason: string, rawError?: unknown) {
    super(
      `Validation error: ${reason}`,
      providerName,
      operation,
      'VALIDATION_ERROR',
      rawError
    );
    this.name = 'ProviderValidationError';
  }
}

export class ProviderNotSupportedError extends ProviderError {
  public readonly missingCapability: string;

  constructor(providerName: string, operation: string, capability: string) {
    super(
      `Capability '${capability}' is not supported by provider '${providerName}'`,
      providerName,
      operation,
      'VALIDATION_ERROR'
    );
    this.name = 'ProviderNotSupportedError';
    this.missingCapability = capability;
  }
}

export class ProviderDataError extends ProviderError {
  constructor(providerName: string, operation: string, reason: string, rawError?: unknown) {
    super(
      `Malformed or unparseable provider response: ${reason}`,
      providerName,
      operation,
      'PROVIDER_ERROR',
      rawError
    );
    this.name = 'ProviderDataError';
  }
}

/**
 * Normalizes any external or unknown error into a structured ProviderError
 */
export function normalizeProviderError(
  err: unknown,
  providerName: string,
  operation: string
): ProviderError {
  if (err instanceof ProviderError) {
    return err;
  }

  const message = err instanceof Error ? err.message : String(err || '');
  const lower = message.toLowerCase();

  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('etimedout')) {
    return new ProviderTimeoutError(providerName, operation, undefined, err);
  }

  if (lower.includes('rate limit') || lower.includes('429') || lower.includes('too many requests')) {
    return new ProviderRateLimitError(providerName, operation, undefined, err);
  }

  if (
    lower.includes('unauthorized') ||
    lower.includes('forbidden') ||
    lower.includes('401') ||
    lower.includes('403') ||
    lower.includes('api key') ||
    lower.includes('invalid credential')
  ) {
    return new ProviderAuthenticationError(providerName, operation, message, err);
  }

  if (
    lower.includes('not supported') ||
    lower.includes('unsupported') ||
    lower.includes('capability')
  ) {
    return new ProviderNotSupportedError(providerName, operation, message);
  }

  if (
    lower.includes('invalid argument') ||
    lower.includes('validation') ||
    lower.includes('missing required')
  ) {
    return new ProviderValidationError(providerName, operation, message, err);
  }

  if (
    lower.includes('unavailable') ||
    lower.includes('503') ||
    lower.includes('502') ||
    lower.includes('bad gateway') ||
    lower.includes('service down') ||
    lower.includes('econnrefused')
  ) {
    return new ProviderUnavailableError(providerName, operation, message, err);
  }

  return new ProviderError(message || 'Unknown provider error', providerName, operation, 'PROVIDER_ERROR', err);
}
