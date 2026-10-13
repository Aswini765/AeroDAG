/**
 * AeroDAG Abuse & Malicious Payload Guardrail
 * 
 * Detects shell command injection sequences, SQL/code payloads,
 * and hazardous script invocations.
 */

import { Guardrail, GuardrailDecision, GuardrailContext } from '../types';

export class AbuseGuardrail implements Guardrail<string, void> {
  readonly id = 'abuse-malicious-payload';
  readonly name = 'Abuse & Malicious Payload Guardrail';
  readonly description = 'Blocks command injection sequences, SQL execution, and hazardous script patterns.';
  readonly stage = 'input' as const;
  readonly severity = 'HIGH' as const;
  readonly enabled = true;

  private static readonly MALICIOUS_PATTERNS = [
    /\b(?:rm\s+-rf|chmod\s+777|chown\s+root)\b/i,
    /\b(?:curl|wget)\s+https?:\/\/.*\|\s*(?:ba)?sh\b/i,
    /\b(?:drop\s+table|truncate\s+table|alter\s+user|select\s+\*\s+from\s+users)\b/i,
    /<script\b[^>]*>([\s\S]*?)<\/script>/i,
    /javascript\s*:\s*alert\s*\(/i,
    /\b(?:eval\s*\(|exec\s*\(|child_process|system\s*\()\b/i
  ];

  evaluate(input: string, context?: GuardrailContext): GuardrailDecision {
    if (typeof input !== 'string') {
      return { decision: 'ALLOW', guardrailId: this.id, severity: 'LOW' };
    }

    for (const pat of AbuseGuardrail.MALICIOUS_PATTERNS) {
      if (pat.test(input)) {
        return {
          decision: 'BLOCK',
          guardrailId: this.id,
          severity: 'HIGH',
          reason: 'Harmful script, SQL injection, or command execution sequence detected.',
          safeMessage: "I can help with travel planning, but I cannot process system command sequences or unsupported script inputs.",
          metadata: { pattern: pat.source }
        };
      }
    }

    return {
      decision: 'ALLOW',
      guardrailId: this.id,
      severity: 'LOW'
    };
  }
}
