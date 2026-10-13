# AeroDAG Travel Context Providers Architecture

Phase 8.3 establishes decoupled, provider-neutral abstractions and real external adapters for:
1. **Maps & Routing** (`MapProvider` / `RealMapProvider` / `MockMapProvider`)
2. **Weather & Meteorological Conditions** (`WeatherProvider` / `RealWeatherProvider` / `MockWeatherProvider`)
3. **Currency Exchange & Conversion** (`CurrencyProvider` / `RealCurrencyProvider` / `MockCurrencyProvider`)

These context providers supply canonical data consumed directly by the **Destination Agent**, **Itinerary Agent**, **Transport Agent**, **Budget Agent**, and **Verification Agent** without exposing vendor-specific API structures, authorization credentials, or internal schemas to agents or client applications.

---

## 1. Maps & Routing Architecture

The maps subsystem calculates physical point-to-point transit metrics, geocodes named landmarks, and computes multi-stop route segments.

```
+--------------------+        +---------------------+        +--------------------+
|   ItineraryAgent   | -----> | ContextTravel       | -----> | MapProvider        |
|                    |        | Evaluator           |        | Domain Interface   |
+--------------------+        +---------------------+        +--------------------+
                                                                       |
                                                                       v
                                                             +--------------------+
                                                             |  ProviderRegistry  |
                                                             +--------------------+
                                                             /                    \
                                                            v                      v
                                                  +--------------------+ +--------------------+
                                                  | RealMapProvider    | | MockMapProvider    |
                                                  | (OSRM / Nominatim) | | (Deterministic)    |
                                                  +--------------------+ +--------------------+
```

- **Agents interact strictly with `MapProvider`**: Neither `ItineraryAgent` nor `TransportAgent` ever calls Google Maps, Mapbox, or OSRM endpoints directly.
- **Geocoding & Reverse Geocoding**: Accepts string location queries (e.g., `"Cubbon Park, Bengaluru"`) and returns canonical `PlaceLocation` models containing exact latitude and longitude.
- **Route Calculation**: Resolves routing pairs or sequences into `MapRouteOption`, with distance normalized to **kilometers (km)** and duration normalized to **minutes**.

---

## 2. Weather & Meteorological Architecture

The weather subsystem fetches real-time meteorological reports and multi-day forecasts to inform activity feasibility and tourist safety.

```
+--------------------+        +---------------------+        +--------------------+
| VerificationAgent  | -----> | ContextTravel       | -----> | WeatherProvider    |
| / ItineraryAgent   |        | Evaluator           |        | Domain Interface   |
+--------------------+        +---------------------+        +--------------------+
                                                                       |
                                                                       v
                                                             +--------------------+
                                                             |  ProviderRegistry  |
                                                             +--------------------+
                                                             /                    \
                                                            v                      v
                                                  +--------------------+ +--------------------+
                                                  | RealWeatherProvider| | MockWeatherProvider|
                                                  | (Open-Meteo)       | | (Deterministic)    |
                                                  +--------------------+ +--------------------+
```

- **Open-Meteo API**: Utilized for real zero-auth weather lookups, returning daily forecasts, max/min temperatures, precipitation probabilities, precipitation volumes, WMO weather condition codes, and wind speeds.
- **Internal Units**: Temperature is normalized to Celsius (`°C`), wind speed to `km/h`, and precipitation volume to millimeters (`mm`).
- **Advisories & Alerts**: Flags high precipitation (>60%), extreme heat (>38°C), and meteorological alert headlines.

---

## 3. Currency Exchange Architecture

The currency subsystem guarantees deterministic, precision-preserving exchange rate resolution and financial currency conversions.

```
+--------------------+        +---------------------+        +--------------------+
|    BudgetAgent     | -----> | ContextTravel       | -----> | CurrencyProvider   |
|                    |        | Evaluator           |        | Domain Interface   |
+--------------------+        +---------------------+        +--------------------+
                                                                       |
                                                                       v
                                                             +--------------------+
                                                             |  ProviderRegistry  |
                                                             +--------------------+
                                                             /                    \
                                                            v                      v
                                                  +--------------------+ +--------------------+
                                                  |RealCurrencyProvider| |MockCurrencyProvider|
                                                  | (Frankfurter / ECB)| | (Deterministic)    |
                                                  +--------------------+ +--------------------+
```

- **India-First Budgeting**: Default display currency is `INR` (Indian Rupee), while supporting arbitrary international currencies (`USD`, `EUR`, `JPY`, `SGD`, `THB`, `VND`, `GBP`, etc.).
- **Deterministic Arithmetic**: Zero LLM financial arithmetic. All conversions use deterministic math:
  $$\text{convertedAmount} = \text{round}(\text{amount} \times \text{rate}, 2)$$
- **Audit Traceability**: Every conversion outputs `CurrencyConversionResult` retaining source currency, original amount, rate, quote timestamp, provider identifier, and cache hit state.

---

## 4. Domain Interfaces

All context providers implement domain contracts defined in `src/services/providers/types.ts`:

