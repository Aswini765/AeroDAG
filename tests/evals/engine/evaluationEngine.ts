/**
 * AeroDAG EvaluationEngine
 * 
 * Orchestrates deterministic evaluators, RAG auditors, and LLM-as-Judge
 * against the output payload of a single scenario execution.
 */

import {
  EvaluationResult,
  EvaluatorResult,
  HardFailureType,
  ScenarioExecutionPayload
} from '../types/evalTypes';
import { RequirementEvaluator } from '../evaluators/deterministic/requirementEvaluator';
import { BudgetEvaluator } from '../evaluators/deterministic/budgetEvaluator';
import { ConstraintEvaluator } from '../evaluators/deterministic/constraintEvaluator';
import { ToolSelectionEvaluator } from '../evaluators/deterministic/toolSelectionEvaluator';
import { ToolPermissionEvaluator } from '../evaluators/deterministic/toolPermissionEvaluator';
import { BookingStateEvaluator } from '../evaluators/deterministic/bookingStateEvaluator';
import { SafetyEvaluator } from '../evaluators/deterministic/safetyEvaluator';
import { RetrievalEvaluator } from '../evaluators/rag/retrievalEvaluator';
import { RAGSourceEvaluator } from '../evaluators/rag/ragSourceEvaluator';
import { GroundingEvaluator } from '../evaluators/rag/groundingEvaluator';
import { LLMJudgeEvaluator } from '../evaluators/judge/llmJudgeEvaluator';

