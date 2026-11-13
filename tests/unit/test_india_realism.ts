/**
 * tests/unit/test_india_realism.ts
 *
 * The numbers must look right to someone who travels in India:
 * - groups are priced with the rooms they really need
 * - flight fares depend on the route (never a flat ₹3,500); short hops and groups go by road
 * - there is always a real Budget way (bus/train + guesthouse/hostel) when it is cheaper
 * - option labels match the cost lines (no "train" card with flight costs)
 * - multi-stop trips fly home from the last stop; days never repeat word for word
 * - permits are flagged; budget fixes are exact (same cost engine)
 */
import { TripPlanningEngine } from '../../src/services/tripPlanningEngine';
import { buildPlanFromDestinationProfile } from '../../src/services/aiDestinationPlanBuilder';
import { buildFallbackProfile } from '../../src/services/indiaPlaces';
import { getRegionRoutes, buildMultiBasePlanFromRoute } from '../../src/services/regionRoutesService';
import { computeFullTripCost } from '../../src/services/fullTripCostHelper';
import { generatePlanOptions } from '../../src/services/planOptionsGenerator';
import { realisticReturnFarePerPerson, roomsNeeded, permitNotes } from '../../src/services/travelRealism';
import { shorterTripFixes, placesThatFit } from '../../src/services/budgetFixes';
import { cleanDayText } from '../../src/services/itineraryText';

let passed = 0;
function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
  passed++;
  console.log(`✓ PASS ${msg}`);
}

const ctx = (o: any) => ({ notes: [], fieldSources: {}, travelStyle: 'Balanced', ...o });
const prefs = (p: any, budget: number) => ({ budgetTotalINR: budget, adultsCount: p.travellers.adults, childrenCount: p.travellers.children } as any);
const ai = (o: any) => buildPlanFromDestinationProfile(ctx(o) as any, buildFallbackProfile(o.destination));
const cheapest = (opts: any[]) => opts.reduce((m, o) => (o.totalCostINR < m.totalCostINR ? o : m));

