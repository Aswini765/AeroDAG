/**
 * TripCheck picks travel and stay for you: the cheapest sensible way there, the best stay that fits.
 * Every pick says why, and the cheapest way is always one tap away ("Make it fit").
 */
import { TripPlanningEngine } from '../../src/services/tripPlanningEngine';
import { computeFullTripCost } from '../../src/services/fullTripCostHelper';
import { bestFitPlan, cheapestPlan } from '../../src/components/consumer/plan/StepPlanner';
import { isFriendsTrip } from '../../src/components/consumer/plan/FriendsGroup';

let passed = 0;
function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
  passed++;
  console.log(`✓ PASS ${msg}`);
}

(async () => {
  const ctx = (extra: any): any => ({
    destination: 'Coorg', origin: 'Bengaluru (BLR)', dates: '4–6 Dec 2027', durationDays: 3,
    adultsCount: 2, childrenCount: 2, childrenAges: [8, 8], totalTravellers: 4, partyType: 'family',
    budgetTotalINR: 40000, budgetBasis: 'total', notes: [], fieldSources: {}, travelStyle: 'Balanced', ...extra
  });
  const plan: any = await TripPlanningEngine.buildDeterministicPlan(ctx({}));
  const fit = bestFitPlan(plan, null, 40000);
  const total = computeFullTripCost(fit).totalWithBufferINR;
  assert(Boolean(fit.userChoices?.travelKey && fit.userChoices?.hotelId), 'Travel and stay are picked for you');
  assert(!/selfdrive/.test(fit.userChoices!.travelKey!), `No own car assumed (${fit.userChoices!.travelKey})`);
  assert(total <= 40000, `Coorg family of 4 fits ₹40,000 (₹${total})`);
  assert(Boolean(fit.userChoices?.why?.travel && fit.userChoices?.why?.stay), `Each pick says why (${fit.userChoices?.why?.travel} / ${fit.userChoices?.why?.stay})`);

  // A pricier stay would break the budget: the pick is the best one that still fits
  const cheap = cheapestPlan(fit, null)!;
  assert(cheap.total <= total, `The cheapest way is never dearer than the pick (₹${cheap.total} ≤ ₹${total})`);

  // Over budget: the pick still works, and "Make it fit" knows the cheapest way
  const tight: any = await TripPlanningEngine.buildDeterministicPlan(ctx({ budgetTotalINR: 15000 }));
  const tightFit = bestFitPlan(tight, null, 15000);
  assert(tightFit.userChoices?.why?.stay === 'Cheapest stay', `Nothing fits ₹15,000: the cheapest stay is picked (${tightFit.userChoices?.why?.stay})`);

  // A long journey is not "sensible" for a short trip: Kolkata → Goa for 4 days picks the flight, not a 42h train
  const goa: any = await TripPlanningEngine.buildDeterministicPlan(ctx({ destination: 'Goa', origin: 'Kolkata (CCU)', durationDays: 4, dates: '4–7 Dec 2027', adultsCount: 2, childrenCount: 0, childrenAges: [], totalTravellers: 2, budgetTotalINR: 60000 }));
  const goaFit = bestFitPlan(goa, null, 60000);
  assert(Boolean(goaFit.flight), `4-day Goa from Kolkata: flight, not 2 days on a train (${goaFit.userChoices?.travelKey})`);

  // The friends card shows for friend groups only, never for a family with kids
  const t = (total: number, children = 0): any => ({ travellers: { total, adults: total - children, children } });
  assert(isFriendsTrip(t(6), 'friends') && isFriendsTrip(t(4), undefined), 'Friends card: 6 friends, or 4 adults with nothing said');
  assert(!isFriendsTrip(t(4, 2), 'family') && !isFriendsTrip(t(2), 'couple') && !isFriendsTrip(t(4), 'family'), 'No friends card for families or couples');

  console.log(`TOTAL PASSED: ${passed}`);
})().catch((e) => { console.error(e); process.exit(1); });
