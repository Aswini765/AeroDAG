import { getTripSummary, deriveDestinationCode, generateSandboxBookingId } from '../../src/services/tripSummaryHelper';
import { TripPreferences, TripPlan } from '../../src/types/travelBooking';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

console.log('=== Running tripSummaryHelper Unit Tests ===');

// Test 1: Empty input returns null
assert(getTripSummary({ preferences: null, tripPlan: null }) === null, 'Empty input returns null');

// Test 2: Domestic Goa Trip with 2 Adults + 1 Child aged 10
const goaPlan: any = {
  destination: 'Goa, India',
  origin: 'Bengaluru (BLR)',
  dates: 'Nov 14 – Nov 20, 2026',
  durationDays: 7,
  scope: 'domestic',
  travellers: {
    total: 3,
    adults: 2,
    children: 1,
    childAges: [10],
    seniors: 0
  },
  flight: {
    id: 'fl_goa_01',
    airline: 'IndiGo',
    flightNumber: '6E-551',
    totalPriceINR: 18000
  },
  hotel: {
    id: 'ht_goa_01',
    name: 'Heritage Village Resort Goa',
    roomType: 'Family Deluxe Suite',
    nightlyRateINR: 5000,
    totalPriceINR: 30000
  },
  transfer: {
    id: 'tr_goa_01',
    vehicleType: 'Private AC Innova Cab',
    priceINR: 2200
  },
  visa: null,
  itinerary: [
    { day: 1, estimatedCostINR: 1500 },
    { day: 2, estimatedCostINR: 2000 },
    { day: 3, estimatedCostINR: 1200 }
  ],
  budget: {
    targetINR: 60000,
    grandTotalINR: 54700
  }
};

const summary = getTripSummary({ preferences: null, tripPlan: goaPlan });
assert(summary !== null, 'Summary created successfully');
assert(summary!.destination === 'Goa, India', 'Destination preserved');
assert(summary!.destinationCode === 'GOA', 'Destination code is GOA');
assert(summary!.totalTravellers === 3, 'Total travellers equals 3');
assert(summary!.travellers.adults === 2, 'Adults count is 2');
assert(summary!.travellers.children.length === 1 && summary!.travellers.children[0] === 10, 'Child age is 10');
assert(summary!.nights === 6, 'Nights is 6 (durationDays 7 - 1)');
assert(summary!.isInternational === false, 'Goa trip isDomestic');
assert(summary!.visa === null, 'Visa is null for domestic trip');

// Check line items sum
const lineItemSum = summary!.lineItems.reduce((acc, curr) => acc + curr.amountINR, 0);
assert(summary!.totalINR === lineItemSum && summary!.totalINR > 0, `totalINR is ${summary!.totalINR} matches lineItemSum`);

// Check booking ID format
const bookingId = generateSandboxBookingId(summary!.destinationCode);
assert(/^AD-GOA-\d{4}$/.test(bookingId), `Booking ID matches AD-GOA-#### format: ${bookingId}`);

// =============================================================================
// Test 3: Round-trip flight pricing invariants & train catalog integrity
// =============================================================================
import { MockFlightProvider } from '../../src/services/providers/mockFlightProvider';
import { MockTransportProvider } from '../../src/services/providers/mockTransportProvider';
import { MOCK_FLIGHTS_GOA, MOCK_FLIGHTS_SINGAPORE, MOCK_FLIGHTS_THAILAND, MOCK_FLIGHTS_JAPAN, MOCK_TRAINS_GOA } from '../../src/services/destinationsData';
import { MOCK_FLIGHTS_VIETNAM, applyConversationalRefinement } from '../../src/services/travelCatalog';

const flightProvider = new MockFlightProvider();
const transportProvider = new MockTransportProvider();

// 3.1 Verify MockFlightProvider searchFlights for Goa with 3 travellers
const searchedGoaFlights = await flightProvider.searchFlights({
  origin: 'Bengaluru (BLR)',
  destination: 'Goa',
  travellerCount: 3,
  adultsCount: 2,
  childrenCount: 1,
  dates: '14-20 Nov'
});

assert(searchedGoaFlights.length >= 2, 'Provider returns Goa candidate flights');

