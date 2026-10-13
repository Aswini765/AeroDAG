/**
 * AeroDAG Phase 8.5 — Booking & Payment Sandbox Domain Errors
 */

export class PaymentAmountMismatchError extends Error {
  constructor(expected: number, received: number, currency: string) {
    super(`PAYMENT_AMOUNT_MISMATCH: Authoritative server amount is ${expected} ${currency}, but received ${received} ${currency}.`);
    this.name = 'PaymentAmountMismatchError';
  }
}

export class PaymentCurrencyMismatchError extends Error {
  constructor(expected: string, received: string) {
    super(`PAYMENT_CURRENCY_MISMATCH: Authoritative booking currency is ${expected}, but received ${received}.`);
    this.name = 'PaymentCurrencyMismatchError';
  }
}

export class InventoryHoldExpiredError extends Error {
  constructor(holdId: string) {
    super(`INVENTORY_HOLD_EXPIRED: Inventory hold '${holdId}' has expired. Confirmation blocked.`);
    this.name = 'InventoryHoldExpiredError';
  }
}

export class CapacityExceededError extends Error {
  constructor(roomCapacity: number, partySize: number) {
    super(`CAPACITY_EXCEEDED: Selected accommodation accommodates up to ${roomCapacity} guests, but party size is ${partySize}.`);
    this.name = 'CapacityExceededError';
  }
}

export class CancellationReviewRequiredError extends Error {
  constructor(bookingId: string) {
    super(`CANCELLATION_REQUIRES_REVIEW: Cancellation policy for booking '${bookingId}' is UNKNOWN. Direct review required.`);
    this.name = 'CancellationReviewRequiredError';
  }
}
