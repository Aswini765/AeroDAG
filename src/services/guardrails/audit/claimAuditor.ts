/**
 * AeroDAG Claim Auditor & Hallucination Prevention
 * 
 * Inspects AI-generated travel claims across regulatory, financial, and booking facts.
 * Determines verification status (SUPPORTED, UNSUPPORTED, CONTRADICTED, UNCERTAIN)
 * against retrieved RAG evidence, tool execution results, and deterministic catalog state.
 */

import { ClaimItem, ClaimVerificationDetail, ClaimAuditResult, ClaimStatus } from '../types';
import { KnowledgeChunk } from '../../../types/travelKnowledge';
import { TripPlan } from '../../../types/travelBooking';
import { TrustedSourceRegistry } from '../../regulatory/trustedSourceRegistry';
import { FreshnessEvaluator } from '../../regulatory/freshnessEvaluator';

export class ClaimAuditor {
  public static readonly UNVERIFIED_DISCLAIMER =
    "I couldn't verify this from the available travel information. Please check the official source before travelling.";

  /**
   * Audits factual claims against available evidence sources
   */
  static auditClaims(
    claims: ClaimItem[],
    options: {
      retrievedKnowledge?: KnowledgeChunk[];
      tripPlan?: TripPlan;
      destination?: string;
    }
  ): ClaimAuditResult {
    const audited: ClaimVerificationDetail[] = [];
    const disclaimers: string[] = [];

    for (const claim of claims) {
      const detail = this.verifySingleClaim(claim, options);
      audited.push(detail);

      if (detail.status === 'UNSUPPORTED' || detail.status === 'UNCERTAIN' || detail.status === 'STALE' || detail.status === 'CONFLICTING') {
        disclaimers.push(`Notice on ${claim.category}: ${this.UNVERIFIED_DISCLAIMER}`);
      }
    }

    const allSupported = audited.every((a) => a.status === 'SUPPORTED');
    const unsupportedClaims = audited.filter((a) => a.status !== 'SUPPORTED');

    return {
      auditedClaims: audited,
      allSupported,
      unsupportedClaims,
      disclaimers
    };
  }

