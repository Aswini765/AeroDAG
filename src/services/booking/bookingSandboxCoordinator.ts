/**
 * AeroDAG Phase 8.5 — Authoritative Booking & Payment Sandbox Coordinator
 * 
 * Centralized coordinator managing the complete sandbox lifecycle:
 * SEARCHED -> AVAILABLE -> SELECTED -> HELD -> PAYMENT_PROCESSING -> CONFIRMED
 * Failure & Refund paths:
 * HOLD_EXPIRED, PAYMENT_FAILED, CANCEL_REQUESTED, CANCELLED, REFUND_PROCESSING, REFUNDED, REFUND_FAILED.
 * 
 * STRICT INVARIANTS:
 * 1. Backend state machine is authoritative.
 * 2. Exact amount and currency validation (never trust client amounts/discounts).
 * 3. 11-condition booking confirmation gate.
 * 4. Expired or released inventory holds strictly block confirmation.
 * 5. Full RBAC: Cross-user booking and hold operations are blocked.
 * 6. Idempotency protection prevents duplicate holds, charges, bookings, and refunds.
 * 7. Compensation / rollback flow for partial failures.
 * 8. Comprehensive audit trail and telemetry without logging secrets or PANs.
 * 9. All entities unambiguously labeled simulated: true.
 */

import {
  Booking,
  BookingState,
  InventoryHold,
  PaymentAuthorizationRecord,
  BookingAuditEvent,
  BookingAuditOperation,
  CancellationPolicy
} from '../../types/bookingSandbox';
import { BookingStateMachine, PaymentStateMachine, IllegalStateTransitionError } from './stateMachine';
import {
  PaymentAmountMismatchError,
  PaymentCurrencyMismatchError,
  InventoryHoldExpiredError,
  CapacityExceededError,
  CancellationReviewRequiredError
} from './errors';
import { getTelemetryTracer } from '../telemetry';
import { getFailureInjector } from '../reliability/failureInjector';
import { getProviderRegistry, PaymentProvider } from '../providers';
import { MockFlightBookingProvider } from '../providers/mockFlightBookingProvider';
import { MockHotelBookingProvider, HotelPartyDetails } from '../providers/mockHotelBookingProvider';
import { MockPaymentProvider } from '../providers/mockPaymentProvider';
import { AuthorizationError } from '../security';
import { IdempotencyRecord } from '../reliability/types';

export interface CreateBookingParams {
  userId: string;
  tripId: string;
  bookingType: 'flight' | 'hotel' | 'package';
  provider: string;
  inventoryId: string;
  selectedOption: Record<string, any>;
  amount: number;
  currency: string;
  cancellationPolicy?: CancellationPolicy;
  traceId?: string;
}

export interface CreateHoldParams {
  bookingId: string;
  userId: string;
  holdDurationSeconds?: number;
  idempotencyKey: string;
  traceId?: string;
}

export interface AuthorizePaymentParams {
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  idempotencyKey: string;
  traceId?: string;
}

export interface ConfirmBookingParams {
  bookingId: string;
  userId: string;
  holdId: string;
  paymentTransactionId: string;
  idempotencyKey: string;
  partyDetails?: HotelPartyDetails;
  traceId?: string;
}

export interface CancelBookingParams {
  bookingId: string;
  userId: string;
  reason?: string;
  idempotencyKey: string;
  traceId?: string;
}

export class BookingSandboxCoordinator {
  private static instance: BookingSandboxCoordinator | null = null;

  private bookings = new Map<string, Booking>();
  private holds = new Map<string, InventoryHold>();
  private activeInventoryLocks = new Set<string>();
  private authorizations = new Map<string, PaymentAuthorizationRecord>();
  private auditEvents: BookingAuditEvent[] = [];
  private idempotencyStore = new Map<string, IdempotencyRecord>();
  private executionLocks = new Set<string>();

  private readonly flightBookingProvider = new MockFlightBookingProvider();
  private readonly hotelBookingProvider = new MockHotelBookingProvider();

  private constructor() {}

  static getInstance(): BookingSandboxCoordinator {
    if (!BookingSandboxCoordinator.instance) {
      BookingSandboxCoordinator.instance = new BookingSandboxCoordinator();
    }
    return BookingSandboxCoordinator.instance;
  }

