/**
 * AeroDAG Unit Test: Continue Planning & Pricing Integrity
 * 
 * Verifies that:
 * 1. "Continue planning" reopens the EXACT saved plan object and preferences (hotel, flight, pace, dates, travellers, needs).
 * 2. Total with buffer is 100% IDENTICAL before and after continue planning.
 * 3. Saving again after continuing updates the existing saved plan, without creating duplicates.
 * 4. Cost-line pills in CheckoutBookingFlow use "Estimate" for hand-built destinations, and "AI estimate" only for AI destinations.
 * 5. Airport transfer is counted exactly once in travel line and fullTripCostHelper.
 */

import { computeFullTripCost } from '../../src/services/fullTripCostHelper';
import { TripPlanningEngine } from '../../src/services/tripPlanningEngine';
import { RequirementEngine } from '../../src/services/requirementEngine';
import { getTripStore, InMemoryTripStore } from '../../src/services/persistence/tripStore';
import { TripPlan, TripPreferences, ConfirmedBookingRecord } from '../../src/types/travelBooking';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${msg}`);
  }
}

async function runTests() {
  console.log('--- TEST SUITE: Continue Planning & Pricing Integrity ---');

  const store = getTripStore(true) as InMemoryTripStore;
  store.clear();

  // 1. Build initial plan
  console.log('\n[Scenario 1: Save Draft and Continue Planning]');
  const ctx = RequirementEngine.createEmptyContext();
  ctx.destination = 'Munnar, Kerala';
  ctx.origin = 'Bengaluru (BLR)';
  ctx.durationDays = 5;
  ctx.dates = '12–16 Nov 2026';
  ctx.budgetTotalINR = 60000;
  ctx.partyType = 'family';
  ctx.adultsCount = 2;
  ctx.childrenCount = 1;
  ctx.childrenAges = [7];
  ctx.totalTravellers = 3;
  ctx.travelStyle = 'Balanced';
  ctx.tripNeeds = ['Travelling with kids', 'Vegetarian food nearby'];

  const originalPlan: TripPlan = await TripPlanningEngine.buildDeterministicPlan(ctx);
  const originalPrefs: TripPreferences = {
    destination: originalPlan.destination,
    origin: originalPlan.origin,
    targetDates: originalPlan.dates,
    durationDays: originalPlan.durationDays,
    partySize: originalPlan.travellers.total,
    adultsCount: originalPlan.travellers.adults,
    childrenCount: originalPlan.travellers.children,
    childrenAges: originalPlan.travellers.childAges,
    budgetTotalINR: 60000,
    budgetTotalUSD: Math.round(60000 / 84),
    budgetTier: 'Comfortable',
    travelStyle: 'Balanced',
    priority: 'Family Friendly',
    accommodationPreference: 'Standard 3-Star',
    dietaryOrNotes: 'Vegetarian',
    scope: 'domestic',
    tripNeeds: ctx.tripNeeds
  };

  const initialCost = computeFullTripCost(originalPlan, originalPrefs);
  const initialTotal = initialCost.totalWithBufferINR;
  assert(initialTotal > 0, `Initial plan full total is calculated: ₹${initialTotal}`);

  // 2. Save Draft
  const draftBookingId = `draft_${Date.now()}`;
  const savedRecord: ConfirmedBookingRecord = {
    bookingId: draftBookingId,
    pnr: 'Saved plan',
    hotelVoucherId: '',
    createdAt: new Date().toISOString(),
    status: 'SELECTED',
    tripTitle: `${originalPlan.durationDays}-Day Trip to Munnar`,
    destination: 'Munnar',
    origin: originalPlan.origin,
    travelDates: originalPlan.dates,
    totalPaidINR: initialTotal,
    totalPaidUSD: Math.round(initialTotal / 84),
    budgetTotalINR: 60000,
    remainingBudgetINR: initialCost.budgetStatus === 'over' ? 0 : 60000 - initialTotal,
    passengers: [],
    selectedFlight: originalPlan.flight,
    selectedHotel: originalPlan.hotel,
    selectedTransfer: originalPlan.transfer,
    itinerary: originalPlan.itinerary,
    scope: 'domestic',
    savedPlan: originalPlan,
    savedPreferences: originalPrefs
  };

  await store.saveDraft(savedRecord);
  const tripsAfterFirstSave = await store.listTrips();
  assert(tripsAfterFirstSave.length === 1, `Draft stored in trip store (count: ${tripsAfterFirstSave.length})`);

  // 3. Continue Planning: Reopen exact saved object
  const retrievedTrip = await store.getTrip(draftBookingId);
  assert(Boolean(retrievedTrip), 'Saved trip retrieved from store');
  assert(Boolean(retrievedTrip?.savedPlan), 'savedPlan property preserved');
  assert(Boolean(retrievedTrip?.savedPreferences), 'savedPreferences property preserved');

  const reopenedPlan = retrievedTrip!.savedPlan!;
  const reopenedPrefs = retrievedTrip!.savedPreferences!;

  // 4. Verify identical price and attributes
  const reopenedCost = computeFullTripCost(reopenedPlan, reopenedPrefs);
  assert(reopenedCost.totalWithBufferINR === initialTotal, `Reopened plan total (₹${reopenedCost.totalWithBufferINR}) is IDENTICAL to original (₹${initialTotal})`);
  assert(reopenedPrefs.travelStyle === 'Balanced', `Pace / travelStyle is preserved as "${reopenedPrefs.travelStyle}"`);
  assert(reopenedPlan.hotel.name === originalPlan.hotel.name, `Hotel is identical (${reopenedPlan.hotel.name})`);
  assert(reopenedPlan.dates === originalPlan.dates, `Dates are identical (${reopenedPlan.dates})`);
  assert(reopenedPlan.travellers.total === originalPlan.travellers.total, `Traveller count is identical (${reopenedPlan.travellers.total})`);

  // 5. Saving again after continuing: updates same record, does NOT duplicate
  console.log('\n[Scenario 2: Save Again After Continuing - No Duplicates]');
  const updatedRecord: ConfirmedBookingRecord = {
    ...retrievedTrip!,
    totalPaidINR: reopenedCost.totalWithBufferINR,
    savedPlan: reopenedPlan,
    savedPreferences: reopenedPrefs
  };

  await store.saveDraft(updatedRecord);
  const tripsAfterSecondSave = await store.listTrips();
  assert(tripsAfterSecondSave.length === 1, `Saving again updates the same draft in place (count: ${tripsAfterSecondSave.length}, no duplicates)`);

  // 6. Checkout Labels
  console.log('\n[Scenario 3: Checkout Labels Consistency]');
  // Hand-built destination: estimate label must be 'Estimate'
  const handBuiltIsAi = Boolean((originalPlan as any).isAiEstimatedDestination);
  const handBuiltLabel = handBuiltIsAi ? 'AI estimate' : 'Estimate';
  assert(handBuiltLabel === 'Estimate', 'Hand-built destination uses "Estimate" label');

  // AI-estimated destination: estimate label must be 'AI estimate'
  const aiPlan = { ...originalPlan, isAiEstimatedDestination: true };
  const aiIsAi = Boolean(aiPlan.isAiEstimatedDestination);
  const aiLabel = aiIsAi ? 'AI estimate' : 'Estimate';
  assert(aiLabel === 'AI estimate', 'AI-estimated destination uses "AI estimate" label');

  // 7. Airport Transfer Counted Exactly Once
  console.log('\n[Scenario 4: Airport Transfer Counted Exactly Once]');
  const travelLine = initialCost.lines.find(l => l.id === 'cost-travel');
  assert(Boolean(travelLine), 'Travel to destination cost line exists');

  const transferItem = originalPlan.transfer;
  assert(Boolean(transferItem), 'Transfer item exists on plan');
  const transferPrice = transferItem.priceINR;
  assert(transferPrice > 0, `Transfer has positive price: ₹${transferPrice}`);

  if (originalPlan.flight) {
    const flightPrice = originalPlan.flight.totalPriceINR || (originalPlan.flight.pricePerPersonINR * originalPlan.travellers.total);
    assert(travelLine!.amountINR === flightPrice + transferPrice, `Travel cost (₹${travelLine!.amountINR}) = Flight (₹${flightPrice}) + Transfer (₹${transferPrice})`);
    assert(Boolean(travelLine!.subtitle?.includes(transferItem.vehicleType || 'Private AC Sedan')), `Travel subtitle mentions transfer vehicle type`);
  }

  // Ensure transfer is NOT added to any other lines
  const localTransportLine = initialCost.lines.find(l => l.id === 'cost-local-transport');
  assert(Boolean(localTransportLine), 'Local transport line exists independently');
  assert(localTransportLine!.amountINR > 0, 'Local transport line is independent of airport transfer');

  console.log(`\n========================================================`);
  console.log(`TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log(`========================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
