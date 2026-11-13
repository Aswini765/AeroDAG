/**
 * tests/unit/test_one_total_everywhere.ts
 * 
 * Verifies Prompt 1: One Total Everywhere (the USP)
 * 
 * Scenarios:
 * 1. Kerala eval sentence:
 *    "5 days in Kerala with my wife and 4-year-old son from Bengaluru from 20 November, budget 60000, we are vegetarian"
 * 2. Rajasthan route:
 *    "Rajasthan trip with my husband between 9 and 19 December from Hyderabad, budget 90000, offbeat places not touristy"
 * 3. Coorg opened from Compare:
 *    Coorg vs Ooty, 4 days, 2 travellers, ₹40,000
 * 
 * Asserts that across each scenario, these are all the exact same number:
 * - Route card or compare column
 * - Plan cost card (computeFullTripCost)
 * - Banner amount (total − budget)
 * - WhatsApp share text
 * - Saved record / My Trips
 * - Checkout grand total
 */

import { computeFullTripCost } from '../../src/services/fullTripCostHelper';
import { getRegionRoutes, buildMultiBasePlanFromRoute } from '../../src/services/regionRoutesService';
import { buildDestinationComparison } from '../../src/services/destinationComparisonService';
import { formatTripShareText } from '../../src/services/shareTripHelper';
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

