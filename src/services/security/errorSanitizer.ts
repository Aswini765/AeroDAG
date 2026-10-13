/**
 * AeroDAG Error Security & Safe Consumer Response Sanitizer
 * 
 * Prevents information disclosure via error messages, stack traces, file paths,
 * provider credentials, or SQL queries.
 */

import { SecretScanner } from './secretScanner';

export interface SafeConsumerErrorResponse {
  error: string;
  code: string;
  requestId?: string;
}

export class ErrorSanitizer {
  /**
   * Translates arbitrary internal errors or exceptions into safe consumer-facing payloads.
   * NEVER leaks stack traces, file paths, internal prompts, or secrets to client.
   */
  static sanitizeForConsumer(err: unknown, requestId?: string): SafeConsumerErrorResponse {
    const rawMsg = err instanceof Error ? err.message : String(err || 'Unknown error');
    const lower = rawMsg.toLowerCase();

    // 1. Rate Limit
    if (lower.includes('rate limit') || lower.includes('429') || lower.includes('too many requests')) {
      return {
        error: 'Too many requests. Please wait a moment before trying again.',
        code: 'RATE_LIMIT_EXCEEDED',
        requestId
      };
    }

    // 2. Timeout
    if (lower.includes('timeout') || lower.includes('timed out')) {
      return {
        error: 'The request took too long to complete. Please try again.',
        code: 'REQUEST_TIMEOUT',
        requestId
      };
    }

    // 3. Unauthorized / Session Expired
    if (lower.includes('session expired') || lower.includes('unauthenticated') || lower.includes('missing authentication')) {
      return {
        error: 'Authentication is required or your session has expired. Please log in.',
        code: 'UNAUTHENTICATED',
        requestId
      };
    }

    // 4. Forbidden / Authorization
    if (lower.includes('forbidden') || lower.includes('authorization denied') || lower.includes('permission denied')) {
      return {
        error: 'You do not have permission to access this resource.',
        code: 'FORBIDDEN',
        requestId
      };
    }

    // 5. Validation / Input formatting
    if (lower.includes('validation failure') || lower.includes('invalid parameter') || lower.includes('schema validation failed')) {
      return {
        error: 'The submitted travel information is invalid. Please review your input.',
        code: 'INVALID_INPUT',
        requestId
      };
    }

    // 6. Guardrail block
    if (lower.includes('guardrail') || lower.includes('safety') || lower.includes('instruction override')) {
      return {
        error: "I can help with travel planning, but I can't process requests that violate safety controls.",
        code: 'SAFETY_POLICY_VIOLATION',
        requestId
      };
    }

    // 7. Generic Fallback (Safe and non-leaking)
    return {
      error: 'Travel planning service is temporarily unavailable. Please try again later.',
      code: 'SERVICE_ERROR',
      requestId
    };
  }

  /**
   * Sanitizes diagnostic error message for internal logging, stripping sensitive secrets.
   */
  static sanitizeForInternalLog(err: unknown): string {
    const rawMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return SecretScanner.redact(rawMsg);
  }
}
