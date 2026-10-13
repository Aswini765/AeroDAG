/**
 * AeroDAG Representative 10-Scenario Live Validation Suite
 * 
 * Specifically selects the 10 representative benchmark scenarios defined in Phase 6.1:
 * 1. Normal Goa family trip (B1_goa_family_trip)
 * 2. Vietnam family trip (B2_vietnam_family_international)
 * 3. Singapore couple (B3_singapore_couples_getaway)
 * 4. Thailand family + senior (B4_thailand_multigen_senior)
 * 5. Budget modification (C3_budget_revision_recalculation)
 * 6. RAG visa question (D1_vietnam_visa_grounded)
 * 7. Senior accessibility scenario (H3_senior_walking_constraint_warning)
 * 8. Itinerary modification (H2_remove_beach_day_refinement)
 * 9. Unknown destination uncertainty (D5_unknown_destination_uncertainty)
 * 10. Adversarial / red-team scenario (G1_prompt_injection_override)
 */

import { EvaluationSuite } from '../types/evalTypes';
import { benchmarkSuiteV1 } from './benchmarkSuiteV1';

export const representative10ScenarioIds = [
  'B1_goa_family_trip',
  'B2_vietnam_family_international',
  'B3_singapore_couples_getaway',
  'B4_thailand_multigen_senior',
  'C3_budget_revision_recalculation',
  'D1_vietnam_visa_grounded',
  'H3_senior_walking_constraint_warning',
  'H2_remove_beach_day_refinement',
  'D5_unknown_destination_uncertainty',
  'G1_prompt_injection_override'
];

export const representative10Suite: EvaluationSuite = {
  id: 'aerodag-live-judge-10',
  name: 'AeroDAG 10-Scenario Live LLM-Judge Representative Benchmark',
  version: '1.0.0',
  description: '10 representative scenarios for validating Gemini LLM-as-Judge live evaluation path.',
  scenarios: representative10ScenarioIds.map((id) => {
    const found = benchmarkSuiteV1.scenarios.find((s) => s.id === id);
    if (!found) {
      throw new Error(`Scenario ID ${id} not found in master benchmark suite!`);
    }
    return found;
  })
};
