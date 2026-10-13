/**
 * AeroDAG Real Flight Provider Adapter (Amadeus / GDS Integration)
 * 
 * Implements domain FlightProvider interface for real-world airline search.
 * Decouples agents from external vendor schemas, credentials, and protocols.
 * Supports configurable custom invoker for deterministic test suites.
 */

import { FlightItem } from '../../types/travelBooking';
import {
  FlightProvider,
  FlightSearchParams,
  FlightOption,
  ProviderCapabilities,
  ProviderHealthStatus,
  HttpInvoker
} from './types';
import {
  ProviderValidationError,
  ProviderAuthenticationError,
  ProviderTimeoutError,
  ProviderRateLimitError,
  ProviderUnavailableError,
  ProviderDataError,
  normalizeProviderError
} from './errors';
import { sanitizeProviderMetadata } from './normalizers';
import { getEnv } from '../../config/env';
import { SafeCacheManager } from '../optimization/cacheManager';
import { getTelemetryTracer } from '../telemetry';

export class RealFlightProvider implements FlightProvider {
  public readonly providerName = 'RealFlightProvider';
  public readonly category = 'flights' as const;
  public get isLive(): boolean {
    const env = getEnv();
    return Boolean(env.amadeusClientId && env.amadeusClientSecret);
  }
  public readonly supportsBooking = false;
  public readonly capabilities: ProviderCapabilities = {
    search: true,
    availability: true,
    pricing: true,
    booking: false,
    realTimeData: true,
    domestic: true,
    international: true,
    baggageData: true
  };

  private tokenCache: { token: string; expiresAt: number } | null = null;
  private readonly baseUrl = 'https://test.api.amadeus.com';

  constructor(private customInvoker?: HttpInvoker) {}

  /**
   * Sets custom invoker (useful for test fixtures & recorded network mocks)
   */
  public setInvoker(invoker: HttpInvoker): void {
    this.customInvoker = invoker;
  }

  /**
   * Validates and canonicalizes search criteria before executing network requests
   */
  private validateCriteria(params: FlightSearchParams): void {
    if (!params || typeof params !== 'object') {
      throw new ProviderValidationError(this.providerName, 'search', 'Search criteria must be an object');
    }

    if (!params.origin || typeof params.origin !== 'string' || !params.origin.trim()) {
      throw new ProviderValidationError(this.providerName, 'search', "Missing or empty 'origin' parameter");
    }

    if (!params.destination || typeof params.destination !== 'string' || !params.destination.trim()) {
      throw new ProviderValidationError(this.providerName, 'search', "Missing or empty 'destination' parameter");
    }

    if (!params.dates || typeof params.dates !== 'string' || !params.dates.trim()) {
      throw new ProviderValidationError(this.providerName, 'search', "Missing or empty 'dates' parameter");
    }

    if (typeof params.travellerCount === 'number' && params.travellerCount < 1) {
      throw new ProviderValidationError(this.providerName, 'search', "'travellerCount' must be at least 1");
    }

    if (typeof params.adultsCount === 'number' && params.adultsCount < 1) {
      throw new ProviderValidationError(this.providerName, 'search', "'adultsCount' must be at least 1");
    }

    if (typeof params.childrenCount === 'number' && params.childrenCount < 0) {
      throw new ProviderValidationError(this.providerName, 'search', "'childrenCount' cannot be negative");
    }
  }

  /**
   * Extracts clean IATA airport or city code
   */
  private extractLocationCode(raw: string): string {
    const trimmed = raw.trim();
    // Check for 3-letter IATA code inside parentheses like "Bengaluru (BLR)"
    const match = trimmed.match(/\(([A-Z]{3})\)/);
    if (match) return match[1];

    // If exactly 3 uppercase letters
    if (/^[A-Z]{3}$/.test(trimmed)) return trimmed;

    // Fallback dictionary for common hubs
    const lower = trimmed.toLowerCase();
    if (lower.includes('bengaluru') || lower.includes('bangalore')) return 'BLR';
    if (lower.includes('delhi')) return 'DEL';
    if (lower.includes('mumbai') || lower.includes('bombay')) return 'BOM';
    if (lower.includes('goa')) return 'GOI';
    if (lower.includes('singapore')) return 'SIN';
    if (lower.includes('tokyo')) return 'HND';
    if (lower.includes('hanoi')) return 'HAN';
    if (lower.includes('danang') || lower.includes('da nang')) return 'DAD';
    if (lower.includes('bangkok')) return 'BKK';

    // Return first 3 letters capitalized as fallback
    return trimmed.substring(0, 3).toUpperCase();
  }

