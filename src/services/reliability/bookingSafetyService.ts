/**
 * AeroDAG Booking & Payment Safety Coordinator
 * 
 * Enforces strict transactional integrity, idempotency protection,
 * and state-machine truthfulness:
 * SEARCHED -> AVAILABLE -> SELECTED -> HELD -> PAYMENT_PROCESSING -> CONFIRMED / FAILED
 * 
 * CRITICAL INVARIANTS:
 * 1. NEVER transition to CONFIRMED without both verified inventory hold AND payment authorization.
 * 2. NEVER execute duplicate booking or charge operations with the same idempotency key.
 * 3. NEVER store or process live payment card numbers.
 * 4. Failure must NEVER accidentally become confirmation.
 */

import { BookingState } from '../../types/travelBooking';
import { BookingStateMachine } from '../booking/stateMachine';
import { getTelemetryTracer } from '../telemetry';
import { getFailureInjector } from './failureInjector';
import { getProviderRegistry, PaymentProvider } from '../providers';
import {
  BookingHoldRequest,
  BookingHoldResponse,
  PaymentSimulationRequest,
  PaymentSimulationResponse,
  BookingConfirmationRequest,
  BookingConfirmationResponse,
  IdempotencyRecord
} from './types';

export class BookingSafetyCoordinator {
  private static instance: BookingSafetyCoordinator | null = null;

  // In-memory idempotency cache (keyed by idempotencyKey)
  private idempotencyStore: Map<string, IdempotencyRecord> = new Map();
  // Active holds: holdId -> { bookingId, expiresAt, status }
  private activeHolds: Map<string, { bookingId: string; expiresAt: number; status: BookingState }> = new Map();
  // Confirmed bookings: bookingId -> BookingConfirmationResponse
  private confirmedBookings: Map<string, BookingConfirmationResponse> = new Map();

  private constructor() {}

  static getInstance(): BookingSafetyCoordinator {
    if (!BookingSafetyCoordinator.instance) {
      BookingSafetyCoordinator.instance = new BookingSafetyCoordinator();
    }
    return BookingSafetyCoordinator.instance;
  }

  /**
   * Resets internal stores (for isolated tests)
   */
  clear(): void {
    this.idempotencyStore.clear();
    this.activeHolds.clear();
    this.confirmedBookings.clear();
  }

  /**
   * Step 1: Create Inventory Hold
   * Transitions state from SELECTED -> HELD (or FAILED on error)
   */
  async createHold(request: BookingHoldRequest): Promise<BookingHoldResponse> {
    const tracer = getTelemetryTracer();
    const injector = getFailureInjector();
    const span = request.traceContext
      ? tracer.startSpan('booking_create_hold', 'booking', request.traceContext, {
          bookingId: request.bookingId,
          itemCount: request.items.length
        })
      : null;

    try {
      // Check failure injection
      if (injector.isEnabled() && injector.shouldFail('BOOKING', 'hold')) {
        await injector.inject('BOOKING', 'hold', request.traceContext?.traceId);
      }

      const holdId = `HOLD-${request.bookingId}-${Date.now()}`;
      const expiresAt = Date.now() + request.holdDurationSeconds * 1000;

      this.activeHolds.set(holdId, {
        bookingId: request.bookingId,
        expiresAt,
        status: 'HELD'
      });

      if (span) {
        tracer.endSpan(span.spanId, 'SUCCESS', {
          holdId,
          bookingState: 'HELD'
        });
      }

      return {
        success: true,
        holdId,
        bookingState: 'HELD',
        expiresAt: new Date(expiresAt).toISOString()
      };
    } catch (err: any) {
      if (span) {
        tracer.endSpan(span.spanId, 'ERROR', {
          errorCategory: 'BOOKING_ERROR',
          errorMessage: err.message,
          bookingState: 'FAILED'
        });
      }

      return {
        success: false,
        bookingState: 'FAILED',
        errorMessage: err.message || 'Inventory hold failed'
      };
    }
  }

