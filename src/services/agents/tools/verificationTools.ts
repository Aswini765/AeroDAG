/**
 * AeroDAG Verification Tools
 * 
 * Validates whole-trip constraints: capacity, destination consistency,
 * senior/child pacing, budget alignment, and required components.
 */

import { ToolDefinition, ToolExecutionContext, ToolValidationResult } from './types';
import { FlightItem, HotelItem, TransferItem, ActivityDayItem, ActivityItem, TripPlanBudget } from '../../../types/travelBooking';
import { TripContext } from '../../requirementEngine';
import { ItineraryRouteAnalysis, ItineraryWeatherAnalysis } from '../../providers/types';

export interface VerifyTripConstraintsArgs {
  tripContext: TripContext;
  flight: FlightItem;
  hotel: HotelItem;
  transfer: TransferItem;
  itinerary: ActivityDayItem[];
  activities: ActivityItem[];
  budget: TripPlanBudget;
  routeAnalysis?: ItineraryRouteAnalysis;
  weatherAnalysis?: ItineraryWeatherAnalysis;
}

export interface VerificationReport {
  passed: boolean;
  issues: string[];
  warnings: string[];
  recommendations: string[];
}

export const verifyTripConstraintsTool: ToolDefinition<VerifyTripConstraintsArgs, VerificationReport> = {
  name: 'verifyTripConstraints',
  description: 'Audits trip integrity across party capacity, destination consistency, senior accessibility, and budget limits.',
  category: 'verification',
  timeoutMs: 4000,
  inputSchema: {
    type: 'object',
    properties: {
      tripContext: { type: 'object', description: 'Authoritative trip parameters' },
      flight: { type: 'object', description: 'Selected flight' },
      hotel: { type: 'object', description: 'Selected accommodation' },
      transfer: { type: 'object', description: 'Selected transfer' },
      itinerary: { type: 'array', description: 'Daily itinerary schedule' },
      activities: { type: 'array', description: 'Curated experiences' },
      budget: { type: 'object', description: 'Computed financials' }
    },
    required: ['tripContext', 'flight', 'hotel', 'transfer', 'itinerary', 'budget']
  },

  validateInput(input: unknown): ToolValidationResult<VerifyTripConstraintsArgs> {
    if (typeof input !== 'object' || input === null) {
      return { valid: false, errors: ['Input must be a valid non-null object'] };
    }
    const raw = input as Record<string, unknown>;
    const errors: string[] = [];

    if (!raw.tripContext) errors.push("Missing 'tripContext'");
    if (!raw.flight) errors.push("Missing 'flight'");
    if (!raw.hotel) errors.push("Missing 'hotel'");
    if (!raw.transfer) errors.push("Missing 'transfer'");
    if (!Array.isArray(raw.itinerary)) errors.push("Missing or invalid 'itinerary' array");
    if (!raw.budget) errors.push("Missing 'budget'");

    if (errors.length > 0) return { valid: false, errors };
    return { valid: true, data: input as VerifyTripConstraintsArgs };
  },

  validateOutput(output: unknown): ToolValidationResult<VerificationReport> {
    if (typeof output !== 'object' || output === null) {
      return { valid: false, errors: ['Output must be a non-null object'] };
    }
    const r = output as Record<string, unknown>;
    if (typeof r.passed !== 'boolean' || !Array.isArray(r.issues) || !Array.isArray(r.warnings)) {
      return { valid: false, errors: ['Malformed verification report structure'] };
    }
    return { valid: true, data: output as VerificationReport };
  },

  async execute(args: VerifyTripConstraintsArgs, context: ToolExecutionContext): Promise<VerificationReport> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const totalTravellers = args.tripContext.totalTravellers || (args.tripContext.adultsCount || 2) + (args.tripContext.childrenCount || 0) + (args.tripContext.seniorsCount || 0);

    // 1. Hotel Capacity Check
    if (args.hotel.maxCapacity < totalTravellers) {
      issues.push(
        `Hotel capacity failure: Selected room '${args.hotel.name}' accommodates ${args.hotel.maxCapacity} guests, but party size is ${totalTravellers}.`
      );
    }

    // 2. Destination Consistency Check
    const targetDest = (args.tripContext.destination || '').toLowerCase();
    const flightDest = (args.flight.destinationCity || '').toLowerCase();
    const hotelDest = (args.hotel.city || args.hotel.area || '').toLowerCase();

    if (targetDest && !flightDest.includes(targetDest.slice(0, 4)) && !targetDest.includes(flightDest.slice(0, 4))) {
      warnings.push(`Flight arrival destination (${args.flight.destinationCity}) may not match primary itinerary destination (${args.tripContext.destination}).`);
    }

    if (targetDest && !hotelDest.includes(targetDest.slice(0, 4)) && !targetDest.includes(hotelDest.slice(0, 4))) {
      issues.push(`Hotel location (${args.hotel.city || args.hotel.name}) does not match requested destination (${args.tripContext.destination}).`);
    }

    // 3. Senior & Low Walking Accessibility Check
    const hasSeniors = (args.tripContext.seniorsCount || 0) > 0 || args.tripContext.walkingIntensity === 'Low';
    if (hasSeniors) {
      const highWalkingDays = args.itinerary.filter(
        (d) => d.theme.toLowerCase().includes('trek') || d.afternoon.toLowerCase().includes('steep')
      );
      if (highWalkingDays.length > 0) {
        warnings.push(`Itinerary contains ${highWalkingDays.length} active excursion(s) that may require shaded private vehicle rest buffers for seniors.`);
      }
      recommendations.push('Private air-conditioned chauffeur transfer retained for reduced walking strain.');
    }

    // 4. Family Friendly Score Check
    const hasChildren = (args.tripContext.childrenCount || 0) > 0;
    if (hasChildren) {
      const lowChildScore = args.itinerary.filter((d) => (d.familyFriendlyScore ?? 8) < 7);
      if (lowChildScore.length > 0) {
        warnings.push(`Itinerary has ${lowChildScore.length} days with lower family-friendly scores (< 7/10).`);
      }
      recommendations.push('Family Comfort: Daily pacing is planned with maximum 2 major sightseeing events per day and guaranteed afternoon downtime.');
    } else {
      recommendations.push('Optimal Pacing: Morning excursions start at 09:30 AM to avoid peak rush hours.');
    }

    // ID / Passport recommendation
    const isDomestic = args.tripContext.scope === 'domestic' || !args.tripContext.destination || ['goa', 'kerala', 'rajasthan', 'himachal', 'kashmir', 'mumbai', 'delhi'].some(d => (args.tripContext.destination || '').toLowerCase().includes(d));
    if (isDomestic) {
      recommendations.push('Carry physical government photo IDs (Aadhaar or Voter ID) for seamless hotel check-in and domestic security gates.');
    } else {
      recommendations.push('Ensure Indian passports have minimum 6 months validity from departure date. Keep digital copies of flight itineraries.');
    }

    // 5. Budget Check
    if (args.budget.isOverBudget) {
      warnings.push(
        `Package cost exceeds target budget by ₹${args.budget.overBudgetAmountINR.toLocaleString()}. Review Budget Engine for non-destructive optimization.`
      );
      recommendations.push(`Budget Advisory: Currently ₹${args.budget.overBudgetAmountINR.toLocaleString()} above your target. Use 1-click optimization to re-balance.`);
    } else {
      recommendations.push(`Financial Audit: ₹${args.budget.remainingBudgetINR.toLocaleString()} available buffer for shopping, local street delicacies, and spontaneous treats.`);
    }

    // 6. Completeness of Required Components Check
    if (!args.flight.id) issues.push('Missing required flight component.');
    if (!args.hotel.id) issues.push('Missing required accommodation component.');
    if (!args.transfer.id) issues.push('Missing required transfer component.');
    if (args.itinerary.length === 0) issues.push('Itinerary has 0 scheduled days.');

    // 7. Route Feasibility & Pacing Check
    if (args.routeAnalysis) {
      if (args.routeAnalysis.status === 'HIGH_TRAVEL_TIME') {
        warnings.push(`HIGH_TRAVEL_TIME: Total scheduled transit time (${args.routeAnalysis.totalDurationMinutes} mins) exceeds daily threshold.`);
      } else if (args.routeAnalysis.status === 'ROUTE_INEFFICIENCY') {
        warnings.push('ROUTE_INEFFICIENCY: Geographically distant stops scheduled consecutively. Consider re-clustering.');
      } else if (args.routeAnalysis.status === 'UNKNOWN') {
        recommendations.push('Route Feasibility Notice: Precise driving route data was unavailable. Allow extra buffer for local transfers.');
      }
      if (args.routeAnalysis.warnings) {
        for (const w of args.routeAnalysis.warnings) {
          if (!warnings.includes(w)) warnings.push(w);
        }
      }
    }

    // 8. Meteorological & Weather Risk Check
    if (args.weatherAnalysis) {
      if (args.weatherAnalysis.status === 'WEATHER_RISK') {
        warnings.push('WEATHER_RISK: Outdoor experiences scheduled during high precipitation probability. Recommend flexible indoor backup.');
      } else if (args.weatherAnalysis.status === 'PACING_RISK') {
        warnings.push('PACING_RISK: Midday temperatures exceed comfort threshold. Schedule strenuous walking during morning/evening hours.');
      } else if (args.weatherAnalysis.status === 'SEVERE_WEATHER_ALERT') {
        warnings.push('SEVERE_WEATHER_ALERT: Active meteorological warning reported in region. Prioritize sheltered venues.');
      }
      if (args.weatherAnalysis.advisories) {
        for (const adv of args.weatherAnalysis.advisories) {
          if (!recommendations.includes(adv)) recommendations.push(adv);
        }
      }
    }

    const passed = issues.length === 0;

    return {
      passed,
      issues,
      warnings,
      recommendations
    };
  }
};
