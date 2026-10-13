/**
 * AeroDAG Phase 8.1 Test Suite — Provider Abstraction Hardening
 * 
 * Verifies:
 * A. Interfaces (Tests 1–10: Flight, Hotel, Transport, Activity, Map, Weather, Currency, Payment, LLM, Embedding)
 * B. Registry (Tests 11–15: Registration, lookup, unknown rejection, capability detection, configuration)
 * C. Normalization (Tests 16–20: Flight, hotel, activity, transport, currency normalization)
 * D. Errors (Tests 21–24: Timeout, rate-limit, auth failure, unavailable normalization)
 * E. Fallback (Tests 25–27: Provider fallback, mock provider safety, simulated availability labeling)
 * F. Security (Tests 28–30: Client provider override blocked, server-only credentials, sanitized metadata)
 * G. Regression/Safety (Tests 31–35: Booking state preserved, idempotency enforced, telemetry redaction, retry taxonomy, unsupported capability rejection)
 */

import {
  getProviderRegistry,
  ProviderRegistry,
  MockFlightProvider,
  MockHotelProvider,
  MockTransportProvider,
  MockActivityProvider,
  MockMapProvider,
  MockWeatherProvider,
  MockCurrencyProvider,
  MockPaymentProvider,
  MockLLMProvider,
  MockTravelKnowledgeProvider,
  FlightProvider,
  HotelProvider,
  TransportProvider,
  ActivityProvider,
  MapProvider,
  WeatherProvider,
  CurrencyProvider,
  PaymentProvider,
  LLMProvider,
  normalizeFlight,
  normalizeHotel,
  normalizeActivity,
  normalizeTransport,
  normalizeCurrency,
  sanitizeProviderMetadata,
  ProviderError,
  ProviderTimeoutError,
  ProviderRateLimitError,
  ProviderAuthenticationError,
  ProviderUnavailableError,
  ProviderValidationError,
  ProviderNotSupportedError,
  normalizeProviderError
} from '../../src/services/providers';
import { DeterministicEmbeddingProvider } from '../../src/services/rag/embeddings/deterministicEmbeddingProvider';
import { BookingSafetyCoordinator } from '../../src/services/reliability/bookingSafetyService';
import { ErrorTaxonomy } from '../../src/services/reliability/errorTaxonomy';
import { getSafePublicConfig, getEnv } from '../../src/config/env';
import { getTelemetryTracer, defaultTelemetryStore } from '../../src/services/telemetry';

import { FAKE_GOOGLE_API_KEY } from '../fixtures/fakeSecrets';
let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
  }
}

