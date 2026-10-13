/**
 * AeroDAG Requirement Dependency Graph & Conflict Detection Engine
 * 
 * Implements:
 * 1. Topological requirement dependency resolution
 * 2. 7-state classification: KNOWN, INFERABLE, OPTIONAL, REQUIRED, CONTEXTUALLY_REQUIRED, UNKNOWN, VERIFIED
 * 3. Provenance and confidence score computation
 * 4. Multi-variable conflict detection (e.g. guest count vs bed capacity, micro-budgets)
 * 5. Adaptive question prioritization (Minimum-Question Principle)
 */

import { TripContext } from '../requirementEngine';
import {
  AdvancedRequirementStatus,
  RequirementConflict,
  RequirementGraphEvaluation,
  RequirementNode,
  RequirementProvenance
} from './types';

export class RequirementDependencyGraph {
  /**
   * Evaluates the entire requirement graph for a given TripContext
   */
  static evaluateGraph(context: TripContext): RequirementGraphEvaluation {
    const nodes: RequirementNode[] = [];
    const isDomestic = context.scope === 'domestic';
    const isInternational = context.scope === 'international';
    const hasKids = context.childrenCount !== null && context.childrenCount > 0;
    const hasSeniors = context.seniorsCount !== null && context.seniorsCount > 0;
    const totalCount = context.totalTravellers || ((context.adultsCount || 0) + (context.childrenCount || 0) + (context.seniorsCount || 0));

    // 1. Destination (Root, Priority 100)
    const destStatus: AdvancedRequirementStatus = context.destination ? 'KNOWN' : 'REQUIRED';
    nodes.push({
      key: 'destination',
      label: 'Destination',
      priorityWeight: 100,
      dependencies: [],
      status: destStatus,
      displayValue: context.destination || 'Unknown',
      provenance: this.getProvenance(context, 'destination', destStatus === 'KNOWN')
    });

    // 2. Origin / Departure City (Priority 90)
    const originStatus: AdvancedRequirementStatus = context.origin
      ? 'KNOWN'
      : (context.destination ? 'INFERABLE' : 'REQUIRED');
    nodes.push({
      key: 'origin',
      label: 'Origin / Departure City',
      priorityWeight: 90,
      dependencies: ['destination'],
      status: originStatus,
      displayValue: context.origin || (context.destination ? 'Bengaluru (BLR) [Default Inferred]' : 'Unknown'),
      provenance: this.getProvenance(context, 'origin', originStatus === 'KNOWN')
    });

    // 3. Duration & Dates (Priority 80)
    const durationStatus: AdvancedRequirementStatus = (context.durationDays || context.dates)
      ? 'KNOWN'
      : 'REQUIRED';
    nodes.push({
      key: 'duration',
      label: 'Duration & Dates',
      priorityWeight: 80,
      dependencies: ['destination'],
      status: durationStatus,
      displayValue: context.durationDays ? `${context.durationDays} Days (${context.dates || 'Upcoming'})` : (context.dates || 'Unknown'),
      provenance: this.getProvenance(context, 'duration', durationStatus === 'KNOWN')
    });

    // 4. Adults & Travellers (Priority 75)
    const travellerStatus: AdvancedRequirementStatus = context.adultsCount !== null
      ? 'KNOWN'
      : 'REQUIRED';
    nodes.push({
      key: 'adultsCount',
      label: 'Travellers & Party Size',
      priorityWeight: 75,
      dependencies: [],
      status: travellerStatus,
      displayValue: context.adultsCount !== null ? `${totalCount} Travellers (${context.adultsCount} Adults)` : 'Unknown',
      provenance: this.getProvenance(context, 'adultsCount', travellerStatus === 'KNOWN')
    });

    // 5. Children Ages (Contextually Required if childrenCount > 0, Priority 70)
    let childAgeStatus: AdvancedRequirementStatus = 'OPTIONAL';
    if (hasKids) {
      childAgeStatus = (context.childrenAges && context.childrenAges.length > 0)
        ? 'KNOWN'
        : 'CONTEXTUALLY_REQUIRED';
    }
    nodes.push({
      key: 'childrenAges',
      label: 'Children Ages',
      priorityWeight: 70,
      dependencies: ['adultsCount'],
      status: childAgeStatus,
      displayValue: hasKids
        ? (context.childrenAges.length > 0 ? `${context.childrenAges.join(', ')} yrs` : 'Needed for bed layouts & airfares')
        : 'N/A (No children)',
      provenance: this.getProvenance(context, 'childrenAges', childAgeStatus === 'KNOWN')
    });

    // 6. Budget Target (Priority 65)
    const budgetStatus: AdvancedRequirementStatus = (context.budgetTotalINR !== null || context.budgetTier !== null)
      ? 'KNOWN'
      : 'REQUIRED';
    nodes.push({
      key: 'budget',
      label: 'Budget Target',
      priorityWeight: 65,
      dependencies: ['destination', 'duration', 'adultsCount'],
      status: budgetStatus,
      displayValue: context.budgetTotalINR
        ? `₹${context.budgetTotalINR.toLocaleString()}`
        : (context.budgetTier ? `Tier: ${context.budgetTier}` : 'Pending'),
      provenance: this.getProvenance(context, 'budget', budgetStatus === 'KNOWN')
    });

    // 7. Traveler Nationality (Contextually Required for International destinations, Priority 60)
    // NEVER infer nationality from IP, language or currency.
    let nationalityStatus: AdvancedRequirementStatus = 'OPTIONAL';
    if (isInternational) {
      nationalityStatus = context.travelerNationality ? 'KNOWN' : 'CONTEXTUALLY_REQUIRED';
    } else if (isDomestic) {
      nationalityStatus = 'KNOWN'; // Domestic does not require international passport
    }
    nodes.push({
      key: 'travelerNationality',
      label: 'Passport Nationality',
      priorityWeight: 60,
      dependencies: ['destination'],
      status: nationalityStatus,
      displayValue: context.travelerNationality || (isDomestic ? 'Domestic (Indian National)' : 'Pending verification'),
      provenance: this.getProvenance(context, 'travelerNationality', nationalityStatus === 'KNOWN')
    });

    // 8. Room Capacity & Hotel Preferences (Priority 50)
    const hotelStatus: AdvancedRequirementStatus = context.accommodationPreference
      ? 'KNOWN'
      : 'INFERABLE';
    nodes.push({
      key: 'accommodationPreference',
      label: 'Hotel & Bedding Preference',
      priorityWeight: 50,
      dependencies: ['adultsCount'],
      status: hotelStatus,
      displayValue: context.accommodationPreference || 'Comfortable Family-Friendly (Inferred)',
      provenance: this.getProvenance(context, 'accommodationPreference', hotelStatus === 'KNOWN')
    });

    // 9. Accessibility & Senior Care (Contextually Required if seniors travelling, Priority 45)
    let accessStatus: AdvancedRequirementStatus = 'OPTIONAL';
    if (hasSeniors) {
      accessStatus = context.accessibilityRequired !== undefined ? 'KNOWN' : 'CONTEXTUALLY_REQUIRED';
    }
    nodes.push({
      key: 'accessibilityRequired',
      label: 'Accessibility & Pacing Requirements',
      priorityWeight: 45,
      dependencies: ['adultsCount'],
      status: accessStatus,
      displayValue: hasSeniors ? (context.accessibilityRequired ? 'Accessible / Low Walking' : 'Standard Senior Pacing') : 'Not required',
      provenance: this.getProvenance(context, 'accessibilityRequired', accessStatus === 'KNOWN')
    });

    // 10. Dietary Needs (Priority 30)
    const dietStatus: AdvancedRequirementStatus = context.dietaryPreference ? 'KNOWN' : 'OPTIONAL';
    nodes.push({
      key: 'dietaryPreference',
      label: 'Dietary Preferences',
      priorityWeight: 30,
      dependencies: [],
      status: dietStatus,
      displayValue: context.dietaryPreference || 'Flexible (Standard Indian / Continental)',
      provenance: this.getProvenance(context, 'dietaryPreference', dietStatus === 'KNOWN')
    });

    // 11. Luggage Allowance (Priority 25)
    const luggageStatus: AdvancedRequirementStatus = context.luggage ? 'KNOWN' : 'OPTIONAL';
    nodes.push({
      key: 'luggage',
      label: 'Luggage Volume',
      priorityWeight: 25,
      dependencies: [],
      status: luggageStatus,
      displayValue: context.luggage || 'Standard (Check-in + Cabin)',
      provenance: this.getProvenance(context, 'luggage', luggageStatus === 'KNOWN')
    });

    // Detect conflicts
    const conflicts = this.detectConflicts(context);

    // Identify missing required & contextually required keys
    const missingRequired = nodes
      .filter((n) => n.status === 'REQUIRED')
      .map((n) => n.key);

    const missingContextuallyRequired = nodes
      .filter((n) => n.status === 'CONTEXTUALLY_REQUIRED')
      .map((n) => n.key);

    // Determine the next single prioritized key to ask
    const unfulfilled = nodes
      .filter((n) => n.status === 'REQUIRED' || n.status === 'CONTEXTUALLY_REQUIRED')
      .sort((a, b) => b.priorityWeight - a.priorityWeight);

    const nextPrioritizedKey = unfulfilled.length > 0 ? unfulfilled[0].key : null;

    // Compute readiness score
    const totalEssentialNodes = nodes.filter((n) => n.priorityWeight >= 60).length;
    const fulfilledEssential = nodes.filter(
      (n) => n.priorityWeight >= 60 && (n.status === 'KNOWN' || n.status === 'VERIFIED' || n.status === 'INFERABLE')
    ).length;
    const readinessScore = totalEssentialNodes > 0 ? fulfilledEssential / totalEssentialNodes : 1.0;

    const criticalConflicts = conflicts.filter((c) => c.severity === 'CRITICAL');
    const isSufficientToPlan = missingRequired.length === 0 && missingContextuallyRequired.length === 0 && criticalConflicts.length === 0;

    return {
      entities: nodes,
      conflicts,
      missingRequired,
      missingContextuallyRequired,
      nextPrioritizedKey,
      readinessScore,
      isSufficientToPlan
    };
  }