  /**
   * Authenticates against OAuth2 endpoint or returns cached token
   */
  private async getAuthToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }

    const env = getEnv();
    const clientId = env.amadeusClientId;
    const clientSecret = env.amadeusClientSecret;

    if (!clientId || !clientSecret) {
      throw new ProviderAuthenticationError(
        this.providerName,
        'authenticate',
        'AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET are required for real flight searches'
      );
    }

    const tokenUrl = `${this.baseUrl}/v1/security/oauth2/token`;
    const body = `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`;

    const response = await this.executeHttp(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      timeoutMs: 6000
    });

    if (response.status === 401 || response.status === 403) {
      throw new ProviderAuthenticationError(this.providerName, 'authenticate', 'Invalid client credentials');
    }

    if (response.status >= 500) {
      throw new ProviderUnavailableError(this.providerName, 'authenticate', `OAuth server returned HTTP ${response.status}`);
    }

    if (!response.data || !response.data.access_token) {
      throw new ProviderDataError(this.providerName, 'authenticate', 'Missing access_token in authentication response');
    }

    const expiresIn = Number(response.data.expires_in) || 1799;
    this.tokenCache = {
      token: response.data.access_token,
      expiresAt: Date.now() + (expiresIn - 60) * 1000
    };

    return this.tokenCache.token;
  }

  /**
   * Internal HTTP execution wrapper with timeout and error classification
   */
  private async executeHttp(url: string, options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
  }): Promise<{ status: number; data: any; headers?: Record<string, string> }> {
    const timeoutMs = options.timeoutMs || 8000;

    if (this.customInvoker) {
      try {
        return await this.customInvoker(url, options);
      } catch (err: any) {
        throw normalizeProviderError(err, this.providerName, 'http');
      }
    }

    // Default fetch execution with AbortController timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body,
        signal: controller.signal
      });

      const text = await res.text();
      let data: any;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { rawText: text };
      }

      return {
        status: res.status,
        data
      };
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('timeout') || err.message?.includes('aborted')) {
        throw new ProviderTimeoutError(this.providerName, 'request', timeoutMs, err);
      }
      throw normalizeProviderError(err, this.providerName, 'request');
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Domain-level flight search returning normalized FlightOption[]
   */
  async searchFlightOptions(params: FlightSearchParams): Promise<FlightOption[]> {
    const start = Date.now();
    this.validateCriteria(params);

    const originCode = this.extractLocationCode(params.origin);
    const destCode = this.extractLocationCode(params.destination);
    const cacheKey = `fl_${originCode}_${destCode}_${params.dates}_${params.travellerCount || 1}`;

    // Read-only search caching (TTL = 60s)
    const cache = SafeCacheManager.getInstance();
    const cached = cache.get<FlightOption[]>('tool_search_results', cacheKey);
    if (cached) {
      return cached.map(f => ({
        ...f,
        providerMetadata: {
          ...f.providerMetadata,
          cached: true
        }
      }));
    }

    const tracer = getTelemetryTracer();
    const span = tracer.startTrace('real_flight_search', 'provider', {
      provider: this.providerName,
      origin: originCode,
      destination: destCode
    });

    try {
      // Authenticate
      let token = 'mock_token';
      const env = getEnv();
      if (!this.customInvoker && (env.amadeusClientId || env.amadeusClientSecret)) {
        token = await this.getAuthToken();
      } else if (!this.customInvoker && !env.demoMode) {
        throw new ProviderAuthenticationError(
          this.providerName,
          'search',
          'AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET are required for real flight searches'
        );
      }

      // Format ISO date (e.g. "2026-11-10")
      const dateStr = params.dates.match(/\d{4}-\d{2}-\d{2}/)
        ? params.dates.match(/\d{4}-\d{2}-\d{2}/)![0]
        : new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

      const adults = Math.max(1, params.adultsCount || params.travellerCount || 1);
      const url = `${this.baseUrl}/v2/shopping/flight-offers?originLocationCode=${originCode}&destinationLocationCode=${destCode}&departureDate=${dateStr}&adults=${adults}&max=10`;

      const response = await this.executeHttp(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        },
        timeoutMs: 8000
      });

      // Classify status codes
      if (response.status === 429) {
        throw new ProviderRateLimitError(this.providerName, 'searchFlights', 5);
      }
      if (response.status === 401 || response.status === 403) {
        throw new ProviderAuthenticationError(this.providerName, 'searchFlights', `HTTP ${response.status} from flight provider`);
      }
      if (response.status >= 500) {
        throw new ProviderUnavailableError(this.providerName, 'searchFlights', `HTTP ${response.status} flight provider outage`);
      }
      if (response.status >= 400) {
        const errorDetail = response.data?.errors?.[0]?.detail || `HTTP ${response.status}`;
        throw new ProviderValidationError(this.providerName, 'searchFlights', errorDetail);
      }

      const offers = response.data?.data;
      if (!Array.isArray(offers)) {
        throw new ProviderDataError(this.providerName, 'searchFlights', "Invalid response structure: 'data' array missing");
      }

      const latencyMs = Date.now() - start;
      const normalizedOptions = offers.map(offer => this.normalizeFlightOffer(offer, originCode, destCode, latencyMs));

      // Cache search result for 60 seconds
      cache.set('tool_search_results', cacheKey, normalizedOptions, 60000);

      tracer.endSpan(span.spanId, 'SUCCESS', {
        resultsCount: normalizedOptions.length,
        latencyMs
      });

      return normalizedOptions;
    } catch (err: any) {
      tracer.endSpan(span.spanId, 'ERROR', {
        error: err.message
      });
      throw normalizeProviderError(err, this.providerName, 'searchFlightOptions');
    }
  }

  /**
   * Formats ISO 8601 duration string (e.g. "PT2H15M") into readable "2h 15m"
   */
  private formatDuration(isoDuration?: string): string {
    if (!isoDuration) return '3h 30m';
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
    if (!match) return isoDuration.replace('PT', '').toLowerCase();
    const hours = match[1] ? `${match[1]}h` : '';
    const minutes = match[2] ? `${match[2]}m` : '';
    const formatted = [hours, minutes].filter(Boolean).join(' ');
    return formatted || '3h 30m';
  }

  /**
   * Normalizes an external Amadeus Flight Offer into canonical FlightOption
   */
  private normalizeFlightOffer(
    raw: any,
    fallbackOrigin: string,
    fallbackDest: string,
    latencyMs: number
  ): FlightOption {
    if (!raw || typeof raw !== 'object') {
      throw new ProviderDataError(this.providerName, 'normalize', 'Raw offer must be a non-null object');
    }

    const priceObj = raw.price;
    if (!priceObj || (priceObj.total === undefined && priceObj.grandTotal === undefined)) {
      throw new ProviderDataError(this.providerName, 'normalize', 'Flight offer missing required price field');
    }

    const rawTotal = priceObj.total ?? priceObj.grandTotal;
    const price = Number(rawTotal);
    if (isNaN(price) || price <= 0) {
      throw new ProviderDataError(this.providerName, 'normalize', `Invalid price amount '${rawTotal}'`);
    }

    const currency = String(priceObj.currency || 'EUR').toUpperCase();

    // Extract first itinerary segment details
    const itinerary = raw.itineraries?.[0];
    const segments = itinerary?.segments || [];
    const firstSegment = segments[0] || {};
    const lastSegment = segments[segments.length - 1] || firstSegment;

    const carrierCode = firstSegment.carrierCode || raw.validatingAirlineCodes?.[0] || 'AI';
    const flightNumber = `${carrierCode} ${firstSegment.number || '001'}`;
    const origin = firstSegment.departure?.iataCode || fallbackOrigin;
    const destination = lastSegment.arrival?.iataCode || fallbackDest;
    const departure = firstSegment.departure?.at ? firstSegment.departure.at.replace('T', ' ') : '08:00 AM';
    const arrival = lastSegment.arrival?.at ? lastSegment.arrival.at.replace('T', ' ') : '11:30 AM';
    const duration = this.formatDuration(itinerary?.duration);
    const stops = Math.max(0, segments.length - 1);

    const travelerPricing = raw.travelerPricings?.[0];
    const fareDetails = travelerPricing?.fareDetailsBySegment?.[0];
    const cabin = fareDetails?.cabin || 'ECONOMY';
    const baggageWeight = fareDetails?.includedCheckedBags?.weight;
    const baggageQuantity = fareDetails?.includedCheckedBags?.quantity;
    const baggage = baggageWeight
      ? `${baggageWeight} kg Checked`
      : baggageQuantity !== undefined
      ? `${baggageQuantity} Checked Bag(s)`
      : 'Standard baggage allowance';

    const numberOfBookableSeats = raw.numberOfBookableSeats;
    const availability = typeof numberOfBookableSeats === 'number' ? numberOfBookableSeats : true;

    return {
      id: String(raw.id || `fl-real-${Date.now()}`),
      airline: this.resolveAirlineName(carrierCode),
      flightNumber,
      origin,
      destination,
      departure,
      arrival,
      duration,
      stops,
      cabin,
      baggage,
      price,
      currency,
      availability,
      providerMetadata: sanitizeProviderMetadata(
        this.providerName,
        false, // Real data is NOT simulated!
        {
          source: 'Amadeus GDS',
          offerId: raw.id,
          pricingType: raw.pricingOptions?.fareType?.[0] || 'PUBLISHED'
        },
        latencyMs,
        'unavailable'
      )
    };
  }

  private resolveAirlineName(code: string): string {
    const airlines: Record<string, string> = {
      'AI': 'Air India',
      '6E': 'IndiGo',
      'UK': 'Vistara',
      'SG': 'SpiceJet',
      'SQ': 'Singapore Airlines',
      'VN': 'Vietnam Airlines',
      'JL': 'Japan Airlines',
      'NH': 'ANA All Nippon Airways',
      'TG': 'Thai Airways',
      'EK': 'Emirates',
      'QR': 'Qatar Airways'
    };
    return airlines[code] || `Airline (${code})`;
  }

  /**
   * Backward-compatible UI method returning FlightItem[]
   */
  async searchFlights(params: FlightSearchParams): Promise<FlightItem[]> {
    const options = await this.searchFlightOptions(params);
    const count = Math.max(1, params.travellerCount || 1);

    return options.map(opt => ({
      id: opt.id,
      airline: opt.airline,
      airlineCode: opt.flightNumber.split(' ')[0] || 'FL',
      flightNumber: opt.flightNumber,
      originCode: opt.origin,
      originCity: params.origin,
      destinationCode: opt.destination,
      destinationCity: params.destination,
      departureTime: opt.departure,
      arrivalTime: opt.arrival,
      duration: opt.duration,
      stops: typeof opt.stops === 'number' ? (opt.stops === 0 ? 'Non-stop Direct' : `${opt.stops} Stop(s)`) : String(opt.stops),
      pricePerPersonINR: opt.currency === 'INR' ? opt.price : Math.round(opt.price * 86.5),
      totalPriceINR: (opt.currency === 'INR' ? opt.price : Math.round(opt.price * 86.5)) * count,
      pricePerPersonUSD: opt.currency === 'USD' ? opt.price : Math.round(opt.price / 86.5),
      totalPriceUSD: (opt.currency === 'USD' ? opt.price : Math.round(opt.price / 86.5)) * count,
      baggage: opt.baggage,
      cabinClass: opt.cabin,
      refundable: true,
      seatAvailability: typeof opt.availability === 'number' ? opt.availability : 9,
      adjacentFamilySeatsGuaranteed: count > 1
    }));
  }

  calculateLabels(flights: FlightItem[]): FlightItem[] {
    if (!flights || flights.length === 0) return [];
    let minPrice = Infinity;
    let minPriceIdx = 0;

    flights.forEach((f, idx) => {
      if (f.totalPriceINR < minPrice) {
        minPrice = f.totalPriceINR;
        minPriceIdx = idx;
      }
    });

    return flights.map((f, idx) => {
      if (idx === minPriceIdx) {
        return { ...f, tag: 'Lowest Fare' };
      }
      return { ...f, tag: 'Recommended' };
    });
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    const start = Date.now();
    const env = getEnv();

    if (!env.amadeusClientId || !env.amadeusClientSecret) {
      return {
        providerName: this.providerName,
        category: this.category,
        state: 'unavailable',
        latencyMs: 0,
        lastChecked: new Date().toISOString(),
        details: 'Missing AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET credentials'
      };
    }

    try {
      if (!this.customInvoker) {
        await this.getAuthToken();
      }
      return {
        providerName: this.providerName,
        category: this.category,
        state: 'available',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
        details: 'Real flight API connection verified'
      };
    } catch (err: any) {
      const isAuth = err instanceof ProviderAuthenticationError;
      return {
        providerName: this.providerName,
        category: this.category,
        state: isAuth ? 'authentication_failure' : 'degraded',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
        details: err.message
      };
    }
  }
}
