/**
 * AeroDAG RequirementEvaluator (Deterministic)
 * 
 * Validates conversational requirement extraction against ground-truth expected parameters:
 * origin, destination, duration, party counts, budget, and readiness.
 */

import { EvaluatorResult, ScenarioExecutionPayload } from '../../types/evalTypes';

export class RequirementEvaluator {
  static evaluate(payload: ScenarioExecutionPayload): EvaluatorResult {
    const { scenario, actualRequirements } = payload;
    const expected = scenario.expectedOutput;

    if (!expected) {
      return {
        evaluatorName: 'RequirementEvaluator',
        passed: true,
        score: 1.0,
        reason: 'No requirement extraction expectations defined for this scenario.'
      };
    }

    if (!actualRequirements) {
      return {
        evaluatorName: 'RequirementEvaluator',
        passed: false,
        score: 0.0,
        reason: 'No extracted requirements returned from execution.'
      };
    }

    const checks: Array<{ name: string; passed: boolean; detail: string }> = [];

    if (expected.destination) {
      const match = (actualRequirements.destination || '')
        .toLowerCase()
        .includes(expected.destination.toLowerCase());
      checks.push({
        name: 'destination',
        passed: match,
        detail: `Expected destination containing "${expected.destination}", got "${actualRequirements.destination}"`
      });
    }

    if (expected.origin) {
      const match = (actualRequirements.origin || '')
        .toLowerCase()
        .includes(expected.origin.toLowerCase());
      checks.push({
        name: 'origin',
        passed: match,
        detail: `Expected origin containing "${expected.origin}", got "${actualRequirements.origin}"`
      });
    }

    if (expected.durationDays !== undefined) {
      const match = actualRequirements.durationDays === expected.durationDays;
      checks.push({
        name: 'durationDays',
        passed: match,
        detail: `Expected ${expected.durationDays} days, got ${actualRequirements.durationDays}`
      });
    }

    if (expected.budgetTotalINR !== undefined) {
      const match = actualRequirements.budgetTotalINR === expected.budgetTotalINR;
      checks.push({
        name: 'budgetTotalINR',
        passed: match,
        detail: `Expected ₹${expected.budgetTotalINR}, got ₹${actualRequirements.budgetTotalINR}`
      });
    }

    if (expected.travellers) {
      if (expected.travellers.adults !== undefined) {
        const match = actualRequirements.adultsCount === expected.travellers.adults;
        checks.push({
          name: 'adultsCount',
          passed: match,
          detail: `Expected ${expected.travellers.adults} adults, got ${actualRequirements.adultsCount}`
        });
      }
      if (expected.travellers.children !== undefined) {
        const match = actualRequirements.childrenCount === expected.travellers.children;
        checks.push({
          name: 'childrenCount',
          passed: match,
          detail: `Expected ${expected.travellers.children} children, got ${actualRequirements.childrenCount}`
        });
      }
      if (expected.travellers.seniors !== undefined) {
        const match = actualRequirements.seniorsCount === expected.travellers.seniors;
        checks.push({
          name: 'seniorsCount',
          passed: match,
          detail: `Expected ${expected.travellers.seniors} seniors, got ${actualRequirements.seniorsCount}`
        });
      }
      if (expected.travellers.total !== undefined) {
        const actualTotal =
          actualRequirements.totalTravellers ||
          (actualRequirements.adultsCount || 0) +
            (actualRequirements.childrenCount || 0) +
            (actualRequirements.seniorsCount || 0);
        const match = actualTotal === expected.travellers.total;
        checks.push({
          name: 'totalTravellers',
          passed: match,
          detail: `Expected ${expected.travellers.total} total travellers, got ${actualTotal}`
        });
      }
    }

    const passedChecks = checks.filter((c) => c.passed).length;
    const totalChecks = checks.length;
    const score = totalChecks > 0 ? passedChecks / totalChecks : 1.0;
    const failedChecks = checks.filter((c) => !c.passed);

    return {
      evaluatorName: 'RequirementEvaluator',
      passed: score >= 0.85,
      score,
      reason:
        failedChecks.length === 0
          ? `All ${totalChecks} requirement extraction criteria verified.`
          : `Requirement extraction mismatches: ${failedChecks.map((f) => f.detail).join('; ')}`,
      details: { checks }
    };
  }
}
