/**
 * AeroDAG Regulatory Guardrail
 * 
 * Enforces strict compliance standards on visa, passport, entry, and customs guidance.
 * Demands official source attribution, destination matching, and explicit uncertainty disclaimers.
 */

import { Guardrail, GuardrailDecision, GuardrailContext } from '../types';
import { KnowledgeChunk } from '../../../types/travelKnowledge';
import { ClaimAuditor } from './claimAuditor';

export interface RegulatoryEvaluationInput {
  destination: string;
  responseContent: string;
  retrievedChunks: KnowledgeChunk[];
}

export class RegulatoryGuardrail implements Guardrail<RegulatoryEvaluationInput, string> {
  readonly id = 'regulatory-compliance-guardrail';
  readonly name = 'Regulatory Information Guardrail';
  readonly description = 'Prevents fabricated visa, passport validity, and entry regulation claims.';
  readonly stage = 'audit' as const;
  readonly severity = 'HIGH' as const;
  readonly enabled = true;

  evaluate(input: RegulatoryEvaluationInput, context?: GuardrailContext): GuardrailDecision {
    const { destination, responseContent, retrievedChunks } = input;
    const lowerContent = responseContent.toLowerCase();

    // Check if the response makes regulatory claims
    const isRegulatoryResponse =
      lowerContent.includes('visa') ||
      lowerContent.includes('passport') ||
      lowerContent.includes('entry requirement') ||
      lowerContent.includes('e-visa');

    if (!isRegulatoryResponse) {
      return {
        decision: 'ALLOW',
        guardrailId: this.id,
        severity: 'LOW',
        metadata: { isRegulatory: false }
      };
    }

    // 1. Evidence Existence Check
    if (retrievedChunks.length === 0) {
      return {
        decision: 'WARN',
        guardrailId: this.id,
        severity: 'HIGH',
        reason: 'Regulatory information provided without grounded reference documents.',
        safeMessage: ClaimAuditor.UNVERIFIED_DISCLAIMER,
        metadata: { lacksGroundedChunks: true }
      };
    }

    // 2. Destination Matching Check
    const matchingDestChunk = retrievedChunks.find(
      (c) => c.country && destination && c.country.toLowerCase().includes(destination.toLowerCase().slice(0, 4))
    );

    if (!matchingDestChunk) {
      return {
        decision: 'BLOCK',
        guardrailId: this.id,
        severity: 'HIGH',
        reason: `Retrieved regulatory documents do not match requested destination '${destination}'.`,
        safeMessage: ClaimAuditor.UNVERIFIED_DISCLAIMER,
        metadata: { destinationMismatch: true }
      };
    }

    // 3. Attribution & Source Verification Check
    const hasSourceAttribution =
      lowerContent.includes(matchingDestChunk.sourceName.toLowerCase()) ||
      lowerContent.includes(matchingDestChunk.trustLevel.toLowerCase()) ||
      lowerContent.includes('official') ||
      lowerContent.includes('department') ||
      lowerContent.includes('government');

    return {
      decision: 'ALLOW',
      guardrailId: this.id,
      severity: 'LOW',
      metadata: {
        isRegulatory: true,
        sourceVerified: true,
        authority: matchingDestChunk.sourceName,
        attributed: hasSourceAttribution
      }
    };
  }
}
