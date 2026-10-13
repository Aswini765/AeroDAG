/**
 * AeroDAG RAG & Trusted Travel Knowledge Domain Types
 * 
 * Defines domain models, knowledge document structures, chunking representations,
 * retrieval queries, source attribution, grounding evaluations, and observability metrics.
 */

import { TripContext } from '../services/requirementEngine';

export type KnowledgeCategory =
  | 'VISA'
  | 'ENTRY_REQUIREMENTS'
  | 'PASSPORT'
  | 'AIRPORT'
  | 'TRANSPORT'
  | 'FAMILY_TRAVEL'
  | 'SENIOR_TRAVEL'
  | 'DESTINATION_INFO'
  | 'TRAVEL_POLICY'
  | 'HEALTH_REQUIREMENTS'
  | 'TRANSIT';

export type TrustLevel =
  | 'TRUSTED_OFFICIAL'
  | 'TRUSTED_GOVERNMENT'
  | 'TRUSTED_EMBASSY'
  | 'TRUSTED_IMMIGRATION_AUTHORITY'
  | 'TRUSTED_INTERNATIONAL_ORGANIZATION'
  | 'TRUSTED_AIRLINE'
  | 'SECONDARY_REFERENCE'
  | 'UNTRUSTED'
  // Backwards compatibility aliases
  | 'OFFICIAL_GOVERNMENT'
  | 'CONSULAR_AUTHORITY'
  | 'AIRPORT_AUTHORITY'
  | 'VERIFIED_PARTNER'
  | 'CURATED_GUIDE';

export type SourceFreshness = 'CURRENT' | 'AGING' | 'STALE' | 'UNKNOWN' | 'EXPIRED' | 'SUPERSEDED';

export type VisaType =
  | 'VISA_FREE'
  | 'VISA_ON_ARRIVAL'
  | 'E_VISA'
  | 'CONSULAR_VISA'
  | 'TRANSIT_VISA'
  | 'ENTRY_PERMIT'
  | 'ETA'
  | 'OTHER'
  | 'UNKNOWN';

export type VisaRequirementStatus = 'REQUIRED' | 'NOT_REQUIRED' | 'CONDITIONAL' | 'UNKNOWN';

export type PassportType = 'ORDINARY' | 'DIPLOMATIC' | 'OFFICIAL' | 'SERVICE' | 'UNKNOWN';

export type RegulatoryClaimStatus =
  | 'SUPPORTED'
  | 'UNSUPPORTED'
  | 'STALE'
  | 'CONFLICTING'
  | 'UNKNOWN';

export interface RegulatorySourceMetadata {
  source: string;
  sourceUrl: string;
  sourceName: string;
  sourceType: string;
  jurisdiction: string;
  country: string;
  publishedAt?: string;
  lastVerifiedAt: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  retrievedAt: string;
  trustLevel: TrustLevel;
  language: string;
  contentHash: string;
  version: string;
  isSuperseded?: boolean;
}

export interface VisaRequirement {
  travelerNationality: string;
  residenceCountry?: string;
  destinationCountry: string;
  destinationRegion?: string;
  passportType: PassportType;
  visaType: VisaType;
  requirement: VisaRequirementStatus;
  eligibility: string;
  durationDays?: number;
  durationDescription?: string;
  entries?: 'SINGLE' | 'DOUBLE' | 'MULTIPLE' | 'UNKNOWN';
  applicationMethod?: 'ONLINE' | 'ON_ARRIVAL' | 'EMBASSY_CONSULATE' | 'VFS_BLS_CENTER' | 'NOT_APPLICABLE' | 'UNKNOWN';
  processingTime?: {
    minimumDays?: number;
    typicalDays?: number;
    maximumDays?: number;
    description?: string;
  };
  fee?: {
    amount: number | 'UNKNOWN';
    currency: string;
    source?: string;
    effectiveDate?: string;
  };
  passportValidity: {
    minMonthsBeyondStay?: number;
    description: string;
    rule: string;
  };
  blankPages?: number | 'UNKNOWN';
  onwardTravel: boolean | 'UNKNOWN';
  proofOfFunds: {
    required: boolean | 'UNKNOWN';
    minAmount?: number;
    currency?: string;
    description?: string;
  };
  accommodationProof?: boolean | 'UNKNOWN';
  insuranceRequirement?: {
    required: boolean | 'UNKNOWN';
    minCoverageUSD?: number;
    description?: string;
  };
  healthRequirements?: string[];
  transitRequirement?: {
    required: boolean | 'UNKNOWN';
    maxTransitHours?: number;
    stayInTransitArea?: boolean;
    description?: string;
  };
  restrictions?: string[];
  source: string;
  sourceUrl: string;
  trustLevel: TrustLevel;
  sourceFreshness: SourceFreshness;
  effectiveFrom?: string;
  effectiveUntil?: string;
  lastVerifiedAt: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNCERTAIN';
  status: 'KNOWN' | 'UNKNOWN' | 'REQUIRES_VERIFICATION' | 'CONFLICTING_SOURCES';
  conflictDetails?: {
    primarySource: string;
    secondarySource: string;
    issue: string;
  };
}

export interface KnowledgeDocument {
  documentId: string;
  title: string;
  country: string;
  destination: string;
  category: KnowledgeCategory;
  sourceName: string;
  sourceUrl?: string;
  lastVerifiedAt: string;
  trustLevel: TrustLevel;
  content: string;
  verificationNote?: string;
  summary?: string;
  tags?: string[];
  sourceMetadata?: RegulatorySourceMetadata;
  visaRequirement?: VisaRequirement;
}

export interface KnowledgeChunk {
  chunkId: string;
  documentId: string;
  title: string;
  text: string;
  destination: string;
  country: string;
  category: KnowledgeCategory;
  sourceName: string;
  sourceUrl?: string;
  lastVerifiedAt: string;
  trustLevel: TrustLevel;
  verificationNote?: string;
}

export interface RetrievedChunk {
  chunk: KnowledgeChunk;
  score: number;
}

export interface KnowledgeQueryFilter {
  destination?: string;
  category?: KnowledgeCategory;
  minTrustLevel?: TrustLevel;
}

export interface RetrievalQuery {
  query: string;
  destination?: string;
  category?: KnowledgeCategory;
  topK?: number;
  minScore?: number;
  tripContext?: TripContext;
}

export interface SourceAttribution {
  documentId: string;
  chunkId: string;
  title: string;
  destination?: string;
  country?: string;
  sourceName: string;
  sourceUrl?: string;
  lastVerifiedAt: string;
  trustLevel: TrustLevel;
  category: KnowledgeCategory;
  verificationNote?: string;
}

export interface GroundingEvaluation {
  isGrounded: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNCERTAIN';
  relevanceScore: number;
  reason: string;
  needsVerification: boolean;
  regulatoryDisclaimer?: string;
}

export interface RagObservability {
  query: string;
  destination?: string;
  retrievedCount: number;
  selectedDocumentIds: string[];
  latencyMs: number;
  groundingValidationPassed: boolean;
}

export interface RagResponse {
  answer: string;
  sources: SourceAttribution[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNCERTAIN';
  isGrounded: boolean;
  needsVerification: boolean;
  verificationNote?: string;
  observability: RagObservability;
}

export interface KnowledgeNeedDecision {
  needsKnowledge: boolean;
  detectedDestination?: string;
  detectedCategory?: KnowledgeCategory;
  reason: string;
  refinedQuery: string;
}
