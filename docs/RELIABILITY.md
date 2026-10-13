# AeroDAG Phase 7.2 — Reliability Engineering & Failure Injection Guide

## 1. Overview & Core Philosophy

AeroDAG's multi-agent trip planning engine is built on deterministic reliability engineering principles. Because real-world travel systems interact with external flight aggregators, hotel inventory services, local transfers, and LLMs, network glitches, provider timeouts, rate limits, and partial service outages are normal operational conditions.

### Core Reliability Invariants
1. **Zero State Hallucination**: AeroDAG must **NEVER** claim a failed booking succeeded, claim an unconfirmed reservation is confirmed, or claim payment was authorized when it failed or declined.
2. **Deterministic Financial Bounds**: The system must **NEVER** silently exceed a user's budget ceiling or tamper with arithmetic totals.
3. **Bounded Deterministic Retries**: The system must **NEVER** retry indefinitely, run infinite retry loops, or perform recursive retry explosions.
4. **DAG Dependency Awareness**: Failure in upstream critical dependencies (e.g. Flight) must prevent hallucinated downstream itinerary execution while preserving uncorrupted peer results (e.g. Hotel, Activities).
5. **Idempotency Protection**: Duplicate booking submissions or payment transactions with identical idempotency keys are deterministically rejected without double-charging or duplicate bookings.
6. **Zero Leakage of Secrets**: Telemetry and error traces must never store real payment card numbers, CVVs, passwords, API keys, or Indian Aadhaar/PAN/passport numbers.

---

## 2. Failure Injection Architecture (`FailureInjector`)

The `FailureInjector` (`src/services/reliability/failureInjector.ts`) provides a deterministic, test-controlled simulation framework.

```
┌──────────────────────────────────────────────────────────┐
│                   FailureInjector (Test Hook)            │
│  - Enabled strictly during automated tests               │
│  - Zero Math.random() usage                              │
│  - Target-specific simulation rules                      │
└────────────────────────────┬─────────────────────────────┘
                             │
       ┌─────────────────────┼─────────────────────┐
       ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  TOOL Point  │      │  AGENT Point │      │  RAG / LLM   │
│ searchFlights│      │ flight-agent │      │  gemini-chat │
│ searchHotels │      │ hotel-agent  │      │ rag-retrieval│
└──────────────┘      └──────────────┘      └──────────────┘
```

### Execution Points (`FailurePoint`)
- `API`: Outer HTTP/Express request boundary
- `ORCHESTRATOR`: TravelAgentOrchestrator workflow pipeline
- `AGENT`: Concrete multi-agent executors (Flight, Hotel, Activity, Transport, Itinerary, Budget, Verification)
- `TOOL`: Individual ToolRegistry tools (`searchFlights`, `searchHotels`, `calculateBudget`, etc.)
- `MCP`: Model Context Protocol adapter tools (`executeMcpToolCall`)
- `GEMINI`: LLM chat provider & LLM-as-judge calls
- `RAG`: Semantic retrieval, vector store, and grounding validation
- `GUARDRAIL`: Input/output safety filters (`prompt-injection`, `budget-adherence`, `booking-state`)
- `VERIFICATION`: Multi-dimensional rule auditor (`VerificationAgent`)
- `BOOKING`: Inventory hold & booking lifecycle coordinator
- `PAYMENT`: Mock sandbox payment gateway

### Failure Modes (`FailureMode`)
- `ERROR`: Standard provider/network exception
- `TIMEOUT`: Latency deadline exceeded
- `RATE_LIMIT`: HTTP 429 too many requests
- `QUOTA_EXHAUSTED`: Free-tier / project quota exhausted
- `INVALID_OUTPUT`: Schema-violating or out-of-bounds output
- `MALFORMED_RESPONSE`: Corrupted JSON payload
- `UNAVAILABLE`: HTTP 503 service unavailable
- `CONSTRAINT_FAILURE`: Rule/guardrail violation

---

## 3. Error Taxonomy & Bounded Retry Policy

### Error Classification (`ErrorTaxonomy`)

