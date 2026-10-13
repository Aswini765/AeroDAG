/**
 * AeroDAG Guardrail Observability & Safe Telemetry
 * 
 * Records structured guardrail events while strictly sanitizing and redacting
 * all sensitive information (PII, cards, passport numbers, API keys, secrets).
 */

import { GuardrailEvent } from './types';
import { getTelemetryMetricsCollector } from '../telemetry';

export class GuardrailTelemetry {
  private static events: GuardrailEvent[] = [];
  private static readonly MAX_EVENTS = 1000;

  /**
   * Records a guardrail event with strict privacy guarantees
   */
  static record(event: GuardrailEvent): void {
    const sanitizedMetadata = this.sanitizeMetadata(event.safeMetadata);

    const safeEvent: GuardrailEvent = {
      ...event,
      safeMetadata: sanitizedMetadata
    };

    this.events.push(safeEvent);
    if (this.events.length > this.MAX_EVENTS) {
      this.events.shift();
    }

    if (safeEvent.decision === 'BLOCK') {
      try {
        getTelemetryMetricsCollector().recordGuardrailBlock();
      } catch {
        // Safe fallback if metrics collector not ready
      }
    }
  }

  /**
   * Returns recent recorded events
   */
  static getEvents(): GuardrailEvent[] {
    return [...this.events];
  }

  /**
   * Clear all recorded events (useful for test resets)
   */
  static clear(): void {
    this.events = [];
  }

  /**
   * Strict recursive metadata sanitizer removing any sensitive keys or patterns
   */
  private static sanitizeMetadata(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!meta) return undefined;
    const sanitized: Record<string, unknown> = {};

    const SENSITIVE_KEY_PATTERNS = [
      /password/i,
      /token/i,
      /secret/i,
      /key/i,
      /card/i,
      /cvv/i,
      /pan/i,
      /aadhaar/i,
      /passport/i,
      /ssn/i,
      /credential/i,
      /prompt/i
    ];

    for (const [key, value] of Object.entries(meta)) {
      if (SENSITIVE_KEY_PATTERNS.some((pat) => pat.test(key))) {
        sanitized[key] = '[REDACTED_SENSITIVE_FIELD]';
        continue;
      }

      if (typeof value === 'string') {
        // Redact potential card / passport / phone patterns in string values
        sanitized[key] = this.maskSensitiveString(value);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeMetadata(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private static maskSensitiveString(str: string): string {
    // Mask potential credit cards (13-19 digits)
    let masked = str.replace(/\b(?:\d[ -]*?){13,19}\b/g, '[REDACTED_CARD]');
    // Mask potential passport numbers (1 letter + 7-8 digits)
    masked = masked.replace(/\b[A-Za-z]\d{7,8}\b/g, '[REDACTED_PASSPORT]');
    // Mask phone numbers (10-12 digits)
    masked = masked.replace(/\b(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/g, '[REDACTED_PHONE]');
    // Mask email addresses
    masked = masked.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,7}\b/g, '[REDACTED_EMAIL]');
    return masked;
  }
}