(async () => {
  // 1. Rooms
  assert(roomsNeeded(2, 2, 0, 4) === 1, 'Family of 2 adults + 2 kids: 1 room');
  assert(roomsNeeded(4, 0, 0) === 2, '4 adults: 2 rooms');
  assert(roomsNeeded(9, 0, 0) === 3, '9 friends: 3 rooms (triple sharing)');

  // 2. Fares depend on the route
  const blrGoi = realisticReturnFarePerPerson('BLR', 'GOI');
  const delBom = realisticReturnFarePerPerson('DEL', 'BOM');
  const blrDed = realisticReturnFarePerPerson('BLR', 'DED');
  assert(blrGoi >= 6000 && blrGoi <= 7500, `BLR⇄GOI ≈ ₹6–7.5k return (₹${blrGoi})`);
  assert(delBom >= 8500 && delBom <= 11000, `DEL⇄BOM ≈ ₹9–11k return (₹${delBom})`);
  assert(blrDed >= 11000, `BLR⇄Dehradun is a long flight, ≥ ₹11k (₹${blrDed})`);
  assert(realisticReturnFarePerPerson('DEL', 'KUU') > realisticReturnFarePerPerson('DEL', 'IXC'), 'Small airports (Kullu) cost more than big ones');

  // 3. Manali for 9 friends from Delhi: rooms counted, tempo traveller, a budget way that fits ₹1.2 lakh
  const manali = ai({ destination: 'Manali', origin: 'New Delhi (DEL)', dates: '20–24 Nov 2026', durationDays: 5, adultsCount: 9, totalTravellers: 9, budgetTotalINR: 120000 });
  const mCost = computeFullTripCost(manali, prefs(manali, 120000));
  assert(/3 rooms/.test(mCost.lines.find((l) => l.id === 'cost-stay')!.subtitle || ''), 'Manali group stay shows 3 rooms');
  assert(!manali.flight, 'Delhi → Manali for 9 is not a flight by default');
  assert(/tempo/i.test(manali.transfer.vehicleType), 'Group goes by tempo traveller');
  const mOpts = generatePlanOptions(manali, prefs(manali, 120000));
  const mBudget = mOpts.find((o) => o.id === 'budget')!;
  assert(Boolean(mBudget) && mBudget.travelMode === 'Bus', 'Budget way is the overnight Volvo bus');
  assert(mBudget.totalCostINR <= 120000, `Budget way fits ₹1.2 lakh (₹${mBudget.totalCostINR})`);

  // 4. Rishikesh solo from Delhi under ₹8,000: bus + hostel fits
  const rish = ai({ destination: 'Rishikesh', origin: 'New Delhi (DEL)', dates: '13–15 Nov 2026', durationDays: 3, adultsCount: 1, totalTravellers: 1, budgetTotalINR: 8000 });
  const rOpts = generatePlanOptions(rish, prefs(rish, 8000));
  const rCheap = cheapest(rOpts);
  assert(/hostel/i.test(rCheap.stayName), `Solo budget stay is a hostel bed (${rCheap.stayName})`);
  assert(rCheap.totalCostINR <= 8000, `Solo Rishikesh fits ₹8,000 (₹${rCheap.totalCostINR})`);

  // 5. Goa family on ₹50k: a train + guesthouse Budget option exists and fits; card labels match costs
  const goa = await TripPlanningEngine.buildDeterministicPlan(ctx({ destination: 'Goa', origin: 'Bengaluru (BLR)', dates: '20–23 Nov 2026', durationDays: 4, adultsCount: 2, childrenCount: 2, childrenAges: [5, 8], totalTravellers: 4, budgetTotalINR: 50000 }) as any);
  const gOpts = generatePlanOptions(goa, prefs(goa, 50000));
  const gBudget = gOpts.find((o) => o.id === 'budget');
  assert(Boolean(gBudget) && gBudget!.totalCostINR <= 50000, `Goa family has a Budget way under ₹50k (₹${gBudget?.totalCostINR})`);
  for (const o of gOpts) {
    const travel = computeFullTripCost(o.plan, prefs(goa, 50000)).lines.find((l) => l.id === 'cost-travel')!.subtitle || '';
    const says = o.travelMode === 'Flight' ? /flight/i : o.travelMode === 'Train' ? /train/i : o.travelMode === 'Bus' ? /bus/i : /cab|sedan|tempo|innova|suv/i;
    assert(says.test(travel), `${o.tier} card says ${o.travelMode} and its cost line agrees (“${travel.slice(0, 40)}…”)`);
  }

  // 6. Ooty from Bengaluru is a road trip; activities are believable
  const ooty = ai({ destination: 'Ooty', origin: 'Bengaluru (BLR)', dates: '20–23 Nov 2026', durationDays: 4, adultsCount: 2, totalTravellers: 2, budgetTotalINR: 30000 });
  assert(!ooty.flight, 'Bengaluru → Ooty is not a flight');
  const goaActs = computeFullTripCost(goa, prefs(goa, 50000)).lines.find((l) => l.id === 'cost-activities')!.amountINR;
  assert(goaActs >= 250 * 4 * 4, `Activities are at least ₹250 per person a day (₹${goaActs})`);

  // 7. Rajasthan: fly in to Jaisalmer, home from Jodhpur; no repeated days; route card = plan total
  const routes = getRegionRoutes('Rajasthan', 6, '', 80000, 2, 'Mumbai (BOM)', '20–26 Nov 2026', { adults: 2 });
  const jj = routes.find((r) => /Jaisalmer/.test(r.title))!;
  const raj = buildMultiBasePlanFromRoute(ctx({ destination: 'Rajasthan', origin: 'Mumbai (BOM)', dates: '20–26 Nov 2026', durationDays: 7, totalTravellers: 2, adultsCount: 2, childrenCount: 0, childrenAges: [], seniorsCount: 0, budgetTotalINR: 80000 }) as any, jj);
  assert(raj.flight?.destinationCode === 'JSA' && raj.flight?.returnFromCode === 'JDH', 'Flies BOM→JSA, home JDH→BOM');
  const bodies = raj.itinerary.map((d) => `${d.morning}|${d.afternoon}`);
  assert(new Set(bodies).size === bodies.length, 'No two Rajasthan days are the same');
  assert(/Fly/.test(raj.itinerary[0].morning), 'Day 1 is the arrival');
  assert(jj.estimatedCostINR === computeFullTripCost(raj, { budgetTotalINR: 80000, adultsCount: 2, childrenCount: 0, childrenAges: [] } as any).totalWithBufferINR, 'Route card total = plan total');
  assert(routes.filter((r) => r.isRecommended).length === 1 && Boolean(routes[0].matchReason), 'Exactly one "Best fit", listed first, with a reason');

  // 8. Permits
  assert(permitNotes('4 days in Ziro, Arunachal Pradesh').length === 1, 'Ziro needs an Inner Line Permit');
  assert(permitNotes('Nubra and Pangong from Leh').length === 1, 'Nubra / Pangong need a permit');
  assert(permitNotes('Goa beaches').length === 0, 'Goa needs no permit');

  // 9. Budget fixes are exact and honest
  const fixes = shorterTripFixes(rCheap.plan, prefs(rish, 4000), 4000);
  for (const f of fixes) {
    assert(computeFullTripCost(f.plan, prefs(rish, 4000)).totalWithBufferINR === f.newTotalINR, `“${f.title}” total is exact (₹${f.newTotalINR})`);
    assert(f.plan.durationDays < rCheap.plan.durationDays, `“${f.title}” really is shorter`);
  }
  const near = placesThatFit({ origin: 'New Delhi (DEL)', days: 3, adults: 2, children: 0, budgetINR: 15000 });
  assert(near.length > 0 && near.every((p) => p.totalINR <= 15000), `Places near Delhi that fit ₹15k for 2 × 3 days: ${near.map((p) => p.name).join(', ')}`);

  // 10. Day text without filler
  assert(cleanDayText('Smooth check-in at Baywatch Resort. Unpack, rest, and settle into Deluxe Suite. Dedicated rest downtime.') === 'Check in at Baywatch Resort and rest.', 'Filler day text is cleaned');

  console.log(`\nTOTAL PASSED: ${passed}`);
})().catch((e) => { console.error(e); process.exit(1); });

// 11. Maps get real place names, not sentences
import('../../src/services/itineraryText').then(({ stopsForDay, dayRouteUrl }) => {
  const stops = stopsForDay({
    morning: 'Overnight AC sleeper / Volvo bus from New Delhi to Manali, then an auto to 3★ stay in Mall Road.',
    afternoon: 'Check in and rest, then an easy visit to Hadimba Temple.',
    evening: 'Dinner at a local place serving regional food.'
  });
  assert(stops.length === 1 && stops[0] === 'Hadimba Temple', `Day 1 stop is "Hadimba Temple" (got ${JSON.stringify(stops)})`);
  const url = decodeURIComponent(dayRouteUrl(['Hadimba Temple', 'Solang Valley'], 'Manali, Himachal Pradesh', 'Mall Road'));
  assert(url.includes('origin=Mall Road, Manali') && url.includes('destination=Solang Valley, Manali') && url.includes('waypoints=Hadimba Temple, Manali'), 'Google Maps route goes stay → each place by name');
  assert(!/Dinner|serving/.test(url), 'No sentences in the map link');
  console.log(`TOTAL PASSED (with maps): ${passed}`);
});
