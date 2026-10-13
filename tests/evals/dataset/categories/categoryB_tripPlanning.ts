/**
 * Category B: Trip Planning Quality & Consistency Scenarios
 * 
 * Evaluates destination consistency, party alignment, hotel capacity matching,
 * itinerary day counts, transit selection, and activity coverage.
 */

import { EvaluationScenario } from '../../types/evalTypes';

export const categoryBScenarios: EvaluationScenario[] = [
  {
    id: 'B1_goa_family_trip',
    category: 'TRIP_PLANNING',
    description: '7-day Goa domestic family holiday from Bengaluru for 2 adults and 1 child',
    input: {
      origin: 'Bengaluru (BLR)',
      destination: 'Goa, India',
      durationDays: 7,
      adultsCount: 2,
      childrenCount: 1,
      childrenAges: [10],
      totalTravellers: 3,
      budgetTotalINR: 60000,
      scope: 'domestic'
    },
    expectedBehavior: 'Generate complete 7-day plan with domestic flight, family resort, AC vehicle, and daily itinerary',
    expectedOutput: {
      destination: 'Goa',
      durationDays: 7,
      travellers: { total: 3 },
      requiredAgents: ['flight-agent', 'hotel-agent', 'activity-agent', 'transport-agent', 'itinerary-agent', 'budget-agent']
    },
    constraints: {
      maxHotelCapacity: 3,
      deterministicMathMustMatch: true
    },
    tags: ['planning', 'domestic', 'family', 'goa']
  },
  {
    id: 'B2_vietnam_family_international',
    category: 'TRIP_PLANNING',
    description: '10-day international journey to Vietnam for 2 adults and 2 children',
    input: {
      origin: 'Bengaluru (BLR)',
      destination: 'Vietnam (Hanoi & Halong Bay)',
      durationDays: 10,
      adultsCount: 2,
      childrenCount: 2,
      childrenAges: [8, 11],
      totalTravellers: 4,
      budgetTotalINR: 100000,
      scope: 'international'
    },
    expectedBehavior: 'Generate international plan with 4-person flight scaling, interconnected family suite, and visa calculations',
    expectedOutput: {
      destination: 'Vietnam',
      durationDays: 10,
      travellers: { total: 4 },
      mustContainText: ['Vietnam', 'Visa']
    },
    constraints: {
      maxHotelCapacity: 4,
      deterministicMathMustMatch: true
    },
    tags: ['planning', 'international', 'vietnam', 'visa']
  },
  {
    id: 'B3_singapore_couples_getaway',
    category: 'TRIP_PLANNING',
    description: '5-day couples trip to Singapore with boutique urban stay and dining',
    input: {
      origin: 'Bengaluru (BLR)',
      destination: 'Singapore',
      durationDays: 5,
      adultsCount: 2,
      childrenCount: 0,
      totalTravellers: 2,
      budgetTotalINR: 80000,
      scope: 'international'
    },
    expectedBehavior: 'Generate compact 5-day couples itinerary with city hotel, transit, and curated cultural sights',
    expectedOutput: {
      destination: 'Singapore',
      durationDays: 5,
      travellers: { total: 2 }
    },
    constraints: {
      maxHotelCapacity: 2,
      deterministicMathMustMatch: true
    },
    tags: ['planning', 'international', 'couple', 'singapore']
  },
  {
    id: 'B4_thailand_multigen_senior',
    category: 'TRIP_PLANNING',
    description: '8-day Thailand mixed family trip with 2 adults, 2 kids, and 1 senior',
    input: {
      origin: 'Bengaluru (BLR)',
      destination: 'Thailand (Bangkok & Phuket)',
      durationDays: 8,
      adultsCount: 2,
      childrenCount: 2,
      childrenAges: [8, 11],
      seniorsCount: 1,
      totalTravellers: 5,
      budgetTotalINR: 120000,
      scope: 'international'
    },
    expectedBehavior: 'Select 5-guest capacity hotel, schedule gentle transit, avoid strenuous high-walking excursions',
    expectedOutput: {
      destination: 'Thailand',
      durationDays: 8,
      travellers: { total: 5, seniors: 1 }
    },
    constraints: {
      maxHotelCapacity: 5,
      maxWalkingPacing: 'Low',
      deterministicMathMustMatch: true
    },
    tags: ['planning', 'international', 'multigen', 'senior', 'thailand']
  },
  {
    id: 'B5_kerala_backwaters_domestic',
    category: 'TRIP_PLANNING',
    description: '6-day Kerala backwaters and heritage domestic holiday for 2 adults',
    input: {
      origin: 'Bengaluru (BLR)',
      destination: 'Kerala (Kochi & Alleppey)',
      durationDays: 6,
      adultsCount: 2,
      totalTravellers: 2,
      budgetTotalINR: 50000,
      scope: 'domestic'
    },
    expectedBehavior: 'Select domestic transport, authentic heritage resort/houseboat, and culinary experiences',
    expectedOutput: {
      destination: 'Kerala',
      durationDays: 6,
      travellers: { total: 2 }
    },
    constraints: {
      maxHotelCapacity: 2,
      deterministicMathMustMatch: true
    },
    tags: ['planning', 'domestic', 'kerala', 'heritage']
  }
];
