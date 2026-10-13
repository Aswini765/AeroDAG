/**
 * AeroDAG Deterministic Mock / Sandbox Payment Provider (Phase 8.5 Enhanced)
 * 
 * Implements the domain PaymentProvider interface for testing and sandbox environments.
 * Decoupled from Stripe, Razorpay, and Adyen SDKs.
 * 
 * STRICT SAFETY INVARIANTS:
 * 1. Incapable of executing real financial transactions.
 * 2. All outputs explicitly marked simulated=true.
 * 3. Never stores PAN or CVV.
 * 4. Deterministic sandbox IDs (SANDBOX-TXN-*, SANDBOX-AUTH-*, SANDBOX-REF-*).
 */

import {
  PaymentProvider,
  PaymentAuthorizeParams,
  PaymentAuthorizationResult,
  PaymentCaptureParams,
  PaymentCaptureResult,
  PaymentRefundParams,
  PaymentRefundResult,
  PaymentStatusResult,
  ProviderCapabilities,
  ProviderHealthStatus
} from './types';
import { sanitizeProviderMetadata } from './normalizers';
import { ProviderTimeoutError } from './errors';

export interface SandboxTransactionRecord {
  transactionId: string;
  orderId: string;
  bookingId?: string;
  userId?: string;
  amount: number;
  currency: string;
  status: 'AUTHORIZED' | 'CAPTURED' | 'REFUNDED' | 'FAILED' | 'EXPIRED';
  authCode: string;
  authorizedAt: string;
  expiresAtMs: number;
  used: boolean;
}

export class MockPaymentProvider implements PaymentProvider {
  public readonly providerName = 'MockPaymentProvider';
  public readonly category = 'payment' as const;
  public readonly isLive = false;
  public readonly supportsBooking = false;
  public readonly capabilities: ProviderCapabilities = {
    booking: true,
    refund: true,
    realTimeData: false,
    currencySupport: true,
    domestic: true,
    international: true
  };

  private transactions = new Map<string, SandboxTransactionRecord>();
  private defaultAuthTTLMs = 600 * 1000; // 10 minutes default auth TTL

