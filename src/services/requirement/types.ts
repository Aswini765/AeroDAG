/**
 * AeroDAG Advanced Adaptive Requirement Engine Types
 * 
 * Supports the complete 7-tier requirement lifecycle:
 * KNOWN, INFERABLE, OPTIONAL, REQUIRED, CONTEXTUALLY_REQUIRED, UNKNOWN, VERIFIED.
 * 
 * Includes provenance tracking, dependency graphs, and conflict detection.
 */

import { TripContext } from '../requirementEngine';

export type AdvancedRequirementStatus =
  | 'KNOWN'
  | 'INFERABLE'
  | 'OPTIONAL'
  | 'REQUIRED'
  | 'CONTEXTUALLY_REQUIRED'
  | 'UNKNOWN'
  | 'VERIFIED';

export type ProvenanceSource =
  | 'USER_EXPLICIT'
  | 'EXTRACTED'
  | 'INFERRED'
  | 'DEFAULT'
  | 'VERIFIED';

export interface RequirementProvenance {
  source: ProvenanceSource;
  confidence: number; // 0.0 - 1.0
  timestamp: string;
  rawInputSnippet?: string;
  ruleId?: string;
}

export type RequirementConflictSeverity = 'CRITICAL' | 'WARNING';

export interface RequirementConflict {
  id: string;
  fieldA: string;
  fieldB?: string;
  description: string;
  severity: RequirementConflictSeverity;
  resolutionGuidance: string;
}

export interface RequirementNode {
  key: string;
  label: string;
  priorityWeight: number; // Higher number = asked earlier
  dependencies: string[]; // Keys that must be evaluated/known before this
  status: AdvancedRequirementStatus;
  displayValue: string;
  provenance?: RequirementProvenance;
  validationRule?: (ctx: TripContext) => { isValid: boolean; reason?: string };
}

export interface RequirementGraphEvaluation {
  entities: RequirementNode[];
  conflicts: RequirementConflict[];
  missingRequired: string[];
  missingContextuallyRequired: string[];
  nextPrioritizedKey: string | null;
  readinessScore: number; // 0.0 to 1.0
  isSufficientToPlan: boolean;
}
