# AeroDAG Real Travel API Integration (Phase 8.2)

## 1. Overview & Architecture

AeroDAG Phase 8.2 introduces production-grade external travel provider integration for **Flights** and **Hotels** on top of the Phase 8.1 Provider Abstraction Layer. The system guarantees complete vendor neutrality: travel planning agents, orchestration pipelines, and user-facing tools interact strictly with canonical domain interfaces (`FlightProvider`, `HotelProvider`) without knowing or depending on whether the underlying implementation is real or simulated.

```
                    TRAVEL AGENT / ORCHESTRATOR
                                 │
                                 ▼
                     Domain Interfaces:
                 FlightProvider / HotelProvider
                                 │
                                 ▼
                          ProviderRegistry
                           /           \
                          /             \
               Real Providers        Mock Providers
             (Amadeus GDS / REST)  (Deterministic Datasets)
                     │                      │
                     ▼                      ▼
            External Travel API       Safe Simulation
```

### Core Invariants
1. **Real Data When Configured**: When `FLIGHT_PROVIDER=real` or `HOTEL_PROVIDER=real` and credentials exist, live inventory is searched.
2. **Deterministic Safety by Default**: If credentials are missing, system defaults safely to mock mode without crashing development environments.
3. **No Fake Inventory in Production**: In `NODE_ENV=production`, fallback to mock inventory is strictly blocked unless `DEMO_MODE=true`. Fake inventory must never masquerade as bookable real inventory.
4. **Zero Price/Availability Fabrication**: Missing prices or seat counts are represented as unavailable or unconfirmed; prices are never estimated or fabricated.
5. **Strict Search Boundary**: Search operations return offers (`SEARCHED` / `AVAILABLE`), never mutating booking states into `CONFIRMED` or `HELD`. Real booking and ticketing remain deferred to later phases.

---

## 2. Integrated Providers & Configuration

### Integrated Providers
- **`RealFlightProvider`**: External flight search adapter integrating GDS / Amadeus Flight Offers API (`/v2/shopping/flight-offers`).
- **`RealHotelProvider`**: External hotel accommodation adapter integrating Amadeus Hotel Search API (`/v1/reference-data/locations/hotels/by-city`).
- **`MockFlightProvider` & `MockHotelProvider`**: Retained for deterministic unit tests, CI test runs, and safe demo mode.

### Server Environment Configuration
```env
# Provider Selection (real | mock | amadeus)
FLIGHT_PROVIDER=real
HOTEL_PROVIDER=real

# Environment & Safety Mode
NODE_ENV=development
DEMO_MODE=false

# External Provider Credentials (Server-Side Only)
AMADEUS_CLIENT_ID=your_amadeus_api_key
AMADEUS_CLIENT_SECRET=your_amadeus_api_secret

# Optional Live Smoke Testing
REAL_PROVIDER_TEST=false
```

Credentials are strictly validated at server startup via `src/config/env.ts`. `getSafePublicConfig()` strips all secrets before sending configuration to the client or UI.

---

## 3. Domain Interfaces & Request Flow

### Request Flow
1. **Agent Invocation**: Travel agent calls `flightProvider.searchFlightOptions(params)` or `hotelProvider.searchHotelOptions(params)`.
2. **Criteria Validation**: Input parameters (`origin`, `destination`, `dates`, `travellerCount`, `durationNights`) are validated. Invalid inputs immediately throw `ProviderValidationError` without network overhead.
3. **Cache Lookup**: `SafeCacheManager` inspects namespace `tool_search_results`. If an unexpired snapshot exists, cached options are returned with `providerMetadata.cached = true`.
4. **OAuth Token Negotiation**: `RealFlightProvider` and `RealHotelProvider` fetch or reuse an in-memory OAuth2 bearer token from Amadeus auth endpoints with automatic TTL caching.
5. **External API Execution**: Outgoing HTTP request executed with bounded timeout (8,000ms) via `AbortController`.
6. **Canonical Normalization**: Raw GDS vendor JSON is transformed into canonical `FlightOption` / `HotelOption` models.
7. **Telemetry & Caching**: Operation span recorded via `TelemetryTracer`, result cached with short 60s TTL, and normalized options returned.

---

## 4. Normalization Contracts

### Flight Normalization (`FlightOption`)
External GDS offers are normalized into canonical `FlightOption`:
- **`id`**: Unique offer identifier from provider.
- **`airline`**: Mapped carrier name (e.g. `6E` -> `IndiGo`, `AI` -> `Air India`, `UK` -> `Vistara`).
- **`flightNumber`**: Canonical format (e.g. `6E 521`).
- **`origin` / `destination`**: 3-letter IATA airport codes (e.g. `BLR`, `GOI`).
- **`departure` / `arrival`**: ISO datetime format (`YYYY-MM-DD HH:mm:ss`).
- **`duration`**: Normalized hours and minutes string (e.g. `PT2H15M` -> `2h 15m`).
- **`stops`**: Segment count minus 1 (0 = Direct, 1 = 1 Stop).
- **`cabin`**: Cabin tier (e.g. `ECONOMY`, `BUSINESS`).
- **`baggage`**: Canonical allowance (e.g. `15 kg Checked`, `1 Checked Bag(s)`).
- **`price`**: Numeric total amount in exact returned currency.
- **`currency`**: Normalized 3-letter currency code (e.g. `INR`, `EUR`, `USD`).
- **`availability`**: Available seats count or boolean `true`.
- **`providerMetadata`**: Scrubbed metadata containing `simulated: false`, `cached: boolean`, and latency.

