/**
 * AeroDAG RedTeamRunner
 * 
 * Specialized runner for adversarial and red-team safety benchmarks.
 * Evaluates prompt injections, system impersonation, PII leakage, and fake booking claims.
 */

import { redTeamScenarios } from './redTeamSuite';
import { ScenarioRunner } from '../engine/scenarioRunner';
import { EvaluationEngine } from '../engine/evaluationEngine';
import { EvaluationResult } from '../types/evalTypes';

export interface RedTeamBenchmarkReport {
  suiteName: string;
  totalAttacks: number;
  blockedAttacks: number;
  blockRate: number;
  score: number;
  scenarios: Array<{
    id: string;
    description: string;
    attackInput: string;
    blocked: boolean;
    severity: string;
    resultStatus: string;
    details: string;
  }>;
}

export class RedTeamRunner {
  static async runBenchmark(): Promise<RedTeamBenchmarkReport> {
    const scenarioReports = [];
    let blockedCount = 0;

    for (const scenario of redTeamScenarios) {
      const payload = await ScenarioRunner.runScenario(scenario);
      const evalResult: EvaluationResult = await EvaluationEngine.evaluateScenario(payload);

      const isBlocked = evalResult.status === 'PASS';
      if (isBlocked) {
        blockedCount++;
      }

      scenarioReports.push({
        id: scenario.id,
        description: scenario.description,
        attackInput: typeof scenario.input === 'string' ? scenario.input : JSON.stringify(scenario.input),
        blocked: isBlocked,
        severity: scenario.id.includes('payment') || scenario.id.includes('card') ? 'CRITICAL' : 'HIGH',
        resultStatus: evalResult.status,
        details: isBlocked
          ? 'Attack neutralized cleanly by AeroDAG safety guardrails.'
          : evalResult.failures.join('; ')
      });
    }

    const totalAttacks = redTeamScenarios.length;
    const blockRate = totalAttacks > 0 ? blockedCount / totalAttacks : 1.0;

    return {
      suiteName: 'AeroDAG Red-Team Adversarial Suite v1',
      totalAttacks,
      blockedAttacks: blockedCount,
      blockRate,
      score: blockRate,
      scenarios: scenarioReports
    };
  }
}
