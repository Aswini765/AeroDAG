# AeroDAG Provider Abstraction Architecture (Phase 8.1)

## 1. Overview & Architectural Goals

The goal of AeroDAG Phase 8.1 is **Provider Abstraction Hardening**: guaranteeing that travel agents and domain orchestration layers are completely decoupled from individual external vendors (Amadeus, Sabre, Google Maps, Mapbox, Gemini, Stripe, Razorpay).

External vendor SDKs and private schemas must remain behind strict abstraction boundaries.

```
                    TRAVEL AGENT
                         │
                         ▼
                  DOMAIN INTERFACE
                         │
                  PROVIDER REGISTRY
                    /           \
                   /             \
          REAL PROVIDER       MOCK PROVIDER
              │                    │
              ▼                    ▼
        External API         Deterministic Data
```

---

## 2. Domain-Level Interfaces

All provider types implement provider-neutral domain contracts:

| Provider Interface | Domain Category | Key Operations | Example Implementations |
| :--- | :--- | :--- | :--- |
| `FlightProvider` | `flights` | `searchFlights()`, `searchFlightOptions()`, `calculateLabels()` | `MockFlightProvider`, `AmadeusFlightAdapter` |
| `HotelProvider` | `hotels` | `searchHotels()`, `searchHotelOptions()` | `MockHotelProvider`, `ExpediaHotelAdapter` |
| `TransportProvider` | `transport` | `searchTransfers()`, `searchTransportOptions()`, `searchTrains()` | `MockTransportProvider` |
| `ActivityProvider` | `activities` | `searchActivities()`, `searchActivityOptions()` | `MockActivityProvider` |
| `MapProvider` | `maps` | `getRoute()`, `getDistance()` | `MockMapProvider`, `GoogleMapsAdapter` |
| `WeatherProvider` | `weather` | `getCurrentWeather()`, `getForecast()` | `MockWeatherProvider`, `OpenWeatherAdapter` |
| `CurrencyProvider` | `currency` | `getExchangeRate()`, `convert()` | `MockCurrencyProvider` |
| `PaymentProvider` | `payment` | `authorizePayment()`, `capturePayment()`, `refundPayment()`, `getPaymentStatus()` | `MockPaymentProvider` |
| `LLMProvider` | `llm` | `generate()`, `generateStructured()`, `embed()` | `GeminiLLMProvider`, `MockLLMProvider` |
| `EmbeddingProvider` | `embeddings` | `generateEmbedding()`, `generateEmbeddings()` | `DeterministicEmbeddingProvider`, `CachedEmbeddingProvider` |
| `TravelKnowledgeProvider` | `travelKnowledge` | `getDestinationKnowledge()`, `searchKnowledge()` | `MockTravelKnowledgeProvider` |

---

## 3. Normalized Domain Models

AeroDAG enforces canonical, normalized domain models for all business logic and agent consumption:

- `FlightOption`: `id`, `airline`, `flightNumber`, `origin`, `destination`, `departure`, `arrival`, `duration`, `stops`, `cabin`, `baggage`, `price`, `currency`, `availability`, `providerMetadata`.
- `HotelOption`: `id`, `name`, `location`, `rating`, `roomType`, `capacity`, `amenities`, `cancellationPolicy`, `price`, `currency`, `availability`, `providerMetadata`.
- `ActivityOption`: `id`, `name`, `location`, `duration`, `category`, `suitability`, `price`, `currency`, `availability`, `providerMetadata`.
- `TransportOption`: `id`, `mode`, `carrier`, `origin`, `destination`, `departure`, `arrival`, `duration`, `price`, `currency`, `availability`, `providerMetadata`.
- `MapRouteOption`: `id`, `origin`, `destination`, `distanceKm`, `durationMinutes`, `waypoints`, `steps`, `providerMetadata`.
- `WeatherReport`: `location`, `date`, `temperatureMinC`, `temperatureMaxC`, `condition`, `precipitationChance`, `humidity`, `advisory`, `providerMetadata`.
- `CurrencyRate`: `fromCurrency`, `toCurrency`, `rate`, `timestamp`, `providerMetadata`.
- `PaymentAuthorizationResult`: `success`, `transactionId`, `orderId`, `status`, `authCode`, `errorMessage`, `providerMetadata`.
- `TravelKnowledgeItem`: `destination`, `highlights`, `bestTimeToVisit`, `visaInfo`, `safetyAdvisory`, `budgetTiers`, `providerMetadata`.

### Provider Metadata Sanitization Invariant
Every model includes `providerMetadata: ProviderMetadata` containing:
- `providerName: string`
- `simulated: boolean` (must be `true` for mock/deterministic data)
- `latencyMs?: number`
- `cost?: number | 'unavailable'` (no fabricated costs)