async function runTestSuite() {
  console.log('\n==================================================');
  console.log('AERODAG PHASE 8.1: PROVIDER ABSTRACTION HARDENING');
  console.log('==================================================\n');

  const registry = getProviderRegistry();

  // ============================================================================
  // CATEGORY A: INTERFACES (Tests 1–10)
  // ============================================================================
  console.log('--- Category A: Domain-Level Interfaces (1-10) ---');

  // Test 1: FlightProvider contract
  {
    const flightProvider = new MockFlightProvider();
    const results = await flightProvider.searchFlightOptions({
      origin: 'Bengaluru (BLR)',
      destination: 'Goa (GOI)',
      dates: '2026-11-10',
      travellerCount: 2,
      adultsCount: 2,
      childrenCount: 0
    });
    const first = results[0];
    assert(
      flightProvider.category === 'flights' &&
      Array.isArray(results) &&
      results.length > 0 &&
      typeof first.id === 'string' &&
      typeof first.airline === 'string' &&
      typeof first.price === 'number' &&
      first.currency === 'INR' &&
      first.providerMetadata.simulated === true,
      'Test 1: FlightProvider contract returns normalized FlightOption[]'
    );
  }

  // Test 2: HotelProvider contract
  {
    const hotelProvider = new MockHotelProvider();
    const results = await hotelProvider.searchHotelOptions({
      destination: 'Goa',
      dates: '2026-11-10',
      durationNights: 3,
      travellerCount: 2,
      adultsCount: 2,
      childrenCount: 0
    });
    const first = results[0];
    assert(
      hotelProvider.category === 'hotels' &&
      Array.isArray(results) &&
      results.length > 0 &&
      typeof first.name === 'string' &&
      typeof first.rating === 'number' &&
      typeof first.capacity === 'number' &&
      Array.isArray(first.amenities) &&
      first.providerMetadata.simulated === true,
      'Test 2: HotelProvider contract returns normalized HotelOption[]'
    );
  }

  // Test 3: TransportProvider contract
  {
    const transportProvider = new MockTransportProvider();
    const results = await transportProvider.searchTransportOptions({
      origin: 'Goa Airport',
      destination: 'Candolim Resort',
      scope: 'domestic',
      travellerCount: 2
    });
    const first = results[0];
    assert(
      transportProvider.category === 'transport' &&
      Array.isArray(results) &&
      results.length > 0 &&
      typeof first.mode === 'string' &&
      typeof first.carrier === 'string' &&
      typeof first.price === 'number' &&
      first.providerMetadata.simulated === true,
      'Test 3: TransportProvider contract returns normalized TransportOption[]'
    );
  }

  // Test 4: ActivityProvider contract
  {
    const activityProvider = new MockActivityProvider();
    const results = await activityProvider.searchActivityOptions({
      destination: 'Goa',
      durationDays: 3
    });
    const first = results[0];
    assert(
      activityProvider.category === 'activities' &&
      Array.isArray(results) &&
      results.length > 0 &&
      typeof first.name === 'string' &&
      typeof first.category === 'string' &&
      Array.isArray(first.suitability) &&
      first.providerMetadata.simulated === true,
      'Test 4: ActivityProvider contract returns normalized ActivityOption[]'
    );
  }

  // Test 5: MapProvider contract
  {
    const mapProvider = new MockMapProvider();
    const route = await mapProvider.getRoute('Panaji', 'Calangute');
    const dist = await mapProvider.getDistance('Panaji', 'Calangute');
    assert(
      mapProvider.category === 'maps' &&
      route.distanceKm > 0 &&
      route.durationMinutes > 0 &&
      Array.isArray(route.steps) &&
      dist.distanceKm === route.distanceKm &&
      route.providerMetadata.simulated === true,
      'Test 5: MapProvider contract provides route and distance calculations'
    );
  }

  // Test 6: WeatherProvider contract
  {
    const weatherProvider = new MockWeatherProvider();
    const current = await weatherProvider.getCurrentWeather('Goa');
    const forecast = await weatherProvider.getForecast('Goa', '2026-11-10');
    assert(
      weatherProvider.category === 'weather' &&
      current.temperatureMaxC > current.temperatureMinC &&
      typeof current.condition === 'string' &&
      forecast.length >= 3 &&
      current.providerMetadata.simulated === true,
      'Test 6: WeatherProvider contract provides forecasts and simulated reports'
    );
  }

  // Test 7: CurrencyProvider contract
  {
    const currencyProvider = new MockCurrencyProvider();
    const rate = await currencyProvider.getExchangeRate('USD', 'INR');
    const converted = await currencyProvider.convert(100, 'USD', 'INR');
    assert(
      currencyProvider.category === 'currency' &&
      rate.rate > 0 &&
      converted.convertedAmount > 100 &&
      converted.currency === 'INR' &&
      rate.providerMetadata.simulated === true,
      'Test 7: CurrencyProvider contract calculates exchange rates and conversions'
    );
  }

  // Test 8: PaymentProvider contract
  {
    const paymentProvider = new MockPaymentProvider();
    const auth = await paymentProvider.authorizePayment({
      orderId: 'ORD-TEST-001',
      amount: 15000,
      currency: 'INR',
      idempotencyKey: 'IDEM-TEST-001',
      paymentMethod: 'UPI'
    });
    const capture = await paymentProvider.capturePayment({
      transactionId: auth.transactionId,
      orderId: 'ORD-TEST-001',
      amount: 15000,
      currency: 'INR',
      idempotencyKey: 'IDEM-TEST-001'
    });
    const status = await paymentProvider.getPaymentStatus(auth.transactionId);
    assert(
      paymentProvider.category === 'payment' &&
      auth.success &&
      auth.status === 'AUTHORIZED' &&
      capture.success &&
      capture.status === 'CAPTURED' &&
      status.status === 'CAPTURED' &&
      auth.providerMetadata.simulated === true,
      'Test 8: PaymentProvider contract authorizes, captures, and checks status'
    );
  }

  // Test 9: LLMProvider contract
  {
    const llmProvider = new MockLLMProvider();
    const gen = await llmProvider.generate({ prompt: 'Recommend 3 places in Goa' });
    const struct = await llmProvider.generateStructured<{ message: string }>({
      prompt: 'Extract trip requirements'
    });
    assert(
      llmProvider.category === 'llm' &&
      typeof gen.text === 'string' &&
      gen.tokenUsage !== undefined &&
      typeof struct.data.message === 'string' &&
      gen.providerMetadata.simulated === true,
      'Test 9: LLMProvider contract supports generate and generateStructured'
    );
  }

  // Test 10: EmbeddingProvider contract
  {
    const embeddingProvider = new DeterministicEmbeddingProvider();
    const emb = await embeddingProvider.generateEmbedding('Vietnam e-visa requirements');
    const batch = await embeddingProvider.generateEmbeddings(['Goa beaches', 'Tokyo Shinkansen']);
    assert(
      embeddingProvider.dimension === 128 &&
      emb.length === 128 &&
      batch.length === 2 &&
      batch[0].length === 128,
      'Test 10: EmbeddingProvider contract generates normalized 128d vectors'
    );
  }

  // ============================================================================
  // CATEGORY B: REGISTRY (Tests 11–15)
  // ============================================================================
  console.log('\n--- Category B: Provider Registry & Resolution (11-15) ---');

  // Test 11: Provider registration
  {
    const customWeather = new MockWeatherProvider();
    registry.registerProvider('weather', customWeather, false);
    const listed = registry.listProviders('weather');
    assert(
      listed.some(p => p.name === 'MockWeatherProvider'),
      'Test 11: Provider registration adds provider to category list'
    );
  }

  // Test 12: Provider lookup
  {
    const flightProv = registry.getProvider<FlightProvider>('flights', 'MockFlightProvider');
    assert(
      flightProv !== undefined && flightProv.providerName === 'MockFlightProvider',
      'Test 12: Provider lookup retrieves exact registered provider by name'
    );
  }

  // Test 13: Unknown provider rejection
  {
    let caught = false;
    try {
      registry.getProvider<FlightProvider>('flights', 'NonExistentVendor999');
    } catch (err: any) {
      caught = err instanceof ProviderValidationError;
    }
    assert(caught, 'Test 13: Unknown provider lookup throws ProviderValidationError');
  }

  // Test 14: Capability detection
  {
    const flightProv = registry.getProvider<FlightProvider>('flights');
    let passCheck = false;
    let failCheck = false;

    try {
      registry.assertCapability(flightProv, 'search');
      passCheck = true;
    } catch {
      passCheck = false;
    }

    try {
      registry.assertCapability(flightProv, 'booking');
    } catch (err: any) {
      failCheck = err instanceof ProviderNotSupportedError;
    }

    assert(
      passCheck && failCheck,
      'Test 14: Capability detection asserts supported and rejects unsupported capabilities'
    );
  }

  // Test 15: Provider configuration resolution
  {
    process.env.WEATHER_PROVIDER = 'MockWeatherProvider';
    const resolved = registry.resolveProvider<WeatherProvider>('weather');
    assert(
      resolved.providerName === 'MockWeatherProvider',
      'Test 15: Provider resolution respects environment configuration'
    );
  }

  // ============================================================================
  // CATEGORY C: NORMALIZATION (Tests 16–20)
  // ============================================================================
  console.log('\n--- Category C: Data Normalization (16-20) ---');

  // Test 16: Flight normalization
  {
    const rawAmadeusPayload = {
      flight_number: 'AI-805',
      carrier: 'Air India',
      totalFare: 7450,
      currency_code: 'INR',
      departureTime: '10:00 AM',
      arrivalTime: '12:30 PM',
      stops: 'Non-stop Direct',
      cabinClass: 'Premium Economy',
      luggage: '25 kg Checked'
    };
    const normalized = normalizeFlight(rawAmadeusPayload, 'AmadeusAdapter', true);
    assert(
      normalized.flightNumber === 'AI-805' &&
      normalized.airline === 'Air India' &&
      normalized.price === 7450 &&
      normalized.currency === 'INR' &&
      normalized.stops === 0 &&
      normalized.cabin === 'Premium Economy' &&
      normalized.providerMetadata.simulated === true,
      'Test 16: Flight normalization normalizes disparate vendor schemas to FlightOption'
    );
  }

  // Test 17: Hotel normalization
  {
    const rawExpediaPayload = {
      hotelName: 'Taj Holiday Village Resort',
      area: 'Candolim',
      totalPrice: 18500,
      currency: 'inr',
      starRating: 5,
      maxGuests: 4,
      amenities: 'Pool, Spa, Beach Access, Wi-Fi',
      freeCancellation: true
    };
    const normalized = normalizeHotel(rawExpediaPayload, 'ExpediaAdapter', true);
    assert(
      normalized.name === 'Taj Holiday Village Resort' &&
      normalized.price === 18500 &&
      normalized.currency === 'INR' &&
      normalized.rating === 5 &&
      normalized.capacity === 4 &&
      normalized.amenities.length === 4 &&
      normalized.cancellationPolicy.includes('Free cancellation'),
      'Test 17: Hotel normalization unifies amenities, ratings, and policies'
    );
  }

  // Test 18: Activity normalization
  {
    const rawViatorPayload = {
      title: 'Dudhsagar Waterfall Jeep Trek',
      destination: 'South Goa',
      costINR: 2200,
      durationHours: '6 Hours',
      activityType: 'Adventure',
      walkingLevel: 'Moderate'
    };
    const normalized = normalizeActivity(rawViatorPayload, 'ViatorAdapter', true);
    assert(
      normalized.name === 'Dudhsagar Waterfall Jeep Trek' &&
      normalized.price === 2200 &&
      normalized.category === 'Adventure' &&
      normalized.suitability.some(s => s.includes('Moderate')),
      'Test 18: Activity normalization unifies title, category, and suitability'
    );
  }

  // Test 19: Transport normalization
  {
    const rawCabPayload = {
      vehicleType: 'Toyota Innova Crysta',
      operator: 'Goa Tour Cabs',
      pickupLocation: 'Mopa Airport',
      dropLocation: 'Panaji',
      priceINR: 2400
    };
    const normalized = normalizeTransport(rawCabPayload, 'CabAdapter', true);
    assert(
      normalized.mode === 'Toyota Innova Crysta' &&
      normalized.carrier === 'Goa Tour Cabs' &&
      normalized.price === 2400 &&
      normalized.origin === 'Mopa Airport',
      'Test 19: Transport normalization canonicalizes origin, carrier, and mode'
    );
  }

  // Test 20: Currency normalization
  {
    const rawXEResponse = {
      base: 'eur',
      target: 'inr',
      exchangeRate: 91.45
    };
    const normalized = normalizeCurrency(rawXEResponse, 'XEAdapter', true);
    assert(
      normalized.fromCurrency === 'EUR' &&
      normalized.toCurrency === 'INR' &&
      normalized.rate === 91.45,
      'Test 20: Currency normalization canonicalizes currencies and exchange rate'
    );
  }

  // ============================================================================
  // CATEGORY D: ERRORS (Tests 21–24)
  // ============================================================================
  console.log('\n--- Category D: Error Normalization & Taxonomy (21-24) ---');

  // Test 21: Timeout normalization
  {
    const timeoutErr = normalizeProviderError(new Error('ETIMEDOUT connection dropped'), 'FlightAdapter', 'search');
    const classified = ErrorTaxonomy.classify(timeoutErr);
    assert(
      timeoutErr instanceof ProviderTimeoutError &&
      timeoutErr.category === 'TIMEOUT' &&
      classified.category === 'TIMEOUT' &&
      classified.isRetryable === true,
      'Test 21: Timeout normalization maps to ProviderTimeoutError and is retryable'
    );
  }

  // Test 22: Rate-limit normalization
  {
    const rateLimitErr = normalizeProviderError(new Error('HTTP 429 Too Many Requests'), 'HotelAdapter', 'search');
    const classified = ErrorTaxonomy.classify(rateLimitErr);
    assert(
      rateLimitErr instanceof ProviderRateLimitError &&
      rateLimitErr.category === 'RATE_LIMIT' &&
      classified.category === 'RATE_LIMIT' &&
      classified.isRetryable === true,
      'Test 22: Rate limit normalization maps to ProviderRateLimitError and is retryable'
    );
  }

  // Test 23: Authentication failure normalization
  {
    const authErr = normalizeProviderError(new Error('Invalid API Key provided: 401 Unauthorized'), 'VendorApi', 'init');
    const classified = ErrorTaxonomy.classify(authErr);
    assert(
      authErr instanceof ProviderAuthenticationError &&
      authErr.category === 'AUTHORIZATION_ERROR' &&
      classified.isRetryable === false,
      'Test 23: Authentication failure normalization is non-retryable AUTHORIZATION_ERROR'
    );
  }

  // Test 24: Unavailable provider normalization
  {
    const unavailErr = normalizeProviderError(new Error('503 Service Unavailable'), 'MapsAdapter', 'getRoute');
    const classified = ErrorTaxonomy.classify(unavailErr);
    assert(
      unavailErr instanceof ProviderUnavailableError &&
      unavailErr.category === 'PROVIDER_ERROR' &&
      classified.category === 'PROVIDER_ERROR',
      'Test 24: Unavailable provider maps to ProviderUnavailableError'
    );
  }

  // ============================================================================
  // CATEGORY E: FALLBACK & SIMULATION (Tests 25–27)
  // ============================================================================
  console.log('\n--- Category E: Fallback & Simulated Safety (25-27) ---');

  // Test 25: Provider failure fallback
  {
    // Register failing primary and healthy fallback
    class FailingProvider implements WeatherProvider {
      readonly providerName = 'FailingWeatherAPI';
      readonly category = 'weather' as const;
      readonly isLive = false;
      readonly supportsBooking = false;
      readonly capabilities = { search: true };
      async getCurrentWeather(): Promise<any> {
        throw new Error('503 Remote Meteorological Service Outage');
      }
      async getForecast(): Promise<any> {
        throw new Error('503 Outage');
      }
    }

    registry.registerProvider('weather', new FailingProvider(), false);
    const result = await registry.executeWithFallback(
      'weather',
      'getCurrentWeather',
      (prov: WeatherProvider) => prov.getCurrentWeather('Goa'),
      { fallbackChain: ['FailingWeatherAPI', 'MockWeatherProvider'] }
    );

    assert(
      result !== null && result.temperatureMaxC > 0 && result.providerMetadata.simulated === true,
      'Test 25: executeWithFallback catches primary failure and succeeds on secondary'
    );
  }

  // Test 26: Mock provider safety
  {
    const payment = new MockPaymentProvider();
    const declineTest = await payment.authorizePayment({
      orderId: 'ORD-FAIL',
      amount: 999999, // Trigger decline code
      currency: 'INR',
      idempotencyKey: 'IDEM-FAIL',
      paymentMethod: 'DECLINE'
    });
    assert(
      declineTest.success === false &&
      declineTest.status === 'DECLINED' &&
      declineTest.providerMetadata.simulated === true,
      'Test 26: MockPaymentProvider declined execution is strictly simulated'
    );
  }

  // Test 27: Simulated availability labeling
  {
    const flightProv = new MockFlightProvider();
    const results = await flightProv.searchFlightOptions({
      origin: 'BLR',
      destination: 'DEL',
      dates: '2026-11-10',
      travellerCount: 1,
      adultsCount: 1,
      childrenCount: 0
    });
    assert(
      results.every(r => r.providerMetadata.simulated === true),
      'Test 27: Mock provider inventory is unambiguously labeled simulated=true'
    );
  }

  // ============================================================================
  // CATEGORY F: SECURITY BOUNDARIES (Tests 28–30)
  // ============================================================================
  console.log('\n--- Category F: Security Boundaries (28-30) ---');

  // Test 28: Frontend cannot select arbitrary unapproved provider
  {
    let blockedMalicious = false;
    try {
      registry.resolveProvider('flights', 'maliciousExternalAdapter');
    } catch (err: any) {
      blockedMalicious = err instanceof ProviderValidationError;
    }
    assert(
      blockedMalicious,
      'Test 28: Resolving arbitrary unapproved provider is rejected with ProviderValidationError'
    );
  }

  // Test 29: Credentials remain server-side
  {
    const publicConfig = getSafePublicConfig();
    const serverEnv = getEnv();
    assert(
      publicConfig.flightProvider !== undefined &&
      publicConfig.hotelProvider !== undefined &&
      !('geminiApiKey' in publicConfig) &&
      !('jwtSecret' in publicConfig) &&
      !('adminKey' in publicConfig),
      'Test 29: getSafePublicConfig exposes provider names without exposing credentials'
    );
  }

  // Test 30: Provider metadata cannot leak secrets
  {
    const dirtyMetadata = {
      apiKey: 'AIzaSySecretApiKey1234567890',
      bearerToken: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      creditCard: '4111 1111 1111 1111',
      sessionSecret: 'mySuperSecretSessionKey',
      validRouteId: 'route-7788'
    };
    const sanitized = sanitizeProviderMetadata('VendorX', false, dirtyMetadata);
    assert(
      sanitized.extra?.apiKey === undefined &&
      sanitized.extra?.bearerToken === undefined &&
      sanitized.extra?.creditCard === undefined &&
      sanitized.extra?.sessionSecret === undefined &&
      sanitized.extra?.validRouteId === 'route-7788',
      'Test 30: sanitizeProviderMetadata strips API keys, tokens, and payment secrets'
    );
  }

  // ============================================================================
  // CATEGORY G: REGRESSION & SAFETY INVARIANTS (Tests 31–35)
  // ============================================================================
  console.log('\n--- Category G: Regression & Safety Invariants (31-35) ---');

  // Test 31: Payment abstraction preserves booking state
  {
    const safety = BookingSafetyCoordinator.getInstance();
    const hold = await safety.createHold({
      bookingId: 'BK-SAFETY-001',
      tripPlanId: 'TRIP-SAFETY-001',
      items: [{ itemId: 'FL-001', type: 'FLIGHT', priceINR: 5000 }],
      holdDurationSeconds: 600
    });

    const payment = await safety.processPayment({
      orderId: 'ORD-SAFETY-001',
      amountINR: 5000,
      currency: 'INR',
      idempotencyKey: 'IDEM-PAY-001',
      paymentMethod: 'UPI'
    });

    const confirm = await safety.confirmBooking({
      bookingId: 'BK-SAFETY-001',
      holdId: hold.holdId!,
      paymentTransactionId: payment.transactionId!,
      idempotencyKey: 'IDEM-CONF-001'
    });

    assert(
      hold.success === true &&
      hold.bookingState === 'HELD' &&
      payment.status === 'SUCCESS' &&
      confirm.success === true &&
      confirm.bookingState === 'CONFIRMED',
      'Test 31: Payment abstraction preserves strict BookingSafetyCoordinator state sequence'
    );
  }

  // Test 32: Idempotency remains enforced
  {
    const safety = BookingSafetyCoordinator.getInstance();
    const pay1 = await safety.processPayment({
      orderId: 'ORD-IDEM-002',
      amountINR: 7500,
      currency: 'INR',
      idempotencyKey: 'IDEM-KEY-REPLAY-99',
      paymentMethod: 'UPI'
    });

    const pay2 = await safety.processPayment({
      orderId: 'ORD-IDEM-002',
      amountINR: 7500,
      currency: 'INR',
      idempotencyKey: 'IDEM-KEY-REPLAY-99',
      paymentMethod: 'UPI'
    });

    assert(
      pay1.transactionId === pay2.transactionId &&
      pay2.idempotentReplay === true,
      'Test 32: Idempotency guard prevents duplicate payment execution via PaymentProvider'
    );
  }

  // Test 33: Telemetry redaction remains active on provider operations
  {
    const tracer = getTelemetryTracer();
    const store = defaultTelemetryStore;
    const traceHandle = tracer.startTrace('provider_call_test', 'provider', {
      cardNumber: '4532 0150 9999 1234',
      providerToken: FAKE_GOOGLE_API_KEY
    });
    tracer.endSpan(traceHandle.spanId, 'SUCCESS');
    const stored = store.getTrace(traceHandle.traceId);
    assert(
      stored !== null &&
      (stored.spans[0].metadata?.cardNumber === '[REDACTED_SENSITIVE_FIELD]' ||
       stored.spans[0].metadata?.cardNumber === '[REDACTED_CARD]') &&
      stored.spans[0].metadata?.providerToken === '[REDACTED_SENSITIVE_FIELD]',
      'Test 33: Telemetry redacts payment card and provider tokens during provider operations'
    );
  }

  // Test 34: Provider timeout uses existing retry system
  {
    const timeoutErr = new ProviderTimeoutError('MockFlightProvider', 'searchFlights', 5000);
    const classification = ErrorTaxonomy.classify(timeoutErr);
    assert(
      classification.category === 'TIMEOUT' &&
      classification.isRetryable === true &&
      classification.severity === 'MEDIUM',
      'Test 34: Provider timeout flows into existing Phase 7.2 retry taxonomy as retryable'
    );
  }

  // Test 35: Unsupported capability is rejected safely
  {
    const mapProv = new MockMapProvider();
    let rejected = false;
    try {
      registry.assertCapability(mapProv, 'booking');
    } catch (err: any) {
      rejected = err instanceof ProviderNotSupportedError &&
                 err.missingCapability === 'booking';
    }
    assert(
      rejected,
      'Test 35: Calling unsupported capability throws ProviderNotSupportedError safely'
    );
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n==================================================');
  console.log(`PHASE 8.1 TEST RESULTS: ${passed} PASSED / ${failed} FAILED (${passed + failed} TOTAL)`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
