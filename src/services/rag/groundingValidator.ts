/**
 * AeroDAG Grounding Validator & Hallucination Prevention
 * 
 * Verifies that travel and regulatory answers are strictly grounded in retrieved
 * trusted sources. Prevents fabricated citations and handles missing knowledge with
 * explicit uncertainty responses.
 */

import { RetrievedChunk, SourceAttribution, GroundingEvaluation } from '../../types/travelKnowledge';
import { TrustedSourceRegistry } from '../regulatory/trustedSourceRegistry';
import { FreshnessEvaluator } from '../regulatory/freshnessEvaluator';

export class GroundingValidator {
  private static readonly OFFICIAL_DISCLAIMER =
    'Visa and entry requirements should be verified against the official government/consular source before travel.';

  /**
   * Evaluates retrieved chunks against the inquiry destination and query
   */
  static evaluate(
    retrievedChunks: RetrievedChunk[],
    targetDestination?: string,
    minScoreThreshold = 0.30
  ): GroundingEvaluation {
    // 1. Check if any chunks were retrieved
    if (!retrievedChunks || retrievedChunks.length === 0) {
      return {
        isGrounded: false,
        confidence: 'UNCERTAIN',
        relevanceScore: 0,
        reason: 'No matching travel knowledge documents found in repository.',
        needsVerification: true,
        regulatoryDisclaimer: this.OFFICIAL_DISCLAIMER
      };
    }

    const topChunk = retrievedChunks[0];

    // 2. Check if score meets minimum relevance threshold
    if (topChunk.score < minScoreThreshold) {
      return {
        isGrounded: false,
        confidence: 'UNCERTAIN',
        relevanceScore: topChunk.score,
        reason: `Top retrieval score (${topChunk.score}) is below relevance threshold (${minScoreThreshold}).`,
        needsVerification: true,
        regulatoryDisclaimer: this.OFFICIAL_DISCLAIMER
      };
    }

    // 3. Destination Consistency Verification
    if (targetDestination) {
      const targetLower = targetDestination.toLowerCase();
      const hasDestinationMatch = retrievedChunks.some((rc) => {
        const dest = rc.chunk.destination.toLowerCase();
        const country = rc.chunk.country.toLowerCase();
        return (
          dest.includes(targetLower) ||
          targetLower.includes(dest) ||
          country.includes(targetLower) ||
          targetLower.includes(country)
        );
      });

      if (!hasDestinationMatch) {
        return {
          isGrounded: false,
          confidence: 'UNCERTAIN',
          relevanceScore: 0,
          reason: `No verified travel knowledge available specifically for "${targetDestination}".`,
          needsVerification: true,
          regulatoryDisclaimer: this.OFFICIAL_DISCLAIMER
        };
      }
    }

    // 4. Grounding established
    const confidence: 'HIGH' | 'MEDIUM' | 'LOW' =
      topChunk.score >= 0.65 ? 'HIGH' : topChunk.score >= 0.45 ? 'MEDIUM' : 'LOW';

    return {
      isGrounded: true,
      confidence,
      relevanceScore: topChunk.score,
      reason: `Successfully grounded across ${retrievedChunks.length} trusted knowledge chunks (top score: ${topChunk.score}).`,
      needsVerification: false,
      regulatoryDisclaimer: this.OFFICIAL_DISCLAIMER
    };
  }

  /**
   * Formulates clean source attributions strictly from retrieved chunk metadata.
   * Guarantees zero fabricated URLs or citations.
   */
  static extractAttributions(chunks: RetrievedChunk[]): SourceAttribution[] {
    const seen = new Set<string>();
    const sources: SourceAttribution[] = [];

    for (const rc of chunks) {
      const c = rc.chunk;
      const key = `${c.documentId}-${c.sourceName}`;
      if (!seen.has(key)) {
        seen.add(key);
        sources.push({
          documentId: c.documentId,
          chunkId: c.chunkId,
          title: c.title,
          destination: c.destination,
          country: c.country,
          sourceName: c.sourceName,
          sourceUrl: c.sourceUrl,
          lastVerifiedAt: c.lastVerifiedAt,
          trustLevel: c.trustLevel,
          category: c.category,
          verificationNote: c.verificationNote || this.OFFICIAL_DISCLAIMER
        });
      }
    }

    return sources;
  }

  /**
   * Specifically evaluates regulatory claims against official sources, freshness, and conflict rules
   */
  static evaluateRegulatory(
    retrievedChunks: RetrievedChunk[],
    targetDestination?: string
  ): GroundingEvaluation & {
    authoritativeChunks: RetrievedChunk[];
    isStale: boolean;
    isConflicting: boolean;
  } {
    const baseEval = this.evaluate(retrievedChunks, targetDestination, 0.25);
    if (!baseEval.isGrounded) {
      return {
        ...baseEval,
        authoritativeChunks: [],
        isStale: false,
        isConflicting: false
      };
    }

    // Filter authoritative chunks
    const authoritativeChunks = retrievedChunks.filter((rc) =>
      TrustedSourceRegistry.isTrustLevelAuthoritative(rc.chunk.trustLevel)
    );

    if (authoritativeChunks.length === 0) {
      return {
        isGrounded: false,
        confidence: 'UNCERTAIN',
        relevanceScore: baseEval.relevanceScore,
        reason: 'Retrieved regulatory items are from secondary/unverified sources only; cannot establish authoritative entry requirements.',
        needsVerification: true,
        regulatoryDisclaimer: this.OFFICIAL_DISCLAIMER,
        authoritativeChunks: [],
        isStale: false,
        isConflicting: false
      };
    }

    // Freshness check on authoritative chunks
    let isStale = false;
    for (const rc of authoritativeChunks) {
      const freshness = FreshnessEvaluator.evaluateFreshness(rc.chunk.lastVerifiedAt);
      if (freshness === 'STALE' || freshness === 'EXPIRED') {
        isStale = true;
        break;
      }
    }

    // Conflict check
    let isConflicting = false;
    if (authoritativeChunks.length >= 2) {
      const texts = authoritativeChunks.map((rc) => rc.chunk.text.toLowerCase());
      const hasVisaFree = texts.some((t) => t.includes('visa-free') || t.includes('no visa required'));
      const hasVisaRequired = texts.some((t) => t.includes('visa required') || t.includes('must apply for a visa'));
      if (hasVisaFree && hasVisaRequired) {
        isConflicting = true;
      }
    }

    const confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNCERTAIN' =
      isConflicting || isStale
        ? 'UNCERTAIN'
        : baseEval.confidence;

    const needsVerification = baseEval.needsVerification || isStale || isConflicting;

    return {
      isGrounded: !isConflicting,
      confidence,
      relevanceScore: baseEval.relevanceScore,
      reason: isConflicting
        ? 'Conflicting official sources detected for this destination.'
        : isStale
        ? 'Official source data is older than configured freshness window.'
        : baseEval.reason,
      needsVerification,
      regulatoryDisclaimer: this.OFFICIAL_DISCLAIMER,
      authoritativeChunks,
      isStale,
      isConflicting
    };
  }

  /**
   * Generates a safe, un-hallucinated uncertainty response for unknown or missing knowledge
   */
  static createUncertaintyResponse(destination?: string): string {
    const destLabel = destination ? `for ${destination}` : 'for this destination';
    return `We currently do not have verified regulatory knowledge ${destLabel} in our trusted travel repository.\n\nVisa, passport validity, and border entry protocols should be verified directly with the official embassy, high commission, or consular authority before travel.`;
  }
}
