/**
 * AeroDAG Travel Provider Interface Abstractions & Normalized Models
 * 
 * Defines clean decoupled contracts for Flights, Hotels, Transport, Activities,
 * Maps, Weather, Currency, Payment, LLMs, Embeddings, and Travel Knowledge.
 * Prevents travel agents from depending directly on external vendor SDKs.
 */

import {
  FlightItem,
  HotelItem,
  TransferItem,
  TrainItem,
  ActivityItem,
  TripScope
} from '../../types/travelBooking';

// ============================================================================
// 1. PROVIDER CAPABILITIES & HEALTH TAXONOMY
// ============================================================================

export type ProviderCategory =
  | 'flights'
  | 'hotels'
  | 'transport'
  | 'activities'
  | 'maps'
  | 'weather'
  | 'currency'
  | 'payment'
  | 'llm'
  | 'embeddings'
  | 'travelKnowledge';

export interface ProviderCapabilities {
  search?: boolean;
  availability?: boolean;
  pricing?: boolean;
  booking?: boolean;
  cancellation?: boolean;
  modification?: boolean;
  refund?: boolean;
  realTimeData?: boolean;
  international?: boolean;
  domestic?: boolean;
  currencySupport?: boolean;
  baggageData?: boolean;
  cancellationPolicy?: boolean;
  structuredOutput?: boolean;
  streaming?: boolean;
  embeddings?: boolean;
  routeOptimization?: boolean;
}

export type ProviderHealthState =
  | 'available'
  | 'degraded'
  | 'unavailable'
  | 'authentication_failure'
  | 'rate_limited'
  | 'timeout';

export interface ProviderHealthStatus {
  providerName: string;
  category: ProviderCategory;
  state: ProviderHealthState;
  latencyMs?: number;
  lastChecked: string;
  details?: string;
}

export interface ProviderMetadata {
  providerName: string;
  simulated: boolean;
  latencyMs?: number;
  cost?: number | 'unavailable';
  cached?: boolean;
  extra?: Record<string, unknown>;
}

// ============================================================================
// 2. BASE PROVIDER INTERFACE
// ============================================================================

export interface BaseProvider {
  readonly providerName: string;
  readonly category: ProviderCategory;
  readonly capabilities: ProviderCapabilities;
  readonly isLive: boolean;
  readonly supportsBooking: boolean;
  healthCheck?(): Promise<ProviderHealthStatus>;
}

// ============================================================================
// 3. NORMALIZED DOMAIN MODELS
// ============================================================================

export interface FlightOption {
  id: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  duration: string;
  stops: number | string;
  cabin: string;
  baggage: string;
  price: number;
  currency: string;
  availability: boolean | number;
  providerMetadata: ProviderMetadata;
}

export interface HotelOption {
  id: string;
  name: string;
  location: string;
  rating: number;
  roomType: string;
  capacity: number;
  amenities: string[];
  cancellationPolicy: string;
  price: number;
  currency: string;
  availability: boolean | number;
  providerMetadata: ProviderMetadata;
}

export interface ActivityOption {
  id: string;
  name: string;
  location: string;
  duration: string;
  category: string;
  suitability: string[];
  price: number;
  currency: string;
  availability: boolean | number;
  providerMetadata: ProviderMetadata;
}

export interface TransportOption {
  id: string;
  mode: 'Transfer' | 'Train' | 'Cab' | 'Bus' | string;
  carrier: string;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  duration: string;
  price: number;
  currency: string;
  availability: boolean | number;
  providerMetadata: ProviderMetadata;
}

export interface PlaceLocation {
  name: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  providerMetadata?: ProviderMetadata;
}

export interface MapRouteOption {
  id: string;
  origin: string;
  destination: string;
  distanceKm: number;
  durationMinutes: number;
  waypoints?: string[];
  steps?: Array<{ instruction: string; distanceKm: number }>;
  travelMode?: string;
  geometry?: string | Array<[number, number]>;
  estimatedTravelTime?: string;
  providerMetadata: ProviderMetadata;
}

export interface WeatherReport {
  location: string;
  date: string;
  temperatureMinC: number;
  temperatureMaxC: number;
  condition: string;
  precipitationChance: number;
  humidity: number;
  latitude?: number;
  longitude?: number;
  timestamp?: string;
  timezone?: string;
  temperature?: number;
  feelsLike?: number;
  precipitationAmount?: number;
  windSpeed?: number;
  windSpeedUnit?: string;
  forecastDate?: string;
  source?: string;
  retrievedAt?: string;
  advisory?: string;
  alerts?: string[];
  isStale?: boolean;
  providerMetadata: ProviderMetadata;
}