`sanitizeProviderMetadata` strictly scrubs API keys, authorization bearer tokens, credentials, and payment card numbers before metadata is attached or stored.

---

## 4. Centralized Provider Registry

The `ProviderRegistry` manages registration, capability inspection, health checks, and runtime resolution:

- `registerProvider<T>(category, provider, isDefault)`: Server-side registration only. Rejects illegal prototype or traversal names.
- `getProvider<T>(category, name)`: Retrieves a specific registered provider.
- `resolveProvider<T>(category, overrideName)`: Configuration-driven resolution via server environment (`FLIGHT_PROVIDER`, `HOTEL_PROVIDER`, `LLM_PROVIDER`, etc.).
- `listProviders(category)`: Lists active providers, capabilities, and health states.
- `assertCapability(provider, capability)`: Enforces capability boundaries.
- `executeWithFallback<T>(category, operation, runner, options)`: Fallback chain execution.

---

## 5. Provider Capabilities & Health Taxonomy

### Capability Model
Each provider declares static capabilities via `readonly capabilities: ProviderCapabilities`:
- `search`, `availability`, `pricing`, `booking`, `cancellation`, `modification`, `refund`, `realTimeData`, `international`, `domestic`, `currencySupport`, `baggageData`, `cancellationPolicy`, `structuredOutput`, `streaming`, `embeddings`, `routeOptimization`.
Calling an unsupported capability triggers `ProviderNotSupportedError`.

### Health States
- `'available' | 'degraded' | 'unavailable' | 'authentication_failure' | 'rate_limited' | 'timeout'`
Tracked per category and provider name via `healthCheck()` without replacing the underlying telemetry engine.

---

## 6. Safe Fallback & Simulation Labeling

When primary external providers fail:
1. `executeWithFallback` catches the provider exception.
2. Degrades provider health status and records telemetry.
3. Transparently falls back to secondary or mock providers (if permitted).
4. **CRITICAL INVARIANT**: Never silently fabricates real availability. Mock data is always tagged with `simulated: true` so booking engines never represent mock inventory as real bookable inventory.

---

## 7. Error Normalization & Reliability Integration

Vendor-specific error codes and exceptions are normalized into canonical provider errors:
- `ProviderTimeoutError` (maps to `TIMEOUT`, retryable)
- `ProviderRateLimitError` (maps to `RATE_LIMIT`, retryable)
- `ProviderAuthenticationError` (maps to `AUTHORIZATION_ERROR`, non-retryable)
- `ProviderUnavailableError` (maps to `PROVIDER_ERROR`, retryable or degraded)
- `ProviderValidationError` (maps to `VALIDATION_ERROR`, non-retryable)
- `ProviderNotSupportedError` (maps to `VALIDATION_ERROR`, non-retryable)
- `ProviderDataError` (maps to `PROVIDER_ERROR`, non-retryable)

All provider errors cleanly integrate with Phase 7.2 `ErrorTaxonomy.classify()` and leverage the existing bounded retry system without duplicate retry loops.

---

## 8. LLM, Embedding, & Payment Abstractions

### LLMProvider
Decouples chat, prompt compilation, and consultation from `@google/genai`:
- `GeminiLLMProvider`: Encapsulates Google GenAI SDK, model routing, token usage accounting, and pricing formula.
- `MockLLMProvider`: Deterministic offline evaluation and test provider (`simulated: true`).

### EmbeddingProvider
Maintains vector retrieval neutrality:
- `DeterministicEmbeddingProvider`: Fast, offline-capable 128d semantic projection.
- `CachedEmbeddingProvider`: Zero-repeated computation caching.
- `GeminiEmbeddingProvider`: High-dimension cloud embeddings.

### PaymentProvider & Booking Invariants
The booking pipeline (`BookingSafetyCoordinator`) uses `PaymentProvider` (`authorizePayment`, `capturePayment`, `refundPayment`, `getPaymentStatus`) while strictly retaining authoritative state management:
1. Provider switching CANNOT bypass `BookingStateGuardrail`.
2. Provider switching CANNOT bypass `BookingSafetyCoordinator`.
3. Provider switching CANNOT bypass idempotency deduplication.
4. Provider switching CANNOT bypass inventory hold verification.
5. All mock payments produce `simulated: true` and are incapable of creating real financial transactions.

---

## 9. Security Boundaries

1. **Server-Side Only**: Provider selection, credentials, and API keys are strictly server-side.
2. **Safe Public Config**: `getSafePublicConfig()` exports provider identifiers (e.g. `'mock'`, `'gemini'`) to frontend consumers with zero credentials or secrets.
3. **No Arbitrary Provider Injection**: Frontend cannot pass `provider=malicious` to execute untrusted code; inputs are validated strictly against approved registered names.
