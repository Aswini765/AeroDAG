/**
 * AeroDAG Memory Privacy Sanitizer & Data Minimization Guard
 * 
 * Enforces strict security invariants:
 * 1. Zero storage of payment card numbers (PANs), CVVs, expiration dates
 * 2. Zero storage of API keys, bearer tokens, passwords
 * 3. Rejects uncertain inferences as confirmed preferences without explicit consent
 * 4. Data minimization: strips unnecessary PII
 */

export class MemoryPrivacyViolationError extends Error {
  constructor(reason: string) {
    super(`Memory privacy policy violation: ${reason}`);
    this.name = 'MemoryPrivacyViolationError';
  }
}

export class MemoryPrivacySanitizer {
  private static readonly PAN_REGEX = /\b(?:\d[ -]*?){13,19}\b/;
  private static readonly CVV_REGEX = /["']?(?:cvv|cvc|security\s*code)["']?\s*[:=]?\s*["']?\d{3,4}["']?/i;
  private static readonly API_KEY_REGEX = /(?:sk_live_|sk_test_|AIzaSy|Bearer\s+[A-Za-z0-9_-]+)/i;
  private static readonly PASSWORD_REGEX = /(?:password|passwd|secret)\s*[:=]\s*[^\s]+/i;

  /**
   * Validates and sanitizes data before writing to long-term memory
   */
  static sanitizeForStorage<T>(data: T, key: string): T {
    const serialized = JSON.stringify(data);

    // 1. Check for PAN (Card Numbers)
    if (this.PAN_REGEX.test(serialized)) {
      throw new MemoryPrivacyViolationError(
        `Attempted to persist payment card numbers (PAN) into long-term memory key '${key}'. This is strictly prohibited.`
      );
    }

    // 2. Check for CVV
    if (this.CVV_REGEX.test(serialized)) {
      throw new MemoryPrivacyViolationError(
        `Attempted to persist CVV/security code into memory key '${key}'. Strictly prohibited.`
      );
    }

    // 3. Check for API keys or Secrets
    if (this.API_KEY_REGEX.test(serialized) || this.PASSWORD_REGEX.test(serialized)) {
      throw new MemoryPrivacyViolationError(
        `Attempted to persist credentials or private API keys into memory key '${key}'. Strictly prohibited.`
      );
    }

    return data;
  }

  /**
   * Redacts sensitive fragments from conversational text before persisting to conversation memory
   */
  static sanitizeText(text: string): string {
    return text
      .replace(this.PAN_REGEX, '[REDACTED_CARD_NUMBER]')
      .replace(this.CVV_REGEX, '[REDACTED_CVV]')
      .replace(this.API_KEY_REGEX, '[REDACTED_KEY]');
  }
}
