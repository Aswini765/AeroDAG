/**
 * AeroDAG AI Evaluation Harness — Domain Types & Contracts
 * 
 * Provides strongly-typed data contracts for offline benchmarking,
 * deterministic evaluators, LLM-as-Judge, red-teaming, and regression tracking.
 */

import { TripContext } from '../../../src/services/requirementEngine';
import { TripPlan } from '../../../src/types/travelBooking';
import { RagResponse } from '../../../src/types/travelKnowledge';
import { OrchestrationExecutionLog } from '../../../src/services/agents/orchestrator';
import { GuardrailEvent } from '../../../src/services/guardrails/types';

export type EvaluationCategory =
  | 'REQUIREMENT_EXTRACTION'
  | 'TRIP_PLANNING'
  | 'BUDGET'
  | 'RAG'
  | 'AGENT_TOOL_EXECUTION'
  | 'FAILURE_RECOVERY'
  | 'SAFETY_RED_TEAM'
  | 'REPLANNING';

export type HardFailureType =
  | 'FABRICATED_BOOKING_CONFIRMATION'
  | 'UNAUTHORIZED_TOOL_EXECUTION'
  | 'CRITICAL_PII_LEAKAGE'
  | 'FABRICATED_REGULATORY_CLAIM'
  | 'DETERMINISTIC_BUDGET_CORRUPTION'
  | 'SEVERE_CONSTRAINT_VIOLATION'
  | 'PROMPT_INJECTION_BYPASS';

export interface ExpectedTravellers {
  total?: number;
  adults?: number;
  children?: number;
  seniors?: number;
}

export interface ExpectedOutputConstraints {
  destination?: string;
  origin?: string;
  durationDays?: number;
  travellers?: ExpectedTravellers;
  budgetTotalINR?: number;
  maxAllowedBudgetINR?: number;
  minAllowedBudgetINR?: number;
  requiredTools?: string[];
  forbiddenTools?: string[];
  requiredAgents?: string[];
  expectedStatus?: string;
  mustContainText?: string[];
  mustNotContainText?: string[];
  shouldBeGrounded?: boolean;
  expectedConfidence?: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNCERTAIN';
  expectedAuthoritySources?: string[];
  shouldBlock?: boolean;
  blockedReasonPattern?: string;
  shouldRedactPII?: boolean;
  expectedHardFailureType?: HardFailureType;
  budgetTolerancePercentage?: number;
  shouldBeReadyToPlan?: boolean;
}

export interface ScenarioConstraints {
  maxHotelCapacity?: number;
  maxWalkingPacing?: string;
  childMinAge?: number;
  maxBudgetINR?: number;
  deterministicMathMustMatch?: boolean;
}

export interface ScenarioEvaluatorConfig {
  useDeterministicEvaluators?: boolean;
  useRagEvaluator?: boolean;
  useLlmJudge?: boolean;
  customCriteria?: string[];
}

export interface EvaluationScenario {
  id: string;
  category: EvaluationCategory;
  description: string;
  input: string | Record<string, unknown>;
  context?: TripContext;
  expectedBehavior: string;
  expectedOutput?: ExpectedOutputConstraints;
  constraints?: ScenarioConstraints;
  evaluatorConfig?: ScenarioEvaluatorConfig;
  tags?: string[];
}

export interface EvaluatorResult {
  evaluatorName: string;
  passed: boolean;
  score: number; // 0.0 - 1.0
  reason: string;
  details?: Record<string, unknown>;
  hardFailure?: HardFailureType;
}

export type LLMJudgeStatus = 'COMPLETED' | 'NOT_RUN' | 'ERROR' | 'SKIPPED' | 'RUN';

export type LLMJudgeErrorType =
  | 'MODEL_UNAVAILABLE'
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'AUTH_ERROR'
  | 'MALFORMED_OUTPUT'
  | 'UNKNOWN';

export interface CriterionJudgeScore {
  score: number; // 0 - 10
  reason: string;
}

export interface JudgeCriteriaBreakdown {
  factual_grounding: CriterionJudgeScore;
  constraint_satisfaction: CriterionJudgeScore;
  itinerary_coherence: CriterionJudgeScore;
  traveller_suitability: CriterionJudgeScore;
  helpfulness: CriterionJudgeScore;
  safety_compliance: CriterionJudgeScore;
  [key: string]: CriterionJudgeScore | undefined;
}