export interface CurrencyRate {
  fromCurrency: string;
  toCurrency: string;
  baseCurrency?: string;
  quoteCurrency?: string;
  rate: number;
  timestamp: string;
  source?: string;
  retrievedAt?: string;
  isStale?: boolean;
  providerMetadata: ProviderMetadata;
}

export interface CurrencyConversionResult {
  amount: number;
  sourceCurrency: string;
  exchangeRate: number;
  rateTimestamp: string;
  targetCurrency: string;
  convertedAmount: number;
  provider: string;
  cached: boolean;
  isStale?: boolean;
}

export type RouteFeasibilityStatus = 'KNOWN' | 'UNKNOWN' | 'HIGH_TRAVEL_TIME' | 'ROUTE_INEFFICIENCY';
export type WeatherConfidenceStatus = 'KNOWN' | 'UNKNOWN' | 'WEATHER_RISK' | 'PACING_RISK' | 'SEVERE_WEATHER_ALERT';
export type CurrencyFreshnessStatus = 'CURRENT' | 'STALE' | 'UNKNOWN';

export interface ItineraryRouteAnalysis {
  origin: string;
  destination: string;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  segments: Array<{
    from: string;
    to: string;
    distanceKm: number;
    durationMinutes: number;
  }>;
  status: RouteFeasibilityStatus;
  warnings: string[];
}

export interface ItineraryWeatherAnalysis {
  location: string;
  status: WeatherConfidenceStatus;
  risks: string[];
  advisories: string[];
  forecasts: WeatherReport[];
}

export type HttpInvoker = (url: string, options: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}) => Promise<{ status: number; data: any; headers?: Record<string, string> }>;

export interface PaymentAuthorizeParams {
  orderId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  paymentMethod: string;
  customerRef?: string;
  metadata?: Record<string, string>;
}

export interface PaymentAuthorizationResult {
  success: boolean;
  transactionId: string;
  orderId: string;
  status: 'AUTHORIZED' | 'DECLINED' | 'ERROR';
  authCode?: string;
  errorMessage?: string;
  providerMetadata: ProviderMetadata;
}

export interface PaymentCaptureParams {
  transactionId: string;
  orderId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
}

export interface PaymentCaptureResult {
  success: boolean;
  transactionId: string;
  capturedAmount: number;
  status: 'CAPTURED' | 'FAILED';
  errorMessage?: string;
  providerMetadata: ProviderMetadata;
}

export interface PaymentRefundParams {
  transactionId: string;
  orderId: string;
  amount: number;
  reason?: string;
}

export interface PaymentRefundResult {
  success: boolean;
  refundId: string;
  amountRefunded: number;
  status: 'REFUNDED' | 'FAILED';
  errorMessage?: string;
  providerMetadata: ProviderMetadata;
}

export interface PaymentStatusResult {
  transactionId: string;
  status: 'AUTHORIZED' | 'CAPTURED' | 'REFUNDED' | 'FAILED' | 'UNKNOWN';
  amount: number;
  currency: string;
  providerMetadata: ProviderMetadata;
}

export interface TravelKnowledgeItem {
  destination: string;
  highlights: string[];
  bestTimeToVisit: string;
  visaInfo: string;
  safetyAdvisory: string;
  budgetTiers: Record<string, number>;
  providerMetadata: ProviderMetadata;
}

// ============================================================================
// 4. SEARCH & CRITERIA PARAMS
// ============================================================================

export interface FlightSearchParams {
  origin: string;
  destination: string;
  dates: string;
  travellerCount: number;
  adultsCount: number;
  childrenCount: number;
  scope?: TripScope;
  preferredAirline?: string;
  budgetCeilingINR?: number;
}

export interface HotelSearchParams {
  destination: string;
  dates: string;
  durationNights: number;
  travellerCount: number;
  adultsCount: number;
  childrenCount: number;
  childAges?: number[];
  hotelPreference?: string;
  familyRequirements?: boolean;
  budgetTotalINR?: number;
}

export interface TransportSearchParams {
  origin: string;
  destination: string;
  scope: TripScope;
  travellerCount: number;
  luggageCount?: number;
  preferredMode?: 'Flight' | 'Train' | 'Cab' | 'Combo';
}

export interface ActivitySearchParams {
  destination: string;
  travellerProfile?: string;
  childAges?: number[];
  hasSeniors?: boolean;
  walkingPreference?: 'Low' | 'Moderate' | 'Active';
  categories?: string[];
  durationDays: number;
  budgetINR?: number;
}

