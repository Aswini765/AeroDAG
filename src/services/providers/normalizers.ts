/**
 * AeroDAG Provider Data Normalization Layer
 * 
 * Ingests heterogeneous vendor payload schemas (e.g. Amadeus, Sabre, Expedia,
 * OpenWeather, Stripe, Razorpay) and normalizes them into canonical domain models.
 * Preserves factual data integrity while stripping any sensitive credentials from metadata.
 */

import {
  FlightOption,
  HotelOption,
  ActivityOption,
  TransportOption,
  CurrencyRate,
  MapRouteOption,
  WeatherReport,
  PlaceLocation,
  ProviderMetadata
} from './types';
import { maskSensitiveString } from '../telemetry/sanitizer';

/**
 * Sanitizes provider metadata to ensure no secrets, keys, or authorization tokens leak
 */
export function sanitizeProviderMetadata(
  providerName: string,
  simulated: boolean,
  rawMeta?: Record<string, unknown>,
  latencyMs?: number,
  cost?: number | 'unavailable'
): ProviderMetadata {
  const sanitizedExtra: Record<string, unknown> = {};

  if (rawMeta && typeof rawMeta === 'object') {
    for (const [key, val] of Object.entries(rawMeta)) {
      const lowerKey = key.toLowerCase();
      // Block known secret key names
      if (
        lowerKey.includes('key') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('token') ||
        lowerKey.includes('auth') ||
        lowerKey.includes('password') ||
        lowerKey.includes('credential') ||
        lowerKey.includes('card') ||
        lowerKey.includes('cvv')
      ) {
        continue;
      }

      if (typeof val === 'string') {
        sanitizedExtra[key] = maskSensitiveString(val);
      } else if (typeof val === 'number' || typeof val === 'boolean') {
        sanitizedExtra[key] = val;
      }
    }
  }

  return {
    providerName,
    simulated,
    latencyMs,
    cost: cost !== undefined ? cost : 'unavailable',
    extra: Object.keys(sanitizedExtra).length > 0 ? sanitizedExtra : undefined
  };
}

/**
 * Normalizes flight offers from various vendor formats into FlightOption
 */
export function normalizeFlight(
  raw: any,
  providerName: string,
  simulated = false
): FlightOption {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Cannot normalize invalid flight data');
  }

  // Canonicalize price
  const price = Number(
    raw.price ?? raw.amount ?? raw.totalPriceINR ?? raw.totalFare ?? raw.priceINR ?? 0
  );

  // Canonicalize currency
  const currency = String(
    raw.currency ?? raw.currencyCode ?? raw.currency_code ?? (raw.totalPriceINR ? 'INR' : 'USD')
  ).toUpperCase();

  // Canonicalize stops
  let stops: number | string = 0;
  if (typeof raw.stops === 'number') {
    stops = raw.stops;
  } else if (typeof raw.stops === 'string') {
    const stopsLower = raw.stops.toLowerCase();
    if (stopsLower.includes('non-stop') || stopsLower.includes('direct') || stopsLower.includes('0')) {
      stops = 0;
    } else {
      const match = raw.stops.match(/\d+/);
      stops = match ? parseInt(match[0], 10) : raw.stops;
    }
  } else if (Array.isArray(raw.segments)) {
    stops = Math.max(0, raw.segments.length - 1);
  }

  // Canonicalize dates/times
  const departure = String(raw.departure ?? raw.departureTime ?? raw.departsAt ?? '');
  const arrival = String(raw.arrival ?? raw.arrivalTime ?? raw.arrivesAt ?? '');
  const duration = String(raw.duration ?? raw.totalDuration ?? raw.flightDuration ?? 'N/A');

  // Canonicalize baggage
  const baggage = String(
    raw.baggage ?? raw.baggageAllowance ?? raw.luggage ?? 'Standard allowance'
  );

  // Canonicalize cabin
  const cabin = String(
    raw.cabin ?? raw.cabinClass ?? raw.class ?? 'Economy'
  );

  // Canonicalize availability
  const availability = raw.availability ?? raw.seatAvailability ?? raw.seatsRemaining ?? true;

  return {
    id: String(raw.id ?? `fl-${providerName}-${Date.now()}`),
    airline: String(raw.airline ?? raw.carrierName ?? raw.carrier ?? 'Airline Partner'),
    flightNumber: String(raw.flightNumber ?? raw.flight_number ?? raw.carrierCode ?? 'FL-000'),
    origin: String(raw.origin ?? raw.originCity ?? raw.originCode ?? 'ORIGIN'),
    destination: String(raw.destination ?? raw.destinationCity ?? raw.destinationCode ?? 'DESTINATION'),
    departure,
    arrival,
    duration,
    stops,
    cabin,
    baggage,
    price,
    currency,
    availability: typeof availability === 'number' ? availability : Boolean(availability),
    providerMetadata: sanitizeProviderMetadata(providerName, simulated, raw.metadata)
  };
}