  /**
   * Resets internal sandbox state (for test isolation)
   */
  clear(): void {
    this.bookings.clear();
    this.holds.clear();
    this.activeInventoryLocks.clear();
    this.authorizations.clear();
    this.auditEvents = [];
    this.idempotencyStore.clear();
    this.executionLocks.clear();
    this.flightBookingProvider.clear();
    this.hotelBookingProvider.clear();
  }

  // ============================================================================
  // 1. BOOKING CREATION & SELECTION
  // ============================================================================

  async createBooking(params: CreateBookingParams): Promise<Booking> {
    const tracer = getTelemetryTracer();
    const span = params.traceId
      ? tracer.startSpan('booking_create', 'booking', { traceId: params.traceId, spanId: '' }, {
          userId: params.userId,
          inventoryId: params.inventoryId,
          amount: params.amount
        })
      : null;

    const bookingId = `SANDBOX-BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    const booking: Booking = {
      bookingId,
      userId: params.userId,
      tripId: params.tripId,
      bookingType: params.bookingType,
      provider: params.provider,
      inventoryId: params.inventoryId,
      selectedOption: params.selectedOption,
      currency: (params.currency || 'INR').toUpperCase(),
      amount: params.amount,
      status: 'SELECTED',
      cancellationPolicy: params.cancellationPolicy || { type: 'FULL_REFUND', cutoffHours: 24 },
      createdAt: now,
      updatedAt: now,
      simulated: true,
      auditMetadata: {
        serverCalculatedAmount: params.amount,
        serverCalculatedCurrency: (params.currency || 'INR').toUpperCase()
      }
    };

    this.bookings.set(bookingId, booking);
    this.recordAudit({
      traceId: params.traceId || 'trace-init',
      bookingId,
      userId: params.userId,
      operation: 'BOOKING_CREATED',
      newState: 'SELECTED',
      result: 'SUCCESS',
      details: { amount: booking.amount, currency: booking.currency }
    });

    if (span) {
      tracer.endSpan(span.spanId, 'SUCCESS', { bookingId, status: 'SELECTED' });
    }

    return booking;
  }

  // ============================================================================
  // 2. INVENTORY HOLD CREATION & VERIFICATION
  // ============================================================================

  async createHold(params: CreateHoldParams): Promise<InventoryHold> {
    const tracer = getTelemetryTracer();
    const injector = getFailureInjector();
    const span = params.traceId
      ? tracer.startSpan('booking_hold_create', 'booking', { traceId: params.traceId, spanId: '' }, {
          bookingId: params.bookingId,
          userId: params.userId
        })
      : null;

    // 1. Idempotency Check
    const existing = this.idempotencyStore.get(params.idempotencyKey);
    if (existing && existing.status === 'COMPLETED' && existing.responsePayload) {
      if (span) {
        tracer.endSpan(span.spanId, 'SUCCESS', { idempotentReplay: true });
      }
      return existing.responsePayload as InventoryHold;
    }

    // 2. Failure Injection check
    if (injector.isEnabled() && injector.shouldFail('BOOKING', 'hold')) {
      await injector.inject('BOOKING', 'hold', params.traceId);
    }

    const booking = this.bookings.get(params.bookingId);
    if (!booking) {
      throw new Error(`Booking '${params.bookingId}' not found.`);
    }

    // 3. User Ownership Validation (Phase 7.4 RBAC)
    if (booking.userId !== params.userId) {
      throw new AuthorizationError('ACCESS_BOOKING', `User '${params.userId}' does not own booking '${params.bookingId}'.`);
    }

    // 4. Assert State Transition (SELECTED -> HELD)
    BookingStateMachine.assertValidTransition(booking.status, 'HELD');

    // 5. Concurrency Check: Check inventory lock
    if (this.activeInventoryLocks.has(booking.inventoryId)) {
      throw new Error(`INVENTORY_CONFLICT: Inventory '${booking.inventoryId}' is currently held by another transaction.`);
    }

    const durationSeconds = params.holdDurationSeconds || 600; // 10 minutes default TTL
    const now = Date.now();
    const expiresAtMs = now + durationSeconds * 1000;
    const holdId = `SANDBOX-HOLD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const hold: InventoryHold = {
      holdId,
      bookingId: params.bookingId,
      userId: params.userId,
      provider: booking.provider,
      inventoryId: booking.inventoryId,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(expiresAtMs).toISOString(),
      expiresAtMs,
      status: 'HOLD_ACTIVE',
      simulated: true
    };

    this.holds.set(holdId, hold);
    this.activeInventoryLocks.add(booking.inventoryId);

    // Update booking state
    booking.status = 'HELD';
    booking.holdId = holdId;
    booking.expiresAt = hold.expiresAt;
    booking.updatedAt = new Date().toISOString();

    // Idempotency registration
    this.idempotencyStore.set(params.idempotencyKey, {
      idempotencyKey: params.idempotencyKey,
      resourceId: holdId,
      operation: 'CREATE_HOLD',
      status: 'COMPLETED',
      responsePayload: hold,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    this.recordAudit({
      traceId: params.traceId || 'trace-hold',
      bookingId: params.bookingId,
      userId: params.userId,
      operation: 'HOLD_CREATED',
      previousState: 'SELECTED',
      newState: 'HELD',
      result: 'SUCCESS',
      details: { holdId, expiresAt: hold.expiresAt }
    });

    if (span) {
      tracer.endSpan(span.spanId, 'SUCCESS', { holdId, status: 'HELD' });
    }

    return hold;
  }

  /**
   * Deterministically verifies an inventory hold
   */
  verifyHold(holdId: string, userId: string, bookingId: string): { valid: boolean; error?: string; hold?: InventoryHold } {
    const hold = this.holds.get(holdId);
    if (!hold) {
      return { valid: false, error: 'HOLD_NOT_FOUND' };
    }

    // Ownership check
    if (hold.userId !== userId || hold.bookingId !== bookingId) {
      return { valid: false, error: 'HOLD_OWNERSHIP_MISMATCH' };
    }

    // Status check
    if (hold.status === 'HOLD_RELEASED') {
      return { valid: false, error: 'HOLD_RELEASED' };
    }

    // Expiration check
    if (Date.now() >= hold.expiresAtMs || hold.status === 'HOLD_EXPIRED') {
      if (hold.status !== 'HOLD_EXPIRED') {
        hold.status = 'HOLD_EXPIRED';
        this.activeInventoryLocks.delete(hold.inventoryId);
        const b = this.bookings.get(bookingId);
        if (b && b.status === 'HELD') {
          b.status = 'HOLD_EXPIRED';
          b.updatedAt = new Date().toISOString();
        }
        this.recordAudit({
          traceId: 'trace-expired',
          bookingId,
          userId,
          operation: 'HOLD_EXPIRED',
          newState: 'HOLD_EXPIRED',
          result: 'SUCCESS'
        });
      }
      return { valid: false, error: 'INVENTORY_HOLD_EXPIRED' };
    }

    return { valid: true, hold };
  }

  // ============================================================================
  // 3. PAYMENT AUTHORIZATION & EXACT AMOUNT VALIDATION
  // ============================================================================

  async authorizePayment(params: AuthorizePaymentParams): Promise<PaymentAuthorizationRecord> {
    const tracer = getTelemetryTracer();
    const injector = getFailureInjector();
    const span = params.traceId
      ? tracer.startSpan('payment_authorize', 'payment', { traceId: params.traceId, spanId: '' }, {
          bookingId: params.bookingId,
          userId: params.userId,
          amount: params.amount
        })
      : null;

    // 1. Idempotency Check
    const existing = this.idempotencyStore.get(params.idempotencyKey);
    if (existing && existing.status === 'COMPLETED' && existing.responsePayload) {
      if (span) {
        tracer.endSpan(span.spanId, 'SUCCESS', { idempotentReplay: true });
      }
      return existing.responsePayload as PaymentAuthorizationRecord;
    }

    const booking = this.bookings.get(params.bookingId);
    if (!booking) {
      throw new Error(`Booking '${params.bookingId}' not found.`);
    }

    // 2. Ownership Check
    if (booking.userId !== params.userId) {
      throw new AuthorizationError('ACCESS_BOOKING', `User '${params.userId}' does not own booking '${params.bookingId}'.`);
    }

    // 3. Hold Verification
    if (!booking.holdId) {
      throw new Error('Cannot authorize payment: No inventory hold exists on booking.');
    }
    const holdCheck = this.verifyHold(booking.holdId, params.userId, params.bookingId);
    if (!holdCheck.valid) {
      throw new InventoryHoldExpiredError(booking.holdId);
    }

    // 4. Server-Authoritative Exact Amount & Currency Validation
    if (params.amount !== booking.amount) {
      this.recordAudit({
        traceId: params.traceId || 'trace-auth',
        bookingId: params.bookingId,
        userId: params.userId,
        operation: 'PAYMENT_FAILED',
        newState: booking.status,
        result: 'REJECTED',
        details: { expected: booking.amount, received: params.amount }
      });
      throw new PaymentAmountMismatchError(booking.amount, params.amount, booking.currency);
    }

    if (params.currency.toUpperCase() !== booking.currency.toUpperCase()) {
      this.recordAudit({
        traceId: params.traceId || 'trace-auth',
        bookingId: params.bookingId,
        userId: params.userId,
        operation: 'PAYMENT_FAILED',
        newState: booking.status,
        result: 'REJECTED',
        details: { expected: booking.currency, received: params.currency }
      });
      throw new PaymentCurrencyMismatchError(booking.currency, params.currency);
    }

    // 5. Failure Injection Check
    if (injector.isEnabled()) {
      if (injector.shouldFail('PAYMENT', 'decline')) {
        booking.status = 'PAYMENT_FAILED';
        booking.updatedAt = new Date().toISOString();
        this.recordAudit({
          traceId: params.traceId || 'trace-auth',
          bookingId: params.bookingId,
          userId: params.userId,
          operation: 'PAYMENT_FAILED',
          newState: 'PAYMENT_FAILED',
          result: 'FAILED',
          details: { reason: 'Injected authorization decline' }
        });
        throw new Error('Payment authorization declined: card declined / insufficient funds');
      }
      if (injector.shouldFail('PAYMENT', 'timeout')) {
        await injector.inject('PAYMENT', 'timeout', params.traceId);
      }
    }

    // 6. Invoke PaymentProvider
    const paymentProvider = getProviderRegistry().resolveProvider<PaymentProvider>('payment');
    const authRes = await paymentProvider.authorizePayment({
      orderId: params.bookingId,
      amount: params.amount,
      currency: params.currency,
      idempotencyKey: params.idempotencyKey,
      paymentMethod: params.paymentMethod,
      customerRef: params.userId,
      metadata: { bookingId: params.bookingId, userId: params.userId }
    });

    if (!authRes.success || authRes.status === 'DECLINED') {
      booking.status = 'PAYMENT_FAILED';
      booking.updatedAt = new Date().toISOString();
      this.recordAudit({
        traceId: params.traceId || 'trace-auth',
        bookingId: params.bookingId,
        userId: params.userId,
        operation: 'PAYMENT_FAILED',
        newState: 'PAYMENT_FAILED',
        result: 'FAILED',
        details: { error: authRes.errorMessage }
      });
      throw new Error(authRes.errorMessage || 'Payment authorization declined');
    }

    // 7. Transition state: HELD -> PAYMENT_PROCESSING
    BookingStateMachine.assertValidTransition(booking.status, 'PAYMENT_PROCESSING');
    booking.status = 'PAYMENT_PROCESSING';
    booking.paymentTransactionId = authRes.transactionId;
    booking.updatedAt = new Date().toISOString();

    const authRecord: PaymentAuthorizationRecord = {
      authId: `AUTH-${Date.now()}`,
      transactionId: authRes.transactionId,
      userId: params.userId,
      orderId: params.bookingId,
      bookingId: params.bookingId,
      amount: params.amount,
      currency: params.currency.toUpperCase(),
      status: 'AUTHORIZED',
      authCode: authRes.authCode || `AUTH-SANDBOX-${Date.now()}`,
      authorizedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 600 * 1000).toISOString(),
      expiresAtMs: Date.now() + 600 * 1000,
      used: false,
      simulated: true
    };

    this.authorizations.set(authRes.transactionId, authRecord);

    this.idempotencyStore.set(params.idempotencyKey, {
      idempotencyKey: params.idempotencyKey,
      resourceId: authRes.transactionId,
      operation: 'AUTHORIZE_PAYMENT',
      status: 'COMPLETED',
      responsePayload: authRecord,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    this.recordAudit({
      traceId: params.traceId || 'trace-auth',
      bookingId: params.bookingId,
      userId: params.userId,
      operation: 'PAYMENT_AUTHORIZED',
      previousState: 'HELD',
      newState: 'PAYMENT_PROCESSING',
      result: 'SUCCESS',
      details: { transactionId: authRes.transactionId, amount: params.amount }
    });

    if (span) {
      tracer.endSpan(span.spanId, 'SUCCESS', { transactionId: authRes.transactionId });
    }

    return authRecord;
  }

  // ============================================================================
  // 4. CONFIRM BOOKING (11-CONDITION AUTHORITATIVE GATE)
  // ============================================================================

  async confirmBooking(params: ConfirmBookingParams): Promise<{
    success: boolean;
    booking: Booking;
    confirmationCode: string;
    providerBookingId: string;
    error?: string;
    idempotentReplay?: boolean;
  }> {
    const tracer = getTelemetryTracer();
    const injector = getFailureInjector();
    const span = params.traceId
      ? tracer.startSpan('booking_confirm', 'booking', { traceId: params.traceId, spanId: '' }, {
          bookingId: params.bookingId,
          holdId: params.holdId,
          userId: params.userId
        })
      : null;

    // Concurrency Lock on bookingId
    if (this.executionLocks.has(params.bookingId)) {
      throw new Error(`CONCURRENT_MUTATION: Booking '${params.bookingId}' is currently being confirmed by another concurrent process.`);
    }
    this.executionLocks.add(params.bookingId);

    try {
      // 1. Idempotency Check
      const existing = this.idempotencyStore.get(params.idempotencyKey);
      if (existing && existing.status === 'COMPLETED' && existing.responsePayload) {
        if (span) tracer.endSpan(span.spanId, 'SUCCESS', { idempotentReplay: true });
        return {
          ...(existing.responsePayload as any),
          idempotentReplay: true
        };
      }

      // 2. Authenticated user & booking lookup
      if (!params.userId || typeof params.userId !== 'string') {
        throw new Error('Authentication required for booking confirmation.');
      }
      const booking = this.bookings.get(params.bookingId);
      if (!booking) {
        throw new Error(`Booking '${params.bookingId}' not found.`);
      }

      // 3. User Ownership Validation
      if (booking.userId !== params.userId) {
        throw new AuthorizationError('ACCESS_BOOKING', `User '${params.userId}' does not have permission to confirm booking '${params.bookingId}'.`);
      }

      // 4. Valid Inventory Hold & Not Expired
      const holdCheck = this.verifyHold(params.holdId, params.userId, params.bookingId);
      if (!holdCheck.valid) {
        throw new InventoryHoldExpiredError(params.holdId);
      }

      // 5. Payment Authorization Validation
      const auth = this.authorizations.get(params.paymentTransactionId);
      if (!auth) {
        throw new Error(`Payment authorization '${params.paymentTransactionId}' not found.`);
      }
      if (auth.status === 'EXPIRED' || Date.now() > auth.expiresAtMs) {
        auth.status = 'EXPIRED';
        throw new Error('Payment authorization has expired.');
      }
      if (auth.status !== 'AUTHORIZED') {
        throw new Error(`Invalid payment authorization status '${auth.status}'. Must be AUTHORIZED.`);
      }
      if (auth.used) {
        throw new Error('Payment authorization has already been consumed.');
      }

      // 6. Payment Authorization Context Validation
      if (auth.bookingId !== params.bookingId) {
        throw new Error(`Payment authorization belongs to booking '${auth.bookingId}', not '${params.bookingId}'.`);
      }
      if (auth.userId !== params.userId) {
        throw new AuthorizationError('ACCESS_BOOKING', `Payment authorization belongs to user '${auth.userId}', not '${params.userId}'.`);
      }
      if (auth.amount !== booking.amount) {
        throw new PaymentAmountMismatchError(booking.amount, auth.amount, booking.currency);
      }
      if (auth.currency !== booking.currency) {
        throw new PaymentCurrencyMismatchError(booking.currency, auth.currency);
      }

      // 7. Hotel Capacity Constraint Check (Section 8)
      if (booking.bookingType === 'hotel' && params.partyDetails) {
        const roomCapacity = (booking.selectedOption?.maxCapacity || 2) * (params.partyDetails.roomCount || 1);
        const totalGuests = (params.partyDetails.adultsCount || 1) + (params.partyDetails.childrenCount || 0);
        if (totalGuests > roomCapacity) {
          throw new CapacityExceededError(roomCapacity, totalGuests);
        }
      }

      // 8. Capture Payment via PaymentProvider
      const paymentProvider = getProviderRegistry().resolveProvider<PaymentProvider>('payment');
      const captureRes = await paymentProvider.capturePayment({
        transactionId: params.paymentTransactionId,
        orderId: params.bookingId,
        amount: auth.amount,
        currency: auth.currency,
        idempotencyKey: `cap-${params.idempotencyKey}`
      });

      if (!captureRes.success || captureRes.status !== 'CAPTURED') {
        throw new Error(captureRes.errorMessage || 'Payment capture failed.');
      }

      auth.status = 'CAPTURED';
      auth.used = true;
      this.recordAudit({
        traceId: params.traceId || 'trace-confirm',
        bookingId: params.bookingId,
        userId: params.userId,
        operation: 'PAYMENT_CAPTURED',
        newState: 'CAPTURED',
        result: 'SUCCESS',
        details: { transactionId: params.paymentTransactionId, amount: auth.amount }
      });

      // 9. Failure Injection Check on Provider Confirmation
      let providerFailed = false;
      if (injector.isEnabled() && injector.shouldFail('BOOKING', 'confirm')) {
        providerFailed = true;
      }

      // 10. Provider Confirmation Call
      let providerBookingId = '';
      let confirmationCode = '';

      if (!providerFailed) {
        if (booking.bookingType === 'flight') {
          const pRes = await this.flightBookingProvider.confirm(params.bookingId, params.holdId, params.paymentTransactionId);
          if (!pRes.success) providerFailed = true;
          else {
            providerBookingId = pRes.providerBookingId;
            confirmationCode = pRes.confirmationCode;
          }
        } else if (booking.bookingType === 'hotel') {
          const pRes = await this.hotelBookingProvider.confirm(params.bookingId, params.holdId, params.paymentTransactionId, params.partyDetails);
          if (!pRes.success) providerFailed = true;
          else {
            providerBookingId = pRes.providerBookingId;
            confirmationCode = pRes.confirmationCode;
          }
        } else {
          providerBookingId = `SANDBOX-PKG-${Date.now().toString(36).toUpperCase()}`;
          confirmationCode = `CONF-PKG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        }
      }

      // =======================================================================
      // PARTIAL FAILURE & COMPENSATION HANDLING (Section 19 & 20)
      // =======================================================================
      if (providerFailed) {
        // Payment was captured, but provider confirmation failed!
        // DO NOT claim CONFIRMED! Initiate compensation flow!
        booking.status = 'FAILED';
        booking.updatedAt = new Date().toISOString();

        this.recordAudit({
          traceId: params.traceId || 'trace-confirm',
          bookingId: params.bookingId,
          userId: params.userId,
          operation: 'REFUND_STARTED',
          newState: 'FAILED',
          result: 'FAILED',
          details: { reason: 'Provider confirmation failed after payment capture. Compensation refund initiated.' }
        });

        // Trigger compensation refund
        const refundRes = await paymentProvider.refundPayment({
          transactionId: params.paymentTransactionId,
          orderId: params.bookingId,
          amount: auth.amount,
          reason: 'Booking confirmation failure compensation'
        });

        if (refundRes.success && refundRes.status === 'REFUNDED') {
          auth.status = 'REFUNDED';
          booking.status = 'REFUNDED';
          this.recordAudit({
            traceId: params.traceId || 'trace-confirm',
            bookingId: params.bookingId,
            userId: params.userId,
            operation: 'REFUND_COMPLETED',
            newState: 'REFUNDED',
            result: 'SUCCESS',
            details: { refundId: refundRes.refundId, amountRefunded: refundRes.amountRefunded }
          });
          throw new Error('Provider confirmation failed. Compensation refund was successfully processed.');
        } else {
          booking.status = 'REFUND_FAILED';
          this.recordAudit({
            traceId: params.traceId || 'trace-confirm',
            bookingId: params.bookingId,
            userId: params.userId,
            operation: 'REFUND_FAILED',
            newState: 'REFUND_FAILED',
            result: 'FAILED',
            details: { reason: 'Compensation refund failed. Manual operator recovery required (RECOVERY_REQUIRED).' }
          });
          throw new Error('Provider confirmation failed AND compensation refund failed. RECOVERY_REQUIRED.');
        }
      }

      // 11. Final Success Transition: PAYMENT_PROCESSING -> CONFIRMED
      BookingStateMachine.assertValidTransition(booking.status, 'CONFIRMED');
      booking.status = 'CONFIRMED';
      booking.confirmationCode = confirmationCode;
      booking.providerBookingId = providerBookingId;
      booking.updatedAt = new Date().toISOString();

      // Release hold (consumed)
      const hold = this.holds.get(params.holdId);
      if (hold) {
        hold.status = 'HOLD_RELEASED';
        this.activeInventoryLocks.delete(hold.inventoryId);
      }

      const responsePayload = {
        success: true,
        booking,
        confirmationCode,
        providerBookingId
      };

      // Register Idempotency
      this.idempotencyStore.set(params.idempotencyKey, {
        idempotencyKey: params.idempotencyKey,
        resourceId: params.bookingId,
        operation: 'CONFIRM_BOOKING',
        status: 'COMPLETED',
        responsePayload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      this.recordAudit({
        traceId: params.traceId || 'trace-confirm',
        bookingId: params.bookingId,
        userId: params.userId,
        operation: 'BOOKING_CONFIRMED',
        previousState: 'PAYMENT_PROCESSING',
        newState: 'CONFIRMED',
        result: 'SUCCESS',
        details: { confirmationCode, providerBookingId }
      });

      if (span) {
        tracer.endSpan(span.spanId, 'SUCCESS', { confirmationCode, providerBookingId });
      }

      return responsePayload;
    } finally {
      this.executionLocks.delete(params.bookingId);
    }
  }

  // ============================================================================
  // 5. CANCELLATION & REFUNDS
  // ============================================================================

  async cancelBooking(params: CancelBookingParams): Promise<{
    success: boolean;
    booking: Booking;
    refundAmount: number;
    error?: string;
    idempotentReplay?: boolean;
  }> {
    const tracer = getTelemetryTracer();
    const span = params.traceId
      ? tracer.startSpan('booking_cancel', 'booking', { traceId: params.traceId, spanId: '' }, {
          bookingId: params.bookingId,
          userId: params.userId
        })
      : null;

    // 1. Idempotency Check
    const existing = this.idempotencyStore.get(params.idempotencyKey);
    if (existing && existing.status === 'COMPLETED' && existing.responsePayload) {
      if (span) tracer.endSpan(span.spanId, 'SUCCESS', { idempotentReplay: true });
      return {
        ...(existing.responsePayload as any),
        idempotentReplay: true
      };
    }

    const booking = this.bookings.get(params.bookingId);
    if (!booking) {
      throw new Error(`Booking '${params.bookingId}' not found.`);
    }

    // 2. Ownership Check
    if (booking.userId !== params.userId) {
      throw new AuthorizationError('ACCESS_BOOKING', `User '${params.userId}' does not own booking '${params.bookingId}'.`);
    }

    // 3. State Check: Must be CONFIRMED
    if (booking.status !== 'CONFIRMED') {
      throw new IllegalStateTransitionError('BOOKING', booking.status, 'CANCEL_REQUESTED');
    }

    // 4. Policy Evaluation (Section 22)
    const policy = booking.cancellationPolicy;
    if (policy.type === 'UNKNOWN') {
      throw new CancellationReviewRequiredError(params.bookingId);
    }

    let refundAmount = 0;
    if (policy.type === 'FULL_REFUND') {
      refundAmount = booking.amount;
    } else if (policy.type === 'PARTIAL_REFUND') {
      const pct = policy.refundPercentage ?? 50;
      refundAmount = Math.round((booking.amount * pct) / 100);
    } else if (policy.type === 'NON_REFUNDABLE') {
      refundAmount = 0;
    }

    // Transition: CONFIRMED -> CANCEL_REQUESTED -> CANCELLED
    BookingStateMachine.assertValidTransition(booking.status, 'CANCEL_REQUESTED');
    booking.status = 'CANCEL_REQUESTED';
    this.recordAudit({
      traceId: params.traceId || 'trace-cancel',
      bookingId: params.bookingId,
      userId: params.userId,
      operation: 'CANCELLATION_REQUESTED',
      previousState: 'CONFIRMED',
      newState: 'CANCEL_REQUESTED',
      result: 'SUCCESS'
    });

    BookingStateMachine.assertValidTransition(booking.status, 'CANCELLED');
    booking.status = 'CANCELLED';
    this.recordAudit({
      traceId: params.traceId || 'trace-cancel',
      bookingId: params.bookingId,
      userId: params.userId,
      operation: 'BOOKING_CANCELLED',
      previousState: 'CANCEL_REQUESTED',
      newState: 'CANCELLED',
      result: 'SUCCESS',
      details: { refundAmount, policyType: policy.type }
    });

    // 5. Execute Refund if refundAmount > 0 and transaction exists
    if (refundAmount > 0 && booking.paymentTransactionId) {
      BookingStateMachine.assertValidTransition(booking.status, 'REFUND_PROCESSING');
      booking.status = 'REFUND_PROCESSING';
      this.recordAudit({
        traceId: params.traceId || 'trace-cancel',
        bookingId: params.bookingId,
        userId: params.userId,
        operation: 'REFUND_STARTED',
        previousState: 'CANCELLED',
        newState: 'REFUND_PROCESSING',
        result: 'SUCCESS',
        details: { refundAmount }
      });

      const paymentProvider = getProviderRegistry().resolveProvider<PaymentProvider>('payment');
      const refundRes = await paymentProvider.refundPayment({
        transactionId: booking.paymentTransactionId,
        orderId: booking.bookingId,
        amount: refundAmount,
        reason: params.reason || 'User cancellation'
      });

      if (refundRes.success && refundRes.status === 'REFUNDED') {
        BookingStateMachine.assertValidTransition(booking.status, 'REFUNDED');
        booking.status = 'REFUNDED';
        booking.updatedAt = new Date().toISOString();

        this.recordAudit({
          traceId: params.traceId || 'trace-cancel',
          bookingId: params.bookingId,
          userId: params.userId,
          operation: 'REFUND_COMPLETED',
          previousState: 'REFUND_PROCESSING',
          newState: 'REFUNDED',
          result: 'SUCCESS',
          details: { refundId: refundRes.refundId, amountRefunded: refundRes.amountRefunded }
        });
      } else {
        BookingStateMachine.assertValidTransition(booking.status, 'REFUND_FAILED');
        booking.status = 'REFUND_FAILED';
        booking.updatedAt = new Date().toISOString();

        this.recordAudit({
          traceId: params.traceId || 'trace-cancel',
          bookingId: params.bookingId,
          userId: params.userId,
          operation: 'REFUND_FAILED',
          previousState: 'REFUND_PROCESSING',
          newState: 'REFUND_FAILED',
          result: 'FAILED',
          details: { error: refundRes.errorMessage }
        });

        throw new Error(`Refund execution failed: ${refundRes.errorMessage || 'Gateway error'}`);
      }
    } else {
      // Non-refundable or zero charge: transition CANCELLED -> REFUNDED
      BookingStateMachine.assertValidTransition(booking.status, 'REFUNDED');
      booking.status = 'REFUNDED';
      booking.updatedAt = new Date().toISOString();
    }

    const responsePayload = {
      success: true,
      booking,
      refundAmount
    };

    this.idempotencyStore.set(params.idempotencyKey, {
      idempotencyKey: params.idempotencyKey,
      resourceId: params.bookingId,
      operation: 'CANCEL_BOOKING',
      status: 'COMPLETED',
      responsePayload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    if (span) {
      tracer.endSpan(span.spanId, 'SUCCESS', { bookingState: booking.status, refundAmount });
    }

    return responsePayload;
  }

  // ============================================================================
  // 6. QUERY & AUDIT HELPERS
  // ============================================================================

  getBooking(bookingId: string): Booking | undefined {
    return this.bookings.get(bookingId);
  }

  getHold(holdId: string): InventoryHold | undefined {
    return this.holds.get(holdId);
  }

  getAuthorization(transactionId: string): PaymentAuthorizationRecord | undefined {
    return this.authorizations.get(transactionId);
  }

  getAuditEvents(bookingId?: string): BookingAuditEvent[] {
    if (!bookingId) return [...this.auditEvents];
    return this.auditEvents.filter((e) => e.bookingId === bookingId);
  }

  private recordAudit(event: Omit<BookingAuditEvent, 'eventId' | 'timestamp'>): void {
    this.auditEvents.push({
      eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      ...event
    });
  }
}

export function getBookingSandboxCoordinator(): BookingSandboxCoordinator {
  return BookingSandboxCoordinator.getInstance();
}
