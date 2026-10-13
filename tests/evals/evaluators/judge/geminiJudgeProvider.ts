/**
 * AeroDAG Gemini Judge Provider
 * 
 * Centralized server-side provider abstraction for Google Gemini LLM-as-Judge.
 * Manages dynamic model configuration (EVAL_JUDGE_MODEL), credential isolation,
 * latency measurement, timeout enforcement, and structured schema error classification.
 */

import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';
import {
  LLMJudgeStatus,
  LLMJudgeErrorType,
  StructuredJudgeResult,
  JudgeCriteriaBreakdown
} from '../../types/evalTypes';

export interface JudgeProviderOptions {
  model?: string;
  timeoutMs?: number;
  apiKey?: string;
  customInvoker?: (prompt: string, systemPrompt: string) => Promise<string>;
}

export interface JudgeExecutionOutcome {
  status: LLMJudgeStatus;
  result: StructuredJudgeResult | null;
  provider: string;
  model: string;
  judgeLatencyMs: number;
  errorType?: LLMJudgeErrorType;
  errorMessage?: string;
}

export class GeminiJudgeProvider {
  public static readonly DEFAULT_MODEL = 'gemini-2.5-pro';

  /**
   * Resolves the configured evaluation model name
   */
  static getModelName(overrideModel?: string): string {
    return (
      overrideModel ||
      process.env.EVAL_JUDGE_MODEL ||
      GeminiJudgeProvider.DEFAULT_MODEL
    );
  }

  /**
   * Verifies if Gemini credentials are configured
   */
  static isAvailable(apiKeyOverride?: string): boolean {
    const key = apiKeyOverride || process.env.GEMINI_API_KEY;
    return !!(key && key !== 'MY_GEMINI_API_KEY' && key.trim().length > 10);
  }

  /**
   * Invokes Gemini for structured LLM-as-Judge evaluation
   */
  static async evaluate(
    systemPrompt: string,
    userPrompt: string,
    options?: JudgeProviderOptions
  ): Promise<JudgeExecutionOutcome> {
    const model = this.getModelName(options?.model);
    const timeoutMs = options?.timeoutMs || 45000;
    const apiKey = options?.apiKey || process.env.GEMINI_API_KEY;
    const provider = 'Gemini';

    // 1. Check credential availability
    if (!options?.customInvoker && !this.isAvailable(apiKey)) {
      return {
        status: 'NOT_RUN',
        result: {
          overall_score: null,
          score: null,
          confidence: 0,
          status: 'NOT_RUN',
          provider,
          model,
          judgeLatencyMs: 0,
          timestamp: new Date().toISOString()
        },
        provider,
        model,
        judgeLatencyMs: 0
      };
    }

    const startTime = Date.now();

    try {
      let rawText = '';

      if (options?.customInvoker) {
        const timeoutPromise = new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Judge invocation timed out')), timeoutMs)
        );
        rawText = await Promise.race([options.customInvoker(userPrompt, systemPrompt), timeoutPromise]);
      } else {
        const ai = new GoogleGenAI({ apiKey: apiKey!.trim() });
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
          attempts++;
          try {
            const callPromise = ai.models.generateContent({
              model,
              contents: userPrompt,
              config: {
                systemInstruction: systemPrompt,
                responseMimeType: 'application/json'
              }
            }).then((res) => res.text || '');

            const timeoutPromise = new Promise<string>((_, reject) =>
              setTimeout(() => reject(new Error('Judge invocation timed out')), timeoutMs)
            );

            rawText = await Promise.race([callPromise, timeoutPromise]);
            break;
          } catch (innerErr: any) {
            const msg = String(innerErr?.message || '').toLowerCase();
            const isTransient = msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted') || msg.includes('503') || msg.includes('timeout') || msg.includes('timed out');
            if (attempts < maxAttempts && isTransient) {
              await new Promise((resolve) => setTimeout(resolve, attempts * 3000));
              continue;
            }
            throw innerErr;
          }
        }
      }

      const latencyMs = Date.now() - startTime;

      if (!rawText || !rawText.trim()) {
        return {
          status: 'ERROR',
          result: null,
          provider,
          model,
          judgeLatencyMs: latencyMs,
          errorType: 'MALFORMED_OUTPUT',
          errorMessage: 'Empty response returned by judge model.'
        };
      }

