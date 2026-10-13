/**
 * AeroDAG Phase 9.5 — Self-Correction & Bounded Recovery Test Suite
 * 
 * Asserts:
 * 1. Hotel room capacity breach detection & automated substitution with capacity-compliant hotel.
 * 2. Budget overage detection & automated swap to value accommodation.
 * 3. Deterministic budget recalculation after component adjustment.
 * 4. Strict bounding of correction loop (max 3 attempts, never infinite loop).
 * 5. Transparent escalation to user with clear options when constraints are mathematically irreconcilable.
 * 6. Zero fabrication of non-existent inventory or fake prices to force artificial pass.
 */

import { SelfCorrectionCoordinator } from '../../src/services/reliability/selfCorrectionCoordinator';
import { TripPlan, HotelItem, FlightItem, TransferItem, ActivityDayItem, ActivityItem, TripPlanBudget } from '../../src/types/travelBooking';
import { TripContext } from '../../src/services/requirementEngine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runPhase95Tests() {
  console.log('=== AeroDAG Phase 9.5 Self-Correction & Recovery Tests ===\n');

  const baseFlight: any = {
    id: 'fl_01',
    airline: 'IndiGo',
    flightNumber: '6E-205',
    origin: 'DEL',
    destination: 'GOI',
    departureTime: '2026-11-10T08:00:00Z',
    arrivalTime: '2026-11-10T10:30:00Z',
    duration: '2h 30m',
    cabinClass: 'ECONOMY',
    refundable: true,
    totalPriceINR: 12000
  };

  const hotelCap2Expensive: any = {
    id: 'ht_deluxe_2',
    name: 'Seaside Luxury Villa (2 Guests)',
    location: 'North Goa',
    starRating: 5,
    maxCapacity: 2,
    roomType: 'Deluxe Ocean Suite',
    amenities: ['Pool', 'WiFi', 'Breakfast'],
    cancellationPolicy: 'FREE_CANCELLATION',
    nightlyRateINR: 12000,
    nights: 3,
    totalPriceINR: 36000
  };

  const hotelCap4Family: any = {
    id: 'ht_family_4',
    name: 'Coconut Grove Family Suite (4 Guests)',
    location: 'North Goa',
    starRating: 4,
    maxCapacity: 4,
    roomType: '2-Bedroom Family Cottage',
    amenities: ['Pool', 'Kitchenette', 'WiFi'],
    cancellationPolicy: 'FREE_CANCELLATION',
    nightlyRateINR: 10000,
    nights: 3,
    totalPriceINR: 30000
  };

  const hotelCap2Budget: any = {
    id: 'ht_budget_2',
    name: 'Palm Breeze Guest House',
    location: 'North Goa',
    starRating: 3,
    maxCapacity: 2,
    roomType: 'Standard Double',
    amenities: ['WiFi'],
    cancellationPolicy: 'NON_REFUNDABLE',
    nightlyRateINR: 4000,
    nights: 3,
    totalPriceINR: 12000
  };

  const baseTransfer: any = {
    id: 'tr_01',
    mode: 'PRIVATE_CAB',
    operator: 'Goa Tour Cabs',
    pickupLocation: 'GOI Airport',
    dropoffLocation: 'North Goa Hotel',
    priceINR: 1500
  };

  const baseItinerary: any[] = [
    {
      day: 1,
      theme: 'Arrival & Relaxation',
      morning: 'Airport arrival & transfer to resort',
      afternoon: 'Beach stroll at Calangute',
      evening: 'Sunset dinner at beach shack'
    },
    {
      day: 2,
      theme: 'Heritage & Sightseeing',
      morning: 'Old Goa Churches & Basilica of Bom Jesus',
      afternoon: 'Mangueshi Temple visit',
      evening: 'Fontainhas Latin Quarter walk'
    }
  ];

  const baseActivities: any[] = [
    { id: 'act_01', name: 'Scuba Diving at Grand Island', category: 'WATER_SPORTS', estimatedPriceINR: 3500 },
    { id: 'act_02', name: 'Heritage Walking Tour', category: 'CULTURE', estimatedPriceINR: 1000 }
  ];

  // ==========================================
  // Test 1: Capacity Breach Auto-Correction
  // ==========================================
  console.log('--- Test 1: Hotel Room Capacity Breach Auto-Correction ---');
  const partyOf4Context: any = {
    origin: 'DEL',
    destination: 'GOI',
    startDate: '2026-11-10',
    endDate: '2026-11-13',
    travellers: { total: 4, adults: 2, children: 2, seniors: 0 },
    budgetTotalINR: 80000
  };

  const planWithCapacityBreach: any = {
    destination: 'Goa',
    durationDays: 4,
    travellers: partyOf4Context.travellers,
    flight: baseFlight,
    hotel: hotelCap2Expensive, // maxCapacity = 2, but party is 4!
    availableHotels: [hotelCap2Expensive, hotelCap4Family],
    transfer: baseTransfer,
    itinerary: baseItinerary,
    activities: baseActivities,
    budget: {
      targetINR: 80000,
      grandTotalINR: 54000,
      isOverBudget: false,
      overBudgetAmountINR: 0,
      breakdown: {
        flightsINR: 12000,
        hotelINR: 36000,
        transferINR: 1500,
        activitiesINR: 4500,
        diningINR: 0
      }
    },
    verificationChecks: []
  };

  const capResult = await SelfCorrectionCoordinator.correctPlan(planWithCapacityBreach, partyOf4Context);
  assert(capResult.status === 'RESOLVED', 'Capacity breach was resolved');
  assert(capResult.correctedPlan.hotel.id === 'ht_family_4', 'Hotel was swapped to ht_family_4 (capacity: 4)');
  assert(capResult.correctedPlan.hotel.maxCapacity >= 4, 'Corrected hotel accommodates full party of 4');
  assert(capResult.actions.some(a => a.strategyApplied === 'SWAP_HOTEL_ROOM_CAPACITY'), 'Logged SWAP_HOTEL_ROOM_CAPACITY action');
  assert(capResult.attemptsCount <= 2, 'Resolved within 2 attempts');

  // ==========================================
  // Test 2: Budget Overage Auto-Correction
  // ==========================================
  console.log('\n--- Test 2: Budget Overage Auto-Correction ---');
  const strictBudgetContext: any = {
    origin: 'DEL',
    destination: 'GOI',
    startDate: '2026-11-10',
    endDate: '2026-11-13',
    travellers: { total: 2, adults: 2, children: 0, seniors: 0 },
    budgetTotalINR: 35000 // Tight budget
  };

  // Luxury hotel causes total to be ~54,000 INR (over by 19,000 INR)
  const planWithBudgetOverage: any = {
    destination: 'Goa',
    durationDays: 4,
    travellers: strictBudgetContext.travellers,
    flight: baseFlight, // 12,000
    hotel: hotelCap2Expensive, // 36,000 -> sum is 48,000 + 1500 + 4500 = 54,000 (target: 35,000)
    availableHotels: [hotelCap2Expensive, hotelCap2Budget], // ht_budget_2 is 12,000
    transfer: baseTransfer,
    itinerary: baseItinerary,
    activities: baseActivities,
    budget: {
      targetINR: 35000,
      grandTotalINR: 54000,
      isOverBudget: true,
      overBudgetAmountINR: 19000,
      breakdown: {
        flightsINR: 12000,
        hotelINR: 36000,
        transferINR: 1500,
        activitiesINR: 4500,
        diningINR: 0
      }
    },
    verificationChecks: []
  };

  const budgetResult = await SelfCorrectionCoordinator.correctPlan(planWithBudgetOverage, strictBudgetContext);
  assert(budgetResult.status === 'RESOLVED', 'Budget overage was resolved');
  assert(budgetResult.correctedPlan.hotel.id === 'ht_budget_2', 'Swapped to value accommodation');
  assert(budgetResult.correctedPlan.budget.isOverBudget === false, 'Recalculated budget is within target ceiling');
  assert(budgetResult.actions.some(a => a.strategyApplied === 'SELECT_VALUE_HOTEL_TIER'), 'Logged SELECT_VALUE_HOTEL_TIER action');

  // ==========================================
  // Test 3: Irreconcilable Constraint Bounded Loop & Escalation
  // ==========================================
  console.log('\n--- Test 3: Irreconcilable Constraint Bounded Loop & Escalation ---');
  const impossibleBudgetContext: any = {
    origin: 'DEL',
    destination: 'GOI',
    startDate: '2026-11-10',
    endDate: '2026-11-13',
    travellers: { total: 2, adults: 2, children: 0, seniors: 0 },
    budgetTotalINR: 15000 // Impossible when flight alone is 12,000 INR and transfer is 1,500
  };

  const impossiblePlan: any = {
    destination: 'Goa',
    durationDays: 4,
    travellers: impossibleBudgetContext.travellers,
    flight: baseFlight,
    hotel: hotelCap2Budget, // 12,000 INR
    availableHotels: [hotelCap2Budget], // No cheaper options exist
    transfer: baseTransfer,
    itinerary: baseItinerary,
    activities: baseActivities,
    budget: {
      targetINR: 15000,
      grandTotalINR: 30000,
      isOverBudget: true,
      overBudgetAmountINR: 15000,
      breakdown: {
        flightsINR: 12000,
        hotelINR: 12000,
        transferINR: 1500,
        activitiesINR: 4500,
        diningINR: 0
      }
    },
    verificationChecks: []
  };

  const escalationResult = await SelfCorrectionCoordinator.correctPlan(impossiblePlan, impossibleBudgetContext, 3);
  assert(escalationResult.status === 'ESCALATED_TO_USER', 'Status is ESCALATED_TO_USER when constraints cannot be satisfied');
  assert(escalationResult.attemptsCount <= 3, 'Attempts bounded at max 3 iterations (never infinite loop)');
  assert(typeof escalationResult.userClarificationRequired === 'string' && escalationResult.userClarificationRequired.length > 0, 'Provides clear explanation of the mathematical constraint conflict');
  assert(escalationResult.correctedPlan.budget.grandTotalINR === 30000, 'Did not fabricate fake prices to pretend it succeeded');

  console.log('\n=== All Phase 9.5 Self-Correction Tests PASSED (14/14 assertions) ===');
}

runPhase95Tests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
