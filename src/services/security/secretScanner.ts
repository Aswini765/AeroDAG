/**
 * AeroDAG Deterministic Secret Scanner & Redactor
 * 
 * Scans source text, runtime payloads, logs, and error messages for sensitive credentials.
 * NEVER prints or leaks detected secret values in scan reports.
 * Returns safe metadata and status 'SECRET_DETECTED'.
 */

export type SecretType =
  | 'API_KEY'
  | 'BEARER_TOKEN'
  | 'JWT'
  | 'PRIVATE_KEY'
  | 'PASSWORD'
  | 'CONNECTION_STRING'
  | 'CLOUD_CREDENTIAL'
  | 'PAYMENT_SECRET';

export interface SecretFinding {
  type: SecretType;
  patternName: string;
  lineIndex?: number;
  safePreview: string; // Guaranteed safe descriptor - NEVER the secret value!
}

export interface SecretScanResult {
  hasSecret: boolean;
  status: 'CLEAN' | 'SECRET_DETECTED';
  findings: SecretFinding[];
}

interface SecretPatternDefinition {
  type: SecretType;
  patternName: string;
  regex: RegExp;
  redactedPlaceholder: string;
}

export class SecretScanner {
  private static readonly PATTERNS: SecretPatternDefinition[] = [
    // 1. Private Keys
    {
      type: 'PRIVATE_KEY',
      patternName: 'PEM_PRIVATE_KEY',
      regex: /-----BEGIN\s+(?:RSA\s+|EC\s+|OPENSSH\s+|DSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+|EC\s+|OPENSSH\s+|DSA\s+)?PRIVATE\s+KEY-----/gi,
      redactedPlaceholder: '[REDACTED_PRIVATE_KEY]'
    },
    // 2. Google AI Studio API Keys
    {
      type: 'API_KEY',
      patternName: 'GOOGLE_AI_API_KEY',
      regex: /AIzaSy[A-Za-z0-9_-]{30,}/g,
      redactedPlaceholder: '[REDACTED_API_KEY]'
    },
    // 3. OpenAI / Anthropic / Stripe API Keys
    {
      type: 'API_KEY',
      patternName: 'STRIPE_OR_AI_API_KEY',
      regex: /(?:sk_(?:live|test)_[0-9a-zA-Z]{24,}|sk-ant-[a-zA-Z0-9_-]{30,}|sk-proj-[a-zA-Z0-9_-]{20,})/g,
      redactedPlaceholder: '[REDACTED_API_KEY]'
    },
    // 4. JSON Web Tokens (JWT)
    {
      type: 'JWT',
      patternName: 'JSON_WEB_TOKEN',
      regex: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
      redactedPlaceholder: '[REDACTED_JWT]'
    },
    // 5. Bearer Tokens
    {
      type: 'BEARER_TOKEN',
      patternName: 'BEARER_AUTHORIZATION_TOKEN',
      regex: /Bearer\s+[A-Za-z0-9_.-]{20,}/gi,
      redactedPlaceholder: 'Bearer [REDACTED_TOKEN]'
    },
    // 6. Database Connection Strings (Postgres, Mongo, MySQL, Redis with credentials)
    {
      type: 'CONNECTION_STRING',
      patternName: 'DATABASE_CONNECTION_URI',
      regex: /(?:postgres|postgresql|mongodb(?:\+srv)?|mysql|redis):\/\/[^\s:@]+:[^\s@]+@[^\s/]+/gi,
      redactedPlaceholder: '[REDACTED_DATABASE_URI]'
    },
    // 7. Cloud Credentials (AWS Access Key ID)
    {
      type: 'CLOUD_CREDENTIAL',
      patternName: 'AWS_ACCESS_KEY',
      regex: /\bAKIA[0-9A-Z]{16}\b/g,
      redactedPlaceholder: '[REDACTED_CLOUD_CREDENTIAL]'
    },
    // 8. Hardcoded Passwords in config/assignments
    {
      type: 'PASSWORD',
      patternName: 'CONFIG_PASSWORD_ASSIGNMENT',
      regex: /(?:password|passwd|pwd)\s*[:=]\s*['"]([^'"]{6,})['"]/gi,
      redactedPlaceholder: 'password: "[REDACTED_PASSWORD]"'
    },
    // 9. Payment Card Numbers (13-19 digits)
    {
      type: 'PAYMENT_SECRET',
      patternName: 'CREDIT_CARD_NUMBER',
      regex: /\b(?:\d[ -]*?){13,19}\b/g,
      redactedPlaceholder: '[REDACTED_CARD]'
    },
    // 10. Card CVV / CVC
    {
      type: 'PAYMENT_SECRET',
      patternName: 'CARD_SECURITY_CODE',
      regex: /\b(?:cvv|cvc)\s*[:=]\s*\d{3,4}\b/gi,
      redactedPlaceholder: 'cvv: [REDACTED_CVV]'
    }
  ];

  /**
   * Deterministically scans content for credentials without printing or leaking secret values.
   */
  static scan(content: string): SecretScanResult {
    if (!content || typeof content !== 'string') {
      return { hasSecret: false, status: 'CLEAN', findings: [] };
    }

    const findings: SecretFinding[] = [];

    for (const def of this.PATTERNS) {
      const regex = new RegExp(def.regex.source, def.regex.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(content)) !== null) {
        // Special check for card numbers: must contain 13-19 digits
        if (def.patternName === 'CREDIT_CARD_NUMBER') {
          const digitsOnly = match[0].replace(/\D/g, '');
          if (digitsOnly.length < 13 || digitsOnly.length > 19) {
            continue;
          }
        }

        const matchLength = match[0].length;
        findings.push({
          type: def.type,
          patternName: def.patternName,
          safePreview: `${def.redactedPlaceholder} (detected length: ${matchLength})`
        });
      }
    }

    return {
      hasSecret: findings.length > 0,
      status: findings.length > 0 ? 'SECRET_DETECTED' : 'CLEAN',
      findings
    };
  }

  /**
   * Redacts all sensitive credentials in string content with safe placeholders.
   */
  static redact(content: string): string {
    if (!content || typeof content !== 'string') return content;
    let redacted = content;

    for (const def of this.PATTERNS) {
      if (def.patternName === 'CREDIT_CARD_NUMBER') {
        redacted = redacted.replace(def.regex, (match) => {
          const digitsOnly = match.replace(/\D/g, '');
          if (digitsOnly.length >= 13 && digitsOnly.length <= 19) {
            return def.redactedPlaceholder;
          }
          return match;
        });
      } else if (def.patternName === 'CONFIG_PASSWORD_ASSIGNMENT') {
        redacted = redacted.replace(def.regex, def.redactedPlaceholder);
      } else {
        redacted = redacted.replace(def.regex, def.redactedPlaceholder);
      }
    }

    return redacted;
  }
}
