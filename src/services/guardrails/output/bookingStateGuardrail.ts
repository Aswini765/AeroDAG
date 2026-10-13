/**
 * AeroDAG Booking State & Truthfulness Guardrail
 * 
 * Enforces strict distinction between simulation, availability, and legal confirmation.
 * Prevents AI from falsely claiming that bookings or tickets are confirmed when
 * only search, selection, or mock availability has occurred.
 */

import { BookingState } from '../../../types/travelBooking';
import { Guardrail, GuardrailDecision, GuardrailContext } from '../types';

export interface BookingStateEvaluationInput {
  actualState: BookingState;
  isMockProvider: boolean;
  generatedText: string;
}

export class BookingStateGuardrail implements Guardrail<BookingStateEvaluationInput, string> {
  readonly id = 'booking-state-truthfulness-guardrail';
  readonly name = 'Booking State Truthfulness Guardrail';
  readonly description = 'Prevents hallucinated booking confirmations and enforces simulated transaction disclaimers.';
  readonly stage = 'output' as const;
  readonly severity = 'CRITICAL' as const;
  readonly enabled = true;

  public static readonly MOCK_SIMULATION_DISCLAIMER =
    'This is a simulated booking for demonstration purposes.';

  evaluate(input: BookingStateEvaluationInput, context?: GuardrailContext): GuardrailDecision {
    const { actualState, isMockProvider, generatedText } = input;
    const lower = (generatedText || '').toLowerCase();

    const claimsConfirmed =
      lower.includes('flight is booked') ||
      lower.includes('hotel is booked') ||
      lower.includes('tickets are confirmed') ||
      lower.includes('booking is confirmed') ||
      lower.includes('itinerary is officially booked');

    // 1. Check for false confirmation claims
    if (claimsConfirmed && actualState !== 'CONFIRMED') {
      return {
        decision: 'BLOCK',
        guardrailId: this.id,
        severity: 'CRITICAL',
        reason: `State Hallucination: Output claims booking is CONFIRMED, but actual provider state is '${actualState}'.`,
        safeMessage: 'Your itinerary options have been selected and verified, but no live reservation or payment has been executed.',
        metadata: { actualState, claimedConfirmed: true }
      };
    }

    // 2. Check for mock provider transparency
    if (isMockProvider && claimsConfirmed) {
      return {
        decision: 'BLOCK',
        guardrailId: this.id,
        severity: 'HIGH',
        reason: 'Mock execution cannot be presented as a real legal booking transaction.',
        safeMessage: BookingStateGuardrail.MOCK_SIMULATION_DISCLAIMER,
        metadata: { isMock: true }
      };
    }

    return {
      decision: 'ALLOW',
      guardrailId: this.id,
      severity: 'LOW',
      metadata: { actualState, isMockProvider }
    };
  }

  /**
   * Sanitizes output text to prevent untruthful booking claims
   */
  static sanitizeBookingText(text: string, state: BookingState): string {
    if (state !== 'CONFIRMED') {
      return text
        .replace(/\b(?:your\s+)?flight\s+is\s+(?:booked|confirmed)\b/gi, 'your flight is selected')
        .replace(/\b(?:your\s+)?hotel\s+is\s+(?:booked|confirmed)\b/gi, 'your hotel is selected')
        .replace(/\b(?:tickets?\s+(?:are|is)|booking\s+is)\s+confirmed\b/gi, 'travel plan is verified')
        .replace(/\b(?:officially|already)\s+booked\b/gi, 'drafted in itinerary');
    }
    return text;
  }
}
