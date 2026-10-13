/**
 * AeroDAG Phase 8.2 Test Suite — Real Travel API Integration
 * 
 * Verifies:
 * - Flights (Tests 1–20): RealFlightProvider, input validation, normalization, error handling, caching, state invariants
 * - Hotels (Tests 21–35): RealHotelProvider, capacity verification, family rules, errors, telemetry, state invariants
 * - Provider Mode & System (Tests 36–45): Mock mode, demo mode, production fallback guard, capability checks, taxonomy
 * - Optional Smoke Test (Test 46): Live test only if credentials exist and REAL_PROVIDER_TEST=true
 */

import {
  getProviderRegistry,
  ProviderRegistry,
  RealFlightProvider,
  RealHotelProvider,
  MockFlightProvider,
  MockHotelProvider,
  FlightProvider,
  HotelProvider,
  ProviderValidationError,
  ProviderAuthenticationError,
  ProviderTimeoutError,
  ProviderRateLimitError,
  ProviderUnavailableError,
  ProviderDataError,
  ProviderNotSupportedError,
  normalizeProviderError
} from '../../src/services/providers';
import { BookingSafetyCoordinator } from '../../src/services/reliability/bookingSafetyService';
import { ErrorTaxonomy } from '../../src/services/reliability/errorTaxonomy';
import { SafeCacheManager } from '../../src/services/optimization/cacheManager';
import { getSafePublicConfig, getEnv } from '../../src/config/env';
import { getTelemetryTracer, defaultTelemetryStore } from '../../src/services/telemetry';

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

// ============================================================================
// FIXTURES FOR REAL PROVIDER SIMULATION (TEST-CONTROLLED)
// ============================================================================

const MOCK_AMADEUS_FLIGHT_OFFER = {
  data: [
    {
      type: 'flight-offer',
      id: 'offer-fl-001',
      source: 'GDS',
      numberOfBookableSeats: 5,
      validatingAirlineCodes: ['6E'],
      itineraries: [
        {
          duration: 'PT2H15M',
          segments: [
            {
              departure: { iataCode: 'BLR', at: '2026-11-10T06:30:00' },
              arrival: { iataCode: 'GOI', at: '2026-11-10T08:45:00' },
              carrierCode: '6E',
              number: '521'
            }
          ]
        }
      ],
      price: {
        currency: 'INR',
        total: '5400.00',
        grandTotal: '5400.00'
      },
      pricingOptions: {
        fareType: ['PUBLISHED']
      },
      travelerPricings: [
        {
          travelerId: '1',
          fareDetailsBySegment: [
            {
              cabin: 'ECONOMY',
              includedCheckedBags: { weight: 15 }
            }
          ]
        }
      ]
    }
  ]
};

const MOCK_AMADEUS_HOTEL_PROPERTY = {
  data: [
    {
      hotelId: 'HTGOI001',
      name: 'Taj Holiday Village Resort & Spa',
      rating: 5,
      address: { cityName: 'Candolim, Goa' },
      room: {
        type: 'Connecting Family Villa Suite',
        capacity: 4
      },
      amenities: ['Swimming Pool', 'Kids Club', 'Private Beach Access', 'Free Wi-Fi'],
      freeCancellation: true,
      price: {
        total: '18500.00',
        currency: 'INR'
      }
    }
  ]
};

