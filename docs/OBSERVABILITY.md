# AeroDAG Production Observability & Reliability Architecture (Phase 7.1)

## 1. Executive Summary

AeroDAG Phase 7.1 provides a **provider-neutral, deterministic observability and distributed tracing infrastructure** for multi-agent travel orchestration. Every request entering the system is correlated via a unique `traceId` that propagates through every layer of the stack:

```
User / API Request (traceId: trc_...)
       ↓
Express API Boundary (`api_chat_request`)
       ↓
TravelAgentOrchestrator (`orchestrator_plan_trip`)
       ├── Phase A (Parallel Discovery):
       │     ├── Flight Agent (`flight-agent_execute`) → `searchFlights_tool` / MCP
       │     ├── Hotel Agent (`hotel-agent_execute`) → `searchHotels_tool`
       │     ├── Activity Agent (`activity-agent_execute`) → `searchActivities_tool`
       │     └── Transport Agent (`transport-agent_execute`) → `searchTransfers_tool`
       ├── Phase B (Dependency 1):
       │     └── Itinerary Agent (`itinerary-agent_execute`) → `buildItineraryDays_tool`
       ├── Phase C (Dependency 2):
       │     └── Budget Agent (`budget-agent_execute`) → `computeDeterministicBudget_tool`
       └── Phase D (Dependency 3):
             └── Verification Agent (`verification-agent_execute`) → `verification_audit`
                   ↓
Output Guardrail Pipeline (`guardrail_output-pipeline`)
       ↓
Final Verified Trip Plan Response
```

---

## 2. Telemetry Domain Model

The telemetry abstraction is completely decoupled from any specific vendor (OpenTelemetry, Datadog, Jaeger, Grafana Tempo):

- **`TraceContext`**: Carries `traceId`, `spanId`, optional `parentSpanId`, and `requestId`.
- **`TelemetrySpan`**: Represents a single timed unit of work with `operationName`, `component`, `startTime`, `endTime`, `durationMs`, `status`, `errorCategory`, `errorMessage`, `tokenUsage`, `estimatedCostUSD`, and sanitized `metadata`.
- **`SpanStatus`**: Strongly typed status:
  - `SUCCESS`
  - `ERROR`
  - `TIMEOUT`
  - `CANCELLED`
- **`TelemetryTracer`**: Manages span lifecycles (`startTrace`, `startSpan`, `endSpan`, `withSpan`) and automatically scrub metadata before storing.
- **`TelemetryStore`**: Thread-safe in-memory circular trace store with `getTrace(traceId)`, `getRecentTraces()`, `getSpansByTraceId(traceId)`, and `clear()`.
- **`TelemetryMetricsCollector`**: Aggregates latency statistics (count, min, max, average, errorCount), retries, timeouts, guardrail blocks, token counts, and cost estimates.

---

## 3. Distributed Trace Propagation

### 3.1 Context Propagation Rules
1. Every API request generates or accepts a root `traceId`.
2. As execution branches down into orchestrators, agents, tools, MCP adapters, RAG pipelines, and LLM calls, each unit creates a child span with:
   - `traceId = parent.traceId` (strictly identical across the entire call tree)
   - `parentSpanId = parent.spanId`
   - its own unique `spanId`
3. Child spans never invent new `traceId`s.

### 3.2 Concurrency & Parallel Safety
During Phase A of orchestration, four agents (`flight-agent`, `hotel-agent`, `activity-agent`, `transport-agent`) execute concurrently via `Promise.all`:
- Each parallel execution branch receives an isolated child context snapshot.
- No shared mutable state is modified during agent execution.
- Race conditions and cross-request contamination are prevented.

---

## 4. Error Taxonomy

All system errors are classified into standard categories:

