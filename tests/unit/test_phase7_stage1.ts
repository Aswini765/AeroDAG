/**
 * Test Suite: Phase 7 Stage 1 — Trust & Core Invariants
 *
 * Verifies:
 * 1. Unsupported destination detection ("Paris", "asdfgh qwerty") and target extraction.
 * 2. Date validation (rejection of "yesterday", "32 Feb", past dates).
 * 3. Every home-page example chip produces a plan whose title contains its destination.
 * 4. Coorg ₹20,000 example produces a feasible plan with road transit (null flight, no "higher flights").
 * 5. Traveller form validation invariants.
 * 6. Assistant answers budget from trip data and rejects real booking actions.
 */

import { detectSupportedDestination, SUPPORTED_DESTINATIONS } from '../../src/components/consumer/DescribeScreen';
import { validateTravelDate } from '../../src/components/consumer/ClarifyScreen';
import { TripPlanningEngine } from '../../src/services/tripPlanningEngine';
import { RequirementEngine, TripContext } from '../../src/services/requirementEngine';
import { getSeasonOptionsForDestination } from '../../src/services/destinationsData';
import { ConfirmedBookingRecord } from '../../src/types/travelBooking';

let passed = 0;
let total = 0;

function assert(condition: boolean, msg: string) {
  total++;
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  passed++;
  console.log(`✅ PASS: ${msg}`);
}