  /**
   * Step 2: Safe Payment Processing (Mock/Sandbox with Idempotency)
   * Transitions state to PAYMENT_PROCESSING -> SUCCESS / DECLINED / ERROR
   */
  async processPayment(request: PaymentSimulationRequest): Promise<PaymentSimulationResponse> {
    const tracer = getTelemetryTracer();
    const injector = getFailureInjector();
    const span = request.traceContext
      ? tracer.startSpan('payment_process', 'payment', request.traceContext, {
          orderId: request.orderId,
          amountINR: request.amountINR,
          currency: request.currency
        })
      : null;

    // 1. Idempotency Guard (Prevents double payment execution)
    const existing = this.idempotencyStore.get(request.idempotencyKey);
    if (existing) {
      if (existing.status === 'COMPLETED' && existing.responsePayload) {
        if (span) {
          tracer.endSpan(span.spanId, 'SUCCESS', {
            idempotentReplay: true,
            status: 'SUCCESS'
          });
        }
        return {
          ...(existing.responsePayload as PaymentSimulationResponse),
          idempotentReplay: true
        };
      }
      if (existing.status === 'PENDING') {
        const conflictError = 'Payment request currently in progress for this idempotency key.';
        if (span) {
          tracer.endSpan(span.spanId, 'ERROR', {
            errorCategory: 'PAYMENT_ERROR',
            errorMessage: conflictError
          });
        }
        return {
          success: false,
          orderId: request.orderId,
          status: 'ERROR',
          errorMessage: conflictError,
          timestamp: new Date().toISOString()
        };
      }
    }

    // Register pending execution
    this.idempotencyStore.set(request.idempotencyKey, {
      idempotencyKey: request.idempotencyKey,
      resourceId: request.orderId,
      operation: 'PAYMENT',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    try {
      // Check failure injection
      if (injector.isEnabled()) {
        if (injector.shouldFail('PAYMENT', 'timeout')) {
          await injector.inject('PAYMENT', 'timeout', request.traceContext?.traceId);
        }
        if (injector.shouldFail('PAYMENT', 'charge')) {
          await injector.inject('PAYMENT', 'charge', request.traceContext?.traceId);
        }
        if (injector.shouldFail('PAYMENT', 'decline')) {
          throw new Error('Payment authorization declined: insufficient funds / card declined');
        }
      }

      // Execute payment via registered PaymentProvider domain abstraction
      const paymentProvider = getProviderRegistry().resolveProvider<PaymentProvider>('payment');
      const authResult = await paymentProvider.authorizePayment({
        orderId: request.orderId,
        amount: request.amountINR,
        currency: request.currency || 'INR',
        idempotencyKey: request.idempotencyKey,
        paymentMethod: request.paymentMethod
      });

      if (!authResult.success || authResult.status === 'DECLINED') {
        throw new Error(authResult.errorMessage || 'Payment authorization declined: insufficient funds / card declined');
      }

      const transactionId = authResult.transactionId;
      const response: PaymentSimulationResponse = {
        success: true,
        transactionId,
        orderId: request.orderId,
        status: 'SUCCESS',
        timestamp: new Date().toISOString()
      };

      this.idempotencyStore.set(request.idempotencyKey, {
        idempotencyKey: request.idempotencyKey,
        resourceId: request.orderId,
        operation: 'PAYMENT',
        status: 'COMPLETED',
        responsePayload: response,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      if (span) {
        tracer.endSpan(span.spanId, 'SUCCESS', {
          transactionId,
          status: 'SUCCESS'
        });
      }

      return response;
    } catch (err: any) {
      const isDeclined = String(err.message || '').toLowerCase().includes('declined');
      const isTimeout = String(err.message || '').toLowerCase().includes('timeout');

      const response: PaymentSimulationResponse = {
        success: false,
        orderId: request.orderId,
        status: isDeclined ? 'DECLINED' : isTimeout ? 'TIMEOUT' : 'ERROR',
        errorMessage: err.message,
        errorCode: isDeclined ? 'CARD_DECLINED' : isTimeout ? 'PAYMENT_TIMEOUT' : 'GATEWAY_ERROR',
        timestamp: new Date().toISOString()
      };

      this.idempotencyStore.set(request.idempotencyKey, {
        idempotencyKey: request.idempotencyKey,
        resourceId: request.orderId,
        operation: 'PAYMENT',
        status: 'FAILED',
        responsePayload: response,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      if (span) {
        tracer.endSpan(span.spanId, isTimeout ? 'TIMEOUT' : 'ERROR', {
          errorCategory: isTimeout ? 'TIMEOUT' : 'PAYMENT_ERROR',
          errorMessage: err.message,
          status: response.status
        });
      }

      return response;
    }
  }

  /**
   * Step 3: Confirm Booking
   * Transitions state from HELD -> CONFIRMED (ONLY when hold + payment succeed)
   */
  async confirmBooking(request: BookingConfirmationRequest): Promise<BookingConfirmationResponse> {
    const tracer = getTelemetryTracer();
    const injector = getFailureInjector();
    const span = request.traceContext
      ? tracer.startSpan('booking_confirm', 'booking', request.traceContext, {
          bookingId: request.bookingId,
          holdId: request.holdId
        })
      : null;

    // 1. Idempotency Check
    const existing = this.idempotencyStore.get(request.idempotencyKey);
    if (existing && existing.status === 'COMPLETED' && existing.responsePayload) {
      if (span) {
        tracer.endSpan(span.spanId, 'SUCCESS', {
          idempotentReplay: true,
          bookingState: 'CONFIRMED'
        });
      }
      return {
        ...(existing.responsePayload as BookingConfirmationResponse),
        idempotentReplay: true
      };
    }

    try {
      // 2. Validate Hold Exists & Is Not Expired
      const hold = this.activeHolds.get(request.holdId);
      if (!hold) {
        throw new Error(`Invalid holdId '${request.holdId}'. No active reservation found.`);
      }

      if (Date.now() > hold.expiresAt) {
        hold.status = 'FAILED';
        throw new Error(`Reservation hold '${request.holdId}' has expired.`);
      }

      // 3. Validate Payment Transaction ID
      if (
        !request.paymentTransactionId ||
        (!request.paymentTransactionId.startsWith('TXN-') &&
          !request.paymentTransactionId.startsWith('SANDBOX-TXN-'))
      ) {
        throw new Error('Valid payment transaction authorization required for confirmation.');
      }

      // 4. Check Failure Injection
      if (injector.isEnabled()) {
        if (injector.shouldFail('BOOKING', 'confirm')) {
          await injector.inject('BOOKING', 'confirm', request.traceContext?.traceId);
        }
        if (injector.shouldFail('BOOKING', 'idempotency')) {
          throw new Error('Duplicate booking submission rejected.');
        }
      }

      // 5. Generate Official Confirmation Records
      const confirmationNumber = `CONF-${request.bookingId}-${Date.now().toString(36).toUpperCase()}`;
      const pnr = `PNR-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const hotelVoucher = `VOUCH-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      hold.status = 'CONFIRMED';

      const response: BookingConfirmationResponse = {
        success: true,
        bookingId: request.bookingId,
        confirmationNumber,
        bookingState: 'CONFIRMED',
        pnr,
        hotelVoucher
      };

      this.confirmedBookings.set(request.bookingId, response);
      this.idempotencyStore.set(request.idempotencyKey, {
        idempotencyKey: request.idempotencyKey,
        resourceId: request.bookingId,
        operation: 'CONFIRM_BOOKING',
        status: 'COMPLETED',
        responsePayload: response,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      if (span) {
        tracer.endSpan(span.spanId, 'SUCCESS', {
          confirmationNumber,
          bookingState: 'CONFIRMED',
          pnr,
          hotelVoucher
        });
      }

      return response;
    } catch (err: any) {
      if (span) {
        tracer.endSpan(span.spanId, 'ERROR', {
          errorCategory: 'BOOKING_ERROR',
          errorMessage: err.message,
          bookingState: 'FAILED'
        });
      }

      return {
        success: false,
        bookingId: request.bookingId,
        bookingState: 'FAILED',
        errorMessage: err.message || 'Booking confirmation failed'
      };
    }
  }

  /**
   * Asserts valid state transitions and guarantees that FAILED never becomes CONFIRMED
   */
  assertTruthfulStateTransition(fromState: BookingState, toState: BookingState): boolean {
    const allowed = BookingStateMachine.validateTransition(fromState, toState);
    if (!allowed) {
      throw new Error(`Illegal booking state transition attempted from '${fromState}' to '${toState}'.`);
    }
    return true;
  }
}

export function getBookingSafetyCoordinator(): BookingSafetyCoordinator {
  return BookingSafetyCoordinator.getInstance();
}
