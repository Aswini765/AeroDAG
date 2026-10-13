/**
 * AeroDAG Phase 11.2 — Database Persistence & Schema Types
 * 
 * Defines schema definitions, constraint rules, and database interfaces:
 * - Users & Approved Preferences
 * - Trips & Itineraries
 * - Booking Records & State Transitions
 * - Inventory Holds & Locks
 * - Payment Sandbox Authorizations
 * - Audit Trail Events
 * - Idempotency Keys
 */

export interface DbUser {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN' | 'SYSTEM';
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbUserPreference {
  id: string;
  userId: string;
  tenantId: string;
  preferenceKey: string;
  preferenceValue: string;
  consentLevel: 'EXPLICIT_USER_APPROVED' | 'USER_CONFIGURED' | 'SYSTEM_DEFAULT';
  updatedAt: string;
}

export interface DbTrip {
  id: string;
  userId: string;
  tenantId: string;
  destination: string;
  durationDays: number;
  budgetTotalINR: number;
  planJson: string; // Serialized TripPlan
  status: 'DRAFT' | 'CONFIRMED' | 'COMPLETED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface DbBooking {
  id: string;
  bookingId: string;
  userId: string;
  tenantId: string;
  tripId: string;
  bookingType: 'flight' | 'hotel' | 'package';
  provider: string;
  inventoryId: string;
  amount: number;
  currency: string;
  status: string; // BookingState
  paymentTransactionId?: string;
  confirmationCode?: string;
  providerBookingId?: string;
  cancellationPolicyJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbInventoryHold {
  id: string;
  holdId: string;
  bookingId: string;
  userId: string;
  tenantId: string;
  inventoryId: string;
  status: 'HOLD_ACTIVE' | 'HOLD_RELEASED' | 'HOLD_EXPIRED';
  expiresAtMs: number;
  createdAt: string;
}

export interface DbPaymentAuthorization {
  id: string;
  transactionId: string;
  bookingId: string;
  userId: string;
  tenantId: string;
  amount: number;
  currency: string;
  status: 'AUTHORIZED' | 'CAPTURED' | 'REFUNDED' | 'VOIDED';
  paymentMethod: string;
  authorizedAt: string;
  expiresAtMs: number;
}

export interface DbAuditEvent {
  id: string;
  traceId: string;
  bookingId: string;
  userId: string;
  tenantId: string;
  operation: string;
  previousState?: string;
  newState?: string;
  result: 'SUCCESS' | 'FAILED' | 'REJECTED';
  detailsJson: string;
  createdAt: string;
}

export interface DbIdempotencyRecord {
  idempotencyKey: string;
  resourceId: string;
  operation: string;
  status: 'STARTED' | 'COMPLETED' | 'FAILED';
  responsePayloadJson?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseMigration {
  version: number;
  name: string;
  appliedAt: string;
}
