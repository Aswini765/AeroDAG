/**
 * AeroDAG Oversized Input Guardrail
 * 
 * Prevents context exhaustion attacks and Denial of Service by enforcing
 * strict character length boundaries on user inputs.
 */

import { Guardrail, GuardrailDecision, GuardrailContext } from '../types';

export class OversizedInputGuardrail implements Guardrail<string, void> {
  readonly id = 'oversized-input-guardrail';
  readonly name = 'Oversized Input Guardrail';
  readonly description = 'Guards against context exhaustion by enforcing maximum message lengths.';
  readonly stage = 'input' as const;
  readonly severity = 'MEDIUM' as const;
  readonly enabled = true;

  public static readonly MAX_ALLOWED_CHARACTERS = 4000;

  evaluate(input: string, context?: GuardrailContext): GuardrailDecision {
    if (typeof input !== 'string') {
      return { decision: 'ALLOW', guardrailId: this.id, severity: 'LOW' };
    }

    if (input.length > OversizedInputGuardrail.MAX_ALLOWED_CHARACTERS) {
      return {
        decision: 'BLOCK',
        guardrailId: this.id,
        severity: 'MEDIUM',
        reason: `Message length (${input.length} chars) exceeds the safe limit of ${OversizedInputGuardrail.MAX_ALLOWED_CHARACTERS} characters.`,
        safeMessage: `Your message is too long (exceeds ${OversizedInputGuardrail.MAX_ALLOWED_CHARACTERS} characters). Please shorten your request.`,
        metadata: {
          characterCount: input.length,
          limit: OversizedInputGuardrail.MAX_ALLOWED_CHARACTERS
        }
      };
    }

    return {
      decision: 'ALLOW',
      guardrailId: this.id,
      severity: 'LOW',
      metadata: { characterCount: input.length }
    };
  }
}
