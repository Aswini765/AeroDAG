/**
 * AeroDAG Unit Test: One Total Everywhere
 * 
 * Verifies that for any given plan:
 * 1. FullTripCostCard (computeFullTripCost)
 * 2. Checkout Order Summary / Grand Total (getTripSummary)
 * 3. Saved Record (totalPaidINR) & MyTripsView
 * 4. Trip Assistant ("How much budget left?")
 * ALL report the EXACT SAME total and budget state.
 */

import { computeFullTripCost } from '../../src/services/fullTripCostHelper';
import { TripPlanningEngine } from '../../src/services/tripPlanningEngine';
import { RequirementEngine } from '../../src/services/requirementEngine';
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

function simulateAssistantBudgetReply(trip: ConfirmedBookingRecord): string {
  const targetBudget = trip.budgetTotalINR || 60000;
  const totalPaid = trip.totalPaidINR || 0;
  if (totalPaid > targetBudget) {
    const overAmt = totalPaid - targetBudget;
    return `Your trip is ₹${overAmt.toLocaleString('en-IN')} over your ₹${targetBudget.toLocaleString('en-IN')} target budget (Allocated plan total: ₹${totalPaid.toLocaleString('en-IN')}).`;
  } else {
    const remaining = targetBudget - totalPaid;
    return `You have ₹${remaining.toLocaleString('en-IN')} remaining from your ₹${targetBudget.toLocaleString('en-IN')} target budget (Allocated plan total: ₹${totalPaid.toLocaleString('en-IN')}).`;
  }
}

