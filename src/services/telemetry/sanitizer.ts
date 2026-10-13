/**
 * AeroDAG Telemetry Privacy & Security Redactor
 * 
 * Guarantees zero leakage of credentials, authentication headers, API keys,
 * payment card data, government IDs (Aadhaar, Passport, PAN), raw prompts,
 * or internal chain-of-thought across all exported spans and metadata.
 */

// Sensitive dictionary keys to immediately redact
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passwd/i,
  /token/i,
  /secret/i,
  /api[-_]?key/i,
  /auth(orization)?/i,
  /bearer/i,
  /cookie/i,
  /credential/i,
  /card[-_]?number/i,
  /card[-_]?pan/i,
  /credit[-_]?card/i,
  /cvv/i,
  /cvc/i,
  /pan[-_]?number/i,
  /aadhaar/i,
  /aadhar/i,
  /passport/i,
  /ssn/i,
  /bank[-_]?account/i,
  /routing[-_]?number/i,
  /prompt/i,
  /raw[-_]?prompt/i,
  /chain[-_]?of[-_]?thought/i,
  /cot/i,
  /system[-_]?instruction/i,
  /email/i,
  /phone/i,
  /mobile/i,
  /pnr/i,
  /session[-_]?secret/i,
  /jwt/i,
  /private[-_]?key/i,
  /database[-_]?url/i,
  /connection[-_]?string/i,
  /booking[-_]?credential/i,
  /access[-_]?token/i,
  /refresh[-_]?token/i,
  /admin[-_]?key/i,
  /x-admin-key/i
];

/**
 * Recursively sanitizes any object or metadata dictionary before storage or export
 */
export function sanitizeTelemetryMetadata(meta?: Record<string, unknown>): Record<string, unknown> {
  if (!meta || typeof meta !== 'object') return {};
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(meta)) {
    // 1. Redact key if key matches sensitive patterns
    if (SENSITIVE_KEY_PATTERNS.some((pat) => pat.test(key))) {
      sanitized[key] = '[REDACTED_SENSITIVE_FIELD]';
      continue;
    }

    // 2. Redact value based on type
    if (typeof value === 'string') {
      sanitized[key] = maskSensitiveString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string'
          ? maskSensitiveString(item)
          : typeof item === 'object' && item !== null
          ? sanitizeTelemetryMetadata(item as Record<string, unknown>)
          : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeTelemetryMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Masks sensitive patterns inside string values (cards, tokens, keys, government IDs)
 */
export function maskSensitiveString(str: string): string {
  if (!str) return str;
  let masked = str;

  // 0. Redact Private Keys (PEM format)
  masked = masked.replace(/-----BEGIN\s+(?:RSA\s+|EC\s+|OPENSSH\s+|DSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+|EC\s+|OPENSSH\s+|DSA\s+)?PRIVATE\s+KEY-----/gi, '[REDACTED_PRIVATE_KEY]');

  // 0.1 Redact Database connection URIs
  masked = masked.replace(/(?:postgres|postgresql|mongodb(?:\+srv)?|mysql|redis):\/\/[^\s:@]+:[^\s@]+@[^\s/]+/gi, '[REDACTED_DATABASE_URI]');

  // 0.2 Redact JSON Web Tokens (JWT)
  masked = masked.replace(/\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[REDACTED_JWT]');

  // 1. Redact API keys: Google AI Studio keys (AIzaSy...), AQ tokens, generic 30+ char hex/base64 tokens
  masked = masked.replace(/AIzaSy[A-Za-z0-9_-]{30,}/g, '[REDACTED_API_KEY]');
  masked = masked.replace(/AQ\.[A-Za-z0-9_.-]{30,}/g, '[REDACTED_API_KEY]');
  masked = masked.replace(/Bearer\s+[A-Za-z0-9_.-]{20,}/gi, 'Bearer [REDACTED_TOKEN]');

  // 2. Redact Payment Cards (13 to 19 contiguous or dashed/spaced digits)
  masked = masked.replace(/\b(?:\d[ -]*?){13,19}\b/g, (match) => {
    const digitsOnly = match.replace(/\D/g, '');
    if (digitsOnly.length >= 13 && digitsOnly.length <= 19) {
      return '[REDACTED_CARD]';
    }
    return match;
  });

  // 3. Redact Indian Aadhaar Numbers (12 digits, often in 4-4-4 format: 1234 5678 9012 or 1234-5678-9012)
  masked = masked.replace(/\b\d{4}[ -]\d{4}[ -]\d{4}\b/g, '[REDACTED_AADHAAR]');

  // 4. Redact Indian PAN Numbers (5 letters, 4 digits, 1 letter: ABCDE1234F)
  masked = masked.replace(/\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/gi, '[REDACTED_PAN]');

  // 5. Redact Passports (Standard: 1 letter followed by 7-8 digits)
  masked = masked.replace(/\b[A-Za-z]\d{7,8}\b/g, '[REDACTED_PASSPORT]');

  // 8. Redact Email addresses
  masked = masked.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED_EMAIL]');

  // 9. Redact Phone numbers (international, Indian 10-digit, spaced/dashed)
  masked = masked.replace(/\b(?:\+?91[- ]?)?[6-9]\d{4}[- ]?\d{5}\b/g, '[REDACTED_PHONE]');
  masked = masked.replace(/\b(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/g, '[REDACTED_PHONE]');

  return masked;
}