/**
 * Normalizes hotel properties from various vendor formats into HotelOption
 */
export function normalizeHotel(
  raw: any,
  providerName: string,
  simulated = false
): HotelOption {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Cannot normalize invalid hotel data');
  }

  const price = Number(
    raw.price ?? raw.amount ?? raw.totalPriceINR ?? raw.totalPrice ?? raw.pricePerNightINR ?? 0
  );

  const currency = String(
    raw.currency ?? raw.currencyCode ?? raw.currency_code ?? (raw.totalPriceINR ? 'INR' : 'USD')
  ).toUpperCase();

  const rating = Number(raw.rating ?? raw.starRating ?? raw.reviewScore ?? 4.0);
  const capacity = Number(raw.capacity ?? raw.maxCapacity ?? raw.maxGuests ?? 2);

  const amenities: string[] = Array.isArray(raw.amenities)
    ? raw.amenities.map(String)
    : typeof raw.amenities === 'string'
    ? raw.amenities.split(',').map((s: string) => s.trim())
    : [];

  const cancellationPolicy = String(
    raw.cancellationPolicy ??
    raw.cancellation_policy ??
    (raw.freeCancellation ? 'Free cancellation available' : 'Non-refundable')
  );

  return {
    id: String(raw.id ?? `ht-${providerName}-${Date.now()}`),
    name: String(raw.name ?? raw.hotelName ?? 'Hotel Property'),
    location: String(raw.location ?? raw.area ?? raw.city ?? 'Destination Center'),
    rating,
    roomType: String(raw.roomType ?? raw.room_type ?? 'Standard Room'),
    capacity,
    amenities,
    cancellationPolicy,
    price,
    currency,
    availability: raw.availability ?? raw.roomsAvailable ?? true,
    providerMetadata: sanitizeProviderMetadata(providerName, simulated, raw.metadata)
  };
}

/**
 * Normalizes activity records from various vendor formats into ActivityOption
 */
export function normalizeActivity(
  raw: any,
  providerName: string,
  simulated = false
): ActivityOption {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Cannot normalize invalid activity data');
  }

  const price = Number(
    raw.price ?? raw.amount ?? raw.estimatedPriceINR ?? raw.costINR ?? raw.ticketPrice ?? 0
  );

  const currency = String(
    raw.currency ?? raw.currencyCode ?? (raw.estimatedPriceINR ? 'INR' : 'USD')
  ).toUpperCase();

  let suitability: string[] = [];
  if (Array.isArray(raw.suitability)) {
    suitability = raw.suitability.map(String);
  } else if (typeof raw.ageSuitability === 'string') {
    suitability = [raw.ageSuitability];
  } else if (raw.walkingLevel) {
    suitability = [`Walking: ${raw.walkingLevel}`];
  }

  return {
    id: String(raw.id ?? `act-${providerName}-${Date.now()}`),
    name: String(raw.name ?? raw.title ?? raw.activityName ?? 'Local Experience'),
    location: String(raw.location ?? raw.destination ?? 'Destination'),
    duration: String(raw.duration ?? raw.durationHours ?? '2 Hours'),
    category: String(raw.category ?? raw.activityType ?? 'Sightseeing'),
    suitability,
    price,
    currency,
    availability: raw.availability ?? true,
    providerMetadata: sanitizeProviderMetadata(providerName, simulated, raw.metadata)
  };
}