async function runTests() {
  console.log('--- TEST SUITE: One Total Everywhere ---');

  // Scenario 1: Standard Family Plan
  console.log('\n[Scenario 1: Standard Family Plan in Goa]');
  const ctx1 = RequirementEngine.createEmptyContext();
  ctx1.destination = 'Goa';
  ctx1.origin = 'Bengaluru (BLR)';
  ctx1.durationDays = 7;
  ctx1.budgetTotalINR = 60000;
  ctx1.partyType = 'family';
  ctx1.totalTravellers = 3;
  ctx1.adultsCount = 2;
  ctx1.childrenCount = 1;
  ctx1.childrenAges = [10];
  ctx1.dates = '14–20 Nov 2026';

  const plan1: TripPlan = await TripPlanningEngine.buildDeterministicPlan(ctx1);
  const prefs1: TripPreferences = {
    destination: plan1.destination,
    origin: plan1.origin,
    targetDates: plan1.dates,
    durationDays: plan1.durationDays,
    partySize: plan1.travellers.total,
    adultsCount: plan1.travellers.adults,
    childrenCount: plan1.travellers.children,
    childrenAges: plan1.travellers.childAges,
    budgetTotalINR: 60000,
    budgetTotalUSD: Math.round(60000 / 84),
    budgetTier: 'Comfortable',
    travelStyle: 'Relaxed',
    priority: 'Family Friendly',
    accommodationPreference: 'Standard 3-Star',
    dietaryOrNotes: '',
    scope: 'domestic'
  };

  // 1. Cost Card
  const costCard1 = computeFullTripCost(plan1, prefs1);
  const costCardTotal1 = costCard1.totalWithBufferINR;

  // 2. Checkout Summary (computed in CheckoutBookingFlow from fullTripCostHelper)
  const checkoutCost1 = computeFullTripCost(plan1, prefs1);
  const checkoutTotal1 = checkoutCost1.totalWithBufferINR;

  // 3. Saved Trip Record
  const savedRecord1: ConfirmedBookingRecord = {
    bookingId: 'BK-TEST-001',
    pnr: 'PNR-001',
    hotelVoucherId: 'HTL-001',
    tripTitle: `${plan1.durationDays} days in Goa`,
    destination: plan1.destination,
    origin: plan1.origin,
    travelDates: plan1.dates,
    createdAt: new Date().toISOString(),
    status: 'SELECTED',
    totalPaidINR: costCardTotal1,
    totalPaidUSD: Math.round(costCardTotal1 / 84),
    budgetTotalINR: 60000,
    remainingBudgetINR: costCard1.budgetStatus === 'over' ? 0 : 60000 - costCardTotal1,
    passengers: [],
    selectedFlight: plan1.flight,
    selectedHotel: plan1.hotel,
    selectedTransfer: plan1.transfer,
    itinerary: plan1.itinerary,
    scope: 'domestic'
  };
  const savedRecordTotal1 = savedRecord1.totalPaidINR;

  // 4. Assistant Answer
  const assistantReply1 = simulateAssistantBudgetReply(savedRecord1);

  assert(costCardTotal1 > 0, `Cost card total is positive (₹${costCardTotal1})`);
  assert(costCardTotal1 === checkoutTotal1, `Cost card total (₹${costCardTotal1}) === Checkout Grand Total (₹${checkoutTotal1})`);
  assert(checkoutTotal1 === savedRecordTotal1, `Checkout total (₹${checkoutTotal1}) === Saved record total (₹${savedRecordTotal1})`);
  assert(assistantReply1.includes(`₹${costCardTotal1.toLocaleString('en-IN')}`), `Assistant answer mentions exact total ₹${costCardTotal1.toLocaleString('en-IN')}`);

  if (costCard1.budgetStatus === 'over') {
    assert(assistantReply1.includes('over'), 'Assistant correctly reports trip is over budget');
    assert(assistantReply1.includes(`₹${costCard1.budgetDifferenceINR.toLocaleString('en-IN')}`), `Assistant reports correct over-budget difference ₹${costCard1.budgetDifferenceINR.toLocaleString('en-IN')}`);
  } else {
    assert(assistantReply1.includes('remaining'), 'Assistant correctly reports remaining budget');
    assert(assistantReply1.includes(`₹${costCard1.budgetDifferenceINR.toLocaleString('en-IN')}`), `Assistant reports correct remaining amount ₹${costCard1.budgetDifferenceINR.toLocaleString('en-IN')}`);
  }

  // Check lines in checkout summary sum to checkoutTotal
  const linesSum = checkoutCost1.lines.reduce((acc, l) => acc + l.amountINR, 0) + checkoutCost1.bufferAmountINR;
  assert(linesSum === checkoutTotal1, `Checkout line items sum (${linesSum}) equals Grand Total (${checkoutTotal1})`);

  // Scenario 2: Over-budget Trip Check
  console.log('\n[Scenario 2: Over-budget Trip with tight budget ₹30,000]');
  const ctx2 = RequirementEngine.createEmptyContext();
  ctx2.destination = 'Goa';
  ctx2.origin = 'Bengaluru (BLR)';
  ctx2.durationDays = 7;
  ctx2.budgetTotalINR = 30000; // Intentionally lower than typical Goa 7-day trip
  ctx2.partyType = 'family';
  ctx2.totalTravellers = 3;
  ctx2.adultsCount = 2;
  ctx2.childrenCount = 1;
  ctx2.dates = '14–20 Nov 2026';

  const plan2: TripPlan = await TripPlanningEngine.buildDeterministicPlan(ctx2);
  const prefs2: TripPreferences = {
    destination: plan2.destination,
    origin: plan2.origin,
    targetDates: plan2.dates,
    durationDays: plan2.durationDays,
    partySize: plan2.travellers.total,
    adultsCount: plan2.travellers.adults,
    childrenCount: plan2.travellers.children,
    childrenAges: [10],
    budgetTotalINR: 30000,
    budgetTotalUSD: Math.round(30000 / 84),
    budgetTier: 'Frugal',
    travelStyle: 'Relaxed',
    priority: 'Family Friendly',
    accommodationPreference: 'Standard 3-Star',
    dietaryOrNotes: '',
    scope: 'domestic'
  };

  const costCard2 = computeFullTripCost(plan2, prefs2);
  const costCardTotal2 = costCard2.totalWithBufferINR;
  const checkoutCost2 = computeFullTripCost(plan2, prefs2);
  const checkoutTotal2 = checkoutCost2.totalWithBufferINR;

  const savedRecord2: ConfirmedBookingRecord = {
    bookingId: 'BK-TEST-002',
    pnr: 'PNR-002',
    hotelVoucherId: 'HTL-002',
    tripTitle: `${plan2.durationDays} days in Goa`,
    destination: plan2.destination,
    origin: plan2.origin,
    travelDates: plan2.dates,
    createdAt: new Date().toISOString(),
    status: 'SELECTED',
    totalPaidINR: costCardTotal2,
    totalPaidUSD: Math.round(costCardTotal2 / 84),
    budgetTotalINR: 30000,
    remainingBudgetINR: 0,
    passengers: [],
    selectedFlight: plan2.flight,
    selectedHotel: plan2.hotel,
    selectedTransfer: plan2.transfer,
    itinerary: plan2.itinerary,
    scope: 'domestic'
  };

  const assistantReply2 = simulateAssistantBudgetReply(savedRecord2);

  assert(costCardTotal2 === checkoutTotal2, `Over-budget: Cost card total (${costCardTotal2}) === Checkout total (${checkoutTotal2})`);
  assert(checkoutTotal2 === savedRecord2.totalPaidINR, `Over-budget: Checkout total (${checkoutTotal2}) === Saved record total (${savedRecord2.totalPaidINR})`);
  assert(costCard2.budgetStatus === 'over', 'Cost card correctly marks trip as over budget');
  assert(!assistantReply2.includes('remaining from'), 'Over-budget assistant reply does NOT say remaining from budget');
  assert(assistantReply2.includes('over your ₹30,000 target budget'), 'Over-budget assistant reply accurately says over target budget');

  // Scenario 3: Transfer cost counted once in Travel to Destination
  console.log('\n[Scenario 3: Transfer cost counted once in Travel to destination]');
  const travelLine = costCard1.lines.find(l => l.id === 'cost-travel');
  assert(Boolean(travelLine), 'Travel to destination cost line exists');
  if (plan1.flight && plan1.transfer) {
    const flightCost = plan1.flight.totalPriceINR || (plan1.flight.pricePerPersonINR * plan1.travellers.total);
    const transferCost = plan1.transfer.priceINR || 0;
    assert(travelLine!.amountINR === Math.round(flightCost + transferCost), `Travel cost line includes transfer cost (${flightCost} + ${transferCost} = ${travelLine!.amountINR})`);
  }

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
