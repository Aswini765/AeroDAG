/**
 * Budget: for everyone or for each person? Read from the traveller's words, shown back as maths.
 */
import { decideBasis, basisFromWords, totalFromBudget, budgetLine } from '../../src/services/budgetBasis';
import { parseBudgetINR } from '../../src/services/budgetParser';
import { TripPlanningEngine } from '../../src/services/tripPlanningEngine';
import { computeFullTripCost } from '../../src/services/fullTripCostHelper';
import { CARD_STORIES } from '../../src/components/consumer/WhereShouldWeGo';

let passed = 0;
function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
  passed++;
  console.log(`✓ PASS ${msg}`);
}

(async () => {
  const cases: [string, number, string | null, string][] = [
    ['Goa, 10 friends, 15k each', 10, 'friends', 'per_person'],
    ['Goa 4 days, 15000 per person, 6 of us', 6, 'friends', 'per_person'],
    ['budget 8000 pp for 5 of us', 5, 'friends', 'per_person'],
    ['each of us can spend 12k', 8, 'friends', 'per_person'],
    ['family budget 60k for Goa', 4, 'family', 'total'],
    ['under 40k for 4 of us', 4, 'family', 'total'],
    ['1.5 lakh for 10 of us', 10, 'friends', 'total'],
    ['Coorg 2 adults 2 kids budget 40000', 4, 'family', 'total'],
    ['visit each beach, budget 30000', 2, 'couple', 'total'],
    ['10 friends goa 12000', 10, 'friends', 'per_person'],
    ['10 of us, 50000 Goa', 10, 'friends', 'total']
  ];
  for (const [text, n, party, want] of cases) {
    const amount = parseBudgetINR(text) || 0;
    const got = decideBasis(text, amount, n, party);
    assert(got === want, `"${text}" → ${want} (got ${got}, amount ₹${amount})`);
  }
  assert(decideBasis('how much will Goa cost for 4 of us', null, 4, 'family') === 'none', 'No amount → no budget ("what will it cost?")');
  assert(basisFromWords('Goa trip with friends') === null, 'No budget words → the words say nothing');

  // The maths shown back
  assert(totalFromBudget(15000, 'per_person', 10) === 150000 && totalFromBudget(60000, 'total', 4) === 60000, '₹15,000 each × 10 = ₹1,50,000; a total stays a total');
  assert(budgetLine(150000, 'per_person', 10) === '₹15,000 each × 10 people = ₹1,50,000', `Per person line (${budgetLine(150000, 'per_person', 10)})`);
  assert(budgetLine(60000, 'total', 4) === '₹60,000 for all 4 · about ₹15,000 each', `Total line (${budgetLine(60000, 'total', 4)})`);

  // The plan carries the basis, and a "no budget" plan is never "over"
  const ctx = (extra: any): any => ({
    destination: 'Goa', origin: 'Bengaluru (BLR)', dates: '4–7 Dec 2026', durationDays: 4,
    adultsCount: 10, childrenCount: 0, totalTravellers: 10, partyType: 'friends', notes: [], fieldSources: {}, travelStyle: 'Balanced', ...extra
  });
  const pp: any = await TripPlanningEngine.buildDeterministicPlan(ctx({ budgetTotalINR: 150000, budgetBasis: 'per_person', budgetAmountINR: 15000 }));
  assert(pp.budget.basis === 'per_person' && pp.budget.targetINR === 150000, `Plan keeps "per person" and the group total (${pp.budget.basis}, ₹${pp.budget.targetINR})`);
  const none: any = await TripPlanningEngine.buildDeterministicPlan(ctx({ budgetTotalINR: null, budgetBasis: 'none' }));
  assert(none.budget.basis === 'none', 'Plan without a budget says so');
  const c = computeFullTripCost(pp);
  assert(Math.round(c.totalWithBufferINR / 10) > 0, `Each person's share is worked out (₹${Math.round(c.totalWithBufferINR / 10)})`);

  // Home card stories: totals for a stated group, with the city they're priced from
  for (const [name, st] of Object.entries(CARD_STORIES)) {
    assert(st.fromINR > 5000 && st.people >= 2 && new RegExp(name, 'i').test(st.prompt) && st.prompt.includes(st.origin), `${name} card: ${st.who} · ${st.days} · from ₹${st.fromINR} for ${st.people}, from ${st.origin}`);
  }

  console.log(`TOTAL PASSED: ${passed}`);
})().catch((e) => { console.error(e); process.exit(1); });
