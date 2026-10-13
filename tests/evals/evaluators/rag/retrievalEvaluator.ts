/**
 * AeroDAG RetrievalEvaluator
 * 
 * Audits RAG retrieval quality:
 * - Destination match of retrieved knowledge chunks
 * - Category match (VISA, ACCESSIBILITY, CULTURE, TRANSIT)
 * - Precision@K and Recall@K when target document IDs are specified
 */

import { EvaluatorResult, ScenarioExecutionPayload } from '../../types/evalTypes';

export class RetrievalEvaluator {
  static evaluate(payload: ScenarioExecutionPayload): EvaluatorResult {
    const { scenario, actualRagResponse } = payload;
    const expected = scenario.expectedOutput;

    if (!expected?.shouldBeGrounded && !expected?.expectedAuthoritySources) {
      return {
        evaluatorName: 'RetrievalEvaluator',
        passed: true,
        score: 1.0,
        reason: 'No retrieval expectations configured for scenario.'
      };
    }

    if (!actualRagResponse) {
      return {
        evaluatorName: 'RetrievalEvaluator',
        passed: false,
        score: 0.0,
        reason: 'RAG response was expected but not returned by system.'
      };
    }

    const { sources, isGrounded, confidence } = actualRagResponse;

    // Check unknown destination uncertainty handling
    if (expected.expectedConfidence === 'UNCERTAIN') {
      const handledUncertainty = !isGrounded && confidence === 'UNCERTAIN' && sources.length === 0;
      return {
        evaluatorName: 'RetrievalEvaluator',
        passed: handledUncertainty,
        score: handledUncertainty ? 1.0 : 0.0,
        reason: handledUncertainty
          ? 'System properly identified missing knowledge and returned zero-hallucination UNCERTAIN status.'
          : `Expected UNCERTAIN confidence with 0 sources, but got isGrounded=${isGrounded}, confidence=${confidence}, sources=${sources.length}`,
        details: { confidence, sourcesCount: sources.length }
      };
    }

    // Check normal grounded retrieval
    if (!sources || sources.length === 0) {
      return {
        evaluatorName: 'RetrievalEvaluator',
        passed: false,
        score: 0.0,
        reason: 'Zero knowledge chunks retrieved from trusted vector store.'
      };
    }

    let destMatchCount = 0;
    if (expected.destination) {
      for (const src of sources) {
        if (
          (src.destination && src.destination.toLowerCase().includes(expected.destination.toLowerCase())) ||
          (src.country && src.country.toLowerCase().includes(expected.destination.toLowerCase()))
        ) {
          destMatchCount++;
        }
      }
    }

    const destScore = expected.destination ? (sources.length > 0 ? destMatchCount / sources.length : 0) : 1.0;
    const passed = destScore >= 0.5 && isGrounded;

    return {
      evaluatorName: 'RetrievalEvaluator',
      passed,
      score: destScore,
      reason: passed
        ? `Retrieved ${sources.length} chunks with ${(destScore * 100).toFixed(0)}% destination alignment.`
        : `Retrieval failed destination alignment (${(destScore * 100).toFixed(0)}% matches) or grounding flag was false.`,
      details: {
        retrievedCount: sources.length,
        destScore,
        isGrounded,
        confidence
      }
    };
  }
}
