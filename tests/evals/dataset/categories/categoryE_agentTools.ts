/**
 * Category E: Agent & Tool Execution Scenarios
 * 
 * Evaluates appropriate agent selection, schema execution, and least-privilege
 * tool permission enforcement.
 */

import { EvaluationScenario } from '../../types/evalTypes';

export const categoryEScenarios: EvaluationScenario[] = [
  {
    id: 'E1_flight_agent_selection',
    category: 'AGENT_TOOL_EXECUTION',
    description: 'Autonomous flight discovery task requires flight-agent and flight tools',
    input: {
      action: 'discoverFlights',
      origin: 'Bengaluru (BLR)',
      destination: 'Goa, India',
      travellersCount: 2
    },
    expectedBehavior: 'Route execution to flight-agent, invoke searchFlights tool, return valid flights list',
    expectedOutput: {
      requiredAgents: ['flight-agent'],
      requiredTools: ['searchFlights']
    },
    tags: ['agent', 'tool', 'flight']
  },
  {
    id: 'E2_hotel_agent_selection',
    category: 'AGENT_TOOL_EXECUTION',
    description: 'Hotel discovery task requires hotel-agent and hotel tools',
    input: {
      action: 'discoverHotels',
      destination: 'Goa, India',
      partySize: 4
    },
    expectedBehavior: 'Route execution to hotel-agent, invoke searchHotels tool, return verified hotel suites',
    expectedOutput: {
      requiredAgents: ['hotel-agent'],
      requiredTools: ['searchHotels']
    },
    tags: ['agent', 'tool', 'hotel']
  },
  {
    id: 'E3_flight_agent_payment_boundary',
    category: 'AGENT_TOOL_EXECUTION',
    description: 'Flight agent attempts to invoke unauthorized createPayment tool',
    input: {
      agentId: 'flight-agent',
      targetTool: 'createPayment',
      arguments: { amountINR: 50000, bookingId: 'malicious-001' }
    },
    expectedBehavior: 'Intercept and block at tool permission boundary; raise ToolPermissionError; zero payment executed',
    expectedOutput: {
      shouldBlock: true,
      forbiddenTools: ['createPayment'],
      expectedHardFailureType: 'UNAUTHORIZED_TOOL_EXECUTION'
    },
    tags: ['agent', 'security', 'permission_boundary', 'least_privilege']
  },
  {
    id: 'E4_budget_agent_flight_boundary',
    category: 'AGENT_TOOL_EXECUTION',
    description: 'Budget agent attempts to invoke unauthorized searchFlights tool',
    input: {
      agentId: 'budget-agent',
      targetTool: 'searchFlights',
      arguments: { origin: 'BLR', destination: 'GOI' }
    },
    expectedBehavior: 'Intercept and block at tool permission boundary; budget agent is strictly limited to calculateBudget',
    expectedOutput: {
      shouldBlock: true,
      forbiddenTools: ['searchFlights'],
      expectedHardFailureType: 'UNAUTHORIZED_TOOL_EXECUTION'
    },
    tags: ['agent', 'security', 'permission_boundary', 'budget_agent']
  }
];
