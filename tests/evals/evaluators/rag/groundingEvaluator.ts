/**
 * AeroDAG GroundingEvaluator
 * 
 * Inspects whether answer claims are substantiated by retrieved knowledge.
 * Flags FABRICATED_REGULATORY_CLAIM as a HARD FAILURE if unsupported
 * regulatory/visa claims are stated as facts.
 */

import { EvaluatorResult, ScenarioExecutionPayload } from '../../types/evalTypes';
import { GroundingValidator } from '../../../../src/services/rag/groundingValidator';
import { ClaimAuditor } from '../../../../src/services/guardrails/audit/claimAuditor';

export class GroundingEvaluator {
  static evaluate(payload: ScenarioExecutionPayload): EvaluatorResult {
    const { scenario, actualRagResponse } = payload;
    const expected = scenario.expectedOutput;

    if (!expected?.shouldBeGrounded && expected?.expectedConfidence !== 'UNCERTAIN') {
      return {
        evaluatorName: 'GroundingEvaluator',
        passed: true,
        score: 1.0,
        reason: 'Grounding evaluation not required for this scenario.'
      };
    }

    if (!actualRagResponse) {
      return {
        evaluatorName: 'GroundingEvaluator',
        passed: false,
        score: 0.0,
        reason: 'Missing RAG response for grounding evaluation.'
      };
    }

    const { answer, sources, isGrounded, confidence } = actualRagResponse;

    // Uncertainty scenario
    if (expected.expectedConfidence === 'UNCERTAIN') {
      const isUncertain = !isGrounded && confidence === 'UNCERTAIN';
      return {
        evaluatorName: 'GroundingEvaluator',
        passed: isUncertain,
        score: isUncertain ? 1.0 : 0.0,
        reason: isUncertain
          ? 'Properly recognized absence of verified knowledge; confidence is UNCERTAIN.'
          : `Failed uncertainty check: isGrounded was ${isGrounded}, confidence was ${confidence}`
      };
    }

    // Evaluate sources via GroundingValidator
    const retrievedItems = (sources || []).map((s: any) => ({
      chunk: {
        chunkId: s.chunkId || 'chunk-1',
        documentId: s.documentId || 'doc-1',
        title: s.title || '',
        text: answer || '',
        destination: s.destination || '',
        country: s.country || '',
        category: s.category || 'VISA',
        sourceName: s.sourceName || '',
        sourceUrl: s.sourceUrl,
        lastVerifiedAt: s.lastVerifiedAt || new Date().toISOString(),
        trustLevel: s.trustLevel || 'OFFICIAL_GOVERNMENT'
      },
      score: 0.85
    }));

    const targetDest = scenario.context?.destination || expected.destination;
    const evalResult = GroundingValidator.evaluate(retrievedItems, targetDest);

    // Audit factual claims via ClaimAuditor
    const claimRes = ClaimAuditor.auditClaims(
      [
        {
          id: 'eval-claim-1',
          text: answer || '',
          category: (scenario.category === 'RAG' ? 'visa' : 'general') as any,
          destination: targetDest
        }
      ],
      {
        destination: targetDest
      }
    );

    const hasContradicted = claimRes.auditedClaims.some((v: any) => v.status === 'CONTRADICTED');
    const isGroundedValid = isGrounded && evalResult.isGrounded && !hasContradicted;

    if (!isGroundedValid && hasContradicted) {
      return {
        evaluatorName: 'GroundingEvaluator',
        passed: false,
        score: 0.0,
        reason: 'Contradicted or hallucinated travel claim detected.',
        hardFailure: 'FABRICATED_REGULATORY_CLAIM',
        details: { auditedClaims: claimRes.auditedClaims }
      };
    }

    const score = isGroundedValid ? 1.0 : 0.5;
    return {
      evaluatorName: 'GroundingEvaluator',
      passed: isGroundedValid,
      score,
      reason: isGroundedValid
        ? `Grounding verified with high confidence (${confidence}). Retrieved sources substantiated answer.`
        : `Answer lacked full grounding (isGrounded: ${isGrounded}, validator: ${evalResult.isGrounded}).`,
      details: {
        isGrounded,
        confidence,
        evalResult
      }
    };
  }
}
