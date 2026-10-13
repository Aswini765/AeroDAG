/**
 * AeroDAG Contextual Travel Evaluator
 * 
 * Provides deterministic evaluation of:
 * 1. Itinerary Route Feasibility (excessive travel times, route inefficiencies)
 * 2. Meteorological Activity Risks (heavy rain on outdoor activities, extreme heat pacing)
 * 3. Multi-Currency Budget Normalization (deterministic conversion with audit trails)
 * 
 * Invariants:
 * - Never fabricates route, weather, or exchange rate values.
 * - If data is absent, marks feasibility as UNKNOWN instead of guessing.
 * - Does not cancel activities automatically; yields structured findings for VerificationAgent.
 * - Financial math is strictly deterministic.
 */

import {
  MapProvider,
  WeatherProvider,
  CurrencyProvider,
  WeatherReport,
  CurrencyConversionResult,
  ItineraryRouteAnalysis,
  ItineraryWeatherAnalysis,
  RouteFeasibilityStatus,
  WeatherConfidenceStatus
} from './types';
import { ActivityItem } from '../../types/travelBooking';

export interface RouteStop {
  name: string;
  location?: string;
}

export interface BudgetItemInput {
  name: string;
  amount: number;
  currency: string;
}

export class ContextTravelEvaluator {
  /**
   * Evaluates travel times, distances, and pacing efficiency across itinerary stops
   */
  static async evaluateItineraryRoutes(
    stops: RouteStop[],
    mapProvider: MapProvider,
    options: {
      maxDailyTransitMinutes?: number;
      maxHopDistanceKm?: number;
    } = {}
  ): Promise<ItineraryRouteAnalysis> {
    const maxTransitMins = options.maxDailyTransitMinutes || 180;
    const maxHopKm = options.maxHopDistanceKm || 45;

    if (!stops || stops.length < 2) {
      return {
        origin: stops?.[0]?.name || 'Origin',
        destination: stops?.[0]?.name || 'Destination',
        totalDistanceKm: 0,
        totalDurationMinutes: 0,
        segments: [],
        status: 'KNOWN',
        warnings: []
      };
    }

    const segments: Array<{
      from: string;
      to: string;
      distanceKm: number;
      durationMinutes: number;
    }> = [];

    const warnings: string[] = [];
    let totalDistanceKm = 0;
    let totalDurationMinutes = 0;
    let hasInefficiency = false;
    let mapUnavailable = false;

    for (let i = 0; i < stops.length - 1; i++) {
      const from = stops[i].location || stops[i].name;
      const to = stops[i + 1].location || stops[i + 1].name;

      try {
        const { distanceKm, durationMinutes } = await mapProvider.getDistance(from, to);
        segments.push({ from, to, distanceKm, durationMinutes });
        totalDistanceKm += distanceKm;
        totalDurationMinutes += durationMinutes;

        if (distanceKm > maxHopKm) {
          hasInefficiency = true;
          warnings.push(
            `ROUTE_INEFFICIENCY: Segment from '${from}' to '${to}' is ${distanceKm} km apart. Consider clustering proximate attractions.`
          );
        }
      } catch (err: any) {
        mapUnavailable = true;
        warnings.push(`ROUTE_DATA_UNAVAILABLE: Could not calculate route from '${from}' to '${to}' (${err.message}).`);
      }
    }

    if (mapUnavailable) {
      return {
        origin: stops[0].name,
        destination: stops[stops.length - 1].name,
        totalDistanceKm,
        totalDurationMinutes,
        segments,
        status: 'UNKNOWN',
        warnings
      };
    }

    if (totalDurationMinutes > maxTransitMins) {
      warnings.push(
        `HIGH_TRAVEL_TIME: Total scheduled daily transit time (${totalDurationMinutes} mins) exceeds recommended comfort ceiling (${maxTransitMins} mins).`
      );
    }

    const status: RouteFeasibilityStatus =
      totalDurationMinutes > maxTransitMins
        ? 'HIGH_TRAVEL_TIME'
        : hasInefficiency
        ? 'ROUTE_INEFFICIENCY'
        : 'KNOWN';

    return {
      origin: stops[0].name,
      destination: stops[stops.length - 1].name,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      totalDurationMinutes,
      segments,
      status,
      warnings
    };
  }

