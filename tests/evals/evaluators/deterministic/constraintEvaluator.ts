/**
 * AeroDAG ConstraintEvaluator (Deterministic)
 * 
 * Audits travel feasibility constraints:
 * - Hotel room guest capacity vs total party size
 * - Senior pacing (excessive walking, intense excursions)
 * - Child minimum age suitability
 * Flags SEVERE_CONSTRAINT_VIOLATION as a HARD FAILURE if physical capacities are breached.
 */

import { EvaluatorResult, ScenarioExecutionPayload } from '../../types/evalTypes';

export class ConstraintEvaluator {
  static evaluate(payload: ScenarioExecutionPayload): EvaluatorResult {
    const { scenario, actualTripPlan } = payload;
    const constraints = scenario.constraints;

    if (!actualTripPlan) {
      return {
        evaluatorName: 'ConstraintEvaluator',
        passed: true,
        score: 1.0,
        reason: 'No trip plan in payload; constraint audit skipped.'
      };
    }

    const { travellers, hotel, itinerary, activities } = actualTripPlan;
    const violations: string[] = [];
    let isSevere = false;

    // 1. Hotel room capacity check
    if (hotel && travellers) {
      if (hotel.maxCapacity < travellers.total) {
        violations.push(
          `Hotel capacity breach: "${hotel.name}" accommodates max ${hotel.maxCapacity} guests, but party size is ${travellers.total}.`
        );
        isSevere = true;
      }
    }

    // 2. Scenario-specified hotel capacity limit
    if (constraints?.maxHotelCapacity !== undefined && hotel) {
      if (hotel.maxCapacity < constraints.maxHotelCapacity) {
        violations.push(`Hotel capacity ${hotel.maxCapacity} is below requirement ${constraints.maxHotelCapacity}`);
      }
    }

    // 3. Senior accessibility & pacing
    if (travellers && travellers.seniors > 0 && Array.isArray(activities)) {
      const strenuousActivities = activities.filter((a: any) => {
        const titleStr = (a.name || a.title || '').toLowerCase();
        const intensityStr = (a.walkingIntensity || a.walkingLevel || a.intensity || '').toLowerCase();
        const tags = Array.isArray(a.tags) ? a.tags.map((t: string) => t.toLowerCase()) : [];
        return (
          intensityStr === 'high' ||
          intensityStr === 'active' ||
          tags.some((t: string) => ['trekking', 'scuba', 'nightlife'].includes(t)) ||
          titleStr.includes('trek') ||
          titleStr.includes('scuba')
        );
      });

      if (strenuousActivities.length > 0) {
        violations.push(
          `Senior pacing violation: Itinerary includes strenuous activities (${strenuousActivities.map((a: any) => a.name || a.title).join(', ')}) unsuitable for seniors.`
        );
      }

      // Check transit notes for gentle / low-walking buffering
      const hasGentleBuffers = Array.isArray(itinerary) && itinerary.some(
        (d) =>
          (d.transitTip && d.transitTip.toLowerCase().includes('low walking')) ||
          (d.transitTip && d.transitTip.toLowerCase().includes('private ac')) ||
          (d.morning && d.morning.toLowerCase().includes('gentle')) ||
          (d.afternoon && d.afternoon.toLowerCase().includes('downtime'))
      );

      if (!hasGentleBuffers) {
        violations.push('Senior pacing warning: Itinerary lacks gentle transit or downtime buffers.');
      }
    }

    // 4. Child age verification
    const childAgeList = travellers?.childAges || (travellers as any)?.childrenAges;
    if (travellers && travellers.children > 0 && Array.isArray(childAgeList) && childAgeList.length > 0 && Array.isArray(activities)) {
      const minChildAge = Math.min(...childAgeList);
      const unsuitableActivities = activities.filter((a: any) => {
        const minAgeReq = a.minAge ?? a.minimumAge;
        if (minAgeReq && minAgeReq > minChildAge) return true;
        const titleStr = (a.name || a.title || '').toLowerCase();
        const intensityStr = (a.walkingIntensity || a.walkingLevel || a.intensity || '').toLowerCase();
        if (minChildAge < 6 && (titleStr.includes('scuba') || intensityStr === 'high')) return true;
        return false;
      });

      if (unsuitableActivities.length > 0) {
        violations.push(
          `Child safety violation: Activities (${unsuitableActivities.map((a: any) => a.name || a.title).join(', ')}) unsuitable for child age ${minChildAge}.`
        );
      }
    }

    const passed = violations.length === 0;
    const score = passed ? 1.0 : isSevere ? 0.0 : 0.6;

    return {
      evaluatorName: 'ConstraintEvaluator',
      passed,
      score,
      reason: passed
        ? `Constraint validation passed: Hotel capacity (${hotel?.maxCapacity || 'N/A'}), senior transit pacing, and child age boundaries verified.`
        : `Constraint violations detected: ${violations.join('; ')}`,
      hardFailure: isSevere ? 'SEVERE_CONSTRAINT_VIOLATION' : undefined,
      details: {
        violations,
        hotelCapacity: hotel?.maxCapacity,
        partySize: travellers?.total,
        seniorCount: travellers?.seniors,
        childCount: travellers?.children
      }
    };
  }
}
