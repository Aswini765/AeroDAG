/**
 * AeroDAG Golden Dataset V2
 * 
 * Comprehensive benchmark dataset of representative travel planning journeys:
 * - Domestic family vacation with children
 * - Multi-generational senior group with low walking intensity
 * - International budget journey with visa requirements
 * - Solo weekend getaway
 * - Extreme budget constraint stress tests
 */

import { EvaluationScenario } from '../types/evalTypes';

export const goldenDatasetV2: EvaluationScenario[] = [
  {
    id: 'GOLDEN_01_GOA_FAMILY',
    category: 'TRIP_PLANNING',
    description: '7-Day Goa family vacation for 2 adults and 1 child (age 10) with ₹60,000 budget',
    input: {
      destination: 'Goa, India',
      origin: 'Bengaluru (BLR)',
      durationDays: 7,
      dates: 'November 2026',
      adultsCount: 2,
      childrenCount: 1,
      childrenAges: [10],
      totalTravellers: 3,
      budgetTotalINR: 60000,
      scope: 'domestic',
      walkingIntensity: 'Low',
      accommodationPreference: 'family-friendly hotel with pool'
    },
    expectedBehavior: 'Produce feasible 7-day domestic itinerary under ₹60,000 without overage and hotel room capacity >= 3',
    expectedOutput: {
      destination: 'Goa',
      budgetTolerancePercentage: 0,
      mustContainText: ['Goa', 'Day 1', 'Day 7']
    }
  },
  {
    id: 'GOLDEN_02_VIETNAM_INTERNATIONAL',
    category: 'TRIP_PLANNING',
    description: '10-Day Vietnam international trip with eVisa verification and ₹1,50,000 budget',
    input: {
      destination: 'Vietnam (Hanoi & Halong Bay)',
      origin: 'Bengaluru (BLR)',
      durationDays: 10,
      dates: 'November 2026',
      adultsCount: 2,
      childrenCount: 0,
      totalTravellers: 2,
      budgetTotalINR: 150000,
      scope: 'international',
      travelerNationality: 'IN'
    },
    expectedBehavior: 'Produce 10-day Vietnam itinerary with official eVisa citation and return flight within ₹1,50,000 ceiling',
    expectedOutput: {
      destination: 'Vietnam',
      shouldBeGrounded: true,
      expectedAuthoritySources: ['Vietnam National Immigration Department']
    }
  },
  {
    id: 'GOLDEN_03_SENIOR_PILGRIMAGE',
    category: 'TRIP_PLANNING',
    description: '5-Day Varanasi heritage journey for 2 seniors with low-walking pacing and ground transfers',
    input: {
      destination: 'Varanasi, India',
      origin: 'Delhi (DEL)',
      durationDays: 5,
      dates: 'December 2026',
      adultsCount: 0,
      seniorsCount: 2,
      totalTravellers: 2,
      budgetTotalINR: 40000,
      scope: 'domestic',
      walkingIntensity: 'Low',
      accessibilityRequired: true
    },
    expectedBehavior: 'Produce paced Varanasi itinerary with low walking load (<=3 activities/day) and confirmed ground transport',
    expectedOutput: {
      destination: 'Varanasi'
    }
  },
  {
    id: 'GOLDEN_04_SOLO_SINGAPORE',
    category: 'TRIP_PLANNING',
    description: '4-Day Singapore solo exploration with MRT transit and ₹80,000 budget',
    input: {
      destination: 'Singapore',
      origin: 'Mumbai (BOM)',
      durationDays: 4,
      dates: 'October 2026',
      adultsCount: 1,
      childrenCount: 0,
      totalTravellers: 1,
      budgetTotalINR: 80000,
      scope: 'international',
      travelerNationality: 'IN'
    },
    expectedBehavior: 'Produce 4-day solo Singapore itinerary with Changi flight and Marina Bay attractions',
    expectedOutput: {
      destination: 'Singapore'
    }
  }
];