export interface LLMGenerateRequest {
  prompt: string;
  systemInstruction?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMGenerateResponse {
  text: string;
  model: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  providerMetadata: ProviderMetadata;
}

export interface LLMStructuredRequest<T> extends LLMGenerateRequest {
  responseSchema?: Record<string, unknown>;
}

export interface LLMStructuredResponse<T> {
  data: T;
  rawText: string;
  model: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  providerMetadata: ProviderMetadata;
}

// ============================================================================
// 5. DOMAIN PROVIDER CONTRACTS
// ============================================================================

export interface FlightProvider extends BaseProvider {
  readonly category: 'flights';
  searchFlights(params: FlightSearchParams): Promise<FlightItem[]>;
  searchFlightOptions?(params: FlightSearchParams): Promise<FlightOption[]>;
  calculateLabels?(flights: FlightItem[]): FlightItem[];
}

export interface HotelProvider extends BaseProvider {
  readonly category: 'hotels';
  searchHotels(params: HotelSearchParams): Promise<HotelItem[]>;
  searchHotelOptions?(params: HotelSearchParams): Promise<HotelOption[]>;
}

export interface TransportProvider extends BaseProvider {
  readonly category: 'transport';
  searchTransfers(params: TransportSearchParams): Promise<TransferItem[]>;
  searchTransportOptions?(params: TransportSearchParams): Promise<TransportOption[]>;
  searchTrains?(params: TransportSearchParams): Promise<TrainItem[]>;
}

export interface ActivityProvider extends BaseProvider {
  readonly category: 'activities';
  searchActivities(params: ActivitySearchParams): Promise<ActivityItem[]>;
  searchActivityOptions?(params: ActivitySearchParams): Promise<ActivityOption[]>;
}

export interface MapProvider extends BaseProvider {
  readonly category: 'maps';
  getRoute(origin: string, destination: string, mode?: string): Promise<MapRouteOption>;
  getDistance(origin: string, destination: string): Promise<{ distanceKm: number; durationMinutes: number }>;
  geocode?(query: string): Promise<PlaceLocation>;
  reverseGeocode?(lat: number, lon: number): Promise<PlaceLocation>;
}

export interface WeatherProvider extends BaseProvider {
  readonly category: 'weather';
  getForecast(location: string, dates: string): Promise<WeatherReport[]>;
  getCurrentWeather(location: string): Promise<WeatherReport>;
}

export interface CurrencyProvider extends BaseProvider {
  readonly category: 'currency';
  getExchangeRate(from: string, to: string): Promise<CurrencyRate>;
  convert(amount: number, from: string, to: string): Promise<{ convertedAmount: number; rate: number; currency: string }>;
  convertDetailed?(amount: number, from: string, to: string): Promise<CurrencyConversionResult>;
}

export interface PaymentProvider extends BaseProvider {
  readonly category: 'payment';
  authorizePayment(params: PaymentAuthorizeParams): Promise<PaymentAuthorizationResult>;
  capturePayment(params: PaymentCaptureParams): Promise<PaymentCaptureResult>;
  refundPayment(params: PaymentRefundParams): Promise<PaymentRefundResult>;
  getPaymentStatus(transactionId: string): Promise<PaymentStatusResult>;
}

export interface LLMProvider extends BaseProvider {
  readonly category: 'llm';
  generate(request: LLMGenerateRequest): Promise<LLMGenerateResponse>;
  generateStructured<T>(request: LLMStructuredRequest<T>): Promise<LLMStructuredResponse<T>>;
  embed?(text: string): Promise<number[]>;
}

export interface TravelAdvisory {
  destination: string;
  level: 'NORMAL' | 'EXERCISE_CAUTION' | 'RECONSIDER_TRAVEL' | 'DO_NOT_TRAVEL';
  summary: string;
  source: string;
  sourceUrl?: string;
  lastUpdated: string;
}

export interface TravelKnowledgeProvider extends BaseProvider {
  readonly category: 'travelKnowledge';
  getDestinationKnowledge(destination: string): Promise<TravelKnowledgeItem | null>;
  searchKnowledge(query: string): Promise<TravelKnowledgeItem[]>;
  getVisaRequirements?(nationality: string, destination: string, passportType?: string): Promise<any | null>;
  getEntryRequirements?(nationality: string, destination: string): Promise<any | null>;
  getTransitRequirements?(nationality: string, transitCountry: string, destinationCountry: string): Promise<any | null>;
  getTravelAdvisory?(destination: string): Promise<TravelAdvisory | null>;
}

export interface TravelProviders {
  flightProvider: FlightProvider;
  hotelProvider: HotelProvider;
  transportProvider: TransportProvider;
  activityProvider: ActivityProvider;
}
