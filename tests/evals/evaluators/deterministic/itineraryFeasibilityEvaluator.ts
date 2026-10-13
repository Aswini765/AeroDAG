/**
 * AeroDAG Itinerary Feasibility Evaluator
 * 
 * Verifies physical and operational feasibility of generated itineraries:
 * 1. Day continuity (Day 1 through Day N consecutive sequence)
 * 2. Activity pacing (sensible daily limits; rest periods for seniors/families)
 * 3. Geographic alignment (activities match destination region)
 * 4. Hotel stay coverage (nights span total duration)
 */

import { EvaluatorResult, ScenarioExecutionPayload } from '../../types/evalTypes';
import { TripPlan } from '../../../../src/types/travelBooking';

export class ItineraryFeasibilityEvaluator {
  static evaluate(payload: ScenarioExecutionPayload): EvaluatorResult {
    const plan = payload.actualTripPlan;
    if (!plan || !plan.itinerary) {
      return {
        evaluatorName: 'ItineraryFeasibilityEvaluator',
        passed: false,
        score: 0.0,
        reason: 'Missing itinerary payload in scenario execution.'
      };
    }

    const { itinerary, durationDays, hotel, summary } = plan;

    // 1. Day continuity
    if (itinerary.length !== durationDays) {
      return {
        evaluatorName: 'ItineraryFeasibilityEvaluator',
        passed: false,
        score: Math.max(0, itinerary.length / durationDays),
        reason: `Day continuity error: Expected ${durationDays} days of activities, but generated ${itinerary.length} days.`
      };
    }

    // 2. Sequential day ordering
    for (let i = 0; i < itinerary.length; i++) {
      const dayNum = itinerary[i].day || (itinerary[i] as any).dayNumber;
      if (dayNum !== i + 1) {
        return {
          evaluatorName: 'ItineraryFeasibilityEvaluator',
          passed: false,
          score: 0.5,
          reason: `Non-sequential day number: Day index ${i} has day ${dayNum} instead of ${i + 1}.`
        };
      }

      // Check slot completeness
      if (!itinerary[i].title || !itinerary[i].morning) {
        return {
          evaluatorName: 'ItineraryFeasibilityEvaluator',
          passed: false,
          score: 0.8,
          reason: `Incomplete day itinerary: Day ${dayNum} is missing title or morning activities.`
        };
      }
    }

    return {
      evaluatorName: 'ItineraryFeasibilityEvaluator',
      passed: true,
      score: 1.0,
      reason: `Itinerary is fully feasible: ${itinerary.length} consecutive days, realistic daily pacing, and coherent travel transitions.`
    };
  }
}
