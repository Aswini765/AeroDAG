/**
 * AeroDAG Deterministic Mock Map Provider
 * 
 * Provides mock driving/transit distance calculations, waypoints, and routing.
 * Strictly decoupled from Google Maps, Mapbox, or OpenStreetMap APIs.
 * Clearly labels all outputs as simulated.
 */

import {
  MapProvider,
  MapRouteOption,
  ProviderCapabilities,
  ProviderHealthStatus
} from './types';
import { sanitizeProviderMetadata } from './normalizers';

export class MockMapProvider implements MapProvider {
  public readonly providerName = 'MockMapProvider';
  public readonly category = 'maps' as const;
  public readonly isLive = false;
  public readonly supportsBooking = false;
  public readonly capabilities: ProviderCapabilities = {
    search: true,
    realTimeData: false,
    routeOptimization: true,
    domestic: true,
    international: true
  };

  async getDistance(
    origin: string,
    destination: string
  ): Promise<{ distanceKm: number; durationMinutes: number }> {
    // Deterministic distance estimation based on string hashes
    const hash = Math.abs(
      [...origin, ...destination].reduce((acc, char) => acc + char.charCodeAt(0), 0)
    );
    const distanceKm = Math.max(3, (hash % 25) + 4);
    const durationMinutes = Math.round(distanceKm * 2.2);

    return { distanceKm, durationMinutes };
  }

  async getDuration(origin: string, destination: string): Promise<number> {
    const res = await this.getDistance(origin, destination);
    return res.durationMinutes;
  }

  async geocode(query: string) {
    return {
      name: query,
      latitude: 12.9716,
      longitude: 77.5946,
      city: 'Bengaluru',
      country: 'India',
      countryCode: 'IN',
      providerMetadata: sanitizeProviderMetadata(this.providerName, true, { query }, 5, 0)
    };
  }

  async getRoute(
    origin: string,
    destination: string,
    mode: string = 'driving'
  ): Promise<MapRouteOption> {
    const { distanceKm, durationMinutes } = await this.getDistance(origin, destination);

    return {
      id: `route-sim-${Date.now()}`,
      origin,
      destination,
      distanceKm,
      durationMinutes,
      travelMode: mode,
      waypoints: [`Waypoint Alpha near ${origin}`, `Scenic Overlook en route to ${destination}`],
      steps: [
        { instruction: `Depart from ${origin} heading toward main arterial road`, distanceKm: Math.round(distanceKm * 0.2) },
        { instruction: `Continue along highway corridor toward ${destination}`, distanceKm: Math.round(distanceKm * 0.7) },
        { instruction: `Arrive safely at destination ${destination}`, distanceKm: Math.round(distanceKm * 0.1) }
      ],
      providerMetadata: sanitizeProviderMetadata(this.providerName, true, { mode }, 12, 0)
    };
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    return {
      providerName: this.providerName,
      category: this.category,
      state: 'available',
      latencyMs: 5,
      lastChecked: new Date().toISOString(),
      details: 'Deterministic mock maps online'
    };
  }
}