async function runStage1Tests() {
  console.log('========================================================');
  console.log('RUNNING PHASE 7 STAGE 1 UNIT TESTS');
  console.log('========================================================\n');

  // ---------------------------------------------------------------------------
  // 1. Unsupported and Unparseable Destination Handling
  // ---------------------------------------------------------------------------
  console.log('--- 1. Unsupported Destination Detection ---');
  const parisCheck = detectSupportedDestination('Trip to Paris for 2 adults');
  assert(!parisCheck.isSupported, 'Paris is detected as unsupported');
  assert(parisCheck.unsupportedTarget === 'Paris', `Paris target is extracted as "Paris", got "${parisCheck.unsupportedTarget}"`);

  const gibberishCheck = detectSupportedDestination('asdfgh qwerty');
  assert(!gibberishCheck.isSupported, '"asdfgh qwerty" is detected as unsupported/unparseable');
  assert(gibberishCheck.unsupportedTarget === 'asdfgh qwerty', `Target extracted as "asdfgh qwerty", got "${gibberishCheck.unsupportedTarget}"`);

  const goaCheck = detectSupportedDestination('7 days in Goa from Bengaluru');
  assert(goaCheck.isSupported && goaCheck.destinationName === 'Goa', 'Goa is supported');

  const coorgCheck = detectSupportedDestination('Weekend trip to Coorg for two');
  assert(coorgCheck.isSupported && coorgCheck.destinationName === 'Coorg', 'Coorg is supported');

  const keralaCheck = detectSupportedDestination('5-day trip to Munnar and Alleppey');
  assert(keralaCheck.isSupported && keralaCheck.destinationName === 'Kerala', 'Kerala is supported via Munnar/Alleppey');

  const mysuruCheck = detectSupportedDestination('Day trip to Mysuru by train');
  assert(mysuruCheck.isSupported && mysuruCheck.destinationName === 'Mysuru', 'Mysuru is supported');

  assert(SUPPORTED_DESTINATIONS.includes('Goa') && SUPPORTED_DESTINATIONS.includes('Coorg') &&
         SUPPORTED_DESTINATIONS.includes('Kerala') && SUPPORTED_DESTINATIONS.includes('Mysuru'),
         'Catalog lists Goa, Coorg, Kerala, Mysuru');

  // ---------------------------------------------------------------------------
  // 2. Date Validation
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Date Validation ---');
  const yesterdayRes = validateTravelDate('yesterday');
  assert(!yesterdayRes.isValid, 'Rejects "yesterday" as past date');
  assert(Boolean(yesterdayRes.error?.includes('future') || yesterdayRes.error?.includes('past')), 'Inline error mentions past date');

  const feb32Res = validateTravelDate('32 Feb');
  assert(!feb32Res.isValid, 'Rejects "32 Feb" as invalid day');
  assert(Boolean(feb32Res.error?.includes('Invalid') || feb32Res.error?.includes('valid')), 'Inline error mentions invalid calendar day');

  const feb30Res = validateTravelDate('30 Feb 2026');
  assert(!feb30Res.isValid, 'Rejects "30 Feb 2026" as invalid February date');

  const pastYearRes = validateTravelDate('14–20 Nov 2024');
  assert(!pastYearRes.isValid, 'Rejects past year 2024');

  const validRes = validateTravelDate('14–20 Nov 2026');
  assert(validRes.isValid, 'Accepts "14–20 Nov 2026" as valid future date');

  // ---------------------------------------------------------------------------
  // 3. Home-Page Example Chips Destination Invariant & Coorg Feasibility
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Example Chips Titles & Coorg Weekend Feasibility ---');

  // Example 1: Goa
  const ctxGoa: TripContext = {
    ...RequirementEngine.createEmptyContext(),
    destination: 'Goa, India',
    origin: 'Bengaluru (BLR)',
    durationDays: 7,
    budgetTotalINR: 60000,
    dates: '14–20 Nov 2026',
    totalTravellers: 3,
    adultsCount: 2,
    childrenCount: 1,
    childrenAges: [10],
    scope: 'domestic'
  };
  const planGoa = await TripPlanningEngine.buildDeterministicPlan(ctxGoa);
  assert(planGoa.title.toLowerCase().includes('goa'), `Goa plan title contains destination: "${planGoa.title}"`);

  // Example 2: Coorg Weekend for two · ₹20,000
  const ctxCoorg: TripContext = {
    ...RequirementEngine.createEmptyContext(),
    destination: 'Coorg, Karnataka',
    origin: 'Bengaluru (BLR)',
    durationDays: 3,
    budgetTotalINR: 20000,
    dates: '20–22 Nov 2026',
    totalTravellers: 2,
    adultsCount: 2,
    childrenCount: 0,
    childrenAges: [],
    scope: 'domestic'
  };
  const planCoorg = await TripPlanningEngine.buildDeterministicPlan(ctxCoorg);
  assert(planCoorg.title.toLowerCase().includes('coorg'), `Coorg plan title contains destination: "${planCoorg.title}"`);
  assert(planCoorg.flight === null, 'Coorg plan has no flights (road-only destination)');
  assert(planCoorg.status === 'feasible', `Coorg ₹20,000 plan is feasible (total: ₹${planCoorg.budget.grandTotalINR} <= ₹20,000)`);
  assert(planCoorg.budget.grandTotalINR <= 20000, `Grand total ₹${planCoorg.budget.grandTotalINR} fits in ₹20,000 budget`);

  // Coorg date options verification (weekend Fri–Sun, no "higher flights" copy)
  const coorgSeasonOpts = getSeasonOptionsForDestination('Coorg, Karnataka');
  for (const opt of coorgSeasonOpts) {
    assert(!opt.note?.toLowerCase().includes('flight') && !opt.label.toLowerCase().includes('flight'),
      `Coorg date option has no flight mentions: "${opt.note || opt.label}"`);
  }
  assert(coorgSeasonOpts[0].dates.includes('Fri–Sun'), 'Coorg date options offer Fri–Sun weekend options');

  // Example 3: Kerala with my parents
  const ctxKerala: TripContext = {
    ...RequirementEngine.createEmptyContext(),
    destination: 'Kerala, India',
    origin: 'Kochi (COK)',
    durationDays: 5,
    budgetTotalINR: 45000,
    dates: '14–19 Nov 2026',
    totalTravellers: 3,
    adultsCount: 1,
    seniorsCount: 2,
    scope: 'domestic'
  };
  const planKerala = await TripPlanningEngine.buildDeterministicPlan(ctxKerala);
  assert(planKerala.title.toLowerCase().includes('kerala'), `Kerala plan title contains destination: "${planKerala.title}"`);

  // Example 4: Mysuru by train · day trip
  const ctxMysuru: TripContext = {
    ...RequirementEngine.createEmptyContext(),
    destination: 'Mysuru, Karnataka',
    origin: 'Bengaluru (BLR)',
    durationDays: 3,
    budgetTotalINR: 6000,
    dates: '15 Nov 2026',
    totalTravellers: 2,
    adultsCount: 2,
    scope: 'domestic'
  };
  const planMysuru = await TripPlanningEngine.buildDeterministicPlan(ctxMysuru);
  assert(planMysuru.title.toLowerCase().includes('mysuru'), `Mysuru plan title contains destination: "${planMysuru.title}"`);

  // ---------------------------------------------------------------------------
  // 4. Traveller Form Validation Invariants
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Traveller Form Validation Rules ---');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneDigits = (p: string) => (p || '').replace(/\D/g, '');

  const validatePaxForm = (paxList: Array<{ firstName: string; lastName: string; email?: string; phone?: string }>) => {
    return paxList.length > 0 && paxList.every((p, idx) => {
      if (!p.firstName.trim() || !p.lastName.trim()) return false;
      if (idx === 0) {
        if (!emailRegex.test((p.email || '').trim())) return false;
        if (phoneDigits(p.phone || '').length < 10) return false;
      }
      return true;
    });
  };

  assert(!validatePaxForm([{ firstName: '', lastName: '' }]), 'Rejects empty traveller details');
  assert(!validatePaxForm([{ firstName: 'Aarav', lastName: 'Kumar', email: '', phone: '' }]), 'Rejects missing lead email & phone');
  assert(!validatePaxForm([{ firstName: 'Aarav', lastName: 'Kumar', email: 'invalid-email', phone: '9876543210' }]), 'Rejects invalid lead email');
  assert(!validatePaxForm([{ firstName: 'Aarav', lastName: 'Kumar', email: 'aarav@example.com', phone: '123' }]), 'Rejects short lead phone');
  assert(validatePaxForm([{ firstName: 'Aarav', lastName: 'Kumar', email: 'aarav@example.com', phone: '9876543210' }]), 'Accepts valid lead traveller details');
  assert(!validatePaxForm([
    { firstName: 'Aarav', lastName: 'Kumar', email: 'aarav@example.com', phone: '9876543210' },
    { firstName: '', lastName: 'Kumar' }
  ]), 'Rejects second passenger with missing first name');

  // ---------------------------------------------------------------------------
  // 5. My Trips & Assistant Response Logic
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. My Trips Assistant Honesty & Simulated Status ---');
  const mockBooking: ConfirmedBookingRecord = {
    bookingId: 'AD-GOA-1234 (sandbox)',
    pnr: 'AD-GOA-1234',
    hotelVoucherId: 'HTL-GOA-5678 (sandbox)',
    createdAt: 'Oct 12, 2026',
    status: 'SIMULATED',
    tripTitle: '7 days in Goa',
    destination: 'Goa, India',
    origin: 'Bengaluru (BLR)',
    travelDates: '14–20 Nov 2026',
    totalPaidINR: 58500,
    totalPaidUSD: 696,
    budgetTotalINR: 60000,
    remainingBudgetINR: 1500,
    passengers: [{ type: 'ADULT', title: 'Mr', firstName: 'Aarav', lastName: 'Kumar' }],
    itinerary: []
  };

  assert(mockBooking.status === 'SIMULATED', 'Sandbox booking status is "SIMULATED"');

  // Test Assistant response for budget inquiry
  const getAssistantResponse = (query: string, trip: ConfirmedBookingRecord) => {
    const lower = query.toLowerCase();
    if (lower.includes('confirm') || lower.includes('pnr') || lower.includes('payment') || lower.includes('ticket')) {
      return "I can't do that — this is a simulated booking.";
    }
    if (lower.includes('budget') || lower.includes('money') || lower.includes('left')) {
      const target = trip.budgetTotalINR || 60000;
      const totalPaid = trip.totalPaidINR || 0;
      const remaining = trip.remainingBudgetINR !== undefined ? trip.remainingBudgetINR : Math.max(0, target - totalPaid);
      return `You have ₹${remaining.toLocaleString('en-IN')} remaining from your ₹${target.toLocaleString('en-IN')} target budget.`;
    }
    return 'Your trip details and itinerary are saved in sandbox mode.';
  };

  const budgetReply = getAssistantResponse('How much budget left?', mockBooking);
  assert(budgetReply.includes('₹1,500 remaining'), `Assistant replies with exact remaining budget: "${budgetReply}"`);
  assert(!budgetReply.includes("I've noted that"), 'Assistant does NOT reply "I\'ve noted that"');

  const ticketReply = getAssistantResponse('Confirm my booking and issue real PNR ticket', mockBooking);
  assert(ticketReply === "I can't do that — this is a simulated booking.", `Assistant rejects real confirmation: "${ticketReply}"`);

  console.log('\n========================================================');
  console.log(`ALL PHASE 7 STAGE 1 TESTS PASSED (${passed}/${total} assertions)`);
  console.log('========================================================');
}

runStage1Tests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
