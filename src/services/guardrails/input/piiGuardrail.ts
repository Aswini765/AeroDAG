/**
 * AeroDAG PII Detection & Privacy Guardrail
 * 
 * Detects, redacts, and prevents sensitive personal and financial data
 * (passports, cards, bank accounts, national IDs) from entering logs or AI prompts.
 * Designed with a replaceable PIIDetector interface for future Presidio integration.
 */

import { Guardrail, GuardrailDecision, GuardrailContext } from '../types';

export type PIIType =
  | 'PASSPORT'
  | 'CREDIT_CARD'
  | 'EMAIL'
  | 'PHONE'
  | 'AADHAAR'
  | 'PAN_CARD'
  | 'BANK_ACCOUNT';

export interface PIIFinding {
  type: PIIType;
  matchedText: string;
  startIndex: number;
  endIndex: number;
  redactedPlaceholder: string;
}

export interface PIIDetector {
  detect(text: string): PIIFinding[];
  redact(text: string): string;
}

export class RegexPIIDetector implements PIIDetector {
  // Regex definitions
  private static readonly EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g;
  private static readonly PHONE_REGEX = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  // Passport format: 1 letter followed by 7-8 digits (including Indian Z-series and global standards)
  private static readonly PASSPORT_REGEX = /\b[A-Za-z]\d{7,8}\b/g;
  // Indian Aadhaar format: 12 digits (with optional spaces)
  private static readonly AADHAAR_REGEX = /\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b/g;
  // Indian PAN format: 5 letters, 4 digits, 1 letter
  private static readonly PAN_REGEX = /\b[A-Z]{5}\d{4}[A-Z]\b/gi;
  // Credit/Debit Cards: 13-19 digits with separators
  private static readonly CARD_REGEX = /\b(?:\d{4}[- ]?){3}\d{4}\b|\b\d{15,16}\b/g;
  // Bank Account numbers: 9 to 18 digits explicitly prefaced by account/a/c
  private static readonly BANK_ACCOUNT_REGEX = /\b(?:a\/c|account\s*(?:no|number)?)\s*[:#-]?\s*\d{9,18}\b/gi;

  detect(text: string): PIIFinding[] {
    const findings: PIIFinding[] = [];

    // Helper matcher
    const matchPattern = (regex: RegExp, type: PIIType, placeholder: string) => {
      let match: RegExpExecArray | null;
      const re = new RegExp(regex.source, regex.flags);
      while ((match = re.exec(text)) !== null) {
        findings.push({
          type,
          matchedText: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          redactedPlaceholder: placeholder
        });
      }
    };

    matchPattern(RegexPIIDetector.CARD_REGEX, 'CREDIT_CARD', '[REDACTED_CARD]');
    matchPattern(RegexPIIDetector.PASSPORT_REGEX, 'PASSPORT', '[REDACTED_PASSPORT]');
    matchPattern(RegexPIIDetector.AADHAAR_REGEX, 'AADHAAR', '[REDACTED_AADHAAR]');
    matchPattern(RegexPIIDetector.PAN_REGEX, 'PAN_CARD', '[REDACTED_PAN]');
    matchPattern(RegexPIIDetector.BANK_ACCOUNT_REGEX, 'BANK_ACCOUNT', '[REDACTED_BANK_ACCOUNT]');
    matchPattern(RegexPIIDetector.EMAIL_REGEX, 'EMAIL', '[REDACTED_EMAIL]');
    matchPattern(RegexPIIDetector.PHONE_REGEX, 'PHONE', '[REDACTED_PHONE]');

    return findings;
  }

  redact(text: string): string {
    let result = text;
    result = result.replace(new RegExp(RegexPIIDetector.CARD_REGEX.source, 'gi'), '[REDACTED_CARD]');
    result = result.replace(new RegExp(RegexPIIDetector.PASSPORT_REGEX.source, 'gi'), '[REDACTED_PASSPORT]');
    result = result.replace(new RegExp(RegexPIIDetector.AADHAAR_REGEX.source, 'gi'), '[REDACTED_AADHAAR]');
    result = result.replace(new RegExp(RegexPIIDetector.PAN_REGEX.source, 'gi'), '[REDACTED_PAN]');
    result = result.replace(new RegExp(RegexPIIDetector.BANK_ACCOUNT_REGEX.source, 'gi'), '[REDACTED_BANK_ACCOUNT]');
    result = result.replace(new RegExp(RegexPIIDetector.EMAIL_REGEX.source, 'gi'), '[REDACTED_EMAIL]');
    result = result.replace(new RegExp(RegexPIIDetector.PHONE_REGEX.source, 'gi'), '[REDACTED_PHONE]');
    return result;
  }
}

export class PIIGuardrail implements Guardrail<string, { redactedText: string; findings: PIIFinding[] }> {
  readonly id = 'pii-detection-guardrail';
  readonly name = 'PII Protection Guardrail';
  readonly description = 'Detects, redacts, and shields sensitive PII and financial credentials.';
  readonly stage = 'input' as const;
  readonly severity = 'MEDIUM' as const;
  readonly enabled = true;

  private detector: PIIDetector = new RegexPIIDetector();

  evaluate(input: string, context?: GuardrailContext): GuardrailDecision {
    if (typeof input !== 'string' || !input.trim()) {
      return {
        decision: 'ALLOW',
        guardrailId: this.id,
        severity: 'LOW'
      };
    }

    const findings = this.detector.detect(input);

    if (findings.length === 0) {
      return {
        decision: 'ALLOW',
        guardrailId: this.id,
        severity: 'LOW',
        metadata: { piiDetected: false, redactedText: input }
      };
    }

    const redacted = this.detector.redact(input);
    const criticalTypes: PIIType[] = ['CREDIT_CARD', 'BANK_ACCOUNT'];
    const hasCriticalFinancial = findings.some((f) => criticalTypes.includes(f.type));

    // Credit cards are strictly blocked from LLM processing
    if (hasCriticalFinancial) {
      return {
        decision: 'BLOCK',
        guardrailId: this.id,
        severity: 'CRITICAL',
        reason: 'Payment card or bank account credentials detected in request.',
        safeMessage: 'For your security, please do not share payment card numbers or bank credentials in travel requests.',
        metadata: {
          piiDetected: true,
          types: findings.map((f) => f.type),
          redactedText: redacted
        }
      };
    }

    // Passports/IDs/emails are redacted and allowed through safely
    return {
      decision: 'WARN',
      guardrailId: this.id,
      severity: 'MEDIUM',
      reason: 'Non-financial PII detected and redacted before processing.',
      metadata: {
        piiDetected: true,
        types: findings.map((f) => f.type),
        redactedText: redacted
      }
    };
  }

  getRedactedText(input: string): string {
    return this.detector.redact(input);
  }

  detectFindings(input: string): PIIFinding[] {
    return this.detector.detect(input);
  }
}
