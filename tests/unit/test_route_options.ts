/**
 * tests/unit/test_route_options.ts
 *
 * Step 1 ("How do you want to get there?") must be right for the traveller's OWN city:
 * - Kolkata → Goa: IndiGo 6E 634 non-stop 2h 40m; Amaravati Express 18047 with real class fares;
 *   no Bengaluru train; no bus or cab (2,000+ km); own car = fuel + tolls + night stops, shown as sums
 * - Bengaluru → Goa: 17309 with checked fares (SL ₹365 · 3A ₹1,000 · 2A ₹1,440)
 * - Days are days AT the destination: a train that gets in a day early adds a hotel night to the total
 */
import { TripPlanningEngine } from '../../src/services/tripPlanningEngine';
import { computeFullTripCost } from '../../src/services/fullTripCostHelper';
import { travelOptions, applyTravelOption, journeyDates, selfDriveCost } from '../../src/services/routeOptions';

let passed = 0;
function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
  passed++;
  console.log(`✓ PASS ${msg}`);
}

const ctx = (origin: string, budget: number): any => ({
  destination: 'Goa', origin, dates: '20–23 Nov 2026', durationDays: 4,
  adultsCount: 2, childrenCount: 0, totalTravellers: 2, budgetTotalINR: budget,
  notes: [], fieldSources: {}, travelStyle: 'Balanced'
});