/**
 * Normalizes ground transport and transfers into TransportOption
 */
export function normalizeTransport(
  raw: any,
  providerName: string,
  simulated = false
): TransportOption {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Cannot normalize invalid transport data');
  }

  const price = Number(
    raw.price ?? raw.amount ?? raw.priceINR ?? raw.totalPriceINR ?? 0
  );

  const currency = String(
    raw.currency ?? raw.currencyCode ?? (raw.priceINR ? 'INR' : 'USD')
  ).toUpperCase();

  return {
    id: String(raw.id ?? `tr-${providerName}-${Date.now()}`),
    mode: String(raw.mode ?? raw.vehicleType ?? raw.transportType ?? 'Transfer'),
    carrier: String(raw.carrier ?? raw.operator ?? raw.trainName ?? 'Transport Partner'),
    origin: String(raw.origin ?? raw.pickupLocation ?? raw.fromStation ?? 'Pickup Location'),
    destination: String(raw.destination ?? raw.dropLocation ?? raw.toStation ?? 'Destination'),
    departure: String(raw.departure ?? raw.departureTime ?? ''),
    arrival: String(raw.arrival ?? raw.arrivalTime ?? ''),
    duration: String(raw.duration ?? '1 Hour'),
    price,
    currency,
    availability: raw.availability ?? true,
    providerMetadata: sanitizeProviderMetadata(providerName, simulated, raw.metadata)
  };
}

/**
 * Normalizes exchange rate responses into CurrencyRate
 */
export function normalizeCurrency(
  rawOrFrom: any,
  providerNameOrTo: string,
  simulatedOrRate: any = false,
  extraProviderName?: string,
  extraTimestamp?: string,
  extraIsStale?: boolean
): CurrencyRate {
  if (typeof rawOrFrom === 'string') {
    const fromCurrency = rawOrFrom.toUpperCase();
    const toCurrency = String(providerNameOrTo || 'INR').toUpperCase();
    const rate = Number(simulatedOrRate || 1.0);
    const providerName = extraProviderName || 'CurrencyProvider';
    const timestamp = String(extraTimestamp || new Date().toISOString());
    const retrievedAt = new Date().toISOString();
    return {
      fromCurrency,
      toCurrency,
      baseCurrency: fromCurrency,
      quoteCurrency: toCurrency,
      rate,
      timestamp,
      retrievedAt,
      source: providerName,
      isStale: Boolean(extraIsStale),
      providerMetadata: sanitizeProviderMetadata(providerName, false)
    };
  }

  const raw = rawOrFrom;
  const providerName = providerNameOrTo;
  const simulated = Boolean(simulatedOrRate);

  if (!raw || typeof raw !== 'object') {
    throw new Error('Cannot normalize invalid currency data');
  }

  const rate = Number(raw.rate ?? raw.exchangeRate ?? raw.value ?? 1.0);
  const fromCurrency = String(raw.fromCurrency ?? raw.from ?? raw.base ?? 'USD').toUpperCase();
  const toCurrency = String(raw.toCurrency ?? raw.to ?? raw.target ?? 'INR').toUpperCase();
  const timestamp = String(raw.timestamp ?? raw.date ?? new Date().toISOString());
  const retrievedAt = String(raw.retrievedAt ?? new Date().toISOString());

  // Stale detection if timestamp is > 24 hours in the past
  const parsedTime = Date.parse(timestamp);
  const isStale = !isNaN(parsedTime) && (Date.now() - parsedTime > 86400000);

  return {
    fromCurrency,
    toCurrency,
    baseCurrency: fromCurrency,
    quoteCurrency: toCurrency,
    rate,
    timestamp,
    retrievedAt,
    source: String(raw.source ?? providerName),
    isStale: raw.isStale !== undefined ? Boolean(raw.isStale) : isStale,
    providerMetadata: sanitizeProviderMetadata(providerName, simulated, raw.metadata)
  };
}