### Hotel Normalization (`HotelOption`)
- **`id`**: Unique property identifier.
- **`name`**: Hotel display name.
- **`location`**: Standardized city and region.
- **`rating`**: Numeric star rating (1–5).
- **`roomType`**: Descriptive room classification (e.g. `Connecting Family Villa Suite`).
- **`capacity`**: Verified guest capacity.
- **`amenities`**: Curated amenity string array (e.g. `['Swimming Pool', 'Kids Club', 'Free Wi-Fi']`).
- **`cancellationPolicy`**: Explicit policy (e.g. `Free cancellation until 24h before check-in`).
- **`price`**: Total stay amount.
- **`currency`**: 3-letter currency code.
- **`providerMetadata`**: Includes family and capacity compliance metadata.

---

## 5. Capacity & Family Safety Verification

AeroDAG strictly prohibits "blind trust" of unstructured provider marketing text:
- For families and groups, room capacity is evaluated against total party size (`adultsCount + childrenCount`).
- If the provider includes verified room capacity $\ge$ party size:
  - `capacityVerified: true`
  - `familyComplianceStatus: 'COMPLIANT'`
- If room capacity is absent or unstructured:
  - `capacityVerified: false`
  - `familyComplianceStatus: 'UNKNOWN'`
- **Rule**: Agents and UI never claim "family room confirmed" when provider capacity data is `UNKNOWN`.

---

## 6. Error Taxonomy Mapping & Reliability

All external HTTP responses and network exceptions map into Phase 8.1 / Phase 7.2 canonical errors:

| External HTTP / Error Condition | Normalized Provider Error | ErrorTaxonomy Category | Retryable |
| :--- | :--- | :--- | :--- |
| Network Timeout / `AbortError` | `ProviderTimeoutError` | `TIMEOUT` | Yes (Bounded) |
| HTTP 429 Too Many Requests | `ProviderRateLimitError` | `RATE_LIMIT` | Yes (Backoff) |
| HTTP 401 Unauthorized / 403 Forbidden | `ProviderAuthenticationError` | `AUTHORIZATION_ERROR` | No (Fast Fail) |
| HTTP 500 / 502 / 503 / 504 | `ProviderUnavailableError` | `PROVIDER_ERROR` | Yes (Bounded) |
| HTTP 400 Bad Request / Invalid Criteria | `ProviderValidationError` | `VALIDATION_ERROR` | No (Fast Fail) |
| Malformed JSON / Missing Required Fields | `ProviderDataError` | `INVALID_INPUT` | No (Fast Fail) |

All retries are handled through the existing Phase 7.2 reliability engine (`BoundedRetryManager` with maximum 2 retries). Aggressive polling or infinite loops are impossible.

---

## 7. Caching & State Invariants

- **SafeCacheManager**: Leverages Phase 7.3 namespace isolation (`tool_search_results`).
- **Short TTL**: Read-only flight and hotel search snapshots expire in 60 seconds.
- **Snapshot Indicator**: Cached responses return `providerMetadata.cached = true`.
- **Prohibited Caching Rules**:
  - Payment credentials, tokens, and authorization IDs are NEVER cached.
  - Booking holds, reservation states, and confirmation numbers are NEVER cached.
  - Search results are strictly transient snapshots and never treated as confirmed inventory.

---

## 8. Security & Observability

### Security Guardrails
1. **Zero Secret Leakage**: API keys, bearer tokens, and client secrets are stripped from provider metadata via `sanitizeProviderMetadata`.
2. **Server-Side Confinement**: External credentials never appear in frontend bundles, LLM prompts, tool arguments, or log outputs.
3. **Telemetry Sanitization**: Traces record provider name, latency, outcome, and item counts, but never authorization headers or raw sensitive payloads.

### Observability
Every search emits structured spans under `TelemetryTracer`:
- Operation: `real_flight_search` or `real_hotel_search`
- Spans: start time, duration, status (`SUCCESS`, `ERROR`, `TIMEOUT`), item count, sanitized error messages.

---

## 9. Testing Strategy & Opt-In Smoke Test

### Deterministic Test Suite (`test_phase8_2.ts`)
The standard test suite does **NOT** require active internet connectivity or paid API credentials. It uses:
- Custom mock HTTP invokers injecting real-format Amadeus GDS payloads.
- Injected network faults (HTTP 429, 401, 503, timeouts, malformed payloads).
- 46 automated assertions verifying interface compliance, normalization, safety invariants, and registry modes.

### Running Test Suite
```bash
npx tsx test_phase8_2.ts
```

### Live API Smoke Test (Optional)
To run an opt-in live search against Amadeus sandbox:
```bash
AMADEUS_CLIENT_ID=your_key AMADEUS_CLIENT_SECRET=your_secret REAL_PROVIDER_TEST=true npx tsx test_phase8_2.ts
```
The smoke test is strictly read-only search: it never creates holds, books rooms, issues tickets, or charges credit cards.

---

## 10. Scope Boundaries & Next Steps

Phase 8.2 is strictly **SEARCH / INVENTORY INTEGRATION**:
- **Included**: Real flight search, real hotel search, criteria validation, GDS response normalization, rate limit/timeout mapping, safe caching, and fallback protection.
- **Excluded**: Live bookings, hold mutations, ticket issuance, credit card captures, or checkout flows. (Deferred to later phases).