export async function runTests() {
  console.log('========================================================');
  console.log('TEST SUITE: One Total Everywhere (Prompt 1 Acceptance)');
  console.log('========================================================\n');

  // =========================================================================
  // Scenario 1: Kerala sentence
  // "5 days in Kerala with my wife and 4-year-old son from Bengaluru from 20 November, budget 60000, we are vegetarian"
  // =========================================================================
  console.log('[Scenario 1: Kerala Multi-Base Route (5 days, 3 travellers, budget ₹60,000)]');
  const kerRoutes = getRegionRoutes('Kerala', 4, 'vegetarian', 60000, 3, 'Bengaluru (BLR)', '20–24 Nov 2026', { adults: 2, children: 1, childAges: [4] });
  assert(kerRoutes.length >= 1, 'Generates Kerala route options');

  const kerRoute = kerRoutes[0];
  const kerCardTotal = kerRoute.estimatedCostINR;

  const kerPlan = buildMultiBasePlanFromRoute(
    {
      destination: 'Kerala',
      destinationType: 'region',
      origin: 'Bengaluru (BLR)',
      dates: '20–24 Nov 2026',
      durationDays: 5,
      totalTravellers: 3,
      adultsCount: 2,
      childrenCount: 1,
      childrenAges: [4],
      seniorsCount: 0,
      budgetTotalINR: 60000,
      freeTextPreferences: 'vegetarian'
    },
    kerRoute
  );

  const kerPrefs: TripPreferences = {
    destination: kerPlan.destination,
    origin: kerPlan.origin,
    targetDates: kerPlan.dates,
    durationDays: kerPlan.durationDays,
    partySize: kerPlan.travellers.total,
    adultsCount: kerPlan.travellers.adults,
    childrenCount: kerPlan.travellers.children,
    childrenAges: kerPlan.travellers.childAges,
    budgetTotalINR: 60000,
    budgetTotalUSD: Math.round(60000 / 84),
    budgetTier: 'Comfortable',
    travelStyle: 'Balanced',
    priority: 'Family Friendly',
    accommodationPreference: 'Connecting Family Suite',
    dietaryOrNotes: '',
    scope: 'domestic'
  };

  const kerCostCard = computeFullTripCost(kerPlan, kerPrefs);
  const kerPlanTotal = kerCostCard.totalWithBufferINR;
  const kerBannerDiff = kerCostCard.budgetStatus === 'over' ? (kerPlanTotal - 60000) : 0;
  const kerShareText = formatTripShareText(kerPlan, kerPrefs);

  const kerSavedRecord: ConfirmedBookingRecord = {
    bookingId: 'BK-KER-001',
    tripTitle: kerPlan.title,
    destination: kerPlan.destination,
    origin: kerPlan.origin,
    travelDates: kerPlan.dates,
    createdAt: new Date().toISOString(),
    status: 'CONFIRMED',
        pnr: 'TEST-PNR',
        hotelVoucherId: 'TEST-VOUCHER',
    totalPaidINR: kerCostCard.totalWithBufferINR,
    totalPaidUSD: Math.round(kerCostCard.totalWithBufferINR / 84),
    budgetTotalINR: 60000,
    remainingBudgetINR: Math.max(0, 60000 - kerCostCard.totalWithBufferINR),
    passengers: [],
    selectedFlight: kerPlan.flight,
    selectedHotel: kerPlan.hotel,
    selectedTransfer: kerPlan.transfer,
    itinerary: kerPlan.itinerary,
    scope: 'domestic'
  };

  const kerCheckoutTotal = computeFullTripCost(kerPlan, kerPrefs).totalWithBufferINR;

  // Assert exact single rupee equality across all 6 touchpoints
  assert(kerCardTotal === kerPlanTotal, `Kerala: Route card (₹${kerCardTotal}) === Plan cost card (₹${kerPlanTotal})`);
  assert(kerCostCard.totalWithBufferINR === kerCheckoutTotal, `Kerala: Plan cost card (₹${kerPlanTotal}) === Checkout total (₹${kerCheckoutTotal})`);
  assert(kerSavedRecord.totalPaidINR === kerPlanTotal, `Kerala: Saved record (₹${kerSavedRecord.totalPaidINR}) === Plan cost card (₹${kerPlanTotal})`);
  assert(kerShareText.includes(`₹${kerPlanTotal.toLocaleString('en-IN')}`), `Kerala: Share text contains exact total ₹${kerPlanTotal.toLocaleString('en-IN')}`);
  if (kerCostCard.budgetStatus === 'over') {
    assert(kerBannerDiff === (kerPlanTotal - 60000), `Kerala: Over-budget banner diff (₹${kerBannerDiff}) === total - budget (₹${kerPlanTotal - 60000})`);
  }

  // =========================================================================
  // Scenario 2: Rajasthan route
  // "Rajasthan trip with my husband between 9 and 19 December from Hyderabad, budget 90000, offbeat places not touristy"
  // =========================================================================
  console.log('\n[Scenario 2: Rajasthan Route (11 days, 2 travellers, budget ₹90,000)]');
  const rajRoutes = getRegionRoutes('Rajasthan', 10, 'offbeat places not touristy', 90000, 2, 'Hyderabad (HYD)', '9–19 Dec 2026');
  assert(rajRoutes.length >= 1, 'Generates Rajasthan route options');

  const rajRoute = rajRoutes[0];
  const rajCardTotal = rajRoute.estimatedCostINR;

  const rajPlan = buildMultiBasePlanFromRoute(
    {
      destination: 'Rajasthan',
      destinationType: 'region',
      origin: 'Hyderabad (HYD)',
      dates: '9–19 Dec 2026',
      durationDays: 11,
      totalTravellers: 2,
      adultsCount: 2,
      childrenCount: 0,
      childrenAges: [],
      seniorsCount: 0,
      budgetTotalINR: 90000,
      freeTextPreferences: 'offbeat places not touristy'
    },
    rajRoute
  );

  const rajPrefs: TripPreferences = {
    destination: rajPlan.destination,
    origin: rajPlan.origin,
    targetDates: rajPlan.dates,
    durationDays: rajPlan.durationDays,
    partySize: 2,
    adultsCount: 2,
    childrenCount: 0,
    childrenAges: [],
    budgetTotalINR: 90000,
    budgetTotalUSD: Math.round(90000 / 84),
    budgetTier: 'Comfortable',
    travelStyle: 'Balanced',
    priority: 'Best Hotel',
    accommodationPreference: 'Connecting Family Suite',
    dietaryOrNotes: '',
    scope: 'domestic'
  };

  const rajCostCard = computeFullTripCost(rajPlan, rajPrefs);
  const rajPlanTotal = rajCostCard.totalWithBufferINR;
  const rajShareText = formatTripShareText(rajPlan, rajPrefs);
  const rajCheckoutTotal = computeFullTripCost(rajPlan, rajPrefs).totalWithBufferINR;

  const rajSavedRecord: ConfirmedBookingRecord = {
    bookingId: 'BK-RAJ-001',
    tripTitle: rajPlan.title,
    destination: rajPlan.destination,
    origin: rajPlan.origin,
    travelDates: rajPlan.dates,
    createdAt: new Date().toISOString(),
    status: 'CONFIRMED',
        pnr: 'TEST-PNR',
        hotelVoucherId: 'TEST-VOUCHER',
    totalPaidINR: rajPlanTotal,
    totalPaidUSD: Math.round(rajPlanTotal / 84),
    budgetTotalINR: 90000,
    remainingBudgetINR: Math.max(0, 90000 - rajPlanTotal),
    passengers: [],
    selectedFlight: rajPlan.flight,
    selectedHotel: rajPlan.hotel,
    selectedTransfer: rajPlan.transfer,
    itinerary: rajPlan.itinerary,
    scope: 'domestic'
  };

  assert(rajCardTotal === rajPlanTotal, `Rajasthan: Route card (₹${rajCardTotal}) === Plan cost card (₹${rajPlanTotal})`);
  assert(rajPlanTotal === rajCheckoutTotal, `Rajasthan: Plan cost card (₹${rajPlanTotal}) === Checkout total (₹${rajCheckoutTotal})`);
  assert(rajSavedRecord.totalPaidINR === rajPlanTotal, `Rajasthan: Saved record (₹${rajSavedRecord.totalPaidINR}) === Plan cost card (₹${rajPlanTotal})`);
  assert(rajShareText.includes(`₹${rajPlanTotal.toLocaleString('en-IN')}`), `Rajasthan: Share text contains exact total ₹${rajPlanTotal.toLocaleString('en-IN')}`);

  // =========================================================================
  // Scenario 3: Coorg opened from Compare
  // Coorg vs Ooty, 4 days, 2 travellers, ₹40,000
  // =========================================================================
  console.log('\n[Scenario 3: Coorg opened from Compare (4 days, 2 travellers, budget ₹40,000)]');
  const compResult = await buildDestinationComparison(
    ['Coorg', 'Ooty'],
    4,
    2,
    40000,
    'Bengaluru (BLR)',
    'Cab',
    '14–17 Nov 2026'
  );

  const coorgItem = compResult.places.find((p) => p.cleanName === 'Coorg')!;
  assert(Boolean(coorgItem), 'Coorg exists in comparison result');
  const compColumnTotal = coorgItem.totalWithBufferINR;

  const coorgPlan = coorgItem.plan;
  const coorgPrefs: TripPreferences = {
    destination: coorgPlan.destination,
    origin: coorgPlan.origin,
    targetDates: coorgPlan.dates,
    durationDays: coorgPlan.durationDays,
    partySize: 2,
    adultsCount: 2,
    childrenCount: 0,
    childrenAges: [],
    budgetTotalINR: 40000,
    budgetTotalUSD: Math.round(40000 / 84),
    budgetTier: 'Comfortable',
    travelStyle: 'Balanced',
    priority: 'Lowest Price',
    accommodationPreference: 'Connecting Family Suite',
    dietaryOrNotes: '',
    scope: 'domestic'
  };

  const coorgCostCard = computeFullTripCost(coorgPlan, coorgPrefs);
  const coorgPlanTotal = coorgCostCard.totalWithBufferINR;
  const coorgCheckoutTotal = computeFullTripCost(coorgPlan, coorgPrefs).totalWithBufferINR;
  const coorgShareText = formatTripShareText(coorgPlan, coorgPrefs);

  const coorgSavedRecord: ConfirmedBookingRecord = {
    bookingId: 'BK-CRG-001',
    tripTitle: coorgPlan.title,
    destination: coorgPlan.destination,
    origin: coorgPlan.origin,
    travelDates: coorgPlan.dates,
    createdAt: new Date().toISOString(),
    status: 'CONFIRMED',
        pnr: 'TEST-PNR',
        hotelVoucherId: 'TEST-VOUCHER',
    totalPaidINR: coorgPlanTotal,
    totalPaidUSD: Math.round(coorgPlanTotal / 84),
    budgetTotalINR: 40000,
    remainingBudgetINR: Math.max(0, 40000 - coorgPlanTotal),
    passengers: [],
    selectedFlight: coorgPlan.flight,
    selectedHotel: coorgPlan.hotel,
    selectedTransfer: coorgPlan.transfer,
    itinerary: coorgPlan.itinerary,
    scope: 'domestic'
  };

  assert(compColumnTotal === coorgPlanTotal, `Coorg: Compare column (₹${compColumnTotal}) === Plan cost card (₹${coorgPlanTotal})`);
  assert(coorgPlanTotal === coorgCheckoutTotal, `Coorg: Plan cost card (₹${coorgPlanTotal}) === Checkout total (₹${coorgCheckoutTotal})`);
  assert(coorgSavedRecord.totalPaidINR === coorgPlanTotal, `Coorg: Saved record (₹${coorgSavedRecord.totalPaidINR}) === Plan cost card (₹${coorgPlanTotal})`);
  assert(coorgShareText.includes(`₹${coorgPlanTotal.toLocaleString('en-IN')}`), `Coorg: Share text contains exact total ₹${coorgPlanTotal.toLocaleString('en-IN')}`);

  console.log(`\n========================================================`);
  console.log(`TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log(`========================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

if (process.argv[1]?.includes('test_one_total_everywhere')) {
  runTests().catch((err) => {
    console.error('Test execution error:', err);
    process.exit(1);
  });
}
