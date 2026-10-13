/**
 * AeroDAG Travel Provider Registry & Abstraction Layer
 * 
 * Central gateway providing decoupled Flight, Hotel, Transport, Activity,
 * Map, Weather, Currency, Payment, LLM, Embedding, and Travel Knowledge providers.
 * Enforces domain-level interfaces and prevents vendor lock-in.
 */

import { TravelProviders, FlightProvider, HotelProvider, TransportProvider, ActivityProvider } from './types';
import { ProviderRegistry, getProviderRegistry } from './providerRegistry';
import { MockFlightProvider } from './mockFlightProvider';
import { MockHotelProvider } from './mockHotelProvider';
import { MockTransportProvider } from './mockTransportProvider';
import { MockActivityProvider } from './mockActivityProvider';
import { MockMapProvider } from './mockMapProvider';
import { MockWeatherProvider } from './mockWeatherProvider';
import { MockCurrencyProvider } from './mockCurrencyProvider';
import { MockPaymentProvider } from './mockPaymentProvider';
import { MockLLMProvider } from './mockLlmProvider';
import { GeminiLLMProvider } from './geminiLlmProvider';
import { MockTravelKnowledgeProvider } from './mockTravelKnowledgeProvider';
import { DeterministicEmbeddingProvider } from '../rag/embeddings/deterministicEmbeddingProvider';

import { RealFlightProvider } from './realFlightProvider';
import { RealHotelProvider } from './realHotelProvider';
import { RealMapProvider } from './realMapProvider';
import { RealWeatherProvider } from './realWeatherProvider';
import { RealCurrencyProvider } from './realCurrencyProvider';
import { RealTravelKnowledgeProvider } from './realTravelKnowledgeProvider';
import { ContextTravelEvaluator } from './contextTravelEvaluator';
import { TrustedSourceRegistry } from '../regulatory/trustedSourceRegistry';
import { FreshnessEvaluator } from '../regulatory/freshnessEvaluator';
import { VisaRegulatoryModel } from '../regulatory/visaRegulatoryModel';
import { RegulatoryGuardrail } from '../regulatory/regulatoryGuardrail';

export * from './types';
export * from './errors';
export * from './normalizers';
export * from './providerRegistry';
export * from './mockFlightProvider';
export * from './mockHotelProvider';
export * from './mockTransportProvider';
export * from './mockActivityProvider';
export * from './mockMapProvider';
export * from './mockWeatherProvider';
export * from './mockCurrencyProvider';
export * from './mockPaymentProvider';
export * from './mockLlmProvider';
export * from './geminiLlmProvider';
export * from './mockTravelKnowledgeProvider';
export * from './realFlightProvider';
export * from './realHotelProvider';
export * from './realMapProvider';
export * from './realWeatherProvider';
export * from './realCurrencyProvider';
export * from './realTravelKnowledgeProvider';
export * from './contextTravelEvaluator';
export * from './mockFlightBookingProvider';
export * from './mockHotelBookingProvider';
export * from '../regulatory/trustedSourceRegistry';
export * from '../regulatory/freshnessEvaluator';
export * from '../regulatory/visaRegulatoryModel';
export * from '../regulatory/regulatoryGuardrail';
export * from '../booking';

/**
 * Initializes the default provider registry with standard deterministic mock providers
 * and Gemini adapters.
 */
