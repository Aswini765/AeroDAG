/**
 * AeroDAG RegressionComparator
 * 
 * Compares current evaluation results with a historical baseline.
 * Identifies score deltas, newly regressed scenarios, and fixed failures.
 */

import { EvaluationResult, RegressionComparisonResult } from '../types/evalTypes';

export class RegressionComparator {
  static compare(
    currentResults: EvaluationResult[],
    baselineResults?: EvaluationResult[],
    baselineRunId?: string
  ): RegressionComparisonResult {
    if (!baselineResults || baselineResults.length === 0) {
      return {
        isRegression: false,
        overallScoreDelta: 0,
        regressedScenarios: [],
        fixedScenarios: [],
        summary: 'No historical baseline provided; initialized as primary benchmark run.'
      };
    }

    const baselineMap = new Map<string, EvaluationResult>();
    for (const b of baselineResults) {
      baselineMap.set(b.scenarioId, b);
    }

    const regressedScenarios: Array<{
      scenarioId: string;
      previousStatus: string;
      currentStatus: string;
      scoreDelta: number;
    }> = [];

    const fixedScenarios: Array<{
      scenarioId: string;
      previousStatus: string;
      currentStatus: string;
      scoreDelta: number;
    }> = [];

    let currentScoreSum = 0;
    let baselineScoreSum = 0;
    let comparedCount = 0;

    for (const cur of currentResults) {
      const base = baselineMap.get(cur.scenarioId);
      currentScoreSum += cur.overallScore;

      if (base) {
        comparedCount++;
        baselineScoreSum += base.overallScore;
        const delta = cur.overallScore - base.overallScore;

        if (base.status === 'PASS' && cur.status === 'FAIL') {
          regressedScenarios.push({
            scenarioId: cur.scenarioId,
            previousStatus: base.status,
            currentStatus: cur.status,
            scoreDelta: delta
          });
        } else if (base.status === 'FAIL' && cur.status === 'PASS') {
          fixedScenarios.push({
            scenarioId: cur.scenarioId,
            previousStatus: base.status,
            currentStatus: cur.status,
            scoreDelta: delta
          });
        }
      }
    }

    const curAvg = currentResults.length > 0 ? currentScoreSum / currentResults.length : 0;
    const baseAvg = comparedCount > 0 ? baselineScoreSum / comparedCount : curAvg;
    const overallScoreDelta = curAvg - baseAvg;

    const isRegression = regressedScenarios.length > 0 || overallScoreDelta < -0.05;

    let summary = '';
    if (isRegression) {
      summary = `REGRESSION DETECTED: ${regressedScenarios.length} scenario(s) regressed from PASS to FAIL. Overall score delta: ${(overallScoreDelta * 100).toFixed(1)}%.`;
    } else if (fixedScenarios.length > 0) {
      summary = `IMPROVEMENT: ${fixedScenarios.length} scenario(s) improved from FAIL to PASS. Zero regressions detected.`;
    } else {
      summary = `STABLE: Performance is consistent with baseline. Zero regressed scenarios.`;
    }

    return {
      isRegression,
      baselineRunId,
      overallScoreDelta,
      regressedScenarios,
      fixedScenarios,
      summary
    };
  }
}