```typescript
export interface MapProvider extends BaseProvider {
  getRoute(origin: string, destination: string, mode?: string): Promise<MapRouteOption>;
  getDistance(origin: string, destination: string, mode?: string): Promise<{ distanceKm: number; durationMinutes: number }>;
  geocode?(query: string): Promise<PlaceLocation>;
}

export interface WeatherProvider extends BaseProvider {
  getCurrentWeather(location: string, coordinates?: { lat: number; lon: number }): Promise<WeatherReport>;
  getForecast(location: string, days?: number, coordinates?: { lat: number; lon: number }): Promise<WeatherReport[]>;
}

export interface CurrencyProvider extends BaseProvider {
  getExchangeRate(from: string, to: string): Promise<CurrencyRate>;
  convert(amount: number, from: string, to: string): Promise<number>;
  convertDetailed(amount: number, from: string, to: string): Promise<CurrencyConversionResult>;
}
```

---

## 5. Real Providers

1. **`RealMapProvider`**:
   - Geocoding: OpenStreetMap Nominatim (`https://nominatim.openstreetmap.org/search`).
   - Routing: Open Source Routing Machine (`http://router.project-osrm.org/route/v1/driving/`).
   - Network calls use `HttpInvoker` with configurable 8000ms timeouts, 429/403/500 error classification, and automatic telemetry tracing.

2. **`RealWeatherProvider`**:
   - Forecasts: Open-Meteo (`https://api.open-meteo.com/v1/forecast`).
   - Auto-geocodes city names to coordinates before fetching forecast data.
   - Normalizes WMO codes (0=Clear, 51-67=Rain, 95-99=Thunderstorm) into descriptive text conditions.

3. **`RealCurrencyProvider`**:
   - Rates: Frankfurter API (backed by the European Central Bank, `https://api.frankfurter.app/latest`).
   - Validates ISO-4217 3-letter currency codes.
   - Computes reciprocal and cross-rates deterministically when needed.

---

## 6. Mock Providers

1. **`MockMapProvider`**:
   - Deterministic distance calculation based on coordinate or name hashing.
   - Realistic speed calculation (average 40 km/h urban driving, 4.5 km/h walking).
   - Generates simulated canonical `MapRouteOption` marked `simulated: true`.

2. **`MockWeatherProvider`**:
   - Returns 5-day forecasts with realistic seasonal temperatures and precipitation chances.
   - Detects keyword conditions (e.g. "Monsoon" in Goa or "Desert heat" in Rajasthan).
   - All reports marked `simulated: true`.

3. **`MockCurrencyProvider`**:
   - Pre-calibrated baseline rates for key travel pairs:
     - `USD -> INR`: 86.5
     - `EUR -> INR`: 91.2
     - `GBP -> INR`: 108.5
     - `SGD -> INR`: 64.2
     - `THB -> INR`: 2.45
     - `JPY -> INR`: 0.58
     - `AED -> INR`: 23.55
   - All conversions marked `simulated: true`.

---

## 7. Normalization

External payloads are parsed using pure functions in `src/services/providers/normalizers.ts`:
- **`normalizePlaceLocation`**: Rejects missing coordinates, throws `ProviderDataError` rather than fabricating coordinates.
- **`normalizeMapRoute`**: Converts meters to kilometers, seconds to minutes, maps coordinates, and strips vendor metadata.
- **`normalizeWeatherForecast`**: Extracts Open-Meteo daily arrays into canonical `WeatherReport` records.
- **`normalizeCurrency`**: Canonicalizes 3-letter currency codes, extracts rate, and verifies mathematical sanity.
- **`sanitizeProviderMetadata`**: Redacts credentials, tokens, and authorization parameters.

---

## 8. Caching

Caching leverages `SafeCacheManager` (`src/services/optimization/cacheManager.ts`) with distinct, conservative namespace TTLs:
- **Maps**: 120 seconds TTL (short-lived due to dynamic traffic conditions).
- **Weather**: 300 seconds (5 minutes) TTL.
- **Currency**: 600 seconds (10 minutes) TTL.

**Safety Invariants**:
- Cached objects are marked `cached: true` and include `retrievedAt` timestamps.
- Booking states and payment states are strictly banned from `SafeCacheManager` (violators throw `UnsafeCacheAttemptError`).

---

## 9. Freshness & Stale Data Detection

Data freshness thresholds are enforced by `ContextTravelEvaluator`:
- **Weather Freshness Threshold**: 180 minutes (3 hours). Weather reports older than 3 hours are marked `isStale: true` and flagged in verification.
- **Currency Freshness Threshold**: 1440 minutes (24 hours). Rates older than 24 hours are marked `isStale: true` with a `RATE_STALE` warning.
- Never present stale cached data as freshly retrieved.

---

## 10. Error Handling & Taxonomy

