/**
 * AeroDAG Constraint & Accessibility Guardrail
 * 
 * Enforces non-negotiable physical travel constraints:
 * - Hotel room guest capacity >= party headcount (BLOCK on violation)
 * - Family & minor safety (age limits, downtime buffers)
 * - Senior & accessibility pacing (shaded transit, low walking)
 */

import { TripPlan } from '../../../types/travelBooking';
import { Guardrail, GuardrailDecision, GuardrailContext } from '../types';

export class ConstraintGuardrail implements Guardrail<TripPlan, void> {
  readonly id = 'constraint-accessibility-guardrail';
  readonly name = 'Travel Constraints & Safety Guardrail';
  readonly description = 'Validates party size, room capacity, child age bounds, and senior pacing.';
  readonly stage = 'output' as const;
  readonly severity = 'HIGH' as const;
  readonly enabled = true;

  evaluate(plan: TripPlan, context?: GuardrailContext): GuardrailDecision {
    const totalTravellers = plan.travellers.total;
    const hotelCapacity = plan.hotel.maxCapacity;

    // 1. Strict Hotel Capacity Constraint
    if (hotelCapacity < totalTravellers) {
      return {
        decision: 'BLOCK',
        guardrailId: this.id,
        severity: 'CRITICAL',
        reason: `Hotel Capacity Failure: Selected hotel room '${plan.hotel.name}' has capacity ${hotelCapacity}, but party size is ${totalTravellers}.`,
        safeMessage: `The selected room configuration cannot accommodate ${totalTravellers} guests. A family suite or extra room is required.`,
        metadata: { hotelCapacity, totalTravellers }
      };
    }

    // 2. Child Safety & Age Suitability Constraints
    const childrenCount = plan.travellers.children;
    const childAges = plan.travellers.childAges || [];
    if (childrenCount > 0 && childAges.length > 0) {
      const youngestAge = Math.min(...childAges);

      for (const activity of plan.activities) {
        if (activity.minAge && youngestAge < activity.minAge) {
          return {
            decision: 'WARN',
            guardrailId: this.id,
            severity: 'HIGH',
            reason: `Activity age violation: '${activity.name}' requires minimum age ${activity.minAge}, but youngest traveller is ${youngestAge}.`,
            metadata: { activityName: activity.name, minAge: activity.minAge, youngestAge }
          };
        }
      }
    }

    // 3. Senior & Low Walking Accessibility Constraints
    const hasSeniors = plan.travellers.seniors > 0;
    if (hasSeniors) {
      const intensiveDays = plan.itinerary.filter(
        (day) =>
          day.theme.toLowerCase().includes('trek') ||
          day.morning.toLowerCase().includes('steep climb') ||
          day.afternoon.toLowerCase().includes('strenuous')
      );

      if (intensiveDays.length > 0) {
        return {
          decision: 'WARN',
          guardrailId: this.id,
          severity: 'HIGH',
          reason: `Itinerary contains ${intensiveDays.length} strenuous excursion(s) that conflict with senior traveller accessibility.`,
          metadata: { intensiveDaysCount: intensiveDays.length }
        };
      }
    }

    return {
      decision: 'ALLOW',
      guardrailId: this.id,
      severity: 'LOW',
      metadata: { hotelCapacityValid: true, totalTravellers }
    };
  }
}