export function initializeDefaultProviders(registry: ProviderRegistry = getProviderRegistry()): void {
  const safeEnv = typeof process !== 'undefined' && process.env ? process.env : ({} as Record<string, string | undefined>);
  const isFlightReal = safeEnv.FLIGHT_PROVIDER === 'real' || safeEnv.FLIGHT_PROVIDER === 'amadeus';
  const isHotelReal = safeEnv.HOTEL_PROVIDER === 'real' || safeEnv.HOTEL_PROVIDER === 'amadeus';
  const isMapReal = safeEnv.MAP_PROVIDER === 'real' || safeEnv.MAP_PROVIDER === 'osrm' || safeEnv.MAP_PROVIDER === 'google';
  const isWeatherReal = safeEnv.WEATHER_PROVIDER === 'real' || safeEnv.WEATHER_PROVIDER === 'openmeteo' || safeEnv.WEATHER_PROVIDER === 'openweather';
  const isCurrencyReal = safeEnv.CURRENCY_PROVIDER === 'real' || safeEnv.CURRENCY_PROVIDER === 'frankfurter' || safeEnv.CURRENCY_PROVIDER === 'exchangerate';

  // Flight
  registry.registerProvider('flights', new MockFlightProvider(), !isFlightReal, ['mock']);
  registry.registerProvider('flights', new RealFlightProvider(), isFlightReal, ['real', 'amadeus']);

  // Hotel
  registry.registerProvider('hotels', new MockHotelProvider(), !isHotelReal, ['mock']);
  registry.registerProvider('hotels', new RealHotelProvider(), isHotelReal, ['real', 'amadeus']);

  // Transport
  registry.registerProvider('transport', new MockTransportProvider(), true, ['mock']);

  // Activities
  registry.registerProvider('activities', new MockActivityProvider(), true, ['mock']);

  // Maps
  registry.registerProvider('maps', new MockMapProvider(), !isMapReal, ['mock']);
  registry.registerProvider('maps', new RealMapProvider(), isMapReal, ['real', 'osrm', 'google']);

  // Weather
  registry.registerProvider('weather', new MockWeatherProvider(), !isWeatherReal, ['mock']);
  registry.registerProvider('weather', new RealWeatherProvider(), isWeatherReal, ['real', 'openmeteo', 'openweather']);

  // Currency
  registry.registerProvider('currency', new MockCurrencyProvider(), !isCurrencyReal, ['mock']);
  registry.registerProvider('currency', new RealCurrencyProvider(), isCurrencyReal, ['real', 'frankfurter', 'exchangerate']);

  // Payment
  registry.registerProvider('payment', new MockPaymentProvider(), true);

  // LLM
  registry.registerProvider('llm', new MockLLMProvider(), false);
  registry.registerProvider('llm', new GeminiLLMProvider(), true);

  // Embeddings
  registry.registerProvider('embeddings', new DeterministicEmbeddingProvider(), true);

  // Travel Knowledge
  const isKnowledgeReal = safeEnv.KNOWLEDGE_PROVIDER === 'real' || safeEnv.VISA_PROVIDER === 'real';
  registry.registerProvider('travelKnowledge', new MockTravelKnowledgeProvider(), !isKnowledgeReal, ['mock']);
  registry.registerProvider('travelKnowledge', new RealTravelKnowledgeProvider(), isKnowledgeReal, ['real']);
}

// Automatically bootstrap standard providers into singleton registry
initializeDefaultProviders();

/**
 * Backward-compatible accessor for TravelProviders
 */
export function getTravelProviders(): TravelProviders {
  const registry = getProviderRegistry();
  return {
    flightProvider: registry.resolveProvider<FlightProvider>('flights'),
    hotelProvider: registry.resolveProvider<HotelProvider>('hotels'),
    transportProvider: registry.resolveProvider<TransportProvider>('transport'),
    activityProvider: registry.resolveProvider<ActivityProvider>('activities')
  };
}

/**
 * Backward-compatible registration helper for custom TravelProviders
 */
export function registerTravelProviders(customProviders: Partial<TravelProviders>): void {
  const registry = getProviderRegistry();
  if (customProviders.flightProvider) {
    registry.registerProvider('flights', customProviders.flightProvider, true);
  }
  if (customProviders.hotelProvider) {
    registry.registerProvider('hotels', customProviders.hotelProvider, true);
  }
  if (customProviders.transportProvider) {
    registry.registerProvider('transport', customProviders.transportProvider, true);
  }
  if (customProviders.activityProvider) {
    registry.registerProvider('activities', customProviders.activityProvider, true);
  }
}
