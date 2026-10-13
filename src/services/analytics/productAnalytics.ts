/**
 * AeroDAG Phase 12.3 — Privacy-Conscious Product Analytics Engine
 * 
 * Tracks consumer user-journey metrics, funnel progression, and operational quality
 * WITHOUT logging raw prompts, PII, passport numbers, or payment data.
 * 
 * Event Categories:
 * 1. Planning Funnel: Started -> Clarified -> Completed -> Plan Generated
 * 2. Itinerary Operations: Day Edited, Day Added, Reordered, Budget Recalculated
 * 3. Booking Funnel: Hold Created -> Payment Authorized -> Booking Confirmed -> Cancelled/Refunded
 * 4. Reliability Signals: Verification Audited, Provider Degradation, Self-Correction Executed
 */

export type AnalyticsEventType =
  | 'TRIP_PLANNING_STARTED'
  | 'CLARIFICATION_ANSWERED'
  | 'REQUIREMENTS_COMPLETED'
  | 'PLAN_GENERATED'
  | 'ITINERARY_EDITED'
  | 'BUDGET_RECALCULATED'
  | 'VERIFICATION_AUDITED'
  | 'SANDBOX_HOLD_CREATED'
  | 'SANDBOX_PAYMENT_AUTHORIZED'
  | 'SANDBOX_BOOKING_CONFIRMED'
  | 'SANDBOX_BOOKING_CANCELLED'
  | 'SANDBOX_REFUND_COMPLETED';

export interface AnalyticsEvent {
  eventId: string;
  eventType: AnalyticsEventType;
  timestamp: string;
  sessionId: string;
  tenantId: string;
  metadata: Record<string, string | number | boolean>;
}

export interface FunnelMetrics {
  totalPlanningStarted: number;
  totalPlansGenerated: number;
  totalHoldsCreated: number;
  totalBookingsConfirmed: number;
  totalBookingsCancelled: number;
  planningToPlanConversionRate: number;
  planToHoldConversionRate: number;
  holdToConfirmConversionRate: number;
  cancellationRate: number;
}

export class ProductAnalyticsService {
  private static instance: ProductAnalyticsService | null = null;
  private events: AnalyticsEvent[] = [];

  static getInstance(): ProductAnalyticsService {
    if (!this.instance) {
      this.instance = new ProductAnalyticsService();
    }
    return this.instance;
  }

  clear(): void {
    this.events = [];
  }

  /**
   * Tracks a product event while enforcing strict privacy sanitization
   */
  track(
    eventType: AnalyticsEventType,
    context: {
      sessionId: string;
      tenantId?: string;
      metadata?: Record<string, any>;
    }
  ): AnalyticsEvent {
    // Sanitize metadata: block any PII, raw prompt text, or card data
    const cleanMeta: Record<string, string | number | boolean> = {};
    if (context.metadata) {
      for (const [key, val] of Object.entries(context.metadata)) {
        const lowerKey = key.toLowerCase();
        // Drop forbidden fields
        if (
          lowerKey.includes('prompt') ||
          lowerKey.includes('password') ||
          lowerKey.includes('card') ||
          lowerKey.includes('cvv') ||
          lowerKey.includes('passport') ||
          lowerKey.includes('name') ||
          lowerKey.includes('email') ||
          lowerKey.includes('phone')
        ) {
          continue;
        }

        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
          cleanMeta[key] = val;
        }
      }
    }

    const event: AnalyticsEvent = {
      eventId: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      eventType,
      timestamp: new Date().toISOString(),
      sessionId: context.sessionId,
      tenantId: context.tenantId || 'default_tenant',
      metadata: cleanMeta
    };

    this.events.push(event);
    return event;
  }

  getEvents(filter?: { eventType?: AnalyticsEventType; sessionId?: string }): AnalyticsEvent[] {
    return this.events.filter((e) => {
      if (filter?.eventType && e.eventType !== filter.eventType) return false;
      if (filter?.sessionId && e.sessionId !== filter.sessionId) return false;
      return true;
    });
  }

  /**
   * Computes core product and funnel conversion metrics
   */
  computeFunnelMetrics(): FunnelMetrics {
    const started = this.events.filter((e) => e.eventType === 'TRIP_PLANNING_STARTED').length;
    const plans = this.events.filter((e) => e.eventType === 'PLAN_GENERATED').length;
    const holds = this.events.filter((e) => e.eventType === 'SANDBOX_HOLD_CREATED').length;
    const confirmed = this.events.filter((e) => e.eventType === 'SANDBOX_BOOKING_CONFIRMED').length;
    const cancelled = this.events.filter((e) => e.eventType === 'SANDBOX_BOOKING_CANCELLED').length;

    const planningToPlanConversionRate = started > 0 ? Math.round((plans / started) * 100) : 0;
    const planToHoldConversionRate = plans > 0 ? Math.round((holds / plans) * 100) : 0;
    const holdToConfirmConversionRate = holds > 0 ? Math.round((confirmed / holds) * 100) : 0;
    const cancellationRate = confirmed > 0 ? Math.round((cancelled / confirmed) * 100) : 0;

    return {
      totalPlanningStarted: started,
      totalPlansGenerated: plans,
      totalHoldsCreated: holds,
      totalBookingsConfirmed: confirmed,
      totalBookingsCancelled: cancelled,
      planningToPlanConversionRate,
      planToHoldConversionRate,
      holdToConfirmConversionRate,
      cancellationRate
    };
  }
}
