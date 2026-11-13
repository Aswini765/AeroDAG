/**
 * tests/unit/test_india_coverage.ts
 *
 * "Whatever place in India the user types, they get a plan."
 * - Every region that gets the route step has real, named routes (never "Base 1 / Base 2").
 * - Region detection matches whole state names only ("Coorg, Karnataka" is not Karnataka).
 * - When the AI is busy, the offline India reference still produces a full plan with the
 *   right airport (or an honest "check the route"), real sights, and one consistent total.
 */
import { isKnownRegion } from '../../src/server/parseTripHandler';
import { REGION_ROUTES, REGION_ALIASES } from '../../src/services/regionRoutesData';
import { getRegionRoutes } from '../../src/services/regionRoutesService';
import { buildFallbackProfile, findIndiaPlace } from '../../src/services/indiaPlaces';
import { buildPlanFromDestinationProfile } from '../../src/services/aiDestinationPlanBuilder';
import { computeFullTripCost } from '../../src/services/fullTripCostHelper';
import { buildHotelSearchUrl, buildFlightSearchUrl } from '../../src/services/bookingLinks';

let passed = 0;
function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
  passed++;
  console.log(`✓ PASS ${msg}`);
}

// 1. Region detection
for (const r of ['Rajasthan', 'Himachal Pradesh', 'Kashmir', 'Ladakh', 'Sikkim', 'Meghalaya', 'North-East', 'Tamil Nadu', 'Karnataka', 'Gujarat', 'Odisha', 'Arunachal Pradesh', 'Assam', 'Uttarakhand', 'Kerala']) {
  assert(isKnownRegion(r), `${r} is a region`);
}
for (const c of ['Coorg, Karnataka', 'Leh Ladakh', 'Goa', 'Hampi', 'Tawang', 'Shillong', 'Spiti valley', 'Rishikesh', 'Andaman']) {
  assert(!isKnownRegion(c), `${c} is a single place, not a whole state`);
}

// 2. Every non-curated region has real routes with real names and computed totals
for (const key of Object.keys(REGION_ALIASES)) {
  if (key === 'rajasthan' || key === 'kerala') continue;
  assert((REGION_ROUTES[key] || []).length >= 1, `${key} has at least one real route`);
  const name = REGION_ALIASES[key][0];
  const routes = getRegionRoutes(name, 6, null, 80000, 2);
  assert(routes.length >= 1, `${name}: route step returns routes`);
  for (const r of routes) {
    assert(!/Base \d/.test(r.title + r.nightsPerBaseText), `${name}: "${r.title}" has real place names`);
    assert(r.bases.reduce((a, b) => a + b.nights, 0) === 6, `${name}: "${r.title}" nights add up to 6`);
    assert(r.estimatedCostINR > 10000, `${name}: "${r.title}" total is computed (₹${r.estimatedCostINR})`);
  }
}

// 3. Offline plans for any Indian place
const ctx = (destination: string) => ({
  destination,
  origin: 'Bengaluru (BLR)',
  dates: '20–24 Nov 2026',
  durationDays: 5,
  adultsCount: 2,
  childrenCount: 0,
  totalTravellers: 2,
  budgetTotalINR: 60000
});

for (const place of ['Tawang', 'Hampi', 'Varanasi', 'Shillong', 'Leh', 'Andaman', 'Rishikesh', 'Kanyakumari']) {
  assert(findIndiaPlace(place) !== null, `${place} is in the India reference`);
  const profile = buildFallbackProfile(place);
  const plan = buildPlanFromDestinationProfile(ctx(place) as any, profile);
  const text = JSON.stringify(plan);
  assert(plan.destination.toLowerCase().includes(place.toLowerCase()), `${place}: plan is for ${place}`);
  assert(!plan.isAiEstimatedDestination, `${place}: offline plan is labelled "Estimate", not "AI estimate"`);
  assert(!/BLR→BLR/.test(text), `${place}: no fake Bengaluru→Bengaluru flight`);
  const ref = findIndiaPlace(place)!;
  if (ref.airport) assert(text.includes(ref.airport.code), `${place}: uses its real nearest airport ${ref.airport.code}`);
  assert(plan.itinerary.some((d: any) => ref.sights.some((s) => JSON.stringify(d).includes(s))), `${place}: day plan names real sights`);
  const cost = computeFullTripCost(plan, { destination: place, origin: 'Bengaluru (BLR)', targetDates: plan.dates, durationDays: 5, partySize: 2, adultsCount: 2, childrenCount: 0, childrenAges: [], budgetTotalINR: 60000, budgetTotalUSD: 714, budgetTier: 'Comfortable', travelStyle: 'Balanced', priority: 'Family Friendly', accommodationPreference: 'Connecting Family Suite', dietaryOrNotes: '', scope: 'domestic' });
  assert(cost.totalWithBufferINR > 0, `${place}: total computed (₹${cost.totalWithBufferINR})`);
}

// Unknown small place: still a plan, with an honest "check the route" instead of an invented airport
{
  const profile = buildFallbackProfile('Ziro');
  const plan = buildPlanFromDestinationProfile(ctx('Ziro') as any, profile);
  assert(/Ziro/.test(plan.destination), 'Unknown place Ziro still gets a plan');
  assert(/check the best route/.test(plan.flight?.airline || ''), 'Unknown place: travel line says to check the route');
}

// 4. Booking links carry place, dates and guests
{
  const h = buildHotelSearchUrl('Coorg', '20–23 Nov 2026', { adults: 2, children: 1, childAges: [4] });
  assert(h.includes('checkin=11202026') && h.includes('checkout=11232026'), 'Hotel link has check-in and check-out');
  assert(h.includes('roomStayQualifier=2e1e4e') && h.includes('searchText=Coorg'), 'Hotel link has guests and place');
  const f = buildFlightSearchUrl('BLR', 'IXB', '20–24 Nov 2026', { adults: 2 });
  assert(!!f && f.includes('BLR-IXB-20/11/2026_IXB-BLR-24/11/2026') && f.includes('paxType=A-2_C-0_I-0'), 'Flight link has route, dates and passengers');
  assert(buildFlightSearchUrl('BLR', 'BLR', '20–24 Nov 2026', { adults: 2 }) === null, 'No flight link for same-city "flight"');
}

// 5. Starting city is read from the text and used for the flight
{
  const { findOriginInText, originCodeFor } = await import('../../src/services/originCities');
  assert(findOriginInText('Tawang trip 6 days for 2 from Kolkata')?.code === 'CCU', '"from Kolkata" → CCU');
  assert(findOriginInText('weekend in coorg from pune')?.code === 'PNQ', '"from pune" → PNQ');
  assert(findOriginInText('5 days in Goa') === null, 'No origin when none is stated');
  assert(originCodeFor('Lucknow') === 'LKO' && originCodeFor('Kolkata (CCU)') === 'CCU', 'Origin labels map to airport codes');
  const plan = buildPlanFromDestinationProfile({ ...ctx('Tawang'), origin: 'Kolkata (CCU)' } as any, buildFallbackProfile('Tawang'));
  assert(/CCU→TEZ/.test(plan.flight?.airline || ''), 'Tawang from Kolkata flies CCU→TEZ, not BLR');
}

console.log(`\nTOTAL PASSED: ${passed}`);
