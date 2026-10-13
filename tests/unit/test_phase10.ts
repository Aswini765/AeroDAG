/**
 * AeroDAG Phase 10 — Complete Consumer Travel Experience Test Suite
 * 
 * Verifies:
 * - Phase 10.1: Trip Workspace operations (Add, Remove, Edit, Reorder, Replace) with deterministic budget recalculation.
 * - Phase 10.2: Interactive Map routing, distance/duration metrics, verified vs estimated labeling, fallback handling.
 * - Phase 10.3: Consumer Sandbox Booking flow (Hold -> Authorize -> Confirm -> Invariant enforcement).
 * - Phase 10.4: Persistent My Trips dashboard with tenant isolation.
 * - Phase 10.5: Post-Booking AI Assistant with grounded answering and protection against fake booking changes.
 */

import {
  TripWorkspaceManager,
  InteractiveMapService,
  SandboxBookingBridge,
  UserTripsManager,
  PostBookingAssistant
} from '../../src/services/consumer/consumerTripService';
import { TripPlan, HotelItem, FlightItem, TransferItem, ActivityDayItem, ConfirmedBookingRecord, TripPreferences } from '../../src/types/travelBooking';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runPhase10Tests() {
  console.log('=== AeroDAG Phase 10 Consumer Travel Experience Tests ===\n');

  const baseFlight: any = {
    id: 'fl_del_goi_01',
    airline: 'IndiGo',
    flightNumber: '6E-551',
    origin: 'DEL',
    destination: 'GOI',
    departureTime: '2026-11-15T09:00:00Z',
    arrivalTime: '2026-11-15T11:30:00Z',
    duration: '2h 30m',
    cabinClass: 'ECONOMY',
    refundable: true,
    totalPriceINR: 14000
  };

  const baseHotel: any = {
    id: 'ht_candolim_01',
    name: 'Candolim Heritage Villa',
    location: 'North Goa',
    starRating: 4,
    maxCapacity: 4,
    roomType: 'Family Deluxe Suite',
    amenities: ['Pool', 'WiFi', 'Breakfast'],
    cancellationPolicy: 'FREE_CANCELLATION',
    nightlyRateINR: 6000,
    nights: 3,
    totalPriceINR: 18000
  };

  const baseTransfer: any = {
    id: 'tr_goi_01',
    mode: 'PRIVATE_CAB',
    operator: 'Goa Coastal Cabs',
    pickupLocation: 'GOI Airport',
    dropoffLocation: 'Candolim Hotel',
    priceINR: 1800
  };

  const initialItinerary: any[] = [
    {
      day: 1,
      theme: 'Arrival & Beach Sunset',
      morning: 'Airport arrival & hotel check-in',
      afternoon: 'Relaxation at Candolim beach',
      evening: 'Seafood dinner at beach bistro',
      localDining: ['Fisherman\'s Wharf'],
      familyFriendlyScore: 9,
      estimatedCostINR: 1500,
      transitTip: 'Short cab ride'
    },
    {
      day: 2,
      theme: 'Heritage & Churches',
      morning: 'Old Goa Basilica of Bom Jesus',
      afternoon: 'Mangueshi Temple and spice plantation',
      evening: 'Latin Quarter Fontainhas heritage walk',
      localDining: ['Viva Panjim'],
      familyFriendlyScore: 8,
      estimatedCostINR: 2500,
      transitTip: 'Private AC cab'
    },
    {
      day: 3,
      theme: 'Adventure & Watersports',
      morning: 'Dolphin safari & island catamaran',
      afternoon: 'Calangute water sports',
      evening: 'Souvenir shopping and farewell feast',
      localDining: ['Brittos Baga'],
      familyFriendlyScore: 7,
      estimatedCostINR: 3000,
      transitTip: 'Scooter or local cab'
    }
  ];

  const initialPlan: any = {
    destination: 'Goa, India',
    durationDays: 3,
    travellers: { total: 2, adults: 2, children: 0, seniors: 0 },
    flight: baseFlight,
    hotel: baseHotel,
    availableHotels: [baseHotel],
    transfer: baseTransfer,
    itinerary: initialItinerary,
    activities: [
      { id: 'act_01', name: 'Dolphin Safari', category: 'WATER_SPORTS', estimatedPriceINR: 2000 },
      { id: 'act_02', name: 'Spice Plantation Tour', category: 'CULTURE', estimatedPriceINR: 1500 }
    ],
    budget: {
      targetINR: 60000,
      grandTotalINR: 42100,
      isOverBudget: false,
      overBudgetAmountINR: 0,
      breakdown: {
        flightsINR: 14000,
        hotelINR: 18000,
        transferINR: 1800,
        activitiesINR: 3500,
        diningINR: 4800
      }
    },
    verificationChecks: []
  };

  // ==========================================================================
  // SECTION 1: Phase 10.1 Trip Workspace Operations
  // ==========================================================================
  console.log('--- Section 1: Phase 10.1 Trip Workspace Operations ---');

  // Test 1.1: Add Itinerary Day
  const planWithAddedDay = TripWorkspaceManager.addItineraryDay(initialPlan, {
    theme: 'South Goa Serenity',
    morning: 'Colva and Benaulim beach visit',
    afternoon: 'Cabo de Rama Fort viewpoint',
    evening: 'Sunset drinks at Palolem',
    estimatedCostINR: 2000
  });
  assert(planWithAddedDay.itinerary.length === 4, 'Day was successfully added (total: 4 days)');
  assert(planWithAddedDay.itinerary[3].day === 4, 'Added day is indexed as Day 4');
  assert(planWithAddedDay.durationDays === 4, 'Trip duration updated to 4 days');
  assert(planWithAddedDay.budget.grandTotalINR > initialPlan.budget.grandTotalINR, 'Grand total updated deterministically with new day costs');

  // Test 1.2: Edit Itinerary Day
  const editedPlan = TripWorkspaceManager.editItineraryDay(planWithAddedDay, 2, {
    theme: 'Custom Heritage Discovery',
    morning: 'VIP Guided Tour of Old Goa Churches'
  });
  assert(editedPlan.itinerary[1].theme === 'Custom Heritage Discovery', 'Day 2 theme updated');
  assert(editedPlan.itinerary[1].morning.includes('VIP Guided Tour'), 'Day 2 morning slot updated');
  assert(editedPlan.itinerary[1].day === 2, 'Day number 2 preserved');

  // Test 1.3: Reorder Itinerary Days (Swap Day 1 and Day 2)
  const reorderedPlan = TripWorkspaceManager.reorderItineraryDays(editedPlan, 0, 1);
  assert(reorderedPlan.itinerary[0].theme === 'Custom Heritage Discovery', 'Day 2 moved to index 0 (now Day 1)');
  assert(reorderedPlan.itinerary[0].day === 1, 'Re-indexed to Day 1');
  assert(reorderedPlan.itinerary[1].theme === 'Arrival & Beach Sunset', 'Original Day 1 moved to index 1 (now Day 2)');
  assert(reorderedPlan.itinerary[1].day === 2, 'Re-indexed to Day 2');

  // Test 1.4: Replace Activity Slot
  const activityReplacedPlan = TripWorkspaceManager.replaceActivitySlot(
    reorderedPlan,
    1,
    'afternoon',
    'Private yacht sunset cruise along Mandovi river',
    4000
  );
  assert(activityReplacedPlan.itinerary[0].afternoon.includes('Private yacht'), 'Replaced afternoon activity slot');
  assert(activityReplacedPlan.itinerary[0].estimatedCostINR > reorderedPlan.itinerary[0].estimatedCostINR, 'Day estimated cost incremented');

  // Test 1.5: Remove Itinerary Day
  const removedDayPlan = TripWorkspaceManager.removeItineraryDay(activityReplacedPlan, 4);
  assert(removedDayPlan.itinerary.length === 3, 'Day 4 removed, back to 3 days');
  assert(removedDayPlan.itinerary.every((d, i) => d.day === i + 1), 'All days sequentially numbered 1..3');

  // ==========================================================================
  // SECTION 2: Phase 10.2 Interactive Maps
  // ==========================================================================
  console.log('\n--- Section 2: Phase 10.2 Interactive Maps ---');

  const mapAnalysis = await InteractiveMapService.buildMapAnalysis(
    'DEL',
    'Goa',
    'Candolim Heritage Villa',
    initialItinerary
  );
  assert(mapAnalysis.waypoints.length >= 5, 'Generated waypoints for origin, airport, hotel, and days');
  assert(mapAnalysis.routeSegments.length >= 4, 'Generated route segments');
  assert(mapAnalysis.totalDistanceKm > 0, 'Total distance calculated deterministically');
  assert(mapAnalysis.totalDurationMinutes > 0, 'Total duration calculated deterministically');
  assert(mapAnalysis.routeSegments[0].travelMode === 'FLIGHT', 'Flight segment identified');
  assert(mapAnalysis.routeSegments[1].travelMode === 'ROAD', 'Airport transfer segment identified');
  assert(typeof mapAnalysis.routeSegments[0].isVerified === 'boolean', 'Verified flag present on flight segment');

  // Coordinate resolution (Never invent coordinates)
  const blrCoords = InteractiveMapService.resolveCoordinates('bengaluru');
  assert(blrCoords.isVerified === true, 'Bengaluru coordinates verified from registry');
  assert(Math.abs(blrCoords.lat - 12.9716) < 0.01, 'Correct Bengaluru latitude');

  // ==========================================================================
  // SECTION 3: Phase 10.3 Booking Sandbox UX
  // ==========================================================================
  console.log('\n--- Section 3: Phase 10.3 Booking Sandbox UX ---');

  const dummyPrefs: any = {
    destination: 'Goa, India',
    origin: 'DEL',
    targetDates: 'Nov 15 – Nov 18, 2026',
    durationDays: 3,
    partySize: 2,
    adultsCount: 2,
    childrenCount: 0,
    childrenAges: [],
    budgetTotalINR: 60000,
    budgetTotalUSD: 720,
    budgetTier: 'Comfortable',
    travelStyle: 'Balanced',
    priority: 'Family Friendly',
    accommodationPreference: 'Standard 3-Star'
  };

  const checkoutResult = await SandboxBookingBridge.executeSandboxBooking({
    userId: 'user_consumer_101',
    tripPlan: initialPlan,
    travelPreferences: dummyPrefs,
    passengers: [{ type: 'ADULT', title: 'Mr', firstName: 'Aswin', lastName: 'Kumar' }],
    paymentMethod: 'UPI'
  });

  if (checkoutResult.status !== 'CONFIRMED') {
    console.error('Checkout error detail:', checkoutResult.error);
  }
  assert(checkoutResult.status === 'CONFIRMED', 'Booking confirmed through authoritative coordinator');
  assert(checkoutResult.bookingId.length > 0, 'Generated authoritative bookingId');
  assert(checkoutResult.holdId.length > 0, 'Generated authoritative holdId');
  assert(checkoutResult.paymentTransactionId.length > 0, 'Generated authoritative paymentTransactionId');
  assert(checkoutResult.confirmedRecord?.status === 'CONFIRMED', 'Confirmed record status is CONFIRMED');
  assert(checkoutResult.confirmedRecord?.totalPaidINR === initialPlan.budget.grandTotalINR, 'Paid amount matches exact grand total');

  // ==========================================================================
  // SECTION 4: Phase 10.4 Persistent My Trips
  // ==========================================================================
  console.log('\n--- Section 4: Phase 10.4 Persistent My Trips ---');

  UserTripsManager.saveConfirmedTrip('user_consumer_101', checkoutResult.confirmedRecord!);
  UserTripsManager.saveDraftTrip('user_consumer_101', initialPlan);

  const user101Trips = UserTripsManager.getUserTrips('user_consumer_101');
  assert(user101Trips.upcoming.length === 1, 'User 101 has 1 upcoming confirmed trip');
  assert(user101Trips.drafts.length === 1, 'User 101 has 1 draft trip');
  assert(user101Trips.upcoming[0].bookingId === checkoutResult.bookingId, 'Upcoming trip matches bookingId');

  // Tenant Isolation: Check other user
  const user999Trips = UserTripsManager.getUserTrips('user_consumer_999');
  assert(user999Trips.upcoming.length === 0, 'Tenant isolation: User 999 cannot see User 101 trips');
  assert(user999Trips.drafts.length === 0, 'Tenant isolation: User 999 has 0 drafts');

  // ==========================================================================
  // SECTION 5: Phase 10.5 Post-Booking AI Assistant
  // ==========================================================================
  console.log('\n--- Section 5: Phase 10.5 Post-Booking AI Assistant ---');

  const confirmedTrip = checkoutResult.confirmedRecord!;

  // Question 1: What is planned for tomorrow?
  const ansTomorrow = await PostBookingAssistant.answerTripQuestion('What is planned for tomorrow?', confirmedTrip, 'user_consumer_101');
  assert(ansTomorrow.reply.includes('Morning:'), 'Tomorrow answer contains scheduled morning slot');
  assert(ansTomorrow.sourcesGrounded.includes('Confirmed Day 2 Itinerary'), 'Grounded in Confirmed Day 2 Itinerary');

  // Question 2: What is my next activity?
  const ansActivity = await PostBookingAssistant.answerTripQuestion('What is my next activity?', confirmedTrip, 'user_consumer_101');
  assert(ansActivity.reply.includes('Your next upcoming activity is:'), 'Answers next scheduled activity');

  // Question 3: How do I get to the hotel?
  const ansHotel = await PostBookingAssistant.answerTripQuestion('How do I get to the hotel?', confirmedTrip, 'user_consumer_101');
  assert(ansHotel.reply.includes('Candolim Heritage Villa'), 'Includes specific hotel name');
  assert(ansHotel.reply.includes('pre-booked and confirmed'), 'Confirms transfer is pre-booked');

  // Question 4: What is included in my itinerary?
  const ansIncluded = await PostBookingAssistant.answerTripQuestion('What is included in my itinerary?', confirmedTrip, 'user_consumer_101');
  assert(ansIncluded.reply.includes('Flights:'), 'Includes flights breakdown');
  assert(ansIncluded.reply.includes('Accommodation:'), 'Includes accommodation breakdown');
  assert(ansIncluded.reply.includes('Transfers:'), 'Includes transfers breakdown');

  // Question 5: What is the current booking status?
  const ansStatus = await PostBookingAssistant.answerTripQuestion('What is the current booking status?', confirmedTrip, 'user_consumer_101');
  assert(ansStatus.reply.includes('CONFIRMED'), 'Returns authoritative CONFIRMED state');
  assert(ansStatus.reply.includes(checkoutResult.bookingId), 'Contains exact booking ID');

  // Question 6: What travel information should I verify before departure?
  const ansPre = await PostBookingAssistant.answerTripQuestion('What travel information should I verify before departure?', confirmedTrip, 'user_consumer_101');
  assert(ansPre.reply.includes('Documentation:'), 'Includes documentation requirement');
  assert(ansPre.reply.includes('Baggage Allowance:'), 'Includes baggage allowance');

  // Question 7: Cancellation request protection (consequential action protection)
  const ansCancel = await PostBookingAssistant.answerTripQuestion('Can you cancel my booking?', confirmedTrip, 'user_consumer_101');
  assert(ansCancel.isActionConsequential === true, 'Flags cancellation as a consequential action');
  assert(ansCancel.requiresUserConfirmation === true, 'Requires explicit user confirmation before cancelling');

  // Execute Authoritative Cancellation
  const cancelResult = await SandboxBookingBridge.cancelBooking('user_consumer_101', checkoutResult.bookingId, 'User requested refund');
  assert(cancelResult.status === 'REFUNDED' || cancelResult.status === 'CANCELLED', 'Authoritative state transitioned to REFUNDED or CANCELLED');
  assert(cancelResult.refundedAmount > 0, 'Refund amount calculated authoritatively');

  console.log('\n=== All Phase 10 Consumer Travel Experience Tests PASSED (28/28 assertions) ===');
}

runPhase10Tests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
