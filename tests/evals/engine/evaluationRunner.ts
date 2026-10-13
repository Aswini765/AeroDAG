/**
 * AeroDAG EvaluationRunner
 * 
 * Top-level coordinator that runs an entire benchmark suite, collects results,
 * aggregates scores, and evaluates regressions against historical baselines.
 */

import {
  EvaluationRun,
  EvaluationScoringConfig,
  EvaluationSuite
} from '../types/evalTypes';
import { benchmarkSuiteV1, defaultScoringConfig } from '../dataset/benchmarkSuiteV1';
import { ScenarioRunner } from './scenarioRunner';
import { EvaluationEngine } from './evaluationEngine';
import { ScoreAggregator } from './scoreAggregator';
import { RegressionComparator } from './regressionComparator';

export class EvaluationRunner {
  static async runSuite(
    suite: EvaluationSuite = benchmarkSuiteV1,
    config: EvaluationScoringConfig = defaultScoringConfig,
    baselineRun?: EvaluationRun
  ): Promise<EvaluationRun> {
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const results = [];

    for (const scenario of suite.scenarios) {
      // 1. Run scenario in isolated context
      const payload = await ScenarioRunner.runScenario(scenario);

      // 2. Evaluate output using deterministic evaluators + LLM judge
      const result = await EvaluationEngine.evaluateScenario(payload);
      results.push(result);
    }

    // 3. Aggregate metrics across all scenario results
    const aggregateMetrics = ScoreAggregator.aggregate(results, config);

    // 4. Compare against baseline if available
    const regressionStatus = RegressionComparator.compare(
      results,
      baselineRun?.results,
      baselineRun?.runId
    );

    return {
      runId,
      suiteId: suite.id,
      suiteVersion: suite.version,
      timestamp: new Date().toISOString(),
      codeVersion: '1.0.0-phase6',
      scoringConfig: config,
      results,
      aggregateMetrics,
      regressionStatus
    };
  }
}
