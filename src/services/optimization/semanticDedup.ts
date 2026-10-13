/**
 * AeroDAG Semantic Deduplication & Deterministic Fast-Path Optimizer
 * 
 * Prevents redundant LLM calls by:
 * 1. Detecting identical sequential queries
 * 2. Routing pure deterministic arithmetic / budget queries directly to deterministic logic
 * 3. Fast-pathing completion phrases ("looks good", "build trip", "proceed") when context is sufficient
 * 4. Reusing authoritative extracted TripContext without redundant LLM re-extraction
 */

import { TripContext, RequirementEngine } from '../requirementEngine';

export interface FastPathResult {
  canBypassLlm: boolean;
  reason?: 'REDUNDANT_INPUT' | 'DETERMINISTIC_CALCULATION' | 'CONFIRMATION_READY' | 'AUTHORITATIVE_CONTEXT_REUSE';
  extractedRequirements?: Partial<TripContext>;
  message?: string;
  readyToPlan?: boolean;
}

export class SemanticDedup {
  private lastMessageHash: string | null = null;
  private lastContextHash: string | null = null;

  /**
   * Evaluates if a chat turn can be resolved deterministically without calling Gemini
   */
  static evaluateFastPath(
    userMessage: string,
    tripContext: TripContext,
    conversationHistory: Array<{ sender: 'ai' | 'user'; text: string }> = []
  ): FastPathResult {
    const trimmed = userMessage.trim().toLowerCase();

    // 1. Completion / Build Confirmation Fast-Path
    const isConfirmation =
      trimmed === 'yes' ||
      trimmed === 'looks good' ||
      trimmed === 'build my trip' ||
      trimmed === 'build trip' ||
      trimmed === 'proceed' ||
      trimmed === 'plan it' ||
      trimmed === 'ready';

    if (isConfirmation && RequirementEngine.isSufficientToPlan(tripContext)) {
      return {
        canBypassLlm: true,
        reason: 'CONFIRMATION_READY',
        message: "Great! All core details are confirmed. Generating your personalized itinerary now...",
        extractedRequirements: {},
        readyToPlan: true
      };
    }

    // 2. Pure Arithmetic / Currency Calculation Fast-Path
    const isArithmetic = /^(?:what is|calculate|compute)?\s*₹?\s*(\d+)\s*([+\-*/])\s*₹?\s*(\d+)\s*\??$/i.exec(trimmed);
    if (isArithmetic) {
      const a = Number(isArithmetic[1]);
      const op = isArithmetic[2];
      const b = Number(isArithmetic[3]);
      let ans = 0;
      if (op === '+') ans = a + b;
      else if (op === '-') ans = a - b;
      else if (op === '*') ans = a * b;
      else if (op === '/' && b !== 0) ans = a / b;

      return {
        canBypassLlm: true,
        reason: 'DETERMINISTIC_CALCULATION',
        message: `The calculated total is ₹${ans.toLocaleString('en-IN')}.`,
        extractedRequirements: {},
        readyToPlan: RequirementEngine.isSufficientToPlan(tripContext)
      };
    }

    // 3. Exact Redundant Repeat of the Last Message
    if (conversationHistory.length > 0) {
      const lastUserMsg = conversationHistory
        .filter((m) => m.sender === 'user')
        .pop();
      if (lastUserMsg && lastUserMsg.text.trim().toLowerCase() === trimmed) {
        const isReady = RequirementEngine.isSufficientToPlan(tripContext);
        const nextQ = RequirementEngine.getNextQuestion(tripContext);
        return {
          canBypassLlm: true,
          reason: 'REDUNDANT_INPUT',
          message: isReady
            ? "I already have these details noted! We are ready to generate your trip whenever you like."
            : `I have that noted! ${nextQ ? nextQ.questionText : ''}`,
          extractedRequirements: {},
          readyToPlan: isReady
        };
      }
    }

    return {
      canBypassLlm: false
    };
  }
}