  /**
   * Evaluates weather risks for scheduled activities against forecast reports
   */
  static evaluateWeatherRisks(
    arg1: ActivityItem[] | WeatherReport[],
    arg2: ActivityItem[] | WeatherReport[]
  ): ItineraryWeatherAnalysis {
    let activities: ActivityItem[] = [];
    let weatherReports: WeatherReport[] = [];

    const isWeather = (item: any) =>
      item && (item.temperatureMinC !== undefined || item.condition !== undefined || item.precipitationChance !== undefined);

    if (Array.isArray(arg1) && arg1.length > 0 && isWeather(arg1[0])) {
      weatherReports = arg1 as WeatherReport[];
      activities = (arg2 || []) as ActivityItem[];
    } else if (Array.isArray(arg2) && arg2.length > 0 && isWeather(arg2[0])) {
      weatherReports = arg2 as WeatherReport[];
      activities = (arg1 || []) as ActivityItem[];
    } else {
      activities = (arg1 || []) as ActivityItem[];
      weatherReports = (arg2 || []) as WeatherReport[];
    }

    if (!weatherReports || weatherReports.length === 0) {
      return {
        location: activities?.[0]?.location || 'Unknown',
        status: 'UNKNOWN',
        risks: ['WEATHER_UNAVAILABLE: No meteorological forecast data available (status UNKNOWN).'],
        advisories: [],
        forecasts: []
      };
    }

    const risks: string[] = [];
    const advisories: string[] = [];
    let detectedRisk: WeatherConfidenceStatus = 'KNOWN';

    // Index forecasts by date or take primary
    const primaryForecast = weatherReports[0];

    // Check severe alerts
    if (primaryForecast.alerts && primaryForecast.alerts.length > 0) {
      detectedRisk = 'SEVERE_WEATHER_ALERT';
      risks.push(`SEVERE_WEATHER_ALERT: Active meteorological warning: ${primaryForecast.alerts.join(', ')}.`);
    }

    for (const act of activities || []) {
      const actName = (act.name || '').toLowerCase();
      const isOutdoor =
        act.category?.toLowerCase() === 'nature' ||
        act.category?.toLowerCase() === 'adventure' ||
        actName.includes('beach') ||
        actName.includes('trek') ||
        actName.includes('safari') ||
        actName.includes('outdoor') ||
        actName.includes('cruise');

      // Rain risk
      if (isOutdoor && primaryForecast.precipitationChance >= 60) {
        if (detectedRisk === 'KNOWN') detectedRisk = 'WEATHER_RISK';
        risks.push(
          `WEATHER_RISK: '${act.name}' is an outdoor experience with ${primaryForecast.precipitationChance}% precipitation chance. Consider indoor backup.`
        );
      }

      // Extreme heat / pacing risk
      if (isOutdoor && primaryForecast.temperatureMaxC >= 38) {
        if (detectedRisk === 'KNOWN') detectedRisk = 'PACING_RISK';
        risks.push(
          `PACING_RISK: Extreme heat (${primaryForecast.temperatureMaxC}°C) forecast during '${act.name}'. Recommend shaded scheduling or morning hours.`
        );
      }
    }

    if (primaryForecast.advisory) {
      advisories.push(primaryForecast.advisory);
    }

    return {
      location: primaryForecast.location,
      status: detectedRisk,
      risks,
      advisories,
      forecasts: weatherReports
    };
  }

  /**
   * Checks whether a weather report is stale based on configured freshness TTL (default 30 min)
   */
  static isWeatherStale(report: WeatherReport, maxAgeMinutes: number = 30): boolean {
    if (!report || !report.retrievedAt) return true;
    const retrievedTime = new Date(report.retrievedAt).getTime();
    if (isNaN(retrievedTime)) return true;
    return (Date.now() - retrievedTime) > maxAgeMinutes * 60 * 1000;
  }

  /**
   * Deterministically normalizes multiple international budget expenses into target currency
   */
  static async normalizeBudgetItems(
    items: BudgetItemInput[],
    targetCurrency: string,
    currencyProvider: CurrencyProvider
  ): Promise<{ normalizedItems: CurrencyConversionResult[]; totalConverted: number }> {
    const normalizedItems: CurrencyConversionResult[] = [];
    let totalConverted = 0;

    for (const item of items) {
      if (typeof currencyProvider.convertDetailed === 'function') {
        const result = await currencyProvider.convertDetailed(item.amount, item.currency, targetCurrency);
        normalizedItems.push(result);
        totalConverted += result.convertedAmount;
      } else {
        const { convertedAmount, rate } = await currencyProvider.convert(item.amount, item.currency, targetCurrency);
        normalizedItems.push({
          amount: item.amount,
          sourceCurrency: item.currency.toUpperCase(),
          exchangeRate: rate,
          rateTimestamp: new Date().toISOString(),
          targetCurrency: targetCurrency.toUpperCase(),
          convertedAmount,
          provider: currencyProvider.providerName,
          cached: false
        });
        totalConverted += convertedAmount;
      }
    }

    // Preserve precision to 2 decimal places
    totalConverted = Math.round(totalConverted * 100) / 100;

    return {
      normalizedItems,
      totalConverted
    };
  }
}
