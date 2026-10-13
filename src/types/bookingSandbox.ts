/**
 * AeroDAG Phase 8.5 — Booking & Payment Sandbox Domain Models & Interfaces
 * 
 * Defines authoritative domain models, state machines, inventory holds,
 * cancellation policies, audit records, and provider contracts.
 * 
 * STRICT INVARIANT:
 * All sandbox entities are strictly simulated (simulated: true).
 * No real money, live cards, or actual inventory bookings are ever processed.
 */

import { Currency } from './travelBooking';
import { ProviderMetadata } from '../services/providers/types';
import { TraceContext } from '../services/telemetry/types';

// ============================================================================
// 1. STATE MACHINE TYPES
// ============================================================================

export type BookingState =
  | 'SEARCHED'
  | 'AVAILABLE'
  | 'SELECTED'
  | 'HELD'
  | 'PAYMENT_PROCESSING'
  | 'CONFIRMED'
  | 'SIMULATED'
  | 'EXPIRED'
  | 'UNAVAILABLE'
  | 'HOLD_EXPIRED'
  | 'PAYMENT_FAILED'
  | 'CANCEL_REQUESTED'
  | 'CANCELLED'
  | 'REFUND_PROCESSING'
  | 'REFUNDED'
  | 'REFUND_FAILED'
  | 'FAILED';

export type PaymentState =
  | 'NOT_STARTED'
  | 'AUTHORIZING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'EXPIRED'
  | 'REFUND_PROCESSING'
  | 'REFUNDED'
  | 'REFUND_FAILED';

export type HoldStatus = 'HOLD_ACTIVE' | 'HOLD_EXPIRED' | 'HOLD_RELEASED';

export type CancellationPolicyType =
  | 'FULL_REFUND'
  | 'PARTIAL_REFUND'
  | 'NON_REFUNDABLE'
  | 'UNKNOWN';

// ============================================================================
// 2. DOMAIN MODELS
// ============================================================================

export interface CancellationPolicy {
  type: CancellationPolicyType;
  refundPercentage?: number;
  cutoffHours?: number;
  description?: string;
}

export interface InventoryHold {
  holdId: string;
  bookingId: string;
  userId: string;
  provider: string;
  inventoryId: string;
  createdAt: string;
  expiresAt: string;
  expiresAtMs: number;
  status: HoldStatus;
  simulated: true;
}

export interface Booking {
  bookingId: string;
  userId: string;
  tripId: string;
  bookingType: 'flight' | 'hotel' | 'package';
  provider: string;
  inventoryId: string;
  selectedOption: Record<string, any>;
  currency: string;
  amount: number;
  status: BookingState;
  holdId?: string;
  paymentId?: string;
  paymentTransactionId?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  simulated: true;
  confirmationCode?: string;
  providerBookingId?: string;
  cancellationPolicy: CancellationPolicy;
  auditMetadata: Record<string, any>;
}

export interface PaymentAuthorizationRecord {
  authId: string;
  transactionId: string;
  userId: string;
  orderId: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: PaymentState;
  authCode: string;
  authorizedAt: string;
  expiresAt: string;
  expiresAtMs: number;
  used: boolean;
  simulated: true;
}

export type BookingAuditOperation =
  | 'BOOKING_CREATED'
  | 'HOLD_CREATED'
  | 'HOLD_EXPIRED'
  | 'HOLD_RELEASED'
  | 'PAYMENT_AUTHORIZED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_CAPTURED'
  | 'BOOKING_CONFIRMED'
  | 'CANCELLATION_REQUESTED'
  | 'BOOKING_CANCELLED'
  | 'REFUND_STARTED'
  | 'REFUND_COMPLETED'
  | 'REFUND_FAILED';

export interface BookingAuditEvent {
  eventId: string;
  traceId: string;
  bookingId: string;
  userId: string;
  timestamp: string;
  operation: BookingAuditOperation;
  previousState?: string;
  newState: string;
  result: 'SUCCESS' | 'FAILED' | 'REJECTED';
  details?: Record<string, any>;
}

// ============================================================================
// 3. PROVIDER BOOKING CONTRACTS
// ============================================================================

export interface FlightBookingSelection {
  flightId: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  airline: string;
  price: number;
  currency: string;
  seatsRequested: number;
}

export interface HotelBookingSelection {
  hotelId: string;
  roomId: string;
  name: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  maxCapacity: number;
  adultsCount: number;
  childrenCount: number;
  childrenAges?: number[];
  price: number;
  currency: string;
  cancellationPolicy: CancellationPolicy;
}

export interface SandboxProviderHoldResult {
  success: boolean;
  holdId: string;
  inventoryId: string;
  expiresAt: string;
  simulated: true;
  providerMetadata: ProviderMetadata;
  errorMessage?: string;
}

export interface SandboxProviderConfirmationResult {
  success: boolean;
  providerBookingId: string;
  confirmationCode: string;
  confirmedAt: string;
  simulated: true;
  providerMetadata: ProviderMetadata;
  errorMessage?: string;
}

export interface SandboxProviderCancellationResult {
  success: boolean;
  cancelledAt: string;
  refundEligible: boolean;
  simulated: true;
  providerMetadata: ProviderMetadata;
  errorMessage?: string;
}
