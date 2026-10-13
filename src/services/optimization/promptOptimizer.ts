/**
 * AeroDAG Prompt & Context Optimizer
 * 
 * Minimizes LLM token footprints while strictly preserving:
 * - Safety guidelines and constraints
 * - Traveler headcount, ages, and budget constraints
 * - Vital context needed for accurate reasoning
 */

import { TripContext } from '../requirementEngine';

export interface PromptOptimizationResult {
  compactContext: Record<string, unknown>;
  compactHistory: Array<{ sender: 'ai' | 'user'; text: string }>;
  tokensSavedEstimate: number;
}

export class PromptOptimizer {
  /**
   * Filters out null, undefined, and empty array/object properties from TripContext
   * to eliminate empty tokens while preserving authoritative non-null constraints.
   */
  static compactTripContext(context: TripContext): Record<string, unknown> {
    const compact: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(context)) {
      if (value === null || value === undefined) {
        continue;
      }
      if (Array.isArray(value) && value.length === 0) {
        continue;
      }
      if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
        continue;
      }
      compact[key] = value;
    }

    return compact;
  }

  /**
   * Trims conversation history to the most recent high-signal conversational turns
   * (e.g., maximum 4 turns), eliminating duplicate earlier turn tokens.
   */
  static compactConversationHistory(
    history: Array<{ sender: 'ai' | 'user'; text: string }>,
    maxTurns = 4
  ): Array<{ sender: 'ai' | 'user'; text: string }> {
    if (!Array.isArray(history) || history.length <= maxTurns) {
      return history || [];
    }
    return history.slice(-maxTurns);
  }

  /**
   * Optimizes complete chat request context and estimates token savings
   */
  static optimizeChatContext(
    tripContext: TripContext,
    conversationHistory: Array<{ sender: 'ai' | 'user'; text: string }>
  ): PromptOptimizationResult {
    const originalJsonLength = JSON.stringify(tripContext).length;
    const compactContext = this.compactTripContext(tripContext);
    const compactJsonLength = JSON.stringify(compactContext).length;

    const originalHistoryTurns = conversationHistory.length;
    const compactHistory = this.compactConversationHistory(conversationHistory, 4);
    const trimmedHistoryTurns = originalHistoryTurns - compactHistory.length;

    // Roughly 4 chars per token + ~20 tokens per trimmed history message
    const contextCharsSaved = Math.max(0, originalJsonLength - compactJsonLength);
    const historyCharsSaved = trimmedHistoryTurns * 60;
    const tokensSavedEstimate = Math.round((contextCharsSaved + historyCharsSaved) / 4);

    return {
      compactContext,
      compactHistory,
      tokensSavedEstimate
    };
  }
}