  async authorizePayment(params: PaymentAuthorizeParams): Promise<PaymentAuthorizationResult> {
    const methodUpper = (params.paymentMethod || '').toUpperCase();

    // 1. Timeout simulation trigger
    if (methodUpper === 'TIMEOUT' || methodUpper === 'TEST_PAYMENT_TIMEOUT') {
      throw new ProviderTimeoutError('Mock payment gateway authorization timed out (Simulation)', this.providerName);
    }

    // 2. Decline simulation trigger
    if (
      params.amount === 999999 ||
      methodUpper === 'DECLINE' ||
      methodUpper === 'TEST_PAYMENT_FAILURE'
    ) {
      const declineTxnId = `SANDBOX-TXN-DECLINED-${Date.now()}`;
      return {
        success: false,
        transactionId: declineTxnId,
        orderId: params.orderId,
        status: 'DECLINED',
        errorMessage: 'Payment authorization declined by mock card issuer: Insufficient funds or invalid card',
        providerMetadata: sanitizeProviderMetadata(this.providerName, true, { orderId: params.orderId }, 15, 0)
      };
    }

    const transactionId = `SANDBOX-TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const authCode = `SANDBOX-AUTH-${Date.now()}`;
    const expiresAtMs = Date.now() + this.defaultAuthTTLMs;

    this.transactions.set(transactionId, {
      transactionId,
      orderId: params.orderId,
      bookingId: (params.metadata as any)?.bookingId || params.orderId,
      userId: (params.metadata as any)?.userId || params.customerRef || 'sandbox_user',
      amount: params.amount,
      currency: (params.currency || 'INR').toUpperCase(),
      status: 'AUTHORIZED',
      authCode,
      authorizedAt: new Date().toISOString(),
      expiresAtMs,
      used: false
    });

    return {
      success: true,
      transactionId,
      orderId: params.orderId,
      status: 'AUTHORIZED',
      authCode,
      providerMetadata: sanitizeProviderMetadata(this.providerName, true, { orderId: params.orderId }, 15, 0)
    };
  }

  async capturePayment(params: PaymentCaptureParams): Promise<PaymentCaptureResult> {
    const txn = this.transactions.get(params.transactionId);

    if (!txn) {
      return {
        success: false,
        transactionId: params.transactionId,
        capturedAmount: 0,
        status: 'FAILED',
        errorMessage: `Transaction '${params.transactionId}' not found.`,
        providerMetadata: sanitizeProviderMetadata(this.providerName, true, undefined, 10, 0)
      };
    }

    if (txn.used || txn.status === 'CAPTURED') {
      return {
        success: false,
        transactionId: params.transactionId,
        capturedAmount: 0,
        status: 'FAILED',
        errorMessage: `Cannot capture transaction: authorization has already been consumed`,
        providerMetadata: sanitizeProviderMetadata(this.providerName, true, undefined, 10, 0)
      };
    }

    if (Date.now() > txn.expiresAtMs) {
      txn.status = 'EXPIRED';
      return {
        success: false,
        transactionId: params.transactionId,
        capturedAmount: 0,
        status: 'FAILED',
        errorMessage: `Cannot capture transaction: payment authorization has expired`,
        providerMetadata: sanitizeProviderMetadata(this.providerName, true, undefined, 10, 0)
      };
    }

    if (txn.status !== 'AUTHORIZED') {
      return {
        success: false,
        transactionId: params.transactionId,
        capturedAmount: 0,
        status: 'FAILED',
        errorMessage: `Cannot capture transaction: state is not AUTHORIZED (currently '${txn.status}')`,
        providerMetadata: sanitizeProviderMetadata(this.providerName, true, undefined, 10, 0)
      };
    }

    // Amount & currency verification
    if (params.amount !== txn.amount) {
      return {
        success: false,
        transactionId: params.transactionId,
        capturedAmount: 0,
        status: 'FAILED',
        errorMessage: `Capture amount mismatch: authorized ${txn.amount} ${txn.currency}, capture requested ${params.amount}`,
        providerMetadata: sanitizeProviderMetadata(this.providerName, true, undefined, 10, 0)
      };
    }

    if (params.currency && params.currency.toUpperCase() !== txn.currency) {
      return {
        success: false,
        transactionId: params.transactionId,
        capturedAmount: 0,
        status: 'FAILED',
        errorMessage: `Capture currency mismatch: authorized ${txn.currency}, requested ${params.currency}`,
        providerMetadata: sanitizeProviderMetadata(this.providerName, true, undefined, 10, 0)
      };
    }

    txn.status = 'CAPTURED';
    txn.used = true;

    return {
      success: true,
      transactionId: params.transactionId,
      capturedAmount: params.amount,
      status: 'CAPTURED',
      providerMetadata: sanitizeProviderMetadata(this.providerName, true, undefined, 12, 0)
    };
  }

  async refundPayment(params: PaymentRefundParams): Promise<PaymentRefundResult> {
    const txn = this.transactions.get(params.transactionId);

    // Simulated failure trigger
    if (params.reason === 'SIMULATE_REFUND_FAIL') {
      return {
        success: false,
        refundId: '',
        amountRefunded: 0,
        status: 'FAILED',
        errorMessage: 'Simulated payment gateway refund failure',
        providerMetadata: sanitizeProviderMetadata(this.providerName, true, undefined, 10, 0)
      };
    }

    if (!txn || txn.status !== 'CAPTURED') {
      return {
        success: false,
        refundId: '',
        amountRefunded: 0,
        status: 'FAILED',
        errorMessage: `Cannot refund transaction: state is not CAPTURED (currently '${txn?.status || 'UNKNOWN'}')`,
        providerMetadata: sanitizeProviderMetadata(this.providerName, true, undefined, 10, 0)
      };
    }

    txn.status = 'REFUNDED';
    const refundId = `SANDBOX-REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    return {
      success: true,
      refundId,
      amountRefunded: params.amount,
      status: 'REFUNDED',
      providerMetadata: sanitizeProviderMetadata(this.providerName, true, undefined, 10, 0)
    };
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentStatusResult> {
    const txn = this.transactions.get(transactionId);
    if (!txn) {
      return {
        transactionId,
        status: 'UNKNOWN',
        amount: 0,
        currency: 'INR',
        providerMetadata: sanitizeProviderMetadata(this.providerName, true, undefined, 5, 0)
      };
    }

    return {
      transactionId,
      status: txn.status as any,
      amount: txn.amount,
      currency: txn.currency,
      providerMetadata: sanitizeProviderMetadata(this.providerName, true, undefined, 5, 0)
    };
  }

  getTransactionRecord(transactionId: string): SandboxTransactionRecord | undefined {
    return this.transactions.get(transactionId);
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    return {
      providerName: this.providerName,
      category: this.category,
      state: 'available',
      latencyMs: 10,
      lastChecked: new Date().toISOString(),
      details: 'Mock payment gateway sandbox ready (simulated=true)'
    };
  }

  clear(): void {
    this.transactions.clear();
  }
}
