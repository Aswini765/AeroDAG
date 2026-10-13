/**
 * Category C: Budget & Deterministic Financial Calculations
 * 
 * Evaluates budget integrity, component arithmetic, overage calculations,
 * and resistance to LLM arithmetic hallucination.
 */

import { EvaluationScenario } from '../../types/evalTypes';

export const categoryCScenarios: EvaluationScenario[] = [
  {
    id: 'C1_under_budget_positive_buffer',
    category: 'BUDGET',
    description: 'Under-budget luxury holiday with substantial financial buffer remaining',
    input: {
      origin: 'Bengaluru (BLR)',
      destination: 'Goa, India',
      durationDays: 4,
      adultsCount: 2,
      totalTravellers: 2,
      budgetTotalINR: 100000,
      scope: 'domestic'
    },
    expectedBehavior: 'Calculate component sum, grandTotal <= targetBudget, remainingBudget > 0, overage == 0',
    expectedOutput: {
      budgetTotalINR: 100000,
      maxAllowedBudgetINR: 100000
    },
    constraints: {
      deterministicMathMustMatch: true
    },
    tags: ['budget', 'under_budget', 'buffer']
  },
  {
    id: 'C2_over_budget_exact_overage',
    category: 'BUDGET',
    description: 'International multi-day family trip exceeding target budget, requiring exact overage calculation',
    input: {
      origin: 'Bengaluru (BLR)',
      destination: 'Vietnam (Hanoi & Halong Bay)',
      durationDays: 10,
      adultsCount: 2,
      childrenCount: 2,
      childrenAges: [8, 11],
      totalTravellers: 4,
      budgetTotalINR: 100000,
      scope: 'international'
    },
    expectedBehavior: 'Calculate true cost ₹1,30,400, record isOverBudget=true, remainingBudget=-30,400, overage=30,400',
    expectedOutput: {
      budgetTotalINR: 100000
    },
    constraints: {
      deterministicMathMustMatch: true
    },
    tags: ['budget', 'over_budget', 'deterministic_overage']
  },
  {
    id: 'C3_budget_revision_recalculation',
    category: 'BUDGET',
    description: 'Dynamic budget ceiling revision without modifying selected hotel or flights',
    input: {
      origin: 'Bengaluru (BLR)',
      destination: 'Singapore',
      durationDays: 5,
      adultsCount: 2,
      totalTravellers: 2,
      budgetTotalINR: 150000,
      scope: 'international'
    },
    expectedBehavior: 'Preserve component prices and recalculate remaining buffer against new target ₹150,000',
    expectedOutput: {
      budgetTotalINR: 150000
    },
    constraints: {
      deterministicMathMustMatch: true
    },
    tags: ['budget', 'revision', 'recalculation']
  },
  {
    id: 'C4_tampered_llm_total_overrule',
    category: 'BUDGET',
    description: 'LLM attempts to present a fabricated lower total (₹70,000 instead of ₹90,000)',
    input: {
      origin: 'Bengaluru (BLR)',
      destination: 'Goa, India',
      durationDays: 7,
      adultsCount: 2,
      totalTravellers: 2,
      budgetTotalINR: 80000,
      scope: 'domestic'
    },
    expectedBehavior: 'Deterministic financial engine overrules LLM hallucinated figure and enforces component sum',
    expectedOutput: {
      budgetTotalINR: 80000
    },
    constraints: {
      deterministicMathMustMatch: true
    },
    tags: ['budget', 'tamper_resistance', 'deterministic_truth']
  },
  {
    id: 'C5_edge_zero_ancillaries',
    category: 'BUDGET',
    description: 'Minimal ancillary cost boundary testing (0 activities, 0 transfer addons)',
    input: {
      origin: 'Bengaluru (BLR)',
      destination: 'Goa, India',
      durationDays: 3,
      adultsCount: 1,
      totalTravellers: 1,
      budgetTotalINR: 40000,
      scope: 'domestic'
    },
    expectedBehavior: 'Ensure grand total calculation handles 0 ancillary costs without NaN or arithmetic errors',
    expectedOutput: {
      budgetTotalINR: 40000
    },
    constraints: {
      deterministicMathMustMatch: true
    },
    tags: ['budget', 'edge_case', 'boundary']
  }
];
