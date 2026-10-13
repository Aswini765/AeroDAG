/**
 * AeroDAG ToolSelectionEvaluator (Deterministic)
 * 
 * Verifies that the multi-agent system selected the correct agents and tools
 * for the task according to least-privilege principles and problem requirements.
 */

import { EvaluatorResult, ScenarioExecutionPayload } from '../../types/evalTypes';

export class ToolSelectionEvaluator {
  static evaluate(payload: ScenarioExecutionPayload): EvaluatorResult {
    const { scenario, actualAgentLog } = payload;
    const expected = scenario.expectedOutput;

    if (!expected?.requiredAgents && !expected?.requiredTools && !expected?.forbiddenTools) {
      return {
        evaluatorName: 'ToolSelectionEvaluator',
        passed: true,
        score: 1.0,
        reason: 'No agent or tool expectations defined for this scenario.'
      };
    }

    if (!actualAgentLog) {
      return {
        evaluatorName: 'ToolSelectionEvaluator',
        passed: false,
        score: 0.0,
        reason: 'Missing agent execution log; cannot audit tool selection.'
      };
    }

    const { agentOrder, parallelAgents } = actualAgentLog;
    const executedAgents = [...new Set([...agentOrder, ...parallelAgents])];

    const violations: string[] = [];

    // 1. Required agents
    if (expected.requiredAgents) {
      for (const reqAgent of expected.requiredAgents) {
        if (!executedAgents.includes(reqAgent)) {
          violations.push(`Required agent "${reqAgent}" was not executed (Executed: [${executedAgents.join(', ')}])`);
        }
      }
    }

    // 2. Forbidden tools/agents
    if (expected.forbiddenTools) {
      for (const forb of expected.forbiddenTools) {
        if (executedAgents.includes(forb)) {
          violations.push(`Forbidden agent/tool "${forb}" was improperly executed!`);
        }
      }
    }

    const passed = violations.length === 0;
    const score = passed ? 1.0 : 0.0;

    return {
      evaluatorName: 'ToolSelectionEvaluator',
      passed,
      score,
      reason: passed
        ? `Agent/tool selection verified: Executed agents [${executedAgents.join(', ')}] matched scenario requirements.`
        : `Tool selection failures: ${violations.join('; ')}`,
      details: { executedAgents, violations }
    };
  }
}
