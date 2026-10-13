/**
 * AeroDAG Failure Scenario Registry
 * 
 * Catalog of named deterministic failure scenarios covering:
 * - Component timeouts
 * - Provider unavailabilities
 * - Quota exhaustion & rate limits
 * - Malformed & invalid tool outputs
 * - RAG failures & grounding gaps
 * - Verification failures & budget violations
 * - Booking state conflicts & payment declines
 * - Partial parallel agent failures & dependency cascades
 */

import { FailureScenarioRecord } from './types';

export const FAILURE_SCENARIOS: Record<string, FailureScenarioRecord> = {
  // 1. Flight Tool Timeout (Transient - 1 failure then success)
  flight_tool_timeout: {
    id: 'flight_tool_timeout',
    name: 'Flight Tool Timeout Recovery',
    description: 'searchFlights encounters a transient timeout on attempt 1, succeeds on attempt 2',
    point: 'TOOL',
    mode: 'TIMEOUT',
    config: {
      point: 'TOOL',
      mode: 'TIMEOUT',
      target: 'searchFlights',
      failuresBeforeSuccess: 1,
      delayMs: 20
    }
  },

  // 2. Hotel Tool Timeout (Permanent exhaustion)
  hotel_timeout: {
    id: 'hotel_timeout',
    name: 'Hotel Tool Timeout Exhaustion',
    description: 'searchHotels tool times out repeatedly until retry exhaustion',
    point: 'TOOL',
    mode: 'TIMEOUT',
    config: {
      point: 'TOOL',
      mode: 'TIMEOUT',
      target: 'searchHotels',
      failuresBeforeSuccess: 10,
      delayMs: 15
    }
  },

  // 3. Activity Tool Timeout
  activity_timeout: {
    id: 'activity_timeout',
    name: 'Activity Tool Transient Timeout',
    description: 'searchActivities tool times out on attempt 1, succeeds on retry',
    point: 'TOOL',
    mode: 'TIMEOUT',
    config: {
      point: 'TOOL',
      mode: 'TIMEOUT',
      target: 'searchActivities',
      failuresBeforeSuccess: 1,
      delayMs: 10
    }
  },

  // 4. Transport Tool Timeout
  transport_timeout: {
    id: 'transport_timeout',
    name: 'Transport Tool Transient Timeout',
    description: 'estimateTransfer tool times out on attempt 1, succeeds on retry',
    point: 'TOOL',
    mode: 'TIMEOUT',
    config: {
      point: 'TOOL',
      mode: 'TIMEOUT',
      target: 'estimateTransfer',
      failuresBeforeSuccess: 1,
      delayMs: 10
    }
  },

  // 5. Flight Provider Unavailable (503 Service Unavailable)
  flight_provider_unavailable: {
    id: 'flight_provider_unavailable',
    name: 'Flight Provider Unavailable',
    description: 'Upstream airline inventory service returns 503 unavailable',
    point: 'TOOL',
    mode: 'UNAVAILABLE',
    config: {
      point: 'TOOL',
      mode: 'UNAVAILABLE',
      target: 'searchFlights',
      failuresBeforeSuccess: 1
    }
  },

  // 6. Hotel Provider Unavailable
  hotel_provider_unavailable: {
    id: 'hotel_provider_unavailable',
    name: 'Hotel Provider Unavailable',
    description: 'Hotel inventory provider returns service unavailable',
    point: 'TOOL',
    mode: 'UNAVAILABLE',
    config: {
      point: 'TOOL',
      mode: 'UNAVAILABLE',
      target: 'searchHotels',
      failuresBeforeSuccess: 1
    }
  },

  // 7. Gemini Rate Limit (429 Too Many Requests)
  gemini_429: {
    id: 'gemini_429',
    name: 'Gemini 429 Rate Limit',
    description: 'Gemini LLM API triggers HTTP 429 rate limit with backoff requirement',
    point: 'GEMINI',
    mode: 'RATE_LIMIT',
    config: {
      point: 'GEMINI',
      mode: 'RATE_LIMIT',
      target: 'chat',
      failuresBeforeSuccess: 1
    }
  },

  // 8. Gemini Quota Exhaustion
  gemini_quota_exhausted: {
    id: 'gemini_quota_exhausted',
    name: 'Gemini Quota Exhaustion',
    description: 'Gemini API returns RESOURCE_EXHAUSTED with fallback to deterministic consultant',
    point: 'GEMINI',
    mode: 'QUOTA_EXHAUSTED',
    config: {
      point: 'GEMINI',
      mode: 'QUOTA_EXHAUSTED',
      target: 'chat',
      failuresBeforeSuccess: 5
    }
  },

  // 9. MCP Timeout
  mcp_timeout: {
    id: 'mcp_timeout',
    name: 'MCP Adapter Timeout',
    description: 'External MCP server tool execution times out during invocation',
    point: 'MCP',
    mode: 'TIMEOUT',
    config: {
      point: 'MCP',
      mode: 'TIMEOUT',
      target: 'searchFlights',
      failuresBeforeSuccess: 1,
      delayMs: 25
    }
  },

  // 10. MCP Invalid Response
  mcp_invalid_response: {
    id: 'mcp_invalid_response',
    name: 'MCP Schema Violation Output',
    description: 'MCP tool produces response violating declared JSON schema',
    point: 'MCP',
    mode: 'INVALID_OUTPUT',
    config: {
      point: 'MCP',
      mode: 'INVALID_OUTPUT',
      target: 'searchHotels',
      failuresBeforeSuccess: 1,
      malformedData: { invalidKey: 'unrecognized_structure', missingData: true }
    }
  },

  // 11. RAG Retrieval Failure
  rag_failure: {
    id: 'rag_failure',
    name: 'RAG Vector Store Failure',
    description: 'RAG vector index encounters temporary database error',
    point: 'RAG',
    mode: 'ERROR',
    config: {
      point: 'RAG',
      mode: 'ERROR',
      target: 'retrieval',
      failuresBeforeSuccess: 1,
      customError: 'RAG Vector Store internal indexing error'
    }
  },

  // 12. RAG Grounding Failure (Missing trusted regulatory evidence)
  rag_grounding_failure: {
    id: 'rag_grounding_failure',
    name: 'RAG Grounding Validation Failure',
    description: 'Retrieved document chunks score below 0.30 grounding confidence threshold',
    point: 'RAG',
    mode: 'CONSTRAINT_FAILURE',
    config: {
      point: 'RAG',
      mode: 'CONSTRAINT_FAILURE',
      target: 'grounding',
      failuresBeforeSuccess: 1
    }
  },

  // 13. Tool Schema Failure
  tool_schema_failure: {
    id: 'tool_schema_failure',
    name: 'Tool Schema Validation Failure',
    description: 'Tool invoked with arguments violating input schema',
    point: 'TOOL',
    mode: 'INVALID_OUTPUT',
    config: {
      point: 'TOOL',
      mode: 'INVALID_OUTPUT',
      target: 'calculateBudget',
      failuresBeforeSuccess: 1
    }
  },

  // 14. Tool Permission Failure
  tool_permission_failure: {
    id: 'tool_permission_failure',
    name: 'Tool Permission Boundary Violation',
    description: 'Agent attempts to call a tool outside its least-privilege allowedTools list',
    point: 'TOOL',
    mode: 'ERROR',
    config: {
      point: 'TOOL',
      mode: 'ERROR',
      target: 'createPayment',
      failuresBeforeSuccess: 1,
      customError: 'ToolPermissionError: Agent unauthorized to invoke createPayment'
    }
  },

  // 15. Verification Failure
  verification_failure: {
    id: 'verification_failure',
    name: 'Verification Agent Rule Rejection',
    description: 'Verification agent detects plan violation and orders REPLAN',
    point: 'VERIFICATION',
    mode: 'CONSTRAINT_FAILURE',
    config: {
      point: 'VERIFICATION',
      mode: 'CONSTRAINT_FAILURE',
      target: 'audit',
      failuresBeforeSuccess: 1
    }
  },

  // 16. Budget Violation
  budget_violation: {
    id: 'budget_violation',
    name: 'Deterministic Budget Ceiling Exceeded',
    description: 'Grand total exceeds target budget ceiling, triggering replan requirement',
    point: 'GUARDRAIL',
    mode: 'CONSTRAINT_FAILURE',
    config: {
      point: 'GUARDRAIL',
      mode: 'CONSTRAINT_FAILURE',
      target: 'budget-adherence',
      failuresBeforeSuccess: 1
    }
  },

  // 17. Constraint Violation
  constraint_violation: {
    id: 'constraint_violation',
    name: 'Physical Accommodation Capacity Violation',
    description: 'Party size exceeds selected hotel room maximum capacity',
    point: 'GUARDRAIL',
    mode: 'CONSTRAINT_FAILURE',
    config: {
      point: 'GUARDRAIL',
      mode: 'CONSTRAINT_FAILURE',
      target: 'hotel-capacity',
      failuresBeforeSuccess: 1
    }
  },

  // 18. Booking Failure (Hold timeout / inventory lost)
  booking_failure: {
    id: 'booking_failure',
    name: 'Booking Hold Failure',
    description: 'Inventory hold reservation fails due to sudden seat exhaustion',
    point: 'BOOKING',
    mode: 'ERROR',
    config: {
      point: 'BOOKING',
      mode: 'ERROR',
      target: 'hold',
      failuresBeforeSuccess: 1,
      customError: 'Airline inventory seat hold failed: seat no longer available'
    }
  },

  // 19. Payment Failure (Card declined)
  payment_failure: {
    id: 'payment_failure',
    name: 'Payment Authorization Declined',
    description: 'Mock payment gateway rejects authorization with card declined status',
    point: 'PAYMENT',
    mode: 'ERROR',
    config: {
      point: 'PAYMENT',
      mode: 'ERROR',
      target: 'charge',
      failuresBeforeSuccess: 1,
      customError: 'Payment transaction authorization declined: card blocked'
    }
  },

  // 20. Retry Exhaustion
  retry_exhaustion: {
    id: 'retry_exhaustion',
    name: 'Bounded Retry Exhaustion',
    description: 'Persistent error exceeds maximum attempts (3/3) without infinite loop',
    point: 'TOOL',
    mode: 'ERROR',
    config: {
      point: 'TOOL',
      mode: 'ERROR',
      target: 'searchFlights',
      failuresBeforeSuccess: 5,
      customError: 'Permanent provider connection failure'
    }
  },

  // 21. Parallel Partial Failure (Activity fails, others succeed)
  parallel_partial_failure: {
    id: 'parallel_partial_failure',
    name: 'Parallel Discovery Partial Failure',
    description: 'Activity agent fails during parallel run while Flight, Hotel, and Transport succeed',
    point: 'AGENT',
    mode: 'ERROR',
    config: {
      point: 'AGENT',
      mode: 'ERROR',
      target: 'activity-agent',
      failuresBeforeSuccess: 1
    }
  },

  // 22. Multiple Parallel Failures (Activity and Transport fail)
  multiple_parallel_failures: {
    id: 'multiple_parallel_failures',
    name: 'Multiple Parallel Failures Containment',
    description: 'Two non-critical agents fail concurrently without corrupting Flight and Hotel models',
    point: 'AGENT',
    mode: 'ERROR',
    config: {
      point: 'AGENT',
      mode: 'ERROR',
      target: 'transport-agent',
      failuresBeforeSuccess: 1
    }
  },

  // 23. Dependency Failure (Critical Flight fails -> Itinerary cannot fabricate)
  dependency_failure: {
    id: 'dependency_failure',
    name: 'Critical DAG Dependency Failure',
    description: 'Flight failure correctly halts downstream Itinerary without synthetic hallucination',
    point: 'AGENT',
    mode: 'ERROR',
    config: {
      point: 'AGENT',
      mode: 'ERROR',
      target: 'flight-agent',
      failuresBeforeSuccess: 5
    }
  },

  // 24. Duplicate Booking Attempt (Idempotency protection)
  duplicate_booking_attempt: {
    id: 'duplicate_booking_attempt',
    name: 'Duplicate Booking Idempotency Protection',
    description: 'Repeated booking request with identical idempotency key blocked from double charge',
    point: 'BOOKING',
    mode: 'CONSTRAINT_FAILURE',
    config: {
      point: 'BOOKING',
      mode: 'CONSTRAINT_FAILURE',
      target: 'idempotency',
      failuresBeforeSuccess: 1
    }
  },

  // 25. Trace Propagation During Failure
  trace_propagation_during_failure: {
    id: 'trace_propagation_during_failure',
    name: 'Trace Correlation Across Failure Transitions',
    description: 'Injected error records error category on child span while preserving root traceId',
    point: 'TOOL',
    mode: 'TIMEOUT',
    config: {
      point: 'TOOL',
      mode: 'TIMEOUT',
      target: 'searchFlights',
      failuresBeforeSuccess: 1
    }
  }
};
