/**
 * AeroDAG Prompt Injection Guardrail
 * 
 * First-generation hybrid detector combining normalized pattern checks,
 * suspicious instruction classification, and context-aware boundary enforcement.
 */

import { Guardrail, GuardrailDecision, GuardrailContext } from '../types';

export class PromptInjectionGuardrail implements Guardrail<string, void> {
  readonly id = 'prompt-injection-detector';
  readonly name = 'Prompt Injection Guardrail';
  readonly description = 'Detects instruction override, system prompt extraction, and permission bypass attempts.';
  readonly stage = 'input' as const;
  readonly severity = 'HIGH' as const;
  readonly enabled = true;

  public static readonly SAFE_BLOCKED_MESSAGE =
    "I can help with travel planning, but I can't follow instructions that attempt to override the system's safety or access controls.";

  // Pattern categories for transparent auditing
  private static readonly DIRECT_OVERRIDE_PATTERNS = [
    /\bignore\s+(?:all\s+)?(?:previous|prior|above|system)\s+instructions?\b/i,
    /\bdisregard\s+(?:all\s+)?(?:previous|prior|system)\s+(?:rules|instructions?|guidelines?)\b/i,
    /\bforget\s+(?:all\s+)?(?:previous|prior|system)\s+instructions?\b/i,
    /\breset\s+(?:all\s+)?(?:instructions?|prompts?|context)\b/i,
    /\bnew\s+(?:primary\s+)?directive\s*:/i,
    /\byou\s+are\s+now\s+(?:a\s+different|in\s+developer\s+mode|dan|an\s+unrestricted)\b/i,
    /\bstop\s+being\s+(?:a\s+travel\s+planner|an\s+ai\s+assistant)\b/i
  ];

  private static readonly SYSTEM_EXTRACTION_PATTERNS = [
    /\b(?:reveal|show|print|display|leak|output|dump)\s+(?:me\s+)?(?:your\s+)?(?:system\s+prompt|hidden\s+instructions?|initial\s+prompt|developer\s+instructions?)\b/i,
    /\bwhat\s+(?:is|are)\s+your\s+(?:hidden|system|secret)\s+(?:prompt|instructions?)\b/i,
    /\brepeat\s+(?:the\s+words\s+above|everything\s+above)\b/i,
    /\bprint\s+(?:your\s+)?instructions?\s+verbatim\b/i,
    /\b(?:reveal|show|print|display|leak|give\s+me)\b.*?\b(?:api[-_]?key|key|secret|password|credential)/i,
    /\b(?:reveal|show|print|display|leak)\s+(?:internal\s+)?(?:agent\s+)?(?:reasoning|chain[-_]?of[-_]?thought|cot|hidden\s+thoughts?)\b/i
  ];

  private static readonly PERMISSION_BYPASS_PATTERNS = [
    /\bbypass\s+(?:your\s+)?(?:restrictions?|guardrails?|safety|rules|filters?)\b/i,
    /\bignore\s+(?:all\s+)?(?:tool\s+)?(?:permissions?|restrictions?|policies)\b/i,
    /\b(?:call|execute|invoke|run)\s+(?:the\s+)?(?:createpayment|confirmpayment|executepayment|confirmbooking|refundpayment)\b/i,
    /\bexecute\s+this\s+arbitrary\s+(?:command|function|code)\b/i,
    /\boverride\s+(?:agent\s+)?permissions?\b/i,
    /\buse\s+(?:this\s+)?(?:travel\s+)?document\s+as\s+(?:system\s+)?instructions?\b/i,
    /\b(?:ignore\s+(?:safety\s+)?rules?\s+and\s+)?(?:confirm\s+my\s+booking|mark\s+my\s+flight\s+as\s+confirmed|say\s+(?:my\s+)?booking\s+is\s+confirmed)\b/i,
    /\bfalsely\s+confirm\s+(?:the\s+)?booking\b/i
  ];

  private static readonly SYSTEM_IMPERSONATION_PATTERNS = [
    /<\s*system\s*>/i,
    /<\s*\/\s*system\s*>/i,
    /\[\s*system\s*\]/i,
    /\[\s*developer\s*\]/i,
    /\b(?:role|sender)\s*:\s*(?:system|developer|admin)\b/i,
    /\bdeveloper\s+mode\s*:\s*(?:enabled|active|on)\b/i,
    /###\s*system\s+directive\b/i
  ];

  evaluate(input: string, context?: GuardrailContext): GuardrailDecision {
    if (typeof input !== 'string' || !input.trim()) {
      return {
        decision: 'ALLOW',
        guardrailId: this.id,
        severity: 'LOW'
      };
    }

    const normalized = input.toLowerCase().replace(/\s+/g, ' ');

    // 1. Direct Instruction Override Check
    for (const pat of PromptInjectionGuardrail.DIRECT_OVERRIDE_PATTERNS) {
      if (pat.test(normalized)) {
        return {
          decision: 'BLOCK',
          guardrailId: this.id,
          severity: 'HIGH',
          reason: 'Attempted instruction override or persona hijacking.',
          safeMessage: PromptInjectionGuardrail.SAFE_BLOCKED_MESSAGE,
          metadata: { patternMatched: pat.source }
        };
      }
    }

    // 2. System Prompt Extraction Check
    for (const pat of PromptInjectionGuardrail.SYSTEM_EXTRACTION_PATTERNS) {
      if (pat.test(normalized)) {
        return {
          decision: 'BLOCK',
          guardrailId: this.id,
          severity: 'HIGH',
          reason: 'Attempted extraction of system prompt or internal instructions.',
          safeMessage: PromptInjectionGuardrail.SAFE_BLOCKED_MESSAGE,
          metadata: { patternMatched: pat.source }
        };
      }
    }

    // 3. Permission Bypass Check
    for (const pat of PromptInjectionGuardrail.PERMISSION_BYPASS_PATTERNS) {
      if (pat.test(normalized)) {
        return {
          decision: 'BLOCK',
          guardrailId: this.id,
          severity: 'CRITICAL',
          reason: 'Attempted override of tool permissions or invocation of forbidden operations.',
          safeMessage: PromptInjectionGuardrail.SAFE_BLOCKED_MESSAGE,
          metadata: { patternMatched: pat.source }
        };
      }
    }

    // 4. System Message Impersonation Check
    for (const pat of PromptInjectionGuardrail.SYSTEM_IMPERSONATION_PATTERNS) {
      if (pat.test(normalized)) {
        return {
          decision: 'BLOCK',
          guardrailId: this.id,
          severity: 'HIGH',
          reason: 'Attempted impersonation of system message or developer context.',
          safeMessage: PromptInjectionGuardrail.SAFE_BLOCKED_MESSAGE,
          metadata: { patternMatched: pat.source }
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