export interface StructuredJudgeResult {
  overall_score?: number | null; // 0 - 10, or null if NOT_RUN / ERROR
  score?: number | null; // 0.0 - 1.0 (backward compatibility)
  pass?: boolean;
  confidence: number; // 0.0 - 1.0
  criteria?: {
    factual_grounding?: number | CriterionJudgeScore;
    constraint_satisfaction?: number | CriterionJudgeScore;
    itinerary_coherence?: number | CriterionJudgeScore;
    traveller_suitability?: number | CriterionJudgeScore;
    response_helpfulness?: number | CriterionJudgeScore;
    helpfulness?: number | CriterionJudgeScore;
    safety_compliance?: number | CriterionJudgeScore;
    [key: string]: any;
  };
  explanation?: string;
  provider?: string;
  model?: string;
  status: LLMJudgeStatus;
  errorType?: LLMJudgeErrorType;
  errorMessage?: string;
  judgeLatencyMs?: number;
  timestamp?: string;
  modelUsed?: string;
}

export interface EvaluationResult {
  scenarioId: string;
  category: EvaluationCategory;
  status: 'PASS' | 'FAIL' | 'WARNING';
  overallScore: number;
  hardFailures: HardFailureType[];
  failures: string[];
  warnings: string[];
  evaluatorResults: EvaluatorResult[];
  latencyMs: number;
  judgeLatencyMs?: number;
  totalEvaluationLatencyMs?: number;
  llmJudgeStatus: LLMJudgeStatus;
  llmJudgeResult?: StructuredJudgeResult | null;
  tokens?: {
    input: number | null;
    output: number | null;
    total: number | null;
  };
  metadata?: Record<string, unknown>;
}

export interface EvaluationScoringConfig {
  weights: {
    requirementExtraction: number;
    constraintSatisfaction: number;
    budgetAccuracy: number;
    ragGroundedness: number;
    agentToolCorrectness: number;
    safety: number;
    itineraryQuality: number;
    responseHelpfulness: number;
  };
  thresholds: {
    overallPassScore: number;       // default: 0.80
    safetyThreshold: number;         // default: 0.90
    groundednessThreshold: number;   // default: 0.85
    constraintThreshold: number;     // default: 0.90
    maxAllowedHardFailures: number;  // default: 0
  };
}

export interface EvaluationSuite {
  id: string;
  name: string;
  version: string;
  description: string;
  scenarios: EvaluationScenario[];
}

export interface CategoryMetric {
  category: EvaluationCategory;
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  averageScore: number;
  hardFailuresCount: number;
}

export interface AggregateMetrics {
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  skippedScenarios: number;
  overallScore: number;
  categoryMetrics: Record<EvaluationCategory, CategoryMetric>;
  hardFailures: Array<{ scenarioId: string; type: HardFailureType; reason: string }>;
  redTeamMetrics?: {
    totalAttacks: number;
    blockedAttacks: number;
    blockRate: number;
  };
  latencyStats: {
    averageMs: number;
    minMs: number;
    maxMs: number;
    p95Ms: number;
  };
  tokenUsage?: {
    totalInputTokens: number | null;
    totalOutputTokens: number | null;
    totalTokens: number | null;
  };
}

export interface RegressionComparisonResult {
  isRegression: boolean;
  baselineRunId?: string;
  overallScoreDelta: number;
  regressedScenarios: Array<{
    scenarioId: string;
    previousStatus: string;
    currentStatus: string;
    scoreDelta: number;
  }>;
  fixedScenarios: Array<{
    scenarioId: string;
    previousStatus: string;
    currentStatus: string;
    scoreDelta: number;
  }>;
  summary: string;
}

export interface EvaluationRun {
  runId: string;
  suiteId: string;
  suiteVersion: string;
  timestamp: string;
  codeVersion?: string;
  scoringConfig: EvaluationScoringConfig;
  results: EvaluationResult[];
  aggregateMetrics: AggregateMetrics;
  regressionStatus: RegressionComparisonResult;
}

export interface ScenarioExecutionPayload {
  scenario: EvaluationScenario;
  actualTripPlan?: TripPlan | null;
  actualRequirements?: Partial<TripContext> | null;
  actualNextQuestion?: any;
  actualRagResponse?: RagResponse | null;
  actualInputGuardrailDecision?: any | null;
  actualAgentLog?: OrchestrationExecutionLog | null;
  actualError?: Error | null;
  capturedGuardrailEvents: GuardrailEvent[];
  latencyMs: number;
}
