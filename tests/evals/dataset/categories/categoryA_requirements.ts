/**
 * Category A: Requirement Extraction Benchmark Scenarios
 * 
 * Evaluates adaptive conversational requirement gathering, party decomposition,
 * missing field prioritization, and context preservation across updates.
 */

import { EvaluationScenario } from '../../types/evalTypes';
import { RequirementEngine } from '../../../../src/services/requirementEngine';

export const categoryAScenarios: EvaluationScenario[] = [
  {
    id: 'A1_goa_full_extraction',
    category: 'REQUIREMENT_EXTRACTION',
    description: 'Complete initial prompt with destination, duration, party, ages, and budget',
    input: 'Plan a 7-day Goa trip from Bengaluru for me, my wife and our 10-year-old daughter under ₹60,000.',
    expectedBehavior: 'Extract all 6 parameters and mark readyToPlan immediately without redundant questions',
    expectedOutput: {
      origin: 'Bengaluru (BLR)',
      destination: 'Goa, India',
      durationDays: 7,
      travellers: { total: 3, adults: 2, children: 1 },
      budgetTotalINR: 60000
    },
    tags: ['requirements', 'adaptive', 'goa', 'complete_info']
  },
  {
    id: 'A2_vietnam_partial_extraction',
    category: 'REQUIREMENT_EXTRACTION',
    description: 'Partial prompt with destination and party type, missing origin, duration, and budget',
    input: 'Plan a trip to Vietnam for my family.',
    expectedBehavior: 'Identify destination=Vietnam, partyType=family, and prioritize single highest-impact question',
    expectedOutput: {
      destination: 'Vietnam (Hanoi & Halong Bay)'
    },
    tags: ['requirements', 'adaptive', 'vietnam', 'missing_info']
  },
  {
    id: 'A3_multigen_party_breakdown',
    category: 'REQUIREMENT_EXTRACTION',
    description: 'Complex multi-generational party with seniors and multiple child ages',
    input: '4 adults, 2 children aged 7 and 12 and my elderly mother. 8 days in Singapore.',
    expectedBehavior: 'Decompose party into adults=5 (including mother), children=2, seniors=1, total=8, international scope',
    expectedOutput: {
      destination: 'Singapore',
      durationDays: 8,
      travellers: { total: 7, adults: 4, children: 2, seniors: 1 }
    },
    tags: ['requirements', 'multigen', 'senior', 'singapore']
  },
  {
    id: 'A4_late_budget_update',
    category: 'REQUIREMENT_EXTRACTION',
    description: 'User updates budget after initial conversation turn without resetting context',
    input: 'Actually, change my budget to ₹1.5 lakh.',
    context: {
      ...RequirementEngine.createEmptyContext(),
      destination: 'Vietnam (Hanoi & Halong Bay)',
      origin: 'Bengaluru (BLR)',
      durationDays: 10,
      adultsCount: 2,
      childrenCount: 2,
      childrenAges: [8, 11],
      totalTravellers: 4,
      budgetTotalINR: 100000,
      scope: 'international'
    },
    expectedBehavior: 'Update budget ceiling to ₹150,000 while preserving all existing travel parameters',
    expectedOutput: {
      destination: 'Vietnam (Hanoi & Halong Bay)',
      durationDays: 10,
      budgetTotalINR: 150000,
      travellers: { total: 4, adults: 2, children: 2 }
    },
    tags: ['requirements', 'conversational_update', 'budget_revision']
  },
  {
    id: 'A5_redundant_question_prevention',
    category: 'REQUIREMENT_EXTRACTION',
    description: 'User message repeats already known information; system must not ask redundant questions',
    input: 'Going to Goa with my wife for 7 days.',
    context: {
      ...RequirementEngine.createEmptyContext(),
      destination: 'Goa, India',
      origin: 'Bengaluru (BLR)',
      durationDays: 7,
      adultsCount: 2,
      totalTravellers: 2,
      budgetTotalINR: 50000,
      scope: 'domestic'
    },
    expectedBehavior: 'Acknowledge known parameters and mark readyToPlan without re-asking origin, destination, or duration',
    expectedOutput: {
      destination: 'Goa, India',
      durationDays: 7,
      travellers: { total: 2, adults: 2 }
    },
    tags: ['requirements', 'redundancy_check', 'goa']
  }
];