| Error Category | Description |
| :--- | :--- |
| `VALIDATION_ERROR` | Schema validation failure on tool input, agent output, or request payload |
| `AUTHORIZATION_ERROR` | Insufficient permissions for an agent to call a tool or access an admin route |
| `TOOL_ERROR` | Internal failure within a tool handler or provider simulator |
| `PROVIDER_ERROR` | External flight, hotel, or booking partner API error |
| `LLM_ERROR` | Model execution exception or malformed JSON generation |
| `TIMEOUT` | Operation exceeded strict execution deadline (e.g., 5000ms tool timeout) |
| `RATE_LIMIT` | Upstream API rate limiting (e.g., HTTP 429 RESOURCE_EXHAUSTED) |
| `QUOTA_EXCEEDED` | Upstream account quota exhaustion |
| `GUARDRAIL_BLOCK` | Security guardrail blocked execution (prompt injection, abuse, PII leak) |
| `RAG_ERROR` | Vector store lookup or embedding generation failure |
| `BOOKING_ERROR` | Inconsistent booking state transition or inventory issue |
| `PAYMENT_ERROR` | Transaction or pricing discrepancy |
| `INTERNAL_ERROR` | Unexpected unhandled exception |
| `UNKNOWN_ERROR` | Catch-all for uncategorized errors |

---

## 5. Security & Privacy Redaction Policy

Telemetry data **must never store secrets, credentials, or sensitive PII**.

The centralized redaction engine (`sanitizeTelemetryMetadata`) enforces:

1. **Key-based Redaction**:
   Any metadata field matching `/password|token|secret|key|card|cvv|pan|aadhaar|passport|ssn|credential|prompt|auth/i` is automatically masked with `[REDACTED_SENSITIVE_FIELD]`.
2. **Pattern-based Value Redaction**:
   - Google API Keys (`AIzaSy...` & `AQ....`) &rarr; `[REDACTED_API_KEY]`
   - Bearer & JWT tokens &rarr; `[REDACTED_TOKEN]`
   - Credit Card numbers (13-19 digits) &rarr; `[REDACTED_CARD]`
   - Indian Aadhaar numbers (12 digits) &rarr; `[REDACTED_AADHAAR]`
   - Indian PAN card numbers (5 letters + 4 digits + 1 letter) &rarr; `[REDACTED_PAN]`
   - Passport numbers (1 letter + 7-8 digits) &rarr; `[REDACTED_PASSPORT]`
   - Email addresses &rarr; `[REDACTED_EMAIL]`
   - Phone numbers &rarr; `[REDACTED_PHONE]`
3. **Information Intentionally NOT Recorded**:
   - Raw user prompts and conversation transcripts
   - Hidden system prompts and instruction templates
   - Internal chain-of-thought or reasoning tokens
   - Full RAG retrieved chunk texts (only chunk IDs are logged)
   - Payment credentials and user identity numbers

---

## 6. Token Usage & Cost Attribution Safeguards

1. **No Token Fabrication**:
   If upstream LLM response does not include genuine token metrics, `tokenUsage` is set to `"unavailable"`.
2. **Deterministic Cost Estimation**:
   Cost calculation is strictly derived from verified token counts and explicit model pricing:
   - `gemini-2.5-flash`: $0.075 per 1,000,000 input tokens; $0.30 per 1,000,000 output tokens.
   - If token counts are `"unavailable"`, `estimatedCostUSD` is set to `"unavailable"`.

---

## 7. Developer Observability Interface

### 7.1 Internal Admin API
Protected internal endpoints for developer trace inspection (only accessible in non-production or with valid `x-admin-key`):

```http
GET /internal/observability/traces
GET /internal/observability/traces/:traceId
GET /internal/observability/metrics
DELETE /internal/observability/traces
```

### 7.2 Programmatic Inspection
```typescript
import { defaultTelemetryStore, getTelemetryMetricsCollector } from './src/services/telemetry';

// Retrieve complete span tree for a given trace
const trace = defaultTelemetryStore.getTrace('trc_123456789');
console.log(trace.spans);

// Retrieve aggregate performance metrics
const metrics = getTelemetryMetricsCollector().getSnapshot();
console.log(metrics.requestLatency, metrics.agentLatency, metrics.geminiLatency);
```

---

## 8. Future OpenTelemetry Integration

The architecture is deliberately provider-neutral. When migrating to production OpenTelemetry:
1. Implement a custom `TelemetryExporter` that transforms `TelemetrySpan` into OpenTelemetry `ReadableSpan`.
2. Swap the in-memory collector with the standard OTLP gRPC/HTTP exporter.
3. No business logic in agents, tools, RAG, or orchestrators will require changes.
