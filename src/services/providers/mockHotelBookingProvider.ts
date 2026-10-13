/**
 * AeroDAG Phase 8.5 — Deterministic Mock Hotel Booking Provider
 * 
 * Implements sandbox hotel booking lifecycle:
 * search -> select -> hold -> confirm -> cancel.
 * 
 * STRICT INVARIANT:
 * Respects room capacity (adults + children <= maxCapacity).
 * Rejects confirmation if room capacity is exceeded.
 * Output explicitly labeled simulated: true.
 */

import {
  HotelSearchParams,
  HotelOption,
  ProviderCapabilities,
  ProviderHealthStatus
} from './types';
import {
  SandboxProviderHoldResult,
  SandboxProviderConfirmationResult,
  SandboxProviderCancellationResult,
  CancellationPolicy
} from '../../types/bookingSandbox';
import { sanitizeProviderMetadata } from './normalizers';
import { MockHotelProvider } from './mockHotelProvider';

export interface HotelPartyDetails {
  adultsCount: number;
  childrenCount: number;
  childrenAges?: number[];
  roomCount?: number;
}

export class MockHotelBookingProvider {
  public readonly providerName = 'MockHotelBookingProvider';
  public readonly category = 'hotels' as const;
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

  private readonly hotelSearchProvider = new MockHotelProvider();
  private holds = new Map<string, {
    hotelId: string;
    roomId: string;
    bookingId: string;
    userId: string;
    maxCapacity: number;
    expiresAtMs: number;
    cancellationPolicy: CancellationPolicy;
  }>();
  private confirmations = new Map<string, {
    confirmationCode: string;
    providerBookingId: string;
    confirmedAt: string;
  }>();

  async search(params: HotelSearchParams): Promise<HotelOption[]> {
    return this.hotelSearchProvider.searchHotelOptions(params);
  }

  async select(hotelId: string, roomId?: string): Promise<HotelOption | null> {
    const defaultSearch = await this.hotelSearchProvider.searchHotelOptions({
      destination: 'Singapore',
      dates: '2026-11-01',
      durationNights: 3,
      travellerCount: 2,
      adultsCount: 2,
      childrenCount: 0
    });
    const found = defaultSearch.find((h) => h.id === hotelId);
    if (found) return found;

    return {
      id: hotelId,
      name: 'Sandbox Grand Resort',
      location: 'Singapore',
      rating: 4.8,
      roomType: 'Deluxe Suite',
      capacity: 3,
      cancellationPolicy: 'Free cancellation until 48 hours before check-in',
      amenities: ['Free WiFi', 'Breakfast Included', 'Pool'],
      price: 36000,
      currency: 'INR',
      availability: true,
      providerMetadata: sanitizeProviderMetadata(this.providerName, true, { hotelId }, 10, 0)
    };
  }

  async hold(
    hotelId: string,
    roomId: string,
    bookingId: string,
    userId: string,
    maxCapacity: number = 2,
    holdDurationSeconds: number = 600,
    cancellationPolicy: CancellationPolicy = { type: 'FULL_REFUND', cutoffHours: 48 }
  ): Promise<SandboxProviderHoldResult> {
    const holdId = `SANDBOX-HOLD-HTL-${Date.now()}`;
    const expiresAtMs = Date.now() + holdDurationSeconds * 1000;
    const expiresAt = new Date(expiresAtMs).toISOString();

    this.holds.set(holdId, {
      hotelId,
      roomId,
      bookingId,
      userId,
      maxCapacity,
      expiresAtMs,
      cancellationPolicy
    });

    return {
      success: true,
      holdId,
      inventoryId: `${hotelId}:${roomId}`,
      expiresAt,
      simulated: true,
      providerMetadata: sanitizeProviderMetadata(this.providerName, true, { holdId, bookingId }, 15, 0)
    };
  }

  registerHold(
    holdId: string,
    hotelId: string,
    roomId: string,
    bookingId: string,
    userId: string,
    expiresAtMs: number,
    maxCapacity: number = 2,
    cancellationPolicy: CancellationPolicy = { type: 'FULL_REFUND', cutoffHours: 48 }
  ): void {
    this.holds.set(holdId, {
      hotelId,
      roomId,
      bookingId,
      userId,
      expiresAtMs,
      maxCapacity,
      cancellationPolicy
    });
  }

  async confirm(
    bookingId: string,
    holdId: string,
    paymentTransactionId: string,
    partyDetails?: HotelPartyDetails
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
        errorMessage: `Provider hotel hold '${holdId}' has expired.`
      };
    }

    // Capacity check: adults + children <= maxCapacity
    if (partyDetails) {
      const totalParty = (partyDetails.adultsCount || 1) + (partyDetails.childrenCount || 0);
      const capacityPerRoom = hold ? hold.maxCapacity : 2;
      const roomCapacity = capacityPerRoom * (partyDetails.roomCount || 1);
      if (totalParty > roomCapacity) {
        return {
          success: false,
          providerBookingId: '',
          confirmationCode: '',
          confirmedAt: new Date().toISOString(),
          simulated: true,
          providerMetadata: sanitizeProviderMetadata(this.providerName, true, { holdId, bookingId, totalParty, roomCapacity }, 15, 0),
          errorMessage: `Capacity Violation: Selected room accommodates maximum ${roomCapacity} guests, but party size is ${totalParty}.`
        };
      }
    }

    const providerBookingId = `SANDBOX-HTL-${Date.now().toString(36).toUpperCase()}`;
    const confirmationCode = `CONF-HTL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
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
      latencyMs: 15,
      lastChecked: new Date().toISOString(),
      details: 'Deterministic hotel booking sandbox active'
    };
  }

  clear(): void {
    this.holds.clear();
    this.confirmations.clear();
  }
}