External errors are mapped directly into the Phase 7.2 Error Taxonomy (`src/services/providers/errors.ts` and `src/services/reliability/errorTaxonomy.ts`):
- `HTTP 429` $\to$ `ProviderRateLimitError` (`RATE_LIMIT`, isRetryable: true)
- Network timeout / Abort $\to$ `ProviderTimeoutError` (`TIMEOUT`, isRetryable: true)
- `HTTP 401 / 403` $\to$ `ProviderAuthenticationError` (`AUTHORIZATION_ERROR`, isRetryable: false)
- `HTTP 5xx` $\to$ `ProviderUnavailableError` (`PROVIDER_ERROR`, isRetryable: true)
- Malformed / Incomplete payload $\to$ `ProviderDataError` (`DATA_ERROR`, isRetryable: false)
- Unsupported mode / capability $\to$ `ProviderNotSupportedError` (`NOT_SUPPORTED`, isRetryable: false)

---

## 11. Rate Limits & Bounded Retry

- All provider HTTP calls use bounded retry policies via `ErrorTaxonomy`.
- Transient network blips and 429/503 errors retry at most 2 times with exponential backoff.
- Exhausted retries bubble up as structured `ProviderError` instances. No infinite loops.
- Providers degrade gracefully to `UNKNOWN` or `UNAVAILABLE` states. Never fabricate data.

---

## 12. Security & SSRF Protection

- **Credentials Server-Side Only**: Keys (`OPENWEATHER_API_KEY`, `GOOGLE_MAPS_API_KEY`, etc.) are read strictly via `process.env`.
- **SSRF Defenses**:
  - Outbound requests only target allowlisted provider base URLs (`nominatim.openstreetmap.org`, `router.project-osrm.org`, `api.open-meteo.com`, `api.frankfurter.app`).
  - Arbitrary user-provided URLs are never executed.
- **Zero Credential Leakage**:
  - `getSafePublicConfig()` strips all secrets.
  - Telemetry metadata sanitizers redact `apiKey`, `Authorization`, and tokens before recording spans.

---

## 13. Telemetry & Observability

Every provider operation records OpenTelemetry-compatible spans via `getTelemetryTracer()`:
- `traceId`, `spanId`, `parentSpanId`
- `component: "provider"`
- `operationName: "<providerName>.<operation>"`
- `metadata`: sanitized parameters (e.g. `{ sourceCurrency: "USD", targetCurrency: "INR" }`)
- `status`: `"SUCCESS" | "ERROR" | "TIMEOUT"`
- `durationMs`: high-precision millisecond timing

---

## 14. Itinerary Integration

`ContextTravelEvaluator.evaluateItineraryRoutes` inspects consecutive stops on multi-day itineraries:
- **`HIGH_TRAVEL_TIME`**: Flagged if total daily transit time exceeds 240 minutes (configurable).
- **`ROUTE_INEFFICIENCY`**: Flagged if consecutive attractions have an excessive hop distance (>75 km) while closer stops exist.
- **`UNKNOWN`**: If route data is unavailable or fails, route status defaults to `UNKNOWN` without rejecting or crashing the itinerary.

`ContextTravelEvaluator.evaluateWeatherRisks` evaluates weather suitability:
- **`WEATHER_RISK`**: Outdoor activities scheduled on days with $\ge 60\%$ precipitation probability.
- **`PACING_RISK`**: Long outdoor walking or treks during extreme heat (>38°C).
- **`SEVERE_WEATHER_ALERT`**: Active storm or severe meteorological warnings.
- **No Automatic Cancellation**: Risk findings are surfaced to `VerificationAgent` as warnings/advisories without deleting activities from the itinerary.

---

## 15. Budget Integration

`ContextTravelEvaluator.normalizeBudgetItems` normalizes disparate line items (e.g. flights in USD, hotels in SGD, activities in THB) into the user's target currency (default INR):
- Each converted line item records:
  ```typescript
  {
    originalAmount: 400,
    sourceCurrency: "USD",
    exchangeRate: 86.5,
    convertedAmount: 34600,
    targetCurrency: "INR",
    rateTimestamp: "2026-10-07T00:00:00Z",
    provider: "RealCurrencyProvider",
    cached: false
  }
  ```
- Line item summation and totals are calculated with 100% deterministic precision math.

---

## 16. Demo vs. Production Behavior

| Mode | Environment | Maps / Weather / Currency Behavior |
| :--- | :--- | :--- |
| **Development** | `NODE_ENV=development` | Defaults to mock providers if API keys or network are unavailable. |
| **Demo Mode** | `DEMO_MODE=true` | Explicitly allows mock providers; data clearly labeled `simulated: true`. |
| **Production** | `NODE_ENV=production`, `DEMO_MODE=false` | **Strictly blocks fake fallback**. If real providers fail or lack credentials, returns safe degraded status (`UNKNOWN` / `UNAVAILABLE`). Fake data is forbidden. |

---

## 17. Known Limitations

1. **OSRM Public Server**: The public demo OSRM instance has rate limits (~1 req/sec). In large-scale enterprise deployments, a self-hosted OSRM instance or commercial routing API (Google Maps / Mapbox) should be configured.
2. **Open-Meteo Forecast Horizon**: 7 to 14 days maximum. For trips planned months in advance, seasonal historical climate norms should be consulted rather than real-time daily forecasts.
3. **Frankfurter ECB Currency Scope**: Tracks ~32 major central bank currencies. Minor or pegged currencies may require secondary market providers.
