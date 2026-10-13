/**
 * AeroDAG Regulatory Freshness & Conflict Evaluator
 * 
 * Provides deterministic evaluation of regulatory source freshness,
 * effective date windows, expiration detection, content hash tracking,
 * and multi-source conflict resolution.
 */

import { SourceFreshness, TrustLevel, VisaRequirement } from '../../types/travelKnowledge';

export class FreshnessEvaluator {
  private static readonly CURRENT_THRESHOLD_DAYS = 30;
  private static readonly AGING_THRESHOLD_DAYS = 90;

  /**
   * Evaluates the freshness of a regulatory source based on verification date and effective bounds
   */
  static evaluateFreshness(
    lastVerifiedAt?: string,
    effectiveFrom?: string,
    effectiveUntil?: string,
    referenceDate: Date = new Date()
  ): SourceFreshness {
    const now = referenceDate.getTime();

    // 1. Check explicit expiration date
    if (effectiveUntil) {
      const expTime = Date.parse(effectiveUntil);
      if (!isNaN(expTime) && now > expTime) {
        return 'EXPIRED';
      }
    }

    // 2. Check future effective date
    if (effectiveFrom) {
      const fromTime = Date.parse(effectiveFrom);
      if (!isNaN(fromTime) && now < fromTime) {
        // Effective in future; cannot be treated as currently active
        return 'UNKNOWN';
      }
    }

    // 3. Check verification date
    if (!lastVerifiedAt) {
      return 'UNKNOWN';
    }

    const verifiedTime = Date.parse(lastVerifiedAt);
    if (isNaN(verifiedTime)) {
      return 'UNKNOWN';
    }

    const diffDays = Math.floor((now - verifiedTime) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      // Verification date in future
      return 'UNKNOWN';
    }

    if (diffDays <= this.CURRENT_THRESHOLD_DAYS) {
      return 'CURRENT';
    }
    if (diffDays <= this.AGING_THRESHOLD_DAYS) {
      return 'AGING';
    }
    return 'STALE';
  }

  /**
   * Generates a deterministic hash for regulatory text to track content changes and versioning
   */
  static computeContentHash(content: string): string {
    const normalized = content.replace(/\s+/g, ' ').trim().toLowerCase();
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return `hash-${Math.abs(hash).toString(16)}`;
  }

  /**
   * Returns numeric priority ranking for trust level (lower is more authoritative)
   */
  static getTrustRank(trustLevel: TrustLevel): number {
    switch (trustLevel) {
      case 'TRUSTED_IMMIGRATION_AUTHORITY':
        return 1;
      case 'TRUSTED_GOVERNMENT':
      case 'OFFICIAL_GOVERNMENT':
        return 2;
      case 'TRUSTED_EMBASSY':
      case 'CONSULAR_AUTHORITY':
        return 3;
      case 'TRUSTED_OFFICIAL':
        return 3;
      case 'TRUSTED_INTERNATIONAL_ORGANIZATION':
        return 4;
      case 'TRUSTED_AIRLINE':
      case 'AIRPORT_AUTHORITY':
        return 5;
      case 'SECONDARY_REFERENCE':
      case 'VERIFIED_PARTNER':
      case 'CURATED_GUIDE':
        return 6;
      case 'UNTRUSTED':
      default:
        return 99;
    }
  }

  /**
   * Deterministically resolves multiple candidate visa requirements
   * If two authoritative sources conflict on core legal terms, returns CONFLICTING_SOURCES.
   */
  static resolveConflict(
    primary: VisaRequirement,
    secondary: VisaRequirement
  ): {
    resolved: VisaRequirement;
    isConflicting: boolean;
    conflictReason?: string;
  } {
    const rankA = this.getTrustRank(primary.trustLevel);
    const rankB = this.getTrustRank(secondary.trustLevel);

    // If one is authoritative and the other is secondary/untrusted, authoritative strictly wins
    if (rankA <= 4 && rankB > 4) {
      return { resolved: primary, isConflicting: false };
    }
    if (rankB <= 4 && rankA > 4) {
      return { resolved: secondary, isConflicting: false };
    }

    // Both are authoritative (ranks <= 4)
    // Check if there is an irreconcilable conflict in core rules
    const requirementDiffers = primary.requirement !== secondary.requirement;
    const visaTypeDiffers =
      primary.visaType !== secondary.visaType &&
      primary.visaType !== 'UNKNOWN' &&
      secondary.visaType !== 'UNKNOWN';

    if (requirementDiffers || visaTypeDiffers) {
      const conflictReason = `Conflict between ${primary.source} (${primary.requirement}/${primary.visaType}) and ${secondary.source} (${secondary.requirement}/${secondary.visaType})`;

      const conflictedRecord: VisaRequirement = {
        ...primary,
        status: 'CONFLICTING_SOURCES',
        confidence: 'UNCERTAIN',
        conflictDetails: {
          primarySource: `${primary.source} (${primary.sourceUrl})`,
          secondarySource: `${secondary.source} (${secondary.sourceUrl})`,
          issue: conflictReason
        }
      };

      return {
        resolved: conflictedRecord,
        isConflicting: true,
        conflictReason
      };
    }

    // Both authoritative and agree: choose the higher rank or fresher source
    if (rankA < rankB) {
      return { resolved: primary, isConflicting: false };
    }
    if (rankB < rankA) {
      return { resolved: secondary, isConflicting: false };
    }

    // Same rank: pick the fresher verification date
    const dateA = Date.parse(primary.lastVerifiedAt) || 0;
    const dateB = Date.parse(secondary.lastVerifiedAt) || 0;
    return {
      resolved: dateA >= dateB ? primary : secondary,
      isConflicting: false
    };
  }
}