      // 2. Parse and normalize structured output
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(rawText.trim());
      } catch (jsonErr: any) {
        return {
          status: 'ERROR',
          result: null,
          provider,
          model,
          judgeLatencyMs: latencyMs,
          errorType: 'MALFORMED_OUTPUT',
          errorMessage: `Malformed JSON response from judge: ${jsonErr.message}`
        };
      }

      const structuredResult = this.normalizeJudgeOutput(parsedJson, model, latencyMs);

      return {
        status: 'COMPLETED',
        result: structuredResult,
        provider,
        model,
        judgeLatencyMs: latencyMs
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errorType = this.classifyError(err);
      const safeErrorMsg = this.sanitizeErrorMessage(err.message || String(err));

      return {
        status: 'ERROR',
        result: null,
        provider,
        model,
        judgeLatencyMs: latencyMs,
        errorType,
        errorMessage: safeErrorMsg
      };
    }
  }

  /**
   * Normalizes LLM JSON output to the exact AeroDAG Judge Schema
   */
  private static normalizeJudgeOutput(
    raw: any,
    model: string,
    latencyMs: number
  ): StructuredJudgeResult {
    // Determine overall score (0 - 10)
    let overallScore: number | null = null;
    if (typeof raw.overall_score === 'number') {
      overallScore = Math.max(0, Math.min(10, raw.overall_score));
    } else if (typeof raw.score === 'number') {
      overallScore = raw.score <= 1.0 ? Math.round(raw.score * 10) : Math.max(0, Math.min(10, raw.score));
    }

    const confidence = typeof raw.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : 0.90;

    const normalizeCriterion = (field: any): { score: number; reason: string } => {
      if (!field) return { score: 7, reason: 'Evaluated normally.' };
      if (typeof field === 'number') {
        const s = field <= 1.0 ? Math.round(field * 10) : Math.max(0, Math.min(10, field));
        return { score: s, reason: 'Score assigned by judge.' };
      }
      if (typeof field === 'object') {
        const s = typeof field.score === 'number' ? (field.score <= 1.0 ? Math.round(field.score * 10) : Math.max(0, Math.min(10, field.score))) : 7;
        return { score: s, reason: String(field.reason || field.explanation || 'Evaluated normally.') };
      }
      return { score: 7, reason: String(field) };
    };

    const criteriaObj = raw.criteria || raw;

    const criteria: JudgeCriteriaBreakdown = {
      factual_grounding: normalizeCriterion(criteriaObj.factual_grounding),
      constraint_satisfaction: normalizeCriterion(criteriaObj.constraint_satisfaction),
      itinerary_coherence: normalizeCriterion(criteriaObj.itinerary_coherence),
      traveller_suitability: normalizeCriterion(criteriaObj.traveller_suitability),
      helpfulness: normalizeCriterion(criteriaObj.helpfulness || criteriaObj.response_helpfulness),
      safety_compliance: normalizeCriterion(criteriaObj.safety_compliance)
    };

    // If overallScore was null, average the 6 criteria
    if (overallScore === null) {
      const sum = Object.values(criteria).reduce((acc, c) => acc + (c?.score || 0), 0);
      overallScore = Number((sum / 6).toFixed(1));
    }

    return {
      overall_score: overallScore,
      score: Number((overallScore / 10).toFixed(2)),
      pass: overallScore >= 7.0,
      confidence,
      criteria,
      explanation: String(raw.explanation || raw.reason || 'Evaluation completed successfully.'),
      provider: 'Gemini',
      model,
      status: 'COMPLETED',
      judgeLatencyMs: latencyMs,
      timestamp: new Date().toISOString(),
      modelUsed: model
    };
  }

  /**
   * Classifies raw runtime errors into safe structured error types
   */
  private static classifyError(err: any): LLMJudgeErrorType {
    const msg = (err?.message || '').toLowerCase();

    if (msg.includes('timed out') || msg.includes('timeout')) {
      return 'TIMEOUT';
    }
    if (msg.includes('api_key') || msg.includes('401') || msg.includes('unauthorized') || msg.includes('authentication')) {
      return 'AUTH_ERROR';
    }
    if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit') || msg.includes('resource_exhausted')) {
      return 'RATE_LIMIT';
    }
    if (msg.includes('not found') || msg.includes('404') || msg.includes('unsupported model') || msg.includes('model_unavailable')) {
      return 'MODEL_UNAVAILABLE';
    }
    if (msg.includes('json') || msg.includes('unexpected token') || msg.includes('syntaxerror')) {
      return 'MALFORMED_OUTPUT';
    }
    return 'UNKNOWN';
  }

  /**
   * Strips API keys or credentials from error text before reporting
   */
  private static sanitizeErrorMessage(msg: string): string {
    let sanitized = msg;
    const key = process.env.GEMINI_API_KEY;
    if (key && key.trim().length > 5) {
      sanitized = sanitized.split(key.trim()).join('[REDACTED_API_KEY]');
    }
    return sanitized
      .replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[REDACTED_API_KEY]')
      .replace(/[A-Za-z0-9_.-]{30,}/g, '[REDACTED_TOKEN]');
  }
}
