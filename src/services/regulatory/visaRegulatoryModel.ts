/**
 * AeroDAG Visa & Regulatory Canonical Model & Normalizers
 * 
 * Implements deterministic builders, normalizers, user-facing language formatters,
 * and sensitive passport/credential redaction for visa and entry requirements.
 */

import {
  VisaRequirement,
  VisaType,
  VisaRequirementStatus,
  PassportType,
  TrustLevel
} from '../../types/travelKnowledge';
import { FreshnessEvaluator } from './freshnessEvaluator';

export class VisaRegulatoryModel {
  private static readonly PASSPORT_REGEX = /\b[A-PR-WYa-pr-wy][1-9]\d\s?\d{4}[1-9]\b/g;
  private static readonly GENERIC_PASSPORT_REGEX = /\b(?:passport\s*(?:no|num|number)?\s*[:#]?\s*)([A-Z0-9]{7,10})\b/gi;
  private static readonly APPLICATION_ID_REGEX = /\b(?:application|visa|case)\s*(?:id|number|no|ref)?\s*[:#]?\s*([A-Z0-9]{8,15})\b/gi;

  /**
   * Normalizes partial or raw data into a strictly structured VisaRequirement
   */
  static normalize(raw: Partial<VisaRequirement>): VisaRequirement {
    const travelerNationality = (raw.travelerNationality || 'UNKNOWN').toUpperCase().trim();
    const destinationCountry = (raw.destinationCountry || 'UNKNOWN').trim();
    const passportType: PassportType = raw.passportType || 'ORDINARY';
    const visaType: VisaType = raw.visaType || 'UNKNOWN';
    const requirement: VisaRequirementStatus = raw.requirement || 'UNKNOWN';
    const trustLevel: TrustLevel = raw.trustLevel || 'SECONDARY_REFERENCE';

    const lastVerifiedAt = raw.lastVerifiedAt || new Date().toISOString().split('T')[0];
    const sourceFreshness = FreshnessEvaluator.evaluateFreshness(
      raw.lastVerifiedAt,
      raw.effectiveFrom,
      raw.effectiveUntil
    );

    const isAuthoritative = FreshnessEvaluator.getTrustRank(trustLevel) <= 4;
    const status = raw.status || (isAuthoritative && requirement !== 'UNKNOWN' ? 'KNOWN' : 'REQUIRES_VERIFICATION');

    return {
      travelerNationality,
      residenceCountry: raw.residenceCountry,
      destinationCountry,
      destinationRegion: raw.destinationRegion,
      passportType,
      visaType,
      requirement,
      eligibility: raw.eligibility || 'Eligibility criteria must be verified with consular authorities.',
      durationDays: raw.durationDays,
      durationDescription: raw.durationDescription,
      entries: raw.entries || 'UNKNOWN',
      applicationMethod: raw.applicationMethod || 'UNKNOWN',
      processingTime: raw.processingTime,
      fee: raw.fee || { amount: 'UNKNOWN', currency: 'UNKNOWN' },
      passportValidity: raw.passportValidity || {
        description: 'Standard 6-month passport validity beyond intended departure required.',
        rule: '6_MONTHS_BEYOND_DEPARTURE'
      },
      blankPages: raw.blankPages !== undefined ? raw.blankPages : 'UNKNOWN',
      onwardTravel: raw.onwardTravel !== undefined ? raw.onwardTravel : 'UNKNOWN',
      proofOfFunds: raw.proofOfFunds || { required: 'UNKNOWN' },
      accommodationProof: raw.accommodationProof !== undefined ? raw.accommodationProof : 'UNKNOWN',
      insuranceRequirement: raw.insuranceRequirement || { required: 'UNKNOWN' },
      healthRequirements: raw.healthRequirements || [],
      transitRequirement: raw.transitRequirement || { required: 'UNKNOWN' },
      restrictions: raw.restrictions || [],
      source: raw.source || 'Official Consular Portal',
      sourceUrl: raw.sourceUrl || 'https://example.com/unverified',
      trustLevel,
      sourceFreshness,
      effectiveFrom: raw.effectiveFrom,
      effectiveUntil: raw.effectiveUntil,
      lastVerifiedAt,
      confidence: isAuthoritative ? (sourceFreshness === 'CURRENT' ? 'HIGH' : 'MEDIUM') : 'UNCERTAIN',
      status,
      conflictDetails: raw.conflictDetails
    };
  }

  /**
   * Generates safe, verified user-facing language adhering strictly to Section 21 guidelines
   */
  static formatUserFacingGuidance(req: VisaRequirement): string {
    // 1. Conflicting sources
    if (req.status === 'CONFLICTING_SOURCES') {
      return (
        'I found conflicting official information regarding visa requirements for your trip. ' +
        'Please verify directly with the destination immigration authority or official embassy before travel.'
      );
    }

    // 2. Unknown requirement
    if (req.status === 'UNKNOWN' || req.requirement === 'UNKNOWN') {
      return (
        `I couldn't verify the current visa requirement for ${req.destinationCountry} from a trusted source. ` +
        'Please check the official consulate or immigration website.'
      );
    }

    // 3. Stale information
    if (req.sourceFreshness === 'STALE' || req.sourceFreshness === 'EXPIRED') {
      return (
        'Visa information may have changed. The latest verified source available to AeroDAG is older than the ' +
        `configured freshness window (${req.lastVerifiedAt}). Please verify with the official source (${req.sourceUrl}).`
      );
    }

    // 4. Authoritative verified response
    const nat = req.travelerNationality;
    const dest = req.destinationCountry;
    let typeDesc = '';
    switch (req.visaType) {
      case 'VISA_FREE':
        typeDesc = `eligible for visa-free entry${req.durationDays ? ` for up to ${req.durationDays} days` : ''}`;
        break;
      case 'VISA_ON_ARRIVAL':
        typeDesc = `eligible for Visa on Arrival (VoA)${req.durationDays ? ` for up to ${req.durationDays} days` : ''}`;
        break;
      case 'E_VISA':
        typeDesc = `required to obtain an electronic visa (e-Visa) prior to departure`;
        break;
      case 'CONSULAR_VISA':
        typeDesc = `required to obtain a consular sticker visa prior to departure`;
        break;
      default:
        typeDesc = `subject to entry protocols (${req.requirement})`;
    }

    let validityNote = '';
    if (req.passportValidity?.description) {
      validityNote = ` Passport requirement: ${req.passportValidity.description}.`;
    }

    return (
      `Based on the official source currently available (${req.source}), travelers with an ${nat} passport ` +
      `are listed as ${typeDesc}.${validityNote} (Verified: ${req.lastVerifiedAt})`
    );
  }

  /**
   * Redacts sensitive passport numbers, application numbers, and personal identifiers
   */
  static redactSensitiveData(text: string): string {
    if (!text || typeof text !== 'string') return text;
    let redacted = text.replace(this.PASSPORT_REGEX, '[REDACTED_PASSPORT]');
    redacted = redacted.replace(this.GENERIC_PASSPORT_REGEX, 'passport [REDACTED_PASSPORT]');
    redacted = redacted.replace(this.APPLICATION_ID_REGEX, 'application [REDACTED_APPLICATION_ID]');
    return redacted;
  }
}
