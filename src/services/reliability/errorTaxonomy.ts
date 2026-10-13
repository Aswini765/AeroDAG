/**
 * AeroDAG Error Taxonomy & Retryability Classification
 * 
 * Provides deterministic error classification into RETRYABLE and NON-RETRYABLE
 * categories, enforcing bounded retries and preventing infinite retry loops.
 */

import { ErrorCategory } from '../telemetry/types';
import { ErrorClassification, ReliabilityRetryPolicy } from './types';

export const RETRYABLE_CATEGORIES: readonly ErrorCategory[] = [
  'TIMEOUT',
  'RATE_LIMIT',
  'QUOTA_EXHAUSTED',
  'PROVIDER_ERROR'
] as const;

export const NON_RETRYABLE_CATEGORIES: readonly ErrorCategory[] = [
  'VALIDATION_ERROR',
  'AUTHORIZATION_ERROR',
  'GUARDRAIL_BLOCK',
  'BOOKING_ERROR',
  'PAYMENT_ERROR',
  'INTERNAL_ERROR',
  'RAG_ERROR',
  'LLM_ERROR',
  'TOOL_ERROR',
  'UNKNOWN_ERROR'
] as const;

export const DEFAULT_RELIABILITY_RETRY_POLICY: ReliabilityRetryPolicy = {
  maxRetries: 2,
  backoffMs: 50,
  maxBackoffMs: 500,
  retryableCategories: RETRYABLE_CATEGORIES
};

export class ErrorTaxonomy {
  /**
   * Classifies an arbitrary error into a deterministic category, retryability, and severity
   */
  static classify(error: unknown): ErrorClassification {
    const message = error instanceof Error ? error.message : String(error || '');
    const lower = message.toLowerCase();

    // 0. Duck-typed InjectedError or explicit ErrorCategory carrier
    if (error && typeof error === 'object' && 'category' in error) {
      const cat = (error as any).category as ErrorCategory;
      if (RETRYABLE_CATEGORIES.includes(cat)) {
        return {
          category: cat,
          isRetryable: true,
          severity: cat === 'TIMEOUT' ? 'MEDIUM' : 'HIGH',
          reason: message || `Retryable error in ${cat}`
        };
      }
      if (NON_RETRYABLE_CATEGORIES.includes(cat)) {
        return {
          category: cat,
          isRetryable: false,
          severity: 'HIGH',
          reason: message || `Non-retryable error in ${cat}`
        };
      }
    }

    // 1. Timeouts (Retryable)
    if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('etimedout')) {
      return {
        category: 'TIMEOUT',
        isRetryable: true,
        severity: 'MEDIUM',
        reason: 'Operation exceeded maximum latency deadline.'
      };
    }

    // 2. Rate Limits & 429 Quotas (Retryable with backoff)
    if (lower.includes('rate limit') || lower.includes('429') || lower.includes('too many requests')) {
      return {
        category: 'RATE_LIMIT',
        isRetryable: true,
        severity: 'MEDIUM',
        reason: 'Provider rate limit encountered.'
      };
    }

    if (lower.includes('quota') || lower.includes('resource_exhausted')) {
      return {
        category: 'QUOTA_EXHAUSTED',
        isRetryable: true,
        severity: 'HIGH',
        reason: 'API quota exhausted or throttling active.'
      };
    }

    // 3. Transient Provider / Network Unavailability (Retryable)
    if (
      lower.includes('unavailable') ||
      lower.includes('service unavailable') ||
      lower.includes('503') ||
      lower.includes('502') ||
      lower.includes('econnreset') ||
      lower.includes('econnrefused')
    ) {
      return {
        category: 'PROVIDER_ERROR',
        isRetryable: true,
        severity: 'HIGH',
        reason: 'Upstream provider or network temporarily unavailable.'
      };
    }

    // 4. Authorization / Permission Denied (Non-Retryable)
    if (
      (error instanceof Error && (error.name === 'AuthorizationError' || error.name === 'ToolPermissionError')) ||
      lower.includes('authorization') ||
      lower.includes('unauthorized') ||
      lower.includes('permission denied') ||
      lower.includes('forbidden') ||
      lower.includes('not allowed') ||
      lower.includes('toolpermissionerror')
    ) {
      return {
        category: 'AUTHORIZATION_ERROR',
        isRetryable: false,
        severity: 'CRITICAL',
        reason: 'Caller lacks permission to invoke requested resource.'
      };
    }

    // 5. Schema Validation & Input Errors (Non-Retryable)
    if (
      lower.includes('validation') ||
      lower.includes('invalid argument') ||
      lower.includes('invalid schema') ||
      lower.includes('toolvalidationerror') ||
      lower.includes('malformed')
    ) {
      return {
        category: 'VALIDATION_ERROR',
        isRetryable: false,
        severity: 'MEDIUM',
        reason: 'Input or output data failed strict schema verification.'
      };
    }

    // 6. Safety & Guardrail Blocks (Non-Retryable)
    if (
      lower.includes('guardrail') ||
      lower.includes('injection') ||
      lower.includes('blocked') ||
      lower.includes('pii detected') ||
      lower.includes('safety')
    ) {
      return {
        category: 'GUARDRAIL_BLOCK',
        isRetryable: false,
        severity: 'CRITICAL',
        reason: 'Deterministic safety policy blocked execution.'
      };
    }

    // 7. Payment Errors (Non-Retryable without user intervention)
    if (
      lower.includes('payment declined') ||
      lower.includes('insufficient funds') ||
      lower.includes('expired card') ||
      lower.includes('invalid card')
    ) {
      return {
        category: 'PAYMENT_ERROR',
        isRetryable: false,
        severity: 'CRITICAL',
        reason: 'Payment transaction failed authorization.'
      };
    }

    // 8. Booking State Conflicts (Non-Retryable)
    if (
      lower.includes('booking state') ||
      lower.includes('already booked') ||
      lower.includes('inventory expired') ||
      lower.includes('duplicate booking')
    ) {
      return {
        category: 'BOOKING_ERROR',
        isRetryable: false,
        severity: 'HIGH',
        reason: 'Booking state transition conflict.'
      };
    }

    // 9. RAG Failures (Non-Retryable when knowledge is ungrounded)
    if (lower.includes('rag') || lower.includes('retrieval') || lower.includes('ungrounded')) {
      return {
        category: 'RAG_ERROR',
        isRetryable: false,
        severity: 'MEDIUM',
        reason: 'Knowledge retrieval or grounding validation failed.'
      };
    }

    // Default Unknown Error
    return {
      category: 'UNKNOWN_ERROR',
      isRetryable: false,
      severity: 'HIGH',
      reason: message || 'Unclassified error encountered.'
    };
  }

  /**
   * Deterministically determines if an error should trigger a bounded retry
   */
  static isRetryable(error: unknown, policy: ReliabilityRetryPolicy = DEFAULT_RELIABILITY_RETRY_POLICY): boolean {
    const classification = this.classify(error);
    return classification.isRetryable && policy.retryableCategories.includes(classification.category);
  }
}