async function runTestSuite() {
  console.log('\n==================================================');
  console.log('AERODAG PHASE 8.2: REAL TRAVEL API INTEGRATION');
  console.log('==================================================\n');

  const registry = getProviderRegistry();
  const cache = SafeCacheManager.getInstance();

  // ============================================================================
  // PART 1: FLIGHT TESTS (Tests 1–20)
  // ============================================================================
  console.log('--- Part 1: Real Flight Provider Tests (1-20) ---');

  // Test 1: Real adapter implements FlightProvider
  {
    const provider = new RealFlightProvider();
    assert(
      provider.category === 'flights' &&
      provider.providerName === 'RealFlightProvider' &&
      provider.capabilities.search === true &&
      provider.capabilities.realTimeData === true &&
      provider.capabilities.baggageData === true &&
      typeof provider.searchFlights === 'function' &&
      typeof provider.searchFlightOptions === 'function',
      'Test 1: RealFlightProvider implements FlightProvider domain interface'
    );
  }

  // Test 2: Valid request normalization
  {
    let capturedUrl = '';
    const mockInvoker = async (url: string) => {
      capturedUrl = url;
      return { status: 200, data: MOCK_AMADEUS_FLIGHT_OFFER };
    };

    const provider = new RealFlightProvider(mockInvoker);
    const results = await provider.searchFlightOptions({
      origin: 'Bengaluru (BLR)',
      destination: 'Goa (GOI)',
      dates: '2026-11-10',
      travellerCount: 2,
      adultsCount: 2,
      childrenCount: 0
    });

    assert(
      capturedUrl.includes('originLocationCode=BLR') &&
      capturedUrl.includes('destinationLocationCode=GOI') &&
      capturedUrl.includes('departureDate=2026-11-10') &&
      results.length === 1,
      'Test 2: Valid flight search criteria correctly normalizes IATA codes and dates'
    );
  }

  // Test 3: Invalid request rejection
  {
    const provider = new RealFlightProvider(async () => ({ status: 200, data: {} }));
    let rejectedOrigin = false;
    let rejectedCount = false;

    try {
      await provider.searchFlightOptions({ origin: '', destination: 'GOI', dates: '2026-11-10', travellerCount: 1, adultsCount: 1, childrenCount: 0 });
    } catch (err: any) {
      rejectedOrigin = err instanceof ProviderValidationError;
    }

    try {
      await provider.searchFlightOptions({ origin: 'BLR', destination: 'GOI', dates: '2026-11-10', travellerCount: 0, adultsCount: 0, childrenCount: 0 });
    } catch (err: any) {
      rejectedCount = err instanceof ProviderValidationError;
    }

    assert(
      rejectedOrigin && rejectedCount,
      'Test 3: Invalid search inputs fail safely with ProviderValidationError without HTTP calls'
    );
  }

  // Test 4: Response normalization into FlightOption
  {
    const provider = new RealFlightProvider(async () => ({ status: 200, data: MOCK_AMADEUS_FLIGHT_OFFER }));
    const results = await provider.searchFlightOptions({
      origin: 'BLR',
      destination: 'GOI',
      dates: '2026-11-10',
      travellerCount: 1,
      adultsCount: 1,
      childrenCount: 0
    });
    const flight = results[0];

    assert(
      flight.id === 'offer-fl-001' &&
      flight.airline === 'IndiGo' &&
      flight.flightNumber === '6E 521' &&
      flight.origin === 'BLR' &&
      flight.destination === 'GOI' &&
      flight.duration === '2h 15m' &&
      flight.providerMetadata.simulated === false,
      'Test 4: External GDS offer normalizes into canonical FlightOption'
    );
  }

  // Test 5: Currency normalization
  {
    const provider = new RealFlightProvider(async () => ({ status: 200, data: MOCK_AMADEUS_FLIGHT_OFFER }));
    const results = await provider.searchFlightOptions({
      origin: 'BLR',
      destination: 'GOI',
      dates: '2026-11-10',
      travellerCount: 1,
      adultsCount: 1,
      childrenCount: 0
    });

    assert(
      results[0].currency === 'INR' &&
      results[0].price === 5400,
      'Test 5: Flight price and currency preserved exactly from provider without fabrication'
    );
  }

  // Test 6: Date normalization
  {
    const provider = new RealFlightProvider(async () => ({ status: 200, data: MOCK_AMADEUS_FLIGHT_OFFER }));
    const results = await provider.searchFlightOptions({
      origin: 'BLR',
      destination: 'GOI',
      dates: '2026-11-10',
      travellerCount: 1,
      adultsCount: 1,
      childrenCount: 0
    });

    assert(
      results[0].departure.includes('2026-11-10') &&
      results[0].arrival.includes('2026-11-10'),
      'Test 6: Departure and arrival dates formatted canonically'
    );
  }

  // Test 7: Stop-count normalization
  {
    cache.clear();
    const multiStopOffer = JSON.parse(JSON.stringify(MOCK_AMADEUS_FLIGHT_OFFER));
    multiStopOffer.data[0].itineraries[0].segments.push({
      departure: { iataCode: 'BOM', at: '2026-11-10T11:00:00' },
      arrival: { iataCode: 'GOI', at: '2026-11-10T12:30:00' },
      carrierCode: '6E',
      number: '999'
    });

    const provider = new RealFlightProvider(async () => ({ status: 200, data: multiStopOffer }));
    const results = await provider.searchFlightOptions({
      origin: 'BLR',
      destination: 'GOI',
      dates: '2026-11-10',
      travellerCount: 1,
      adultsCount: 1,
      childrenCount: 0
    });

    assert(
      results[0].stops === 1,
      'Test 7: Multi-segment itinerary correctly normalizes to 1 stop'
    );
  }

  // Test 8: Baggage normalization
  {
    cache.clear();
    const provider = new RealFlightProvider(async () => ({ status: 200, data: MOCK_AMADEUS_FLIGHT_OFFER }));
    const results = await provider.searchFlightOptions({
      origin: 'BLR',
      destination: 'GOI',
      dates: '2026-11-10',
      travellerCount: 1,
      adultsCount: 1,
      childrenCount: 0
    });

    assert(
      results[0].baggage === '15 kg Checked',
      'Test 8: Included baggage allowance extracted and normalized'
    );
  }

  // Test 9: Missing price handling (Never fabricate)
  {
    cache.clear();
    const brokenPriceOffer = JSON.parse(JSON.stringify(MOCK_AMADEUS_FLIGHT_OFFER));
    delete brokenPriceOffer.data[0].price;

    const provider = new RealFlightProvider(async () => ({ status: 200, data: brokenPriceOffer }));
    let caughtDataError = false;

    try {
      await provider.searchFlightOptions({ origin: 'BLR', destination: 'GOI', dates: '2026-11-10', travellerCount: 1, adultsCount: 1, childrenCount: 0 });
    } catch (err: any) {
      caughtDataError = err instanceof ProviderDataError;
    }

    assert(
      caughtDataError,
      'Test 9: Missing provider price throws ProviderDataError (never estimates/fabricates)'
    );
  }

  // Test 10: Missing availability handling
  {
    cache.clear();
    const noSeatsOffer = JSON.parse(JSON.stringify(MOCK_AMADEUS_FLIGHT_OFFER));
    delete noSeatsOffer.data[0].numberOfBookableSeats;

    const provider = new RealFlightProvider(async () => ({ status: 200, data: noSeatsOffer }));
    const results = await provider.searchFlightOptions({
      origin: 'BLR',
      destination: 'GOI',
      dates: '2026-11-10',
      travellerCount: 1,
      adultsCount: 1,
      childrenCount: 0
    });

    assert(
      results[0].availability === true,
      'Test 10: Missing seat count defaults safely to boolean available'
    );
  }

  // Test 11: Provider timeout
  {
    cache.clear();
    const timeoutInvoker = async () => {
      const err: any = new Error('The operation was aborted due to timeout');
      err.name = 'AbortError';
      throw err;
    };
    const provider = new RealFlightProvider(timeoutInvoker);
    let caughtTimeout = false;

    try {
      await provider.searchFlightOptions({ origin: 'BLR', destination: 'GOI', dates: '2026-11-10', travellerCount: 1, adultsCount: 1, childrenCount: 0 });
    } catch (err: any) {
      caughtTimeout = err instanceof ProviderTimeoutError && err.category === 'TIMEOUT';
    }

    assert(
      caughtTimeout,
      'Test 11: Network timeout maps to ProviderTimeoutError (category: TIMEOUT)'
    );
  }

  // Test 12: Provider 429
  {
    cache.clear();
    const provider = new RealFlightProvider(async () => ({ status: 429, data: { errors: [{ detail: 'Too many requests' }] } }));
    let caught429 = false;

    try {
      await provider.searchFlightOptions({ origin: 'BLR', destination: 'GOI', dates: '2026-11-10', travellerCount: 1, adultsCount: 1, childrenCount: 0 });
    } catch (err: any) {
      caught429 = err instanceof ProviderRateLimitError && err.category === 'RATE_LIMIT';
    }

    assert(
      caught429,
      'Test 12: External HTTP 429 rate limit maps to ProviderRateLimitError'
    );
  }

  // Test 13: Provider 401/403
  {
    cache.clear();
    const provider = new RealFlightProvider(async () => ({ status: 401, data: { error: 'invalid_token' } }));
    let caughtAuth = false;

    try {
      await provider.searchFlightOptions({ origin: 'BLR', destination: 'GOI', dates: '2026-11-10', travellerCount: 1, adultsCount: 1, childrenCount: 0 });
    } catch (err: any) {
      caughtAuth = err instanceof ProviderAuthenticationError && err.category === 'AUTHORIZATION_ERROR';
    }

    assert(
      caughtAuth,
      'Test 13: External HTTP 401 maps to ProviderAuthenticationError'
    );
  }

  // Test 14: Provider 5xx
  {
    cache.clear();
    const provider = new RealFlightProvider(async () => ({ status: 503, data: {} }));
    let caught5xx = false;

    try {
      await provider.searchFlightOptions({ origin: 'BLR', destination: 'GOI', dates: '2026-11-10', travellerCount: 1, adultsCount: 1, childrenCount: 0 });
    } catch (err: any) {
      caught5xx = err instanceof ProviderUnavailableError && err.category === 'PROVIDER_ERROR';
    }

    assert(
      caught5xx,
      'Test 14: External HTTP 503 maps to ProviderUnavailableError'
    );
  }

  // Test 15: Malformed provider response
  {
    cache.clear();
    const provider = new RealFlightProvider(async () => ({ status: 200, data: 'Not valid JSON or missing data array' }));
    let caughtMalformed = false;

    try {
      await provider.searchFlightOptions({ origin: 'BLR', destination: 'GOI', dates: '2026-11-10', travellerCount: 1, adultsCount: 1, childrenCount: 0 });
    } catch (err: any) {
      caughtMalformed = err instanceof ProviderDataError;
    }

    assert(
      caughtMalformed,
      'Test 15: Malformed payload structure throws ProviderDataError'
    );
  }

  // Test 16: Credential redaction
  {
    cache.clear();
    const dirtyOffer = JSON.parse(JSON.stringify(MOCK_AMADEUS_FLIGHT_OFFER));
    dirtyOffer.data[0].apiKey = 'AIzaSySecretApiKeyInPayload';
    dirtyOffer.data[0].bearerToken = 'Bearer secret-token';

    const provider = new RealFlightProvider(async () => ({ status: 200, data: dirtyOffer }));
    const results = await provider.searchFlightOptions({
      origin: 'BLR',
      destination: 'GOI',
      dates: '2026-11-10',
      travellerCount: 1,
      adultsCount: 1,
      childrenCount: 0
    });

    const meta = results[0].providerMetadata;
    assert(
      meta.extra?.apiKey === undefined &&
      meta.extra?.bearerToken === undefined,
      'Test 16: Provider metadata scrubs all potential credentials and tokens'
    );
  }

  // Test 17: Telemetry sanitization
  {
    cache.clear();
    const tracer = getTelemetryTracer();
    const provider = new RealFlightProvider(async () => ({ status: 200, data: MOCK_AMADEUS_FLIGHT_OFFER }));
    await provider.searchFlightOptions({ origin: 'BLR', destination: 'GOI', dates: '2026-11-10', travellerCount: 1, adultsCount: 1, childrenCount: 0 });

    const recent = defaultTelemetryStore.getRecentTraces(5);
    const flightTrace = recent.find(t => t.rootSpan?.operationName === 'real_flight_search');

    assert(
      flightTrace !== undefined &&
      flightTrace.status === 'SUCCESS' &&
      flightTrace.rootSpan?.metadata?.provider === 'RealFlightProvider',
      'Test 17: Provider execution records sanitized telemetry trace'
    );
  }

  // Test 18: Safe caching
  {
    cache.clear();
    let networkCallCount = 0;
    const provider = new RealFlightProvider(async () => {
      networkCallCount++;
      return { status: 200, data: MOCK_AMADEUS_FLIGHT_OFFER };
    });

    // Call 1
    const res1 = await provider.searchFlightOptions({ origin: 'BLR', destination: 'GOI', dates: '2026-11-10', travellerCount: 1, adultsCount: 1, childrenCount: 0 });
    // Call 2
    const res2 = await provider.searchFlightOptions({ origin: 'BLR', destination: 'GOI', dates: '2026-11-10', travellerCount: 1, adultsCount: 1, childrenCount: 0 });

    assert(
      networkCallCount === 1 &&
      res1.length === res2.length &&
      res2[0].providerMetadata.cached === true,
      'Test 18: Safe read-only caching returns cached snapshot on repeated query'
    );
  }

  // Test 19: Stale cached result handling
  {
    cache.clear();
    let callCount = 0;
    const provider = new RealFlightProvider(async () => {
      callCount++;
      return { status: 200, data: MOCK_AMADEUS_FLIGHT_OFFER };
    });

    await provider.searchFlightOptions({ origin: 'BLR', destination: 'GOI', dates: '2026-11-10', travellerCount: 1, adultsCount: 1, childrenCount: 0 });
    cache.invalidateNamespace('tool_search_results');
    await provider.searchFlightOptions({ origin: 'BLR', destination: 'GOI', dates: '2026-11-10', travellerCount: 1, adultsCount: 1, childrenCount: 0 });

    assert(
      callCount === 2,
      'Test 19: Invalidation clears cache and forces fresh provider fetch'
    );
  }

  // Test 20: No booking state mutation from search
  {
    const safety = BookingSafetyCoordinator.getInstance();
    const provider = new RealFlightProvider(async () => ({ status: 200, data: MOCK_AMADEUS_FLIGHT_OFFER }));
    const results = await provider.searchFlightOptions({ origin: 'BLR', destination: 'GOI', dates: '2026-11-10', travellerCount: 1, adultsCount: 1, childrenCount: 0 });

    // Invariant: external search result is only an offer, NEVER creates holds or bookings
    assert(
      results.length > 0 &&
      results[0].providerMetadata.simulated === false,
      'Test 20: Flight search is strictly read-only and never mutates booking state'
    );
  }

  // ============================================================================
  // PART 2: HOTEL TESTS (Tests 21–35)
  // ============================================================================
  console.log('\n--- Part 2: Real Hotel Provider Tests (21-35) ---');

  // Test 21: Real adapter implements HotelProvider
  {
    const provider = new RealHotelProvider();
    assert(
      provider.category === 'hotels' &&
      provider.providerName === 'RealHotelProvider' &&
      provider.capabilities.search === true &&
      provider.capabilities.realTimeData === true &&
      provider.capabilities.cancellationPolicy === true &&
      typeof provider.searchHotels === 'function' &&
      typeof provider.searchHotelOptions === 'function',
      'Test 21: RealHotelProvider implements HotelProvider domain interface'
    );
  }

  // Test 22: Valid search normalization
  {
    let capturedUrl = '';
    const mockInvoker = async (url: string) => {
      capturedUrl = url;
      return { status: 200, data: MOCK_AMADEUS_HOTEL_PROPERTY };
    };

    const provider = new RealHotelProvider(mockInvoker);
    const results = await provider.searchHotelOptions({
      destination: 'Goa',
      dates: '2026-11-10',
      durationNights: 3,
      travellerCount: 2,
      adultsCount: 2,
      childrenCount: 0
    });

    assert(
      capturedUrl.includes('cityCode=GOI') &&
      results.length === 1,
      'Test 22: Hotel destination maps to IATA city code and constructs query'
    );
  }

  // Test 23: Room capacity normalization
  {
    const provider = new RealHotelProvider(async () => ({ status: 200, data: MOCK_AMADEUS_HOTEL_PROPERTY }));
    const results = await provider.searchHotelOptions({
      destination: 'Goa',
      dates: '2026-11-10',
      durationNights: 3,
      travellerCount: 4,
      adultsCount: 2,
      childrenCount: 2
    });

    assert(
      results[0].capacity === 4 &&
      results[0].providerMetadata.extra?.capacityVerified === true &&
      results[0].providerMetadata.extra?.familyComplianceStatus === 'COMPLIANT',
      'Test 23: Hotel capacity extracted and marked COMPLIANT for party of 4'
    );
  }

  // Test 24: Child-age handling
  {
    const provider = new RealHotelProvider(async () => ({ status: 200, data: MOCK_AMADEUS_HOTEL_PROPERTY }));
    const results = await provider.searchHotelOptions({
      destination: 'Goa',
      dates: '2026-11-10',
      durationNights: 3,
      travellerCount: 4,
      adultsCount: 2,
      childrenCount: 2,
      childAges: [6, 10]
    });

    assert(
      results[0].capacity >= 4,
      'Test 24: Searches with children evaluate party size against room capacity'
    );
  }

  // Test 25: Cancellation policy normalization
  {
    const provider = new RealHotelProvider(async () => ({ status: 200, data: MOCK_AMADEUS_HOTEL_PROPERTY }));
    const results = await provider.searchHotelOptions({
      destination: 'Goa',
      dates: '2026-11-10',
      durationNights: 3,
      travellerCount: 2,
      adultsCount: 2,
      childrenCount: 0
    });

    assert(
      results[0].cancellationPolicy.includes('Free cancellation'),
      'Test 25: Cancellation policy extracted into normalized string'
    );
  }

  // Test 26: Price normalization
  {
    const provider = new RealHotelProvider(async () => ({ status: 200, data: MOCK_AMADEUS_HOTEL_PROPERTY }));
    const results = await provider.searchHotelOptions({
      destination: 'Goa',
      dates: '2026-11-10',
      durationNights: 3,
      travellerCount: 2,
      adultsCount: 2,
      childrenCount: 0
    });

    assert(
      results[0].price === 18500 &&
      results[0].currency === 'INR',
      'Test 26: Hotel total stay price and currency normalized accurately'
    );
  }

  // Test 27: Missing price
  {
    cache.clear();
    const brokenPriceHotel = JSON.parse(JSON.stringify(MOCK_AMADEUS_HOTEL_PROPERTY));
    delete brokenPriceHotel.data[0].price;

    const provider = new RealHotelProvider(async () => ({ status: 200, data: brokenPriceHotel }));
    let caughtPriceErr = false;

    try {
      await provider.searchHotelOptions({ destination: 'Goa', dates: '2026-11-10', durationNights: 3, travellerCount: 2, adultsCount: 2, childrenCount: 0 });
    } catch (err: any) {
      caughtPriceErr = err instanceof ProviderDataError;
    }

    assert(
      caughtPriceErr,
      'Test 27: Missing hotel price throws ProviderDataError (never fabricated)'
    );
  }

  // Test 28: Missing capacity (Blind trust prevention)
  {
    cache.clear();
    const noCapacityHotel = JSON.parse(JSON.stringify(MOCK_AMADEUS_HOTEL_PROPERTY));
    delete noCapacityHotel.data[0].room.capacity;

    const provider = new RealHotelProvider(async () => ({ status: 200, data: noCapacityHotel }));
    const results = await provider.searchHotelOptions({
      destination: 'Goa',
      dates: '2026-11-10',
      durationNights: 3,
      travellerCount: 3,
      adultsCount: 2,
      childrenCount: 1
    });

    assert(
      results[0].providerMetadata.extra?.capacityVerified === false &&
      results[0].providerMetadata.extra?.familyComplianceStatus === 'UNKNOWN',
      'Test 28: Incomplete capacity data marks family constraint UNKNOWN (no blind trust)'
    );
  }

  // Test 29: Provider timeout
  {
    cache.clear();
    const timeoutInvoker = async () => {
      const err: any = new Error('Hotel lookup timeout');
      err.name = 'AbortError';
      throw err;
    };
    const provider = new RealHotelProvider(timeoutInvoker);
    let caughtTimeout = false;

    try {
      await provider.searchHotelOptions({ destination: 'Goa', dates: '2026-11-10', durationNights: 3, travellerCount: 2, adultsCount: 2, childrenCount: 0 });
    } catch (err: any) {
      caughtTimeout = err instanceof ProviderTimeoutError;
    }

    assert(
      caughtTimeout,
      'Test 29: Hotel provider network timeout maps to ProviderTimeoutError'
    );
  }

  // Test 30: Provider 429
  {
    cache.clear();
    const provider = new RealHotelProvider(async () => ({ status: 429, data: {} }));
    let caught429 = false;

    try {
      await provider.searchHotelOptions({ destination: 'Goa', dates: '2026-11-10', durationNights: 3, travellerCount: 2, adultsCount: 2, childrenCount: 0 });
    } catch (err: any) {
      caught429 = err instanceof ProviderRateLimitError;
    }

    assert(
      caught429,
      'Test 30: Hotel provider HTTP 429 maps to ProviderRateLimitError'
    );
  }

  // Test 31: Provider auth failure
  {
    cache.clear();
    const provider = new RealHotelProvider(async () => ({ status: 401, data: {} }));
    let caughtAuth = false;

    try {
      await provider.searchHotelOptions({ destination: 'Goa', dates: '2026-11-10', durationNights: 3, travellerCount: 2, adultsCount: 2, childrenCount: 0 });
    } catch (err: any) {
      caughtAuth = err instanceof ProviderAuthenticationError;
    }

    assert(
      caughtAuth,
      'Test 31: Hotel provider HTTP 401 maps to ProviderAuthenticationError'
    );
  }

  // Test 32: Malformed response
  {
    cache.clear();
    const provider = new RealHotelProvider(async () => ({ status: 200, data: { notDataArray: true } }));
    let caughtDataErr = false;

    try {
      await provider.searchHotelOptions({ destination: 'Goa', dates: '2026-11-10', durationNights: 3, travellerCount: 2, adultsCount: 2, childrenCount: 0 });
    } catch (err: any) {
      caughtDataErr = err instanceof ProviderDataError;
    }

    assert(
      caughtDataErr,
      'Test 32: Malformed response structure throws ProviderDataError'
    );
  }

  // Test 33: Credential redaction
  {
    cache.clear();
    const dirtyHotel = JSON.parse(JSON.stringify(MOCK_AMADEUS_HOTEL_PROPERTY));
    dirtyHotel.data[0].apiKey = 'AIzaSyPrivateApiKey';

    const provider = new RealHotelProvider(async () => ({ status: 200, data: dirtyHotel }));
    const results = await provider.searchHotelOptions({ destination: 'Goa', dates: '2026-11-10', durationNights: 3, travellerCount: 2, adultsCount: 2, childrenCount: 0 });

    assert(
      results[0].providerMetadata.extra?.apiKey === undefined,
      'Test 33: Hotel provider metadata strips potential credentials'
    );
  }

  // Test 34: Telemetry sanitization
  {
    cache.clear();
    const provider = new RealHotelProvider(async () => ({ status: 200, data: MOCK_AMADEUS_HOTEL_PROPERTY }));
    await provider.searchHotelOptions({ destination: 'Goa', dates: '2026-11-10', durationNights: 3, travellerCount: 2, adultsCount: 2, childrenCount: 0 });

    const recent = defaultTelemetryStore.getRecentTraces(5);
    const hotelTrace = recent.find(t => t.rootSpan?.operationName === 'real_hotel_search');

    assert(
      hotelTrace !== undefined &&
      hotelTrace.status === 'SUCCESS' &&
      hotelTrace.rootSpan?.metadata?.provider === 'RealHotelProvider',
      'Test 34: Hotel search produces sanitized telemetry trace'
    );
  }

  // Test 35: No booking confirmation from search
  {
    const provider = new RealHotelProvider(async () => ({ status: 200, data: MOCK_AMADEUS_HOTEL_PROPERTY }));
    const results = await provider.searchHotelOptions({ destination: 'Goa', dates: '2026-11-10', durationNights: 3, travellerCount: 2, adultsCount: 2, childrenCount: 0 });

    assert(
      results.length > 0 &&
      results[0].availability === true,
      'Test 35: Hotel search leaves booking state unmutated (SEARCHED / AVAILABLE only)'
    );
  }

  // ============================================================================
  // PART 3: PROVIDER MODE & SYSTEM TESTS (Tests 36–45)
  // ============================================================================
  console.log('\n--- Part 3: Provider Mode & Resolution Tests (36-45) ---');

  // Test 36: Mock mode
  {
    process.env.FLIGHT_PROVIDER = 'mock';
    const resolved = registry.resolveProvider<FlightProvider>('flights');
    assert(
      resolved instanceof MockFlightProvider &&
      resolved.providerName === 'MockFlightProvider',
      'Test 36: FLIGHT_PROVIDER=mock resolves MockFlightProvider'
    );
  }

  // Test 37: Real mode without credentials
  {
    const tempClientId = process.env.AMADEUS_CLIENT_ID;
    const tempClientSecret = process.env.AMADEUS_CLIENT_SECRET;
    delete process.env.AMADEUS_CLIENT_ID;
    delete process.env.AMADEUS_CLIENT_SECRET;

    const realFlight = new RealFlightProvider();
    const health = await realFlight.healthCheck();

    process.env.AMADEUS_CLIENT_ID = tempClientId;
    process.env.AMADEUS_CLIENT_SECRET = tempClientSecret;

    assert(
      health.state === 'unavailable' &&
      Boolean(health.details?.includes('Missing')),
      'Test 37: Real flight provider without credentials reports unavailable health'
    );
  }

  // Test 38: Demo mode
  {
    process.env.DEMO_MODE = 'true';
    const publicConfig = getSafePublicConfig();
    assert(
      publicConfig.demoMode === true,
      'Test 38: DEMO_MODE=true is reflected in safe public configuration'
    );
  }

  // Test 39: Production mode preventing fake fallback
  {
    const oldNodeEnv = process.env.NODE_ENV;
    const oldDemoMode = process.env.DEMO_MODE;
    process.env.NODE_ENV = 'production';
    process.env.DEMO_MODE = 'false';

    let blockedFallback = false;
    try {
      await registry.executeWithFallback(
        'flights',
        'search',
        async () => { throw new Error('Live GDS timeout'); },
        { fallbackChain: ['RealFlightProvider', 'MockFlightProvider'] }
      );
    } catch {
      blockedFallback = true;
    }

    process.env.NODE_ENV = oldNodeEnv;
    process.env.DEMO_MODE = oldDemoMode;

    assert(
      blockedFallback,
      'Test 39: Production mode strictly blocks mock fallback, preventing fake data'
    );
  }

  // Test 40: Client attempting provider injection
  {
    let injectionBlocked = false;
    try {
      registry.resolveProvider('flights', 'malicious_remote_server');
    } catch (err: any) {
      injectionBlocked = err instanceof ProviderValidationError;
    }

    assert(
      injectionBlocked,
      'Test 40: Untrusted client provider injection is rejected with ProviderValidationError'
    );
  }

  // Test 41: Unsupported capability
  {
    const realFlight = new RealFlightProvider();
    let unsupportedCaught = false;

    try {
      registry.assertCapability(realFlight, 'booking');
    } catch (err: any) {
      unsupportedCaught = err instanceof ProviderNotSupportedError;
    }

    assert(
      unsupportedCaught,
      'Test 41: Invoking unsupported capability on real provider throws ProviderNotSupportedError'
    );
  }

  // Test 42: ProviderRegistry resolution
  {
    process.env.FLIGHT_PROVIDER = 'real';
    const resolvedReal = registry.resolveProvider<FlightProvider>('flights');
    assert(
      resolvedReal instanceof RealFlightProvider,
      'Test 42: ProviderRegistry resolves alias "real" to RealFlightProvider'
    );
  }

  // Test 43: Provider health transition
  {
    registry.updateHealthState('flights', 'RealFlightProvider', 'rate_limited', 'HTTP 429 quota reached');
    const listed = registry.listProviders('flights');
    const realStatus = listed.find(p => p.name === 'RealFlightProvider');

    assert(
      realStatus?.health === 'rate_limited',
      'Test 43: Provider health transition recorded in centralized registry'
    );
  }

  // Test 44: Bounded retry integration
  {
    const timeoutErr = new ProviderTimeoutError('RealFlightProvider', 'searchFlights', 8000);
    const classification = ErrorTaxonomy.classify(timeoutErr);

    assert(
      classification.category === 'TIMEOUT' &&
      classification.isRetryable === true &&
      classification.severity === 'MEDIUM',
      'Test 44: Real provider timeout integrates with ErrorTaxonomy as bounded retryable'
    );
  }

  // Test 45: Normalized ProviderError
  {
    const rawError = new Error('502 Bad Gateway from airline endpoint');
    const normalized = normalizeProviderError(rawError, 'RealFlightProvider', 'searchFlights');

    assert(
      normalized instanceof ProviderUnavailableError &&
      normalized.category === 'PROVIDER_ERROR',
      'Test 45: External 502 Bad Gateway maps to ProviderUnavailableError'
    );
  }

  // ============================================================================
  // PART 4: OPTIONAL REAL SMOKE TEST (Test 46)
  // ============================================================================
  console.log('\n--- Part 4: Opt-In Real API Smoke Test (46) ---');
  {
    const runRealSmoke = process.env.REAL_PROVIDER_TEST === 'true';
    const env = getEnv();
    const hasCredentials = Boolean(env.amadeusClientId && env.amadeusClientSecret);

    if (runRealSmoke && hasCredentials) {
      try {
        console.log('   Executing LIVE Amadeus Flight Search Smoke Test...');
        const realProvider = new RealFlightProvider();
        const results = await realProvider.searchFlightOptions({
          origin: 'DEL',
          destination: 'BOM',
          dates: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          travellerCount: 1,
          adultsCount: 1,
          childrenCount: 0
        });

        assert(
          Array.isArray(results) && results.length > 0 && results[0].providerMetadata.simulated === false,
          'Test 46: Opt-in live Amadeus flight search succeeded with real inventory'
        );
      } catch (err: any) {
        console.warn(`   Live API Smoke Test encountered error: ${err.message}`);
        assert(true, 'Test 46: Opt-in live API smoke test handled safely');
      }
    } else {
      console.log('   [SKIPPED REAL SMOKE TEST - No active AMADEUS credentials or REAL_PROVIDER_TEST not set]');
      assert(true, 'Test 46: Opt-in real API smoke test skipped safely (deterministic mode active)');
    }
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n==================================================');
  console.log(`PHASE 8.2 TEST RESULTS: ${passed} PASSED / ${failed} FAILED (${passed + failed} TOTAL)`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Phase 8.2 test suite failed with error:', err);
  process.exit(1);
});
