/**
 * AeroDAG Payment Tools (Permission Boundary Enforcement)
 * 
 * Tool representing sensitive transactional actions.
 * No planning agent possesses permission to execute payment tools.
 */

import { ToolDefinition, ToolExecutionContext, ToolValidationResult } from './types';

export interface CreatePaymentArgs {
  amountINR: number;
  paymentMethod: string;
  bookingRef: string;
}

export interface PaymentResult {
  paymentId: string;
  status: 'SUCCESS' | 'FAILED';
  timestamp: string;
}

export const createPaymentTool: ToolDefinition<CreatePaymentArgs, PaymentResult> = {
  name: 'createPayment',
  description: 'Process financial transaction and capture payment (restricted tool).',
  category: 'payment',
  timeoutMs: 5000,
  operationType: 'WRITE',
  requiredRole: 'SYSTEM',
  allowedCallers: ['system-orchestrator'],
  financialSensitivity: 'HIGH',
  dataSensitivity: 'RESTRICTED',
  inputSchema: {
    type: 'object',
    properties: {
      amountINR: { type: 'number', description: 'Transaction amount in INR', minimum: 1 },
      paymentMethod: { type: 'string', description: 'Selected payment method' },
      bookingRef: { type: 'string', description: 'Booking reference' }
    },
    required: ['amountINR', 'paymentMethod', 'bookingRef']
  },

  validateInput(input: unknown): ToolValidationResult<CreatePaymentArgs> {
    if (typeof input !== 'object' || input === null) {
      return { valid: false, errors: ['Input must be a valid object'] };
    }
    const raw = input as Record<string, unknown>;
    const amt = Number(raw.amountINR);
    if (isNaN(amt) || amt <= 0) {
      return { valid: false, errors: ['Invalid amountINR'] };
    }
    return {
      valid: true,
      data: {
        amountINR: amt,
        paymentMethod: String(raw.paymentMethod || 'CARD'),
        bookingRef: String(raw.bookingRef || 'REF')
      }
    };
  },

  validateOutput(output: unknown): ToolValidationResult<PaymentResult> {
    if (typeof output !== 'object' || output === null) {
      return { valid: false, errors: ['Output must be an object'] };
    }
    return { valid: true, data: output as PaymentResult };
  },

  async execute(args: CreatePaymentArgs, context: ToolExecutionContext): Promise<PaymentResult> {
    return {
      paymentId: `pay_${Date.now()}`,
      status: 'SUCCESS',
      timestamp: new Date().toISOString()
    };
  }
};

export interface ConfirmBookingArgs {
  bookingId: string;
  holdId: string;
  paymentId: string;
}

export interface ConfirmBookingResult {
  bookingId: string;
  status: 'CONFIRMED' | 'FAILED';
  confirmationNumber: string;
}

export const confirmBookingTool: ToolDefinition<ConfirmBookingArgs, ConfirmBookingResult> = {
  name: 'confirmBooking',
  description: 'Officially confirm held booking after validated payment authorization.',
  category: 'payment',
  timeoutMs: 5000,
  operationType: 'WRITE',
  requiredRole: 'SYSTEM',
  allowedCallers: ['system-orchestrator'],
  financialSensitivity: 'HIGH',
  dataSensitivity: 'RESTRICTED',
  inputSchema: {
    type: 'object',
    properties: {
      bookingId: { type: 'string', description: 'Booking reference ID' },
      holdId: { type: 'string', description: 'Inventory hold ID' },
      paymentId: { type: 'string', description: 'Authorized payment transaction ID' }
    },
    required: ['bookingId', 'holdId', 'paymentId']
  },

  validateInput(input: unknown): ToolValidationResult<ConfirmBookingArgs> {
    if (typeof input !== 'object' || input === null) {
      return { valid: false, errors: ['Input must be an object'] };
    }
    const raw = input as Record<string, unknown>;
    if (!raw.bookingId || !raw.holdId || !raw.paymentId) {
      return { valid: false, errors: ['Missing required confirmation parameters'] };
    }
    return {
      valid: true,
      data: {
        bookingId: String(raw.bookingId),
        holdId: String(raw.holdId),
        paymentId: String(raw.paymentId)
      }
    };
  },

  validateOutput(output: unknown): ToolValidationResult<ConfirmBookingResult> {
    if (typeof output !== 'object' || output === null) {
      return { valid: false, errors: ['Output must be an object'] };
    }
    return { valid: true, data: output as ConfirmBookingResult };
  },

  async execute(args: ConfirmBookingArgs, context: ToolExecutionContext): Promise<ConfirmBookingResult> {
    return {
      bookingId: args.bookingId,
      status: 'CONFIRMED',
      confirmationNumber: `CONF-${Date.now()}`
    };
  }
};

export interface RefundPaymentArgs {
  paymentId: string;
  amountINR: number;
  reason: string;
}

export interface RefundPaymentResult {
  refundId: string;
  paymentId: string;
  status: 'REFUNDED';
}

export const refundPaymentTool: ToolDefinition<RefundPaymentArgs, RefundPaymentResult> = {
  name: 'refundPayment',
  description: 'Execute administrative refund on authorized financial transaction.',
  category: 'payment',
  timeoutMs: 5000,
  operationType: 'WRITE',
  requiredRole: 'ADMIN',
  allowedCallers: ['admin-console', 'system-orchestrator'],
  financialSensitivity: 'HIGH',
  dataSensitivity: 'RESTRICTED',
  inputSchema: {
    type: 'object',
    properties: {
      paymentId: { type: 'string', description: 'Payment reference ID' },
      amountINR: { type: 'number', description: 'Refund amount in INR', minimum: 1 },
      reason: { type: 'string', description: 'Reason for refund' }
    },
    required: ['paymentId', 'amountINR', 'reason']
  },

  validateInput(input: unknown): ToolValidationResult<RefundPaymentArgs> {
    if (typeof input !== 'object' || input === null) {
      return { valid: false, errors: ['Input must be an object'] };
    }
    const raw = input as Record<string, unknown>;
    if (!raw.paymentId || isNaN(Number(raw.amountINR))) {
      return { valid: false, errors: ['Invalid paymentId or amountINR'] };
    }
    return {
      valid: true,
      data: {
        paymentId: String(raw.paymentId),
        amountINR: Number(raw.amountINR),
        reason: String(raw.reason || 'Requested by customer')
      }
    };
  },

  validateOutput(output: unknown): ToolValidationResult<RefundPaymentResult> {
    if (typeof output !== 'object' || output === null) {
      return { valid: false, errors: ['Output must be an object'] };
    }
    return { valid: true, data: output as RefundPaymentResult };
  },

  async execute(args: RefundPaymentArgs, context: ToolExecutionContext): Promise<RefundPaymentResult> {
    return {
      refundId: `ref_${Date.now()}`,
      paymentId: args.paymentId,
      status: 'REFUNDED'
    };
  }
};
