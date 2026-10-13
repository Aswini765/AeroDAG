/**
 * AeroDAG BudgetEvaluator (Deterministic)
 * 
 * Single source of truth mathematical auditor.
 * Validates grand total, component summations, remaining budget, and overages.
 * Flags DETERMINISTIC_BUDGET_CORRUPTION as a HARD FAILURE if tampered or corrupt.
 */

import { EvaluatorResult, ScenarioExecutionPayload } from '../../types/evalTypes';

export class BudgetEvaluator {
  static evaluate(payload: ScenarioExecutionPayload): EvaluatorResult {
    const { scenario, actualTripPlan } = payload;
    const expected = scenario.expectedOutput;

    if (!actualTripPlan) {
      if (scenario.category === 'BUDGET') {
        return {
          evaluatorName: 'BudgetEvaluator',
          passed: false,
          score: 0.0,
          reason: 'No trip plan available to evaluate financial calculations.'
        };
      }
      return {
        evaluatorName: 'BudgetEvaluator',
        passed: true,
        score: 1.0,
        reason: 'No trip plan in payload; budget audit skipped.'
      };
    }

    const { budget } = actualTripPlan;
    if (!budget) {
      return {
        evaluatorName: 'BudgetEvaluator',
        passed: false,
        score: 0.0,
        reason: 'Trip plan missing budget object.'
      };
    }

    // 1. Deterministic arithmetic verification
    const flightsCost = budget.flightsCostINR ?? (budget as any).flightsINR ?? 0;
    const hotelCost = budget.hotelCostINR ?? (budget as any).hotelINR ?? 0;
    const transportCost = budget.transportCostINR ?? (budget as any).transportINR ?? 0;
    const activitiesCost = budget.activitiesCostINR ?? (budget as any).activitiesINR ?? 0;
    const diningCost = budget.diningEstimateINR ?? (budget as any).diningINR ?? 0;
    const otherCost = budget.otherCostsINR ?? 0;
    const targetBudget = budget.targetINR ?? (budget as any).targetBudgetINR ?? 0;
    const overage = budget.overBudgetAmountINR ?? (budget as any).overageINR ?? 0;

    const componentSum = flightsCost + hotelCost + transportCost + activitiesCost + diningCost + otherCost;
    const arithmeticMatch = Math.abs(budget.grandTotalINR - componentSum) <= 1; // 1 INR rounding tolerance

    if (!arithmeticMatch) {
      return {
        evaluatorName: 'BudgetEvaluator',
        passed: false,
        score: 0.0,
        reason: `Budget arithmetic discrepancy: stated grandTotal ₹${budget.grandTotalINR} != calculated sum ₹${componentSum}`,
        hardFailure: 'DETERMINISTIC_BUDGET_CORRUPTION',
        details: { stated: budget.grandTotalINR, componentSum }
      };
    }

    // 2. Remaining budget and overage consistency
    const expectedRemaining = targetBudget - budget.grandTotalINR;
    const remainingMatch = Math.abs(budget.remainingBudgetINR - expectedRemaining) <= 1;

    const expectedOverage = budget.grandTotalINR > targetBudget ? budget.grandTotalINR - targetBudget : 0;
    const overageMatch = Math.abs(overage - expectedOverage) <= 1;

    // 3. Scenario-specific ceiling checks if configured
    let scenarioBudgetMatch = true;
    let scenarioBudgetReason = '';

    if (expected?.budgetTotalINR && expected.budgetTotalINR > 0) {
      scenarioBudgetMatch = targetBudget === expected.budgetTotalINR;
      if (!scenarioBudgetMatch) {
        scenarioBudgetReason = `Target budget mismatch: expected ₹${expected.budgetTotalINR}, got ₹${targetBudget}`;
      }
    }

    if (expected?.maxAllowedBudgetINR) {
      if (budget.grandTotalINR > expected.maxAllowedBudgetINR) {
        scenarioBudgetMatch = false;
        scenarioBudgetReason = `Grand total ₹${budget.grandTotalINR} exceeded max ceiling ₹${expected.maxAllowedBudgetINR}`;
      }
    }

    const checksPassed = arithmeticMatch && remainingMatch && overageMatch && scenarioBudgetMatch;
    const score = checksPassed ? 1.0 : arithmeticMatch ? 0.75 : 0.0;

    return {
      evaluatorName: 'BudgetEvaluator',
      passed: checksPassed,
      score,
      reason: checksPassed
        ? `Deterministic financial engine verified: Component sum ₹${componentSum} = Grand Total ₹${budget.grandTotalINR}. Buffer/Overage consistent.`
        : `Financial discrepancies detected: ${[!arithmeticMatch && 'Arithmetic mismatch', !remainingMatch && 'Remaining budget mismatch', !overageMatch && 'Overage mismatch', scenarioBudgetReason].filter(Boolean).join('; ')}`,
      details: {
        componentSum,
        grandTotalINR: budget.grandTotalINR,
        targetBudgetINR: targetBudget,
        remainingBudgetINR: budget.remainingBudgetINR,
        overageINR: overage,
        isOverBudget: budget.isOverBudget
      }
    };
  }
}