| Category | Retryable? | Severity | Typical Cause | System Response |
| :--- | :---: | :---: | :--- | :--- |
| `TIMEOUT` | **Yes** | MEDIUM | Provider network latency | Bounded exponential backoff (max 2 retries) |
| `RATE_LIMIT` | **Yes** | MEDIUM | Upstream 429 response | Bounded backoff delay |
| `QUOTA_EXHAUSTED` | **Yes** | HIGH | LLM / API quota hit | Retry once, then fallback to deterministic consultant |
| `PROVIDER_ERROR` | **Yes** | HIGH | Transient 503 / 502 / ECONNRESET | Bounded backoff (max 2 retries) |
| `VALIDATION_ERROR` | **No** | MEDIUM | Malformed schema, invalid args | Abort immediately; zero retries |
| `AUTHORIZATION_ERROR` | **No** | CRITICAL | Least-privilege permission denial | Abort immediately; security violation logged |
| `GUARDRAIL_BLOCK` | **No** | CRITICAL | Prompt injection / PII / abuse | Block execution; sanitize response |
| `PAYMENT_ERROR` | **No** | CRITICAL | Card declined / insufficient funds | Halt checkout; require customer action |
| `BOOKING_ERROR` | **No** | HIGH | Inventory expired / state conflict | Abort confirmation; state remains `FAILED` |
| `RAG_ERROR` | **No** | MEDIUM | Vector index error / missing knowledge | Produce safe uncertainty response (zero hallucination) |

### Bounded Retry Rules
- Maximum retries: 2 (3 attempts total).
- Backoff delay: `backoffMs * attempt` (bounded between 50ms and 500ms).
- Selective retry: Non-retryable errors break out of the loop immediately on attempt 1.
- Telemetry: Every retry attempt increments `span.metadata.retryCount` and records to `TelemetryMetricsCollector`.

---

## 4. Dependency-Aware DAG & Partial Failure Recovery

AeroDAG coordinates travel planning as a Directed Acyclic Graph:

```
[Parallel Step 1]
  ├── Flight Agent   ─────────┐
  ├── Hotel Agent    ─────────┼──► Itinerary Agent ──► Budget Agent ──► Verification Agent
  ├── Activity Agent ─────────┤
  └── Transport Agent ────────┘
```

### Critical vs. Ancillary Dependencies
1. **Critical Dependencies (Flight, Hotel)**:
   - If `flight-agent` or `hotel-agent` fails permanently, the downstream `itinerary-agent` cannot synthesize arrival dates or accommodations.
   - The orchestrator **aborts immediately** with a clear message: `"Orchestration Aborted: Critical dependency Flight Agent failed"`.
   - The system **never invents a synthetic flight or hotel** to pretend the plan succeeded.
2. **Ancillary Dependencies (Activity, Transport)**:
   - If `activity-agent` fails (e.g. provider timeout), the orchestrator can activate **partial recovery** when configured.
   - Flight, Hotel, and Transport results are preserved.
   - Activity list defaults to empty with an actionable recommendation: `"Activity discovery service temporarily unavailable; flexible self-guided exploration recommended."`
   - If `transport-agent` fails, a standard local taxi transfer estimate is attached with a notification.

---

## 5. Booking & Payment State Machine Safety

The `BookingSafetyCoordinator` (`src/services/reliability/bookingSafetyService.ts`) manages transactional safety across 7 states:

```
SEARCHED ──► AVAILABLE ──► SELECTED ──► HELD ──► PAYMENT_PROCESSING ──► CONFIRMED
    │              │             │        │               │
    └──────────────┴─────────────┴────────┴───────────────┴──────────► FAILED
```

### Invariants Enforced
1. **Hold Validity**: A booking cannot transition from `HELD` to `PAYMENT_PROCESSING` unless the hold token exists and has not expired.
2. **Payment Verification**: A booking cannot transition from `PAYMENT_PROCESSING` to `CONFIRMED` without a verified payment transaction reference (`TXN-*`).
3. **Idempotency Guard**: Any duplicate payment or confirmation request with an already-completed idempotency key returns the existing cached response without double-charging or re-booking.
4. **State Truthfulness**: Any output claiming tickets are confirmed when the underlying provider state is `FAILED` or `HELD` is blocked by `BookingStateGuardrail`.

---

## 6. Telemetry Integration

All failure injections integrate directly with the Phase 7.1 `TelemetryTracer`:
- Every injected error records `errorCategory`, `status: 'ERROR' | 'TIMEOUT'`, and `retryCount`.
- Child tool spans and agent spans inherit the root request `traceId`.
- Sensitive credentials, payment cards, CVVs, and PII are redacted before recording.
