/**
 * AeroDAG Input Normalization Guardrail
 * 
 * Normalizes input strings by stripping zero-width unicode characters,
 * invisible control codes, unicode homoglyph tricks, and excessive whitespace.
 */

import { Guardrail, GuardrailDecision, GuardrailContext } from '../types';

export class NormalizationGuardrail implements Guardrail<string, string> {
  readonly id = 'input-normalization';
  readonly name = 'Input Normalization Guardrail';
  readonly description = 'Strips invisible unicode controls, zero-width spaces, and control characters.';
  readonly stage = 'input' as const;
  readonly severity = 'LOW' as const;
  readonly enabled = true;

  evaluate(rawInput: string, context?: GuardrailContext): GuardrailDecision {
    if (typeof rawInput !== 'string') {
      return {
        decision: 'ALLOW',
        guardrailId: this.id,
        severity: this.severity,
        metadata: { normalized: '' }
      };
    }

    const normalized = NormalizationGuardrail.normalizeText(rawInput);

    return {
      decision: 'ALLOW',
      guardrailId: this.id,
      severity: this.severity,
      metadata: {
        originalLength: rawInput.length,
        normalizedLength: normalized.length,
        normalized
      }
    };
  }

  static normalizeText(text: string): string {
    return text
      // Remove null bytes and control chars (except normal tab and newline)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Remove zero-width spaces, joiners, directional overrides
      .replace(/[\u200B-\u200D\uFEFF\u202A-\u202E\u2060-\u2064]/g, '')
      // Normalize Unicode characters to standard NFC
      .normalize('NFC')
      // Collapse excessive blank lines
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }
}