/**
 * Normalizes geocoding responses into PlaceLocation
 */
export function normalizePlaceLocation(
  raw: any,
  providerName: string,
  simulated = false
): PlaceLocation {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Cannot normalize invalid place location data');
  }

  const lat = Number(raw.latitude ?? raw.lat);
  const lon = Number(raw.longitude ?? raw.lon ?? raw.lng);

  if (isNaN(lat) || isNaN(lon)) {
    throw new Error('Invalid coordinates: latitude and longitude must be valid numbers');
  }

  const address = raw.address || {};
  const city = raw.city || address.city || address.town || address.village || address.state_district;
  const state = raw.state || address.state;
  const country = raw.country || address.country;
  const countryCode = (raw.countryCode || raw.country_code || address.country_code || '').toUpperCase();

  return {
    name: String(raw.name ?? raw.display_name ?? 'Known Location'),
    latitude: lat,
    longitude: lon,
    city: city ? String(city) : undefined,
    state: state ? String(state) : undefined,
    country: country ? String(country) : undefined,
    countryCode: countryCode ? String(countryCode) : undefined,
    providerMetadata: sanitizeProviderMetadata(providerName, simulated, raw.metadata)
  };
}

/**
 * Normalizes route / directions responses into MapRouteOption
 */
export function normalizeMapRoute(
  raw: any,
  providerName: string,
  simulated = false
): MapRouteOption {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Cannot normalize invalid map route data');
  }

  const primary = (Array.isArray(raw.routes) && raw.routes[0]) ? raw.routes[0] : raw;
  const distanceKm = Number(
    raw.distanceKm ??
    primary.distanceKm ??
    (primary.distance !== undefined ? primary.distance / 1000 : 0)
  );

  const durationMinutes = Number(
    raw.durationMinutes ??
    primary.durationMinutes ??
    (primary.duration !== undefined ? Math.round(primary.duration / 60) : 0)
  );

  const waypoints = Array.isArray(raw.waypoints)
    ? raw.waypoints.map((w: any) => typeof w === 'string' ? w : (w.name || `${w.location?.[1]}, ${w.location?.[0]}`))
    : undefined;

  return {
    id: String(raw.id ?? primary.id ?? `rt-${providerName}-${Date.now()}`),
    origin: String(raw.origin ?? (waypoints?.[0] ? waypoints[0] : 'Origin')),
    destination: String(raw.destination ?? (waypoints?.[1] ? waypoints[waypoints.length - 1] : 'Destination')),
    distanceKm: Math.round(distanceKm * 10) / 10,
    durationMinutes: Math.round(durationMinutes),
    waypoints,
    steps: Array.isArray(raw.steps ?? primary.legs?.[0]?.steps) ? (raw.steps ?? primary.legs?.[0]?.steps) : undefined,
    travelMode: raw.travelMode ? String(raw.travelMode) : 'driving',
    geometry: primary.geometry ?? raw.geometry,
    estimatedTravelTime: raw.estimatedTravelTime || `${Math.round(durationMinutes)} mins`,
    providerMetadata: sanitizeProviderMetadata(providerName, simulated, raw.metadata ?? primary.metadata)
  };
}

/**
 * Normalizes meteorological forecast and weather responses into WeatherReport
 */
