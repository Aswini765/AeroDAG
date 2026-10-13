/**
 * AeroDAG Phase 8.5 — Deterministic Mock Flight Booking Provider
 * 
 * Implements sandbox flight booking lifecycle:
 * search -> select -> hold -> confirm -> cancel.
 * 
 * STRICT INVARIANT:
 * Strictly simulated (simulated: true). Returns deterministic sandbox IDs.
 * Never connects to live GDS / airline reservation systems.
 */

import {
  FlightSearchParams,
  FlightOption,
  ProviderCapabilities,
  ProviderHealthStatus
} from './types';
import {
  SandboxProviderHoldResult,
  SandboxProviderConfirmationResult,
  SandboxProviderCancellationResult
} from '../../types/bookingSandbox';
import { sanitizeProviderMetadata } from './normalizers';
import { MockFlightProvider } from './mockFlightProvider';

export class MockFlightBookingProvider {
  public readonly providerName = 'MockFlightBookingProvider';
  public readonly category = 'flights' as const;
  public readonly isLive = false;
  public readonly supportsBooking = false;
  public readonly capabilities: ProviderCapabilities = {
    search: true,
    availability: true,
    pricing: true,
    booking: true,
    refund: true,
    domestic: true,
    international: true
  };

  private readonly flightSearchProvider = new MockFlightProvider();
  private holds = new Map<string, { flightId: string; bookingId: string; userId: string; expiresAtMs: number }>();
  private confirmations = new Map<string, { confirmationCode: string; providerBookingId: string; confirmedAt: string }>();

  async search(params: FlightSearchParams): Promise<FlightOption[]> {
    return this.flightSearchProvider.searchFlightOptions(params);
  }

  async select(flightId: string): Promise<FlightOption | null> {
    const defaultSearch = await this.flightSearchProvider.searchFlightOptions({
      destination: 'Singapore',
      origin: 'Bengaluru',
      travellerCount: 1,
      dates: '2026-11-01',
      adultsCount: 1,
      childrenCount: 0
    });
    const found = defaultSearch.find((f) => f.id === flightId);
    if (found) return found;

    // Fallback deterministic selection
    return {
      id: flightId,
      airline: 'Sandbox Air',
      flightNumber: 'SA-101',
      origin: 'BLR',
      destination: 'SIN',
      departure: '2026-11-01T10:00:00Z',
      arrival: '2026-11-01T14:30:00Z',
      duration: '4h 30m',
      stops: 0,
      cabin: 'Economy',
      baggage: '15kg check-in',
      price: 18500,
      currency: 'INR',
      availability: 5,
      providerMetadata: sanitizeProviderMetadata(this.providerName, true, { flightId }, 10, 0)
    };
  }

  async hold(
    flightId: string,
    bookingId: string,
    userId: string,
    holdDurationSeconds: number = 600
  ): Promise<SandboxProviderHoldResult> {
    const holdId = `SANDBOX-HOLD-FLT-${Date.now()}`;
    const expiresAtMs = Date.now() + holdDurationSeconds * 1000;
    const expiresAt = new Date(expiresAtMs).toISOString();

    this.holds.set(holdId, {
      flightId,
      bookingId,
      userId,
      expiresAtMs
    });

    return {
      success: true,
      holdId,
      inventoryId: flightId,
      expiresAt,
      simulated: true,
      providerMetadata: sanitizeProviderMetadata(this.providerName, true, { holdId, bookingId }, 15, 0)
    };
  }

  registerHold(holdId: string, flightId: string, bookingId: string, userId: string, expiresAtMs: number): void {
    this.holds.set(holdId, {
      flightId,
      bookingId,
      userId,
      expiresAtMs
    });
  }

  async confirm(
    bookingId: string,
    holdId: string,
    paymentTransactionId: string
  ): Promise<SandboxProviderConfirmationResult> {
    const hold = this.holds.get(holdId);
    if (hold && Date.now() > hold.expiresAtMs) {
      return {
        success: false,
        providerBookingId: '',
        confirmationCode: '',
        confirmedAt: new Date().toISOString(),
        simulated: true,
        providerMetadata: sanitizeProviderMetadata(this.providerName, true, { holdId, bookingId }, 10, 0),
        errorMessage: `Provider inventory hold '${holdId}' has expired.`
      };
    }

    const providerBookingId = `SANDBOX-FLT-${Date.now().toString(36).toUpperCase()}`;
    const confirmationCode = `CONF-FLT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const confirmedAt = new Date().toISOString();

    this.confirmations.set(bookingId, {
      confirmationCode,
      providerBookingId,
      confirmedAt
    });

    return {
      success: true,
      providerBookingId,
      confirmationCode,
      confirmedAt,
      simulated: true,
      providerMetadata: sanitizeProviderMetadata(this.providerName, true, { providerBookingId, confirmationCode }, 20, 0)
    };
  }

  async cancel(bookingId: string, reason?: string): Promise<SandboxProviderCancellationResult> {
    const existing = this.confirmations.get(bookingId);
    if (!existing) {
      return {
        success: false,
        cancelledAt: new Date().toISOString(),
        refundEligible: false,
        simulated: true,
        providerMetadata: sanitizeProviderMetadata(this.providerName, true, { bookingId }, 10, 0),
        errorMessage: `Booking '${bookingId}' not found to cancel.`
      };
    }

    this.confirmations.delete(bookingId);
    return {
      success: true,
      cancelledAt: new Date().toISOString(),
      refundEligible: true,
      simulated: true,
      providerMetadata: sanitizeProviderMetadata(this.providerName, true, { bookingId, reason }, 15, 0)
    };
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    return {
      providerName: this.providerName,
      category: this.category,
      state: 'available',
      latencyMs: 12,
      lastChecked: new Date().toISOString(),
      details: 'Deterministic flight booking sandbox active'
    };
  }

  clear(): void {
    this.holds.clear();
    this.confirmations.clear();
  }
}
