/**
 * AeroDAG Budget Guardrail
 * 
 * Enforces the deterministic arithmetic engine as the sole authority on financial totals.
 * Overrules and corrects any LLM hallucinations regarding totals, overages, or savings.
 */

import { TripPlan, TripPlanBudget } from '../../../types/travelBooking';
import { Guardrail, GuardrailDecision, GuardrailContext } from '../types';

export class BudgetGuardrail implements Guardrail<TripPlan, TripPlan> {
  readonly id = 'deterministic-budget-guardrail';
  readonly name = 'Budget Integrity Guardrail';
  readonly description = 'Enforces deterministic arithmetic integrity over LLM budget calculations.';
  readonly stage = 'output' as const;
  readonly severity = 'CRITICAL' as const;
  readonly enabled = true;

  evaluate(plan: TripPlan, context?: GuardrailContext): GuardrailDecision {
    const b = plan.budget;
    const computedTotal =
      b.flightsCostINR +
      b.hotelCostINR +
      b.transportCostINR +
      b.activitiesCostINR +
      b.diningEstimateINR +
      (b.otherCostsINR || 0);

    // Mathematical sum verification
    if (b.grandTotalINR !== computedTotal) {
      return {
        decision: 'BLOCK',
        guardrailId: this.id,
        severity: 'CRITICAL',
        reason: `Budget arithmetic discrepancy: Stated grand total ₹${b.grandTotalINR} != sum of components ₹${computedTotal}.`,
        metadata: { stated: b.grandTotalINR, computed: computedTotal }
      };
    }

    // Remaining budget verification
    const expectedRemaining = b.targetINR - computedTotal;
    if (b.remainingBudgetINR !== expectedRemaining) {
      return {
        decision: 'BLOCK',
        guardrailId: this.id,
        severity: 'HIGH',
        reason: `Remaining budget discrepancy: Stated ₹${b.remainingBudgetINR} != target (${b.targetINR}) - total (${computedTotal}).`,
        metadata: { statedRemaining: b.remainingBudgetINR, expectedRemaining }
      };
    }

    return {
      decision: 'ALLOW',
      guardrailId: this.id,
      severity: 'LOW',
      metadata: { grandTotalINR: b.grandTotalINR, verified: true }
    };
  }

  /**
   * Deterministically repairs any plan budget discrepancies
   */
  static repairBudget(budget: TripPlanBudget): TripPlanBudget {
    const computedTotal =
      budget.flightsCostINR +
      budget.hotelCostINR +
      budget.transportCostINR +
      budget.activitiesCostINR +
      budget.diningEstimateINR +
      (budget.otherCostsINR || 0);

    const remainingBudgetINR = budget.targetINR - computedTotal;
    const isOverBudget = remainingBudgetINR < 0;
    const overBudgetAmountINR = isOverBudget ? Math.abs(remainingBudgetINR) : 0;

    return {
      ...budget,
      grandTotalINR: computedTotal,
      remainingBudgetINR,
      isOverBudget,
      overBudgetAmountINR
    };
  }
}