(async () => {
  const kol: any = await TripPlanningEngine.buildDeterministicPlan(ctx('Kolkata (CCU)', 20000));
  const opts = travelOptions(kol);
  const modes = opts.map((o) => o.mode);
  assert(modes.join(',') === 'flight,train,selfdrive', `Kolkata → Goa offers flight, train, own car only (got ${modes.join(',')})`);

  const fl = opts.find((o) => o.mode === 'flight')!;
  assert(/6E 634/.test(fl.detail) && /non-stop/.test(fl.detail) && Math.abs(fl.oneWayHours - 2.667) < 0.01, 'Flight is IndiGo 6E 634, non-stop, 2h 40m');

  const tr = opts.find((o) => o.mode === 'train')!;
  assert(/18047/.test(tr.detail) && !/17309/.test(tr.detail), 'Train is the Amaravati Express 18047, never the Bengaluru 17309');
  const fares = Object.fromEntries((tr.classes || []).map((c) => [c.code, c.fareINR]));
  assert(fares.SL === 745 && fares['3A'] === 1990 && fares['2A'] === 2940, 'Class fares SL ₹745 · 3A ₹1,990 · 2A ₹2,940');
  assert(tr.travelCostINR === 1990 * 2 * 2, '3A for 2 people both ways = ₹7,960');

  const car = opts.find((o) => o.mode === 'selfdrive')!;
  const sd = selfDriveCost({ roadKm: 2060, roadHours: 30, fuel: 'diesel', kmpl: 18, cars: 1, fuelPriceINR: 99.82 });
  assert(sd.fuelINR === Math.round((4120 / 18) * 99.82) && sd.haltNightsEachWay === 2, `Diesel at 18 km/l: ${sd.lines[0]}`);
  assert(car.roadKm === 2060 && car.haltNightsEachWay === 2, 'Own car: 2,060 km, 2 night stops each way');

  // Days are at the destination: 18047 runs Mon/Tue/Thu/Sat, so to start Fri 20 Nov you leave Tue 17 Nov
  const j = journeyDates(tr, new Date(2026, 10, 20), new Date(2026, 10, 23));
  assert(/Tue, 17 Nov/.test(j.leave) && /Thu, 19 Nov/.test(j.arrive), `Leave ${j.leave}, reach ${j.arrive} (a day before Day 1)`);

  const withTrain = applyTravelOption(kol, tr, { trainClass: '3A', firstDay: new Date(2026, 10, 20), lastDay: new Date(2026, 10, 23) });
  const cost = computeFullTripCost(withTrain, { budgetTotalINR: 20000 } as any);
  const travel = cost.lines.find((l) => l.id === 'cost-travel')!;
  const stay = cost.lines.find((l) => l.id === 'cost-stay')!;
  assert(travel.amountINR >= 7960 && travel.amountINR <= 7960 + 1200, `Travel line = train ₹7,960 + station autos (₹${travel.amountINR})`);
  assert(Boolean(travel.checked), 'Train fare is labelled "Checked fare"');
  assert(/5 nights/.test(stay.subtitle || ''), `Stay counts the extra nights (early arrival + train home): "${stay.subtitle}"`);
  assert(withTrain.userChoices?.travelKey === 'train-18047-3A' && !withTrain.flight, 'Choice is saved on the plan; no flight left in it');

  // Bengaluru → Goa
  const blr: any = await TripPlanningEngine.buildDeterministicPlan(ctx('Bengaluru (BLR)', 30000));
  const btr = travelOptions(blr).find((o) => o.mode === 'train')!;
  const bf = Object.fromEntries((btr.classes || []).map((c) => [c.code, c.fareINR]));
  assert(/17309/.test(btr.detail) && bf.SL === 365 && bf['3A'] === 1000 && bf['2A'] === 1440, '17309 fares SL ₹365 · 3A ₹1,000 · 2A ₹1,440');
  const bj = journeyDates(btr, new Date(2026, 10, 20), new Date(2026, 10, 23));
  assert(/Thu, 19 Nov, 3:00 PM/.test(bj.leave) && /Fri, 20 Nov, 5:15 AM/.test(bj.arrive) && bj.extraNights === 0, `17309: leave ${bj.leave}, reach ${bj.arrive}, no extra night`);
  const bmodes = travelOptions(blr).map((o) => o.mode);
  assert(bmodes.includes('bus') && bmodes.includes('cab'), 'Bengaluru → Goa also offers bus and cab (560 km)');

  // Going home by train: the real return train and its running days
  assert(/Tue, 24 Nov, 6:30 AM by Amaravati Express \(18048\)/.test(j.leaveGoa) && /Wed, 25 Nov/.test(j.home) && j.extraNights === 2,
    `18048 runs Sun/Tue/Thu/Fri at 6:30 AM → leave Tue 24 Nov, home Wed 25 Nov, 2 extra nights (${j.leaveGoa})`);
  const food = cost.lines.find((l) => l.id === 'cost-food')!;
  const withTrain2 = applyTravelOption(kol, tr, { trainClass: '3A', firstDay: new Date(2026, 10, 20), lastDay: new Date(2026, 10, 23) });
  const stay2 = computeFullTripCost(withTrain2, { budgetTotalINR: 20000 } as any).lines.find((l) => l.id === 'cost-stay')!;
  assert(/5 nights/.test(stay2.subtitle || '') && /6 days/.test(food.subtitle || ''), `Train times add 2 nights and 2 days of food (${stay2.subtitle} · ${food.subtitle})`);
  assert(/22:55|10:55 PM/.test(bj.leaveGoa) && /Mon, 23 Nov/.test(bj.leaveGoa) && bj.extraNights === 0, `17310 (daily) leaves Goa Mon 23 Nov at 10:55 PM (${bj.leaveGoa})`);

  // Own car: no cabs counted while you're there
  const own = applyTravelOption(blr, travelOptions(blr).find((o) => o.mode === 'selfdrive')!, { selfDrive: { fuel: 'diesel', kmpl: 18, cars: 1, fuelPriceINR: 99.82 } });
  const local = computeFullTripCost(own, {} as any).lines.find((l) => l.id === 'cost-local-transport')!;
  assert(/Your own car/.test(local.subtitle || '') && local.amountINR === Math.round((40 / 18) * 99.82 + 100) * 4, `Own car: local = fuel for 40 km/day + parking, not cabs (₹${local.amountINR})`);

  console.log(`TOTAL PASSED: ${passed}`);
})().catch((e) => { console.error(e); process.exit(1); });
