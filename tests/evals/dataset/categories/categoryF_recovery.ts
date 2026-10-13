/**
 * Category F: Failure Recovery & Tool Resilience Scenarios
 * 
 * Evaluates bounded retries, schema output validation, structured failure handling,
 * and prevention of infinite loops or fabricated fallback data.
 */

import { EvaluationScenario } from '../../types/evalTypes';

export const categoryFScenarios: EvaluationScenario[] = [
  {
    id: 'F1_temporary_tool_failure_bounded_retry',
    category: 'FAILURE_RECOVERY',
    description: 'Temporary provider 503 gateway failure triggers bounded retries without infinite loops',
    input: {
      toolName: 'searchFlights',
      simulateError: '503 Service Unavailable'
    },
    expectedBehavior: 'Retry up to maximum policy limit (2 retries), then return structured failure without fabricating mock flights',
    expectedOutput: {
      expectedStatus: 'FAILED',
      mustContainText: ['failed', '503']
    },
    tags: ['recovery', 'retry', 'resilience', 'bounded']
  },
  {
    id: 'F2_malformed_hotel_schema_validation',
    category: 'FAILURE_RECOVERY',
    description: 'Provider returns malformed hotel output missing required id and price',
    input: {
      toolName: 'searchHotels',
      simulateMalformed: true
    },
    expectedBehavior: 'Intercept at ToolRegistry schema validation boundary; reject corrupted response before downstream agents consume it',
    expectedOutput: {
      expectedStatus: 'FAILED',
      mustContainText: ['Tool Validation Failure', 'output']
    },
    tags: ['recovery', 'schema_validation', 'data_integrity']
  },
  {
    id: 'F3_transfer_provider_timeout',
    category: 'FAILURE_RECOVERY',
    description: 'Transfer provider times out during booking negotiation',
    input: {
      toolName: 'searchTransfers',
      simulateTimeout: true
    },
    expectedBehavior: 'Log tool timeout event; handle gracefully without crashing main orchestrator thread',
    expectedOutput: {
      expectedStatus: 'FAILED'
    },
    tags: ['recovery', 'timeout', 'graceful_degradation']
  },
  {
    id: 'F4_unregistered_tool_rejection',
    category: 'FAILURE_RECOVERY',
    description: 'Agent or attacker attempts to call an unregistered nonexistent tool',
    input: {
      toolName: 'nonExistentTravelTool'
    },
    expectedBehavior: 'Reject tool invocation with clear error stating tool is not registered in ToolRegistry',
    expectedOutput: {
      expectedStatus: 'FAILED',
      mustContainText: ['not registered']
    },
    tags: ['recovery', 'registry', 'error_handling']
  }
];
