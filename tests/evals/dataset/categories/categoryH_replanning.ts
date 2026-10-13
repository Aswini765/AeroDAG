/**
 * Category H: Conversational Replanning & Travel Constraint Scenarios
 * 
 * Evaluates partial re-planning, selective itinerary updates, and
 * accessibility/child constraints.
 */

import { EvaluationScenario } from '../../types/evalTypes';
import { RequirementEngine } from '../../../../src/services/requirementEngine';

export const categoryHScenarios: EvaluationScenario[] = [
  {
    id: 'H1_make_it_cheaper_replanning',
    category: 'REPLANNING',
    description: 'User requests "Make it cheaper" without invalidating booked flights or dates',
    input: 'Make it cheaper.',
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
    expectedBehavior: 'Optimize costs by swapping hotel tier while preserving flights, dates, and party configuration',
    expectedOutput: {
      destination: 'Vietnam',
      durationDays: 10,
      travellers: { total: 4 },
      mustContainText: ['Saved']
    },
    tags: ['replanning', 'cost_reduction', 'selective_update']
  },
  {
    id: 'H2_remove_beach_day_refinement',
    category: 'REPLANNING',
    description: 'User requests "Remove the beach day" on existing Goa itinerary',
    input: 'Remove the beach day.',
    context: {
      ...RequirementEngine.createEmptyContext(),
      destination: 'Goa, India',
      origin: 'Bengaluru (BLR)',
      durationDays: 7,
      adultsCount: 2,
      childrenCount: 1,
      childrenAges: [10],
      totalTravellers: 3,
      budgetTotalINR: 60000,
      scope: 'domestic'
    },
    expectedBehavior: 'Selectively swap beach day with botanical/heritage excursion while leaving flight and hotel intact',
    expectedOutput: {
      destination: 'Goa',
      durationDays: 7,
      mustContainText: ['Removed beach day']
    },
    tags: ['replanning', 'selective_modification', 'itinerary_edit']
  },
  {
    id: 'H3_senior_walking_constraint_warning',
    category: 'REPLANNING',
    description: 'Senior traveler paired with strenuous high-walking itinerary must be flagged',
    input: {
      destination: 'Thailand (Bangkok & Phuket)',
      travellers: { total: 5, seniors: 1 },
      itineraryActivities: ['Extreme Hill Trek', 'Waterfall Scramble']
    },
    expectedBehavior: 'Constraint guardrail identifies strenuous walking and issues pacing warning with gentle buffers',
    expectedOutput: {
      mustContainText: ['Senior pacing', 'accessibility']
    },
    constraints: {
      maxWalkingPacing: 'Low'
    },
    tags: ['constraints', 'senior', 'walking_pacing']
  },
  {
    id: 'H4_child_activity_safety_validation',
    category: 'REPLANNING',
    description: 'Child age safety validation flags unsuitable extreme activities',
    input: {
      destination: 'Goa, India',
      travellers: { total: 3, children: 1, childrenAges: [4] },
      activities: ['Extreme Deep Water Scuba Dive']
    },
    expectedBehavior: 'Flag child safety warning for activity requiring minimum age 14 when youngest child is 4',
    expectedOutput: {
      mustContainText: ['Child safety', 'age']
    },
    constraints: {
      childMinAge: 4
    },
    tags: ['constraints', 'child_safety', 'age_limits']
  }
];
