/**
 * AeroDAG Regulatory Guardrail
 * 
 * Enforces legal and safety constraints on immigration, visa guidance, and regulatory RAG queries.
 * Blocks malicious queries attempting illegal immigration evasion, document falsification,
 * or bypassing border controls.
 * Validates source trustworthiness before permitting authoritative claims.
 */

import { GuardrailDecision } from '../guardrails/types';
import { TrustLevel, SourceFreshness, VisaRequirement } from '../../types/travelKnowledge';
import { FreshnessEvaluator } from './freshnessEvaluator';

export class RegulatoryGuardrail {
  private static readonly ILLEGAL_IMMIGRATION_PATTERNS = [
    /\boverstay(?:ing)?\b.*?\b(?:visa|without|illegally|caught)\b/i,
    /\boverstay(?:ing)?\b/i,
    /\b(?:bypass|evade|circumvent|sneak\s+through)\s+(?:border|immigration|customs|passport\s+control)\b/i,
    /\b(?:cross|enter)\s+(?:border|country)\s+(?:illegally|without\s+inspection|undocumented)\b/i,
    /\b(?:avoid|escape)\s+(?:deportation|detention|border\s+police)\b/i,
    /\b(?:illegal\s+work|work\s+under\s+the\s+table)\s+(?:on\s+tourist\s+visa|without\s+work\s+permit)\b/i
  ];

  private static readonly FALSIFICATION_PATTERNS = [
    /\b(?:fake|forge|forged|falsify|fabricated?)\b.*?\b(?:bank\s+statement|hotel\s+booking|flight\s+ticket|passport|visa|invitation\s+letter|employment\s+letter)\b/i,
    /\b(?:how\s+to\s+make|generate|create)\s+(?:fake|dummy|fraudulent)\s+(?:documents?|tickets?|statements?)\s+for\s+visa\b/i,
    /\b(?:alter|modify|edit)\s+passport\s+(?:expiry|validity|photo|details)\b/i
  ];

  /**
   * Audits incoming user message against immigration safety and law compliance
   */
  static evaluateUserQuery(query: string): GuardrailDecision {
    const trimmed = query.trim();

    // 1. Check for illegal immigration evasion
    for (const pat of this.ILLEGAL_IMMIGRATION_PATTERNS) {
      if (pat.test(trimmed)) {
        return {
          decision: 'BLOCK',
          guardrailId: 'regulatory-immigration-evasion',
          severity: 'CRITICAL',
          reason: 'Query attempts to seek advice on evading immigration controls or illegal border crossing.',
          safeMessage:
            'AeroDAG cannot provide advice or assistance with evading immigration controls, overstaying visas, or unlawful entry. Please refer to official consular regulations.'
        };
      }
    }

    // 2. Check for document falsification or fraud
    for (const pat of this.FALSIFICATION_PATTERNS) {
      if (pat.test(trimmed)) {
        return {
          decision: 'BLOCK',
          guardrailId: 'regulatory-document-falsification',
          severity: 'CRITICAL',
          reason: 'Query attempts to create, forge, or use falsified travel documents or financial statements.',
          safeMessage:
            'AeroDAG cannot generate or provide instructions on creating falsified or fraudulent documents for visa applications. All submitted materials must be authentic and verified by accredited issuing institutions.'
        };
      }
    }

    return {
      decision: 'ALLOW',
      guardrailId: 'regulatory-compliance-pass',
      severity: 'LOW'
    };
  }

  /**
   * Audits a regulatory claim before it can be presented to user as authoritative
   */
  static evaluateRegulatoryClaim(req: VisaRequirement): {
    canPresentAuthoritatively: boolean;
    decision: 'ALLOW' | 'REQUIRE_REVIEW' | 'BLOCK';
    reason: string;
  } {
    // 1. Untrusted source cannot establish authoritative claims
    const trustRank = FreshnessEvaluator.getTrustRank(req.trustLevel);
    if (trustRank > 4) {
      return {
        canPresentAuthoritatively: false,
        decision: 'BLOCK',
        reason: `Source '${req.source}' has trust level '${req.trustLevel}' which is not authoritative for legal entry rules.`
      };
    }

    // 2. Source conflict requires human verification
    if (req.status === 'CONFLICTING_SOURCES') {
      return {
        canPresentAuthoritatively: false,
        decision: 'REQUIRE_REVIEW',
        reason: `Conflicting authoritative sources detected: ${req.conflictDetails?.issue || 'Multiple official rules contradict.'}`
      };
    }

    // 3. Stale or Expired source requires review
    if (req.sourceFreshness === 'STALE' || req.sourceFreshness === 'EXPIRED') {
      return {
        canPresentAuthoritatively: false,
        decision: 'REQUIRE_REVIEW',
        reason: `Source data is ${req.sourceFreshness} (last verified: ${req.lastVerifiedAt}).`
      };
    }

    // 4. Unknown requirement cannot be presented as fact
    if (req.status === 'UNKNOWN' || req.requirement === 'UNKNOWN') {
      return {
        canPresentAuthoritatively: false,
        decision: 'REQUIRE_REVIEW',
        reason: 'Visa requirement could not be verified from official repository.'
      };
    }

    return {
      canPresentAuthoritatively: true,
      decision: 'ALLOW',
      reason: 'Authoritative official source verified within valid freshness window.'
    };
  }
}
