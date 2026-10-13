/**
 * AeroDAG Human-in-the-Loop (HITL) Service Foundation
 * 
 * Provides typed state abstraction and interception boundaries for consequential
 * actions requiring explicit human confirmation (payment, booking, cancellation).
 */

import {
  HumanConfirmationRequest,
  ConsequentialActionType,
  ConfirmationStatus
} from './types';

export class HumanConfirmationService {
  private static pendingRequests: Map<string, HumanConfirmationRequest> = new Map();

  // Consequential actions requiring strict human review before execution
  private static readonly CONSEQUENTIAL_ACTIONS: ConsequentialActionType[] = [
    'payment',
    'booking',
    'cancellation',
    'price_increase_replan'
  ];

  /**
   * Determines if a travel operation requires explicit human confirmation
   */
  static requiresConfirmation(actionType: ConsequentialActionType): boolean {
    return this.CONSEQUENTIAL_ACTIONS.includes(actionType);
  }

  /**
   * Registers a pending human confirmation request
   */
  static createRequest(params: {
    actionType: ConsequentialActionType;
    title: string;
    description: string;
    financialImpactINR?: number;
    metadata?: Record<string, unknown>;
  }): HumanConfirmationRequest {
    const request: HumanConfirmationRequest = {
      id: `hitl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      actionType: params.actionType,
      title: params.title,
      description: params.description,
      financialImpactINR: params.financialImpactINR,
      requiresConfirmation: true,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      metadata: params.metadata
    };

    this.pendingRequests.set(request.id, request);
    return request;
  }

  /**
   * Resolves a confirmation request (user confirms or rejects)
   */
  static resolveRequest(requestId: string, status: 'CONFIRMED' | 'REJECTED'): HumanConfirmationRequest | null {
    const existing = this.pendingRequests.get(requestId);
    if (!existing) return null;

    existing.status = status;
    existing.resolvedAt = new Date().toISOString();
    return existing;
  }

  /**
   * Retrieves all pending confirmation requests
   */
  static getPendingRequests(): HumanConfirmationRequest[] {
    return Array.from(this.pendingRequests.values()).filter((r) => r.status === 'PENDING');
  }

  /**
   * Clears confirmation state (useful for test isolation)
   */
  static clear(): void {
    this.pendingRequests.clear();
  }
}
