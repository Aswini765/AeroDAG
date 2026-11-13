/**
 * tests/unit/test_day_places.ts
 *
 * Day by day + Google Maps must use real places Google can find, near the stay:
 * - South Goa stay → Day 2 is in South Goa (not Calangute in the North)
 * - choose a North Goa stay → the middle days are re-planned around it
 * - every stop has an exact Maps search ("Basilica of Bom Jesus, Old Goa")
 * - the route starts at the stay; arrival / home days don't route stay → stay
 * - a place the traveller adds shows on that day and in its route
 * - no "<sight> in <wrong area>" names (Hawa Mahal is not in C-Scheme)
 */
import { TripPlanningEngine } from '../../src/services/tripPlanningEngine';
import { alignItineraryToPlan, mapStopsForDay, dayRouteUrl, dayEmbedUrl } from '../../src/services/itineraryText';

let passed = 0;
function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
  passed++;
  console.log(`✓ PASS ${msg}`);
}

const ctx = (destination: string, origin: string): any => ({
  destination, origin, dates: '20–24 Nov 2026', durationDays: 5,
  adultsCount: 2, childrenCount: 0, totalTravellers: 2, budgetTotalINR: 60000,
  notes: [], fieldSources: {}, travelStyle: 'Balanced'
});

(async () => {
  const goa: any = await TripPlanningEngine.buildDeterministicPlan(ctx('Goa', 'Kolkata (CCU)'));
  assert(/South Goa/.test(goa.hotel.area), `Default stay is in South Goa (${goa.hotel.area})`);
  const days = alignItineraryToPlan(goa);
  const d2 = mapStopsForDay(days[1], goa.destination);
  assert(/South Goa/.test(days[1].title) && d2.some((s) => /Palolem|Cabo de Rama|Colva/.test(s.name)), `Day 2 is near the stay: ${days[1].title}`);
  assert(!days.slice(1, -1).some((d) => /Calangute|Baga/.test(d.title)) || days.length > 5, 'No North Goa beach day first for a South Goa stay');
  const all = days.flatMap((d) => mapStopsForDay(d, goa.destination));
  assert(all.length >= 7 && all.every((s) => /,/.test(s.query)), `Every stop has an exact Maps search (${all.length} stops)`);
  assert(!all.some((s) => /Scenic Evening|Promenade|highlights/i.test(s.name)), 'No made-up names like "Mandovi River Scenic Evening"');

  const url = dayRouteUrl(d2, goa.destination, goa.hotel.area);
  assert(url.startsWith('https://www.google.com/maps/dir/?api=1&origin=Sernabatim%20Beach') && /waypoints=/.test(url), 'Day 2 route starts at the stay and goes through every stop');
  const lastUrl = dayRouteUrl(mapStopsForDay(days[days.length - 1], goa.destination), goa.destination, goa.hotel.area);
  assert(lastUrl.includes('/maps/search/'), 'Going-home day shows the stay, not a route from the stay to itself');
  assert(dayEmbedUrl(d2, goa.destination, goa.hotel.area, null, 'K').includes('/maps/embed/v1/directions?key=K'), 'With a Maps Embed key the page map shows the day\'s route');

  // Pick a North Goa stay → days follow it
  const north = goa.availableHotels.find((h: any) => /North Goa|Candolim|Calangute|Sinquerim/i.test(h.area));
  if (north) {
    const p2 = TripPlanningEngine.swapComponent(goa, { hotel: north });
    const days2 = alignItineraryToPlan(p2);
    assert(/North Goa|Fort Aguada|Chapora/.test(days2[1].title), `North Goa stay → Day 2 "${days2[1].title}"`);
    assert(mapStopsForDay(days2[0], goa.destination)[0].name === north.area.split(',')[0].trim(), 'Day 1 evening walk is near the new stay');
  }

  // A place the traveller adds
  const withAdded = { ...goa, userChoices: { addedStops: [{ day: 3, place: 'Dudhsagar Falls' }] } };
  const d3 = alignItineraryToPlan(withAdded)[2];
  assert(/Visit Dudhsagar Falls\./.test(d3.afternoon) && mapStopsForDay(d3, goa.destination).some((s) => s.name === 'Dudhsagar Falls'), 'Added place shows on Day 3 and in its route');

  // Regional plans: no wrong "in <area>" labels, no repeated sights
  const jaipur: any = await TripPlanningEngine.buildDeterministicPlan(ctx('Jaipur', 'Delhi (DEL)'));
  const jd = alignItineraryToPlan(jaipur);
  const text = jd.map((d) => `${d.morning} ${d.afternoon}`).join(' ');
  assert(!/ in C-Scheme| in Old City \(/.test(text), 'Jaipur days don\'t put sights in the wrong area');
  const names = jd.flatMap((d) => mapStopsForDay(d, 'Jaipur').map((s) => s.name));
  assert(new Set(names).size === names.length, `No sight twice: ${names.join(', ')}`);

  console.log(`TOTAL PASSED: ${passed}`);
})().catch((e) => { console.error(e); process.exit(1); });
