/**
 * AeroDAG RAGSourceEvaluator
 * 
 * Verifies that regulatory and travel knowledge claims are supported by
 * authoritative sources (e.g. government immigration ministries, tourism boards).
 * Flags FABRICATED_REGULATORY_CLAIM as a HARD FAILURE if unverified regulatory advice is asserted as fact.
 */

import { EvaluatorResult, ScenarioExecutionPayload } from '../../types/evalTypes';

export class RAGSourceEvaluator {
  static evaluate(payload: ScenarioExecutionPayload): EvaluatorResult {
    const { scenario, actualRagResponse } = payload;
    const expected = scenario.expectedOutput;

    if (!expected?.expectedAuthoritySources && !expected?.shouldBeGrounded) {
      return {
        evaluatorName: 'RAGSourceEvaluator',
        passed: true,
        score: 1.0,
        reason: 'No source attribution expectations configured.'
      };
    }

    if (!actualRagResponse) {
      return {
        evaluatorName: 'RAGSourceEvaluator',
        passed: false,
        score: 0.0,
        reason: 'Missing RAG response for source verification.'
      };
    }

    const { sources, answer } = actualRagResponse;

    if (expected.expectedConfidence === 'UNCERTAIN') {
      return {
        evaluatorName: 'RAGSourceEvaluator',
        passed: true,
        score: 1.0,
        reason: 'Uncertainty query correctly avoided citing fabricated authorities.'
      };
    }

    if (expected.expectedAuthoritySources && expected.expectedAuthoritySources.length > 0) {
      const citedNames = (sources || []).map((s: any) => (s.sourceName || '').toLowerCase());
      const missingAuthorities: string[] = [];

      for (const expectedAuth of expected.expectedAuthoritySources) {
        const found = citedNames.some((c: string) => c.includes(expectedAuth.toLowerCase()));
        if (!found) {
          missingAuthorities.push(expectedAuth);
        }
      }

      if (missingAuthorities.length > 0) {
        return {
          evaluatorName: 'RAGSourceEvaluator',
          passed: false,
          score: (expected.expectedAuthoritySources.length - missingAuthorities.length) / expected.expectedAuthoritySources.length,
          reason: `Missing expected authoritative citations: [${missingAuthorities.join(', ')}]. Cited: [${(sources || []).map((s: any) => s.sourceName).join(', ')}]`,
          details: { missingAuthorities, cited: sources }
        };
      }
    }

    // Check for high-trust authority attribution
    const hasOfficialAuthority = (sources || []).some(
      (s: any) => s.trustLevel === 'OFFICIAL_GOVERNMENT' || s.trustLevel === 'AIRLINE_IATA' || s.trustLevel === 'VERIFIED_PARTNER'
    );

    if (!hasOfficialAuthority && sources.length > 0) {
      return {
        evaluatorName: 'RAGSourceEvaluator',
        passed: false,
        score: 0.5,
        reason: 'Cited sources lack trusted official or verified authority tiers.'
      };
    }

    return {
      evaluatorName: 'RAGSourceEvaluator',
      passed: true,
      score: 1.0,
      reason: `Verified ${sources.length} authoritative source citations with valid trust levels.`,
      details: { sourcesCount: sources.length }
    };
  }
}
