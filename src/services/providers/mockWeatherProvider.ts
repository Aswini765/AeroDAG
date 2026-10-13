/**
 * AeroDAG Deterministic Mock Weather Provider
 * 
 * Provides mock meteorological forecasts, temperature ranges, and weather advisories.
 * Decoupled from OpenWeather, WeatherAPI, and AccuWeather.
 * Returns strictly simulated metadata.
 */

import {
  WeatherProvider,
  WeatherReport,
  ProviderCapabilities,
  ProviderHealthStatus
} from './types';
import { sanitizeProviderMetadata } from './normalizers';

export class MockWeatherProvider implements WeatherProvider {
  public readonly providerName = 'MockWeatherProvider';
  public readonly category = 'weather' as const;
  public readonly isLive = false;
  public readonly supportsBooking = false;
  public readonly capabilities: ProviderCapabilities = {
    search: true,
    realTimeData: false,
    domestic: true,
    international: true
  };

  async getCurrentWeather(location: string): Promise<WeatherReport> {
    const locLower = (location || '').toLowerCase();
    let tempMin = 22;
    let tempMax = 31;
    let condition = 'Partly Cloudy';
    let advisory: string | undefined = undefined;

    if (locLower.includes('goa') || locLower.includes('kerala')) {
      tempMin = 24;
      tempMax = 32;
      condition = 'Sunny with Coastal Breezes';
      advisory = 'High UV index during midday. Carry sunscreen.';
    } else if (locLower.includes('vietnam') || locLower.includes('hanoi')) {
      tempMin = 20;
      tempMax = 27;
      condition = 'Comfortable & Clear';
      advisory = 'Pleasant weather for outdoor sightseeing.';
    } else if (locLower.includes('japan') || locLower.includes('tokyo')) {
      tempMin = 14;
      tempMax = 21;
      condition = 'Mild & Sunny';
    } else if (locLower.includes('manali') || locLower.includes('kashmir')) {
      tempMin = 4;
      tempMax = 15;
      condition = 'Cool Mountain Air';
      advisory = 'Pack warm thermal layers for late evenings.';
    }

    return {
      location,
      date: new Date().toISOString().split('T')[0],
      temperatureMinC: tempMin,
      temperatureMaxC: tempMax,
      condition,
      precipitationChance: 15,
      humidity: 65,
      advisory,
      providerMetadata: sanitizeProviderMetadata(this.providerName, true, undefined, 8, 0)
    };
  }

  async getForecast(location: string, dates: string): Promise<WeatherReport[]> {
    const current = await this.getCurrentWeather(location);
    const reports: WeatherReport[] = [current];

    // Generate 3-day projection
    for (let i = 1; i <= 3; i++) {
      const forecastDate = new Date(Date.now() + i * 86400000).toISOString().split('T')[0];
      reports.push({
        location,
        date: forecastDate,
        temperatureMinC: current.temperatureMinC + (i % 2 === 0 ? 1 : -1),
        temperatureMaxC: current.temperatureMaxC + (i % 2 === 0 ? -1 : 1),
        condition: current.condition,
        precipitationChance: Math.min(80, current.precipitationChance + i * 5),
        humidity: current.humidity,
        advisory: current.advisory,
        providerMetadata: sanitizeProviderMetadata(this.providerName, true, { projectionDay: i }, 8, 0)
      });
    }

    return reports;
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    return {
      providerName: this.providerName,
      category: this.category,
      state: 'available',
      latencyMs: 8,
      lastChecked: new Date().toISOString(),
      details: 'Deterministic mock weather online'
    };
  }
}