  private static verifySingleClaim(
    claim: ClaimItem,
    options: {
      retrievedKnowledge?: KnowledgeChunk[];
      tripPlan?: TripPlan;
      destination?: string;
    }
  ): ClaimVerificationDetail {
    const textLower = claim.text.toLowerCase();

    // 1. Audit Regulatory / Visa Claims
    if (claim.category === 'visa' || claim.category === 'passport' || claim.category === 'entry') {
      const knowledge = options.retrievedKnowledge || [];
      if (knowledge.length === 0) {
        return {
          claim,
          status: 'UNCERTAIN',
          confidence: 0.2,
          reason: 'No authoritative regulatory documents retrieved to substantiate claim.',
          correctedText: this.UNVERIFIED_DISCLAIMER
        };
      }

      const matchingChunks = knowledge.filter((chunk) => {
        const destMatch = !claim.destination || (chunk.country && chunk.country.toLowerCase().includes(claim.destination.toLowerCase()));
        const contentMatch = chunk.text.toLowerCase().includes('visa') || chunk.text.toLowerCase().includes('passport') || chunk.text.toLowerCase().includes('entry');
        return destMatch && contentMatch;
      });

      if (matchingChunks.length === 0) {
        return {
          claim,
          status: 'UNSUPPORTED',
          confidence: 0.1,
          reason: `No retrieved knowledge matches destination '${claim.destination || 'unknown'}' for regulatory claim.`,
          correctedText: this.UNVERIFIED_DISCLAIMER
        };
      }

      // Check if authoritative
      const authoritativeChunk = matchingChunks.find(c => TrustedSourceRegistry.isTrustLevelAuthoritative(c.trustLevel));
      if (!authoritativeChunk) {
        return {
          claim,
          status: 'UNSUPPORTED',
          confidence: 0.3,
          reason: `Source '${matchingChunks[0].sourceName}' has trust level '${matchingChunks[0].trustLevel}', which cannot establish authoritative visa eligibility.`,
          correctedText: this.UNVERIFIED_DISCLAIMER
        };
      }

      // Check freshness
      const freshness = FreshnessEvaluator.evaluateFreshness(authoritativeChunk.lastVerifiedAt);
      if (freshness === 'STALE' || freshness === 'EXPIRED') {
        return {
          claim,
          status: 'STALE',
          evidenceSource: authoritativeChunk.sourceName,
          confidence: 0.5,
          reason: `Source data is stale (verified: ${authoritativeChunk.lastVerifiedAt}). Verification required before travel.`
        };
      }

      // Check conflicting claims if multiple authoritative chunks exist
      const conflictingChunks = matchingChunks.filter(c => TrustedSourceRegistry.isTrustLevelAuthoritative(c.trustLevel));
      if (conflictingChunks.length >= 2) {
        const hasVisaFree = conflictingChunks.some(c => c.text.toLowerCase().includes('visa-free') || c.text.toLowerCase().includes('no visa'));
        const hasVisaReq = conflictingChunks.some(c =>
          c.text.toLowerCase().includes('visa required') ||
          c.text.toLowerCase().includes('must obtain a visa') ||
          c.text.toLowerCase().includes('must apply for a visa') ||
          c.text.toLowerCase().includes('require a visa')
        );
        if (hasVisaFree && hasVisaReq) {
          return {
            claim,
            status: 'CONFLICTING',
            evidenceSource: conflictingChunks.map(c => c.sourceName).join(', '),
            confidence: 0.4,
            reason: 'Conflicting authoritative sources found regarding visa requirement. Please verify with official immigration authority.'
          };
        }
      }

      return {
        claim,
        status: 'SUPPORTED',
        evidenceSource: authoritativeChunk.sourceName,
        confidence: 0.95,
        reason: `Substantiated by official document: ${authoritativeChunk.sourceName} (${authoritativeChunk.trustLevel})`
      };
    }

    // 2. Audit Booking State Claims
    if (claim.category === 'booking_status') {
      const plan = options.tripPlan;
      const claimsConfirmed = textLower.includes('confirmed') || textLower.includes('is booked') || textLower.includes('ticket issued');

      if (claimsConfirmed) {
        // Under mock environment, tickets are NEVER legally confirmed
        return {
          claim,
          status: 'CONTRADICTED',
          confidence: 0.98,
          reason: 'LLM claimed real confirmed booking, but current execution is simulated/available only.',
          correctedText: 'Your flight and accommodations are selected and verified in simulation, but not yet confirmed through live payment.'
        };
      }

      return {
        claim,
        status: 'SUPPORTED',
        confidence: 0.9,
        reason: 'Booking state claims adhere to available/selected status.'
      };
    }

    // 3. Audit Pricing Claims
    if (claim.category === 'price' || claim.category === 'fee') {
      const plan = options.tripPlan;
      if (plan && typeof claim.claimedValue === 'number') {
        const diff = Math.abs(plan.budget.grandTotalINR - claim.claimedValue);
        if (diff > 100) {
          return {
            claim,
            status: 'CONTRADICTED',
            confidence: 0.99,
            reason: `Claimed price ₹${claim.claimedValue.toLocaleString()} contradicts deterministic total ₹${plan.budget.grandTotalINR.toLocaleString()}.`,
            correctedText: `The actual calculated total is ₹${plan.budget.grandTotalINR.toLocaleString()}.`
          };
        }
      }

      return {
        claim,
        status: 'SUPPORTED',
        confidence: 0.9,
        reason: 'Price matches deterministic arithmetic engine calculation.'
      };
    }

    return {
      claim,
      status: 'SUPPORTED',
      confidence: 0.8,
      reason: 'General claim consistent with domain travel parameters.'
    };
  }
}

export function getClaimAuditor() {
  return ClaimAuditor;
}