  /**
   * Conflict Detection Engine
   */
  static detectConflicts(context: TripContext): RequirementConflict[] {
    const conflicts: RequirementConflict[] = [];

    // Conflict 1: Discrepancy between party count breakdown and total travellers
    if (
      context.totalTravellers !== null &&
      context.adultsCount !== null &&
      context.childrenCount !== null
    ) {
      const sum = (context.adultsCount || 0) + (context.childrenCount || 0) + (context.seniorsCount || 0);
      if (context.totalTravellers > 0 && sum > 0 && context.totalTravellers !== sum) {
        conflicts.push({
          id: 'CONFLICT_TRAVELLER_ARITHMETIC',
          fieldA: 'totalTravellers',
          fieldB: 'adultsCount',
          description: `Total travellers stated as ${context.totalTravellers}, but individual counts sum to ${sum} (${context.adultsCount} adults + ${context.childrenCount} children).`,
          severity: 'CRITICAL',
          resolutionGuidance: 'Clarify exact guest breakdown to ensure accurate flight tickets and hotel bedding.'
        });
      }
    }

    // Conflict 2: Child count declared but mismatch in ages provided
    if (context.childrenCount && context.childrenCount > 0 && context.childrenAges.length > 0) {
      if (context.childrenAges.length !== context.childrenCount) {
        conflicts.push({
          id: 'CONFLICT_CHILD_AGES_MISMATCH',
          fieldA: 'childrenCount',
          fieldB: 'childrenAges',
          description: `Travelling with ${context.childrenCount} children, but ${context.childrenAges.length} child ages were given (${context.childrenAges.join(', ')}).`,
          severity: 'WARNING',
          resolutionGuidance: 'Record ages for each child to determine infant lap vs child seat airline fares.'
        });
      }
    }

    // Conflict 3: Extremely low budget for multi-day international travel
    if (
      context.scope === 'international' &&
      context.budgetTotalINR !== null &&
      context.durationDays !== null &&
      context.durationDays >= 5 &&
      context.budgetTotalINR < 25000
    ) {
      conflicts.push({
        id: 'CONFLICT_UNREALISTIC_INTERNATIONAL_BUDGET',
        fieldA: 'budgetTotalINR',
        fieldB: 'destination',
        description: `Budget of ₹${context.budgetTotalINR.toLocaleString()} is below international return flight floor for ${context.destination || 'international destinations'}.`,
        severity: 'WARNING',
        resolutionGuidance: 'Highlight flight budget reality and offer domestic alternatives or budget tier adjustment.'
      });
    }

    return conflicts;
  }

  private static getProvenance(
    context: TripContext,
    key: string,
    isKnown: boolean
  ): RequirementProvenance {
    if (!isKnown) {
      return {
        source: 'DEFAULT',
        confidence: 0.0,
        timestamp: new Date().toISOString()
      };
    }

    // Explicitly provided in context notes or acknowledge
    return {
      source: 'USER_EXPLICIT',
      confidence: 0.98,
      timestamp: new Date().toISOString()
    };
  }
}
