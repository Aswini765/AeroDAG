/**
 * tests/unit/test_getting_there.ts
 *
 * "How do you want to get there?" must be exact and checkable:
 * - every mode's total is the cost engine's total for the plan with that travel
 * - the current plan's card equals the plan's own total
 * - Bengaluru → Goa road uses the checked distance (~560 km, 10h 30m), not a guess
 * - the advice states what flying costs and what it saves, in numbers
 */
import { TripPlanningEngine } from '../../src/services/tripPlanningEngine';
import { computeFullTripCost } from '../../src/services/fullTripCostHelper';
import { gettingThereOptions, gettingThereAdvice, parseHours } from '../../src/services/gettingThere';

let passed = 0;
function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
  passed++;
  console.log(`✓ PASS ${msg}`);
}

(async () => {
  assert(parseHours('1h 10m') === 1 + 10 / 60 && parseHours('14h 00m') === 14 && parseHours('approx. 11 hours') === 11, 'Durations are read exactly');

  const plan: any = await TripPlanningEngine.buildDeterministicPlan({
    destination: 'Goa', origin: 'Bengaluru (BLR)', dates: '20–23 Nov 2026', durationDays: 4,
    adultsCount: 2, childrenCount: 0, totalTravellers: 2, budgetTotalINR: 40000,
    notes: [], fieldSources: {}, travelStyle: 'Balanced'
  } as any);
  const prefs: any = { budgetTotalINR: 40000, adultsCount: 2, childrenCount: 0 };
  const opts = gettingThereOptions(plan, prefs);
  const keys = opts.map((o) => o.key);
  assert(keys.includes('flight') && keys.includes('train') && keys.includes('road'), `Goa offers flight, train and road (got ${keys.join(', ')})`);

  const current = opts.find((o) => o.isCurrent)!;
  assert(Boolean(current) && current.totalINR === computeFullTripCost(plan, prefs).totalWithBufferINR, 'The selected card shows the same total as the plan');
  for (const o of opts) {
    assert(o.totalINR === computeFullTripCost(o.plan, prefs).totalWithBufferINR, `${o.label} total = cost engine total after switching (₹${o.totalINR})`);
  }

  const train = opts.find((o) => o.key === 'train')!;
  assert(Boolean(train.plan.selectedTrain) && !train.plan.flight, 'Train option really has the train and no flight');
  assert(train.overnight && /17309/.test(train.detail), 'Goa train is the overnight 17309');

  const road = opts.find((o) => o.key === 'road')!;
  assert(/560 km/.test(road.timeText) && /10h 30m/.test(road.timeText), `Bengaluru → Goa road is ~560 km, 10h 30m (got "${road.timeText}")`);
  assert(!road.plan.flight && !road.plan.selectedTrain, 'Road option has no flight or train');

  const advice = gettingThereAdvice(opts, plan.durationDays).join(' ');
  assert(/Flying costs ₹[\d,]+ more than the train and saves about \d+h/.test(advice), `Advice is in numbers: "${advice.slice(0, 90)}…"`);

  // Switching back to flight from the road uses an airport cab, not the long road cab
  const fromRoad = gettingThereOptions(road.plan, prefs).find((o) => o.key === 'flight')!;
  assert(!/-road(-\d+)?$/.test(fromRoad.plan.transfer.id), 'Road → flight drops the road cab');

  console.log(`TOTAL PASSED: ${passed}`);
})().catch((e) => { console.error(e); process.exit(1); });

// Permit notes only for the places that need them (a Goa day plan once showed "Nagaland ILP")
import('../../src/services/travelRealism').then(({ permitNotes }) => {
  const goa = permitNotes('Goa Sernabatim Beach Colva Monday market Salmon lemon Simon');
  if (goa.length !== 0) throw new Error(`Goa got permit notes: ${goa.join(' | ')}`);
  if (permitNotes('Kohima, Nagaland').length !== 1) throw new Error('Nagaland must get its ILP note');
  console.log('✓ PASS Permits: none for Goa, ILP for Nagaland');
});