export function normalizeWeather(
  raw: any,
  providerName: string,
  simulated = false
): WeatherReport {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Cannot normalize invalid weather data');
  }

  const tempMin = Number(raw.temperatureMinC ?? raw.temp_min ?? raw.tempMin ?? 20);
  const tempMax = Number(raw.temperatureMaxC ?? raw.temp_max ?? raw.tempMax ?? 30);
  const precChance = Number(raw.precipitationChance ?? raw.precipitationProbability ?? raw.pop ?? 0);
  const humidity = Number(raw.humidity ?? 60);

  return {
    location: String(raw.location ?? 'Location'),
    date: String(raw.date ?? new Date().toISOString().split('T')[0]),
    temperatureMinC: Math.round(tempMin),
    temperatureMaxC: Math.round(tempMax),
    condition: String(raw.condition ?? raw.weather ?? 'Clear'),
    precipitationChance: Math.min(100, Math.max(0, Math.round(precChance))),
    humidity: Math.min(100, Math.max(0, Math.round(humidity))),
    latitude: raw.latitude !== undefined ? Number(raw.latitude) : undefined,
    longitude: raw.longitude !== undefined ? Number(raw.longitude) : undefined,
    temperature: raw.temperature !== undefined ? Number(raw.temperature) : undefined,
    feelsLike: raw.feelsLike !== undefined ? Number(raw.feelsLike) : undefined,
    windSpeed: raw.windSpeed !== undefined ? Number(raw.windSpeed) : undefined,
    windSpeedUnit: raw.windSpeedUnit ? String(raw.windSpeedUnit) : 'km/h',
    advisory: raw.advisory ? String(raw.advisory) : undefined,
    alerts: Array.isArray(raw.alerts) ? raw.alerts : undefined,
    retrievedAt: String(raw.retrievedAt ?? new Date().toISOString()),
    isStale: Boolean(raw.isStale),
    providerMetadata: sanitizeProviderMetadata(providerName, simulated, raw.metadata)
  };
}

/**
 * Normalizes meteorological forecast payloads (including Open-Meteo daily arrays) into WeatherReport[]
 */
export function normalizeWeatherForecast(
  raw: any,
  location: string,
  providerName: string,
  simulated = false
): WeatherReport[] {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Cannot normalize invalid weather forecast data');
  }

  if (raw.daily && Array.isArray(raw.daily.time)) {
    const daily = raw.daily;
    const count = daily.time.length;
    const reports: WeatherReport[] = [];
    const conditionMap: Record<number, string> = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      51: 'Light drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      80: 'Rain showers',
      95: 'Thunderstorm'
    };

    for (let i = 0; i < count; i++) {
      const wCode = Number(daily.weathercode?.[i] ?? 0);
      const cond = conditionMap[wCode] || (wCode >= 60 && wCode <= 69 ? 'Rain' : 'Partly Cloudy');
      reports.push({
        location,
        date: daily.time[i],
        temperatureMinC: Number(daily.temperature_2m_min?.[i] ?? 20),
        temperatureMaxC: Number(daily.temperature_2m_max?.[i] ?? 30),
        temperature: Number(raw.current_weather?.temperature ?? daily.temperature_2m_max?.[i] ?? 25),
        condition: cond,
        precipitationChance: Number(daily.precipitation_probability_max?.[i] ?? 0),
        precipitationAmount: Number(daily.precipitation_sum?.[i] ?? 0),
        windSpeed: Number(daily.windspeed_10m_max?.[i] ?? raw.current_weather?.windspeed ?? 10),
        windSpeedUnit: 'km/h',
        humidity: 65,
        retrievedAt: new Date().toISOString(),
        timestamp: daily.time[i],
        providerMetadata: sanitizeProviderMetadata(providerName, simulated, raw.metadata)
      });
    }
    return reports;
  }

  if (Array.isArray(raw)) {
    return raw.map(item => normalizeWeather(item, providerName, simulated));
  }

  return [normalizeWeather(raw, providerName, simulated)];
}