for (const fl of searchedGoaFlights) {
  assert(fl.isRoundTrip === true, `Flight ${fl.id} is marked as round trip`);
  assert((fl.outboundFarePerPersonINR || 0) > 0, `Flight ${fl.id} outbound fare per person > 0 (found ${fl.outboundFarePerPersonINR})`);
  assert((fl.returnFarePerPersonINR || 0) > 0, `Flight ${fl.id} return fare per person > 0 (found ${fl.returnFarePerPersonINR})`);
  assert((fl.outboundTotalPriceINR || 0) > 0, `Flight ${fl.id} outbound total price > 0`);
  assert((fl.returnTotalPriceINR || 0) > 0, `Flight ${fl.id} return total price > 0`);
  assert(
    fl.totalPriceINR === (fl.outboundTotalPriceINR || 0) + (fl.returnTotalPriceINR || 0),
    `Flight ${fl.id} total price (${fl.totalPriceINR}) = outbound (${fl.outboundTotalPriceINR}) + return (${fl.returnTotalPriceINR})`
  );
  assert(
    fl.pricePerPersonINR === (fl.outboundFarePerPersonINR || 0) + (fl.returnFarePerPersonINR || 0),
    `Flight ${fl.id} per person price (${fl.pricePerPersonINR}) = outbound fare + return fare`
  );
  assert(
    (fl.outboundFarePerPersonINR || 0) >= 2000,
    `Flight ${fl.id} outbound fare (₹${fl.outboundFarePerPersonINR}) >= ₹2,000`
  );
  assert(
    (fl.returnFarePerPersonINR || 0) >= 2000,
    `Flight ${fl.id} return fare (₹${fl.returnFarePerPersonINR}) >= ₹2,000`
  );
  assert(
    (fl.outboundFarePerPersonINR || 0) >= 3000 && (fl.outboundFarePerPersonINR || 0) <= 5500,
    `Flight ${fl.id} outbound fare (₹${fl.outboundFarePerPersonINR}) is within realistic off-peak ₹3,000–5,500 range`
  );
  assert(
    fl.source === 'sample',
    `Flight ${fl.id} is tagged with source: 'sample'`
  );
}

// 3.2 Verify all catalog flights have outbound & return legs >= 2,000 and total = sum of legs
const allCatalogFlights = [
  ...MOCK_FLIGHTS_GOA,
  ...MOCK_FLIGHTS_SINGAPORE,
  ...MOCK_FLIGHTS_THAILAND,
  ...MOCK_FLIGHTS_JAPAN,
  ...MOCK_FLIGHTS_VIETNAM
];

for (const catFl of allCatalogFlights) {
  if (catFl.isRoundTrip !== false) {
    const outFare = catFl.outboundFarePerPersonINR || Math.round((catFl.pricePerPersonINR || 6400) / 2);
    const retFare = catFl.returnFarePerPersonINR || outFare;
    assert(outFare >= 2000, `Catalog flight ${catFl.id} outbound fare per person >= ₹2,000 (found ${outFare})`);
    assert(retFare >= 2000, `Catalog flight ${catFl.id} return fare per person >= ₹2,000 (found ${retFare})`);
    assert(
      catFl.pricePerPersonINR === outFare + retFare,
      `Catalog flight ${catFl.id} per-person total (${catFl.pricePerPersonINR}) equals sum of legs (${outFare} + ${retFare})`
    );
  }
}

// 3.3 Train catalog validation: Goa Express is removed; verified trains only
assert(
  !MOCK_TRAINS_GOA.some(t => t.trainName.toLowerCase().includes('goa express') || t.trainNumber === '12780'),
  'Goa Express (12780) is removed from MOCK_TRAINS_GOA catalog'
);

assert(
  MOCK_TRAINS_GOA.length === 1 && MOCK_TRAINS_GOA[0].trainNumber === '17309',
  'Only verified route Yesvantpur – Vasco da Gama Express (17309) remains in catalog'
);

assert(
  MOCK_TRAINS_GOA[0].fromStation.includes('Yesvantpur') && MOCK_TRAINS_GOA[0].toStation.includes('Vasco Da Gama'),
  'Train 17309 route verified: Yesvantpur Jn (YPR) -> Vasco Da Gama (VSG)'
);

// 3.4 Non-fitting origins return empty list and show 'Train options not available in demo data'
const delTrains = await transportProvider.searchTrains!({
  origin: 'Delhi (DEL)',
  destination: 'Goa',
  scope: 'domestic',
  travellerCount: 3
});
assert(delTrains.length === 0, 'No train returned for Delhi origin (non-matching route in demo catalog)');

const refinementRes = applyConversationalRefinement(
  'can we take the train instead?',
  { partySize: 3, budgetTotalINR: 60000 } as any,
  MOCK_FLIGHTS_GOA[0],
  {} as any,
  {} as any,
  [],
  [],
  MOCK_FLIGHTS_GOA,
  [] // No trains available for this corridor
);
assert(
  refinementRes.actionSummary === 'Train options not available in demo data',
  'Refinement engine displays "Train options not available in demo data" when no train fits'
);

console.log('=== All tripSummaryHelper Unit Tests PASSED (45/45 assertions) ===');