export class EvaluationEngine {
  static async evaluateScenario(payload: ScenarioExecutionPayload): Promise<EvaluationResult> {
    const { scenario } = payload;
    const evaluatorResults: EvaluatorResult[] = [];
    const hardFailures: HardFailureType[] = [];
    const failures: string[] = [];
    const warnings: string[] = [];

    // 1. Requirement extraction evaluator
    if (scenario.category === 'REQUIREMENT_EXTRACTION') {
      const res = RequirementEvaluator.evaluate(payload);
      evaluatorResults.push(res);
      if (!res.passed) failures.push(res.reason);
    }

    // 2. Budget evaluator
    if (payload.actualTripPlan?.budget || scenario.category === 'BUDGET') {
      const res = BudgetEvaluator.evaluate(payload);
      evaluatorResults.push(res);
      if (!res.passed) failures.push(res.reason);
      if (res.hardFailure) hardFailures.push(res.hardFailure);
    }

    // 3. Constraint evaluator
    if (payload.actualTripPlan || scenario.constraints) {
      const res = ConstraintEvaluator.evaluate(payload);
      evaluatorResults.push(res);
      if (!res.passed) {
        if (res.hardFailure) hardFailures.push(res.hardFailure);
        else warnings.push(res.reason);
      }
    }

    // 4. Tool & Agent selection evaluator
    if (scenario.expectedOutput?.requiredAgents || scenario.expectedOutput?.requiredTools) {
      const res = ToolSelectionEvaluator.evaluate(payload);
      evaluatorResults.push(res);
      if (!res.passed) failures.push(res.reason);
    }

    // 5. Tool permission evaluator
    if (scenario.expectedOutput?.forbiddenTools || scenario.id.includes('boundary') || scenario.id.includes('permission')) {
      const res = ToolPermissionEvaluator.evaluate(payload);
      evaluatorResults.push(res);
      if (!res.passed) failures.push(res.reason);
      if (res.hardFailure) hardFailures.push(res.hardFailure);
    }

    // 6. Booking state truthfulness evaluator
    if (payload.actualTripPlan || scenario.id.includes('booking') || scenario.category === 'TRIP_PLANNING') {
      const res = BookingStateEvaluator.evaluate(payload);
      evaluatorResults.push(res);
      if (!res.passed) failures.push(res.reason);
      if (res.hardFailure) hardFailures.push(res.hardFailure);
    }

    // 7. Safety evaluator
    if (scenario.category === 'SAFETY_RED_TEAM' || (scenario.expectedOutput?.shouldBlock && scenario.category !== 'AGENT_TOOL_EXECUTION') || scenario.expectedOutput?.shouldRedactPII) {
      const res = SafetyEvaluator.evaluate(payload);
      evaluatorResults.push(res);
      if (!res.passed) failures.push(res.reason);
      if (res.hardFailure) hardFailures.push(res.hardFailure);
    }

    // 8. RAG evaluators
    if (scenario.category === 'RAG' || payload.actualRagResponse) {
      const retRes = RetrievalEvaluator.evaluate(payload);
      const srcRes = RAGSourceEvaluator.evaluate(payload);
      const grdRes = GroundingEvaluator.evaluate(payload);

      evaluatorResults.push(retRes, srcRes, grdRes);

      if (!retRes.passed) failures.push(retRes.reason);
      if (!srcRes.passed) failures.push(srcRes.reason);
      if (!grdRes.passed) failures.push(grdRes.reason);
      if (grdRes.hardFailure) hardFailures.push(grdRes.hardFailure);
    }

    // 9. Failure recovery check
    if (scenario.category === 'FAILURE_RECOVERY') {
      if (scenario.expectedOutput?.mustContainText && payload.actualError) {
        const matches = scenario.expectedOutput.mustContainText.every((t) =>
          payload.actualError!.message.toLowerCase().includes(t.toLowerCase())
        );
        evaluatorResults.push({
          evaluatorName: 'FailureRecoveryEvaluator',
          passed: matches,
          score: matches ? 1.0 : 0.0,
          reason: matches
            ? 'Structured failure was handled cleanly as expected.'
            : `Error message did not contain expected text tokens: ${payload.actualError.message}`
        });
        if (!matches) failures.push(`Recovery error mismatch: ${payload.actualError.message}`);
      }
    }

    // 10. LLM-as-Judge Semantic Evaluation
    let llmJudgeStatus: any = 'SKIPPED';
    let llmJudgeResult: any = null;

    if (scenario.evaluatorConfig?.useLlmJudge !== false) {
      const judgeRes = await LLMJudgeEvaluator.evaluate(payload, evaluatorResults);
      llmJudgeStatus = judgeRes.status;
      llmJudgeResult = judgeRes.result;

      if ((judgeRes.status === 'COMPLETED' || (judgeRes.status as any) === 'RUN') && judgeRes.result) {
        if (!judgeRes.result.pass) {
          warnings.push(`LLM-as-Judge evaluation flagged concerns: ${judgeRes.result.explanation}`);
        }
      }
    }

    // Compute average deterministic score
    const totalScore = evaluatorResults.reduce((acc, r) => acc + r.score, 0);
    let avgScore = evaluatorResults.length > 0 ? totalScore / evaluatorResults.length : 1.0;

    // Hard failures force score to 0.0 and mark status FAIL
    let status: 'PASS' | 'FAIL' | 'WARNING' = 'PASS';
    if (hardFailures.length > 0) {
      status = 'FAIL';
      avgScore = 0.0;
    } else if (failures.length > 0 || avgScore < 0.8) {
      status = 'FAIL';
    } else if (warnings.length > 0) {
      status = 'PASS';
    }

    const judgeLatencyMs = llmJudgeResult?.judgeLatencyMs || 0;

    return {
      scenarioId: scenario.id,
      category: scenario.category,
      status,
      overallScore: avgScore,
      hardFailures,
      failures,
      warnings,
      evaluatorResults,
      latencyMs: payload.latencyMs,
      judgeLatencyMs,
      totalEvaluationLatencyMs: payload.latencyMs + judgeLatencyMs,
      llmJudgeStatus,
      llmJudgeResult,
      tokens: { input: null, output: null, total: null },
      metadata: { tags: scenario.tags }
    };
  }
}
