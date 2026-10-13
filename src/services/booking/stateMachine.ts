/**
 * AeroDAG Phase 8.5 — Authoritative State Machine & Transition Validator
 * 
 * Enforces strict mathematical state validation for bookings and payments.
 * CRITICAL INVARIANT:
 * No client can force or bypass transitions.
 * Illegal jumps (e.g. AVAILABLE -> CONFIRMED, CANCELLED -> CONFIRMED, FAILED -> CAPTURED)
 * are rejected deterministically with IllegalStateTransitionError.
 */

import { BookingState, PaymentState } from '../../types/bookingSandbox';

export class IllegalStateTransitionError extends Error {
  public readonly fromState: string;
  public readonly toState: string;

  constructor(machineType: 'BOOKING' | 'PAYMENT', fromState: string, toState: string) {
    super(`Illegal ${machineType} state transition: Cannot transition from '${fromState}' to '${toState}'.`);
    this.name = 'IllegalStateTransitionError';
    this.fromState = fromState;
    this.toState = toState;
  }
}

export class BookingStateMachine {
  /**
   * Complete map of permitted booking state transitions conforming to Phase 8.5 specification
   */
  private static readonly ALLOWED_TRANSITIONS: Record<BookingState, readonly BookingState[]> = {
    SEARCHED: ['AVAILABLE', 'FAILED'],
    AVAILABLE: ['SELECTED', 'EXPIRED', 'UNAVAILABLE', 'FAILED'],
    SELECTED: ['HELD', 'AVAILABLE', 'FAILED'],
    HELD: ['PAYMENT_PROCESSING', 'HOLD_EXPIRED', 'AVAILABLE', 'CANCELLED', 'FAILED'],
    PAYMENT_PROCESSING: ['CONFIRMED', 'SIMULATED', 'PAYMENT_FAILED', 'FAILED'],
    PAYMENT_FAILED: ['PAYMENT_PROCESSING', 'HELD', 'CANCELLED', 'FAILED'],
    HOLD_EXPIRED: ['SEARCHED', 'AVAILABLE', 'FAILED'],
    CONFIRMED: ['CANCEL_REQUESTED', 'FAILED'],
    SIMULATED: ['CANCEL_REQUESTED', 'FAILED', 'CANCELLED'],
    CANCEL_REQUESTED: ['CANCELLED', 'CONFIRMED'],
    CANCELLED: ['REFUND_PROCESSING', 'REFUNDED'],
    REFUND_PROCESSING: ['REFUNDED', 'REFUND_FAILED'],
    REFUND_FAILED: ['REFUND_PROCESSING'],
    EXPIRED: ['SEARCHED', 'AVAILABLE'],
    UNAVAILABLE: ['SEARCHED', 'AVAILABLE'],
    REFUNDED: [], // Terminal state
    FAILED: ['SEARCHED', 'AVAILABLE']
  };

  /**
   * Deterministically validates whether a proposed booking state transition is allowed
   */
  static validateTransition(from: BookingState, to: BookingState): boolean {
    if (from === to) return true; // Idempotent no-op transition
    const allowed = this.ALLOWED_TRANSITIONS[from];
    return Array.isArray(allowed) && allowed.includes(to);
  }

  /**
   * Asserts transition validity, throwing IllegalStateTransitionError if rejected
   */
  static assertValidTransition(from: BookingState, to: BookingState): void {
    if (!this.validateTransition(from, to)) {
      throw new IllegalStateTransitionError('BOOKING', from, to);
    }
  }

  /**
   * Returns list of allowed next states from given state
   */
  static getAllowedTransitions(from: BookingState): readonly BookingState[] {
    return this.ALLOWED_TRANSITIONS[from] || [];
  }
}

export class PaymentStateMachine {
  /**
   * Permitted payment lifecycle state transitions
   */
  private static readonly ALLOWED_TRANSITIONS: Record<PaymentState, readonly PaymentState[]> = {
    NOT_STARTED: ['AUTHORIZING', 'FAILED'],
    AUTHORIZING: ['AUTHORIZED', 'FAILED'],
    AUTHORIZED: ['CAPTURED', 'EXPIRED', 'FAILED'],
    CAPTURED: ['REFUND_PROCESSING', 'FAILED'],
    REFUND_PROCESSING: ['REFUNDED', 'REFUND_FAILED'],
    REFUND_FAILED: ['REFUND_PROCESSING'],
    FAILED: ['AUTHORIZING'],
    EXPIRED: ['AUTHORIZING'],
    REFUNDED: [] // Terminal state
  };

  /**
   * Deterministically validates whether a payment state transition is allowed
   */
  static validateTransition(from: PaymentState, to: PaymentState): boolean {
    if (from === to) return true;
    const allowed = this.ALLOWED_TRANSITIONS[from];
    return Array.isArray(allowed) && allowed.includes(to);
  }

  /**
   * Asserts transition validity, throwing IllegalStateTransitionError if rejected
   */
  static assertValidTransition(from: PaymentState, to: PaymentState): void {
    if (!this.validateTransition(from, to)) {
      throw new IllegalStateTransitionError('PAYMENT', from, to);
    }
  }

  /**
   * Returns list of allowed next states from given state
   */
  static getAllowedTransitions(from: PaymentState): readonly PaymentState[] {
    return this.ALLOWED_TRANSITIONS[from] || [];
  }
}
