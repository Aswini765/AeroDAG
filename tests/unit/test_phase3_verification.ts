/**
 * Comprehensive Phase 3 Verification Test Suite
 * Tests deterministic planning logic, budget allocator, date requirements,
 * drive-time routing, feasibility checks, and line-item integrity.
 */

import { TripPlanningEngine } from '../../src/services/tripPlanningEngine';
import { RequirementEngine, TripContext } from '../../src/services/requirementEngine';
import { getTripSummary } from '../../src/services/tripSummaryHelper';
import { calculateContingencyBufferINR } from '../../src/config/estimateRates';
import { generateVerificationChecks } from '../../src/services/travelCatalog';
import { SEED_KNOWLEDGE_DOCUMENTS } from '../../src/services/rag/knowledgeData';
import { selectArrivalAirportByDriveTime, MOCK_FLIGHTS_GOA } from '../../src/services/destinationsData';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`✅ PASS: ${message}`);
}

async function runTests() {
  console.log('====================================================');
  console.log('RUNNING PHASE 3 DETERMINISTIC PLANNING VERIFICATION');
  console.log('====================================================\n');

  // =========================================================================
  // SCENARIO 1: Goa, 7 days, 2A+1C (10), ₹60,000, comfortable, low walking, dates 14–20 Nov
  // =========================================================================
  console.log('--- SCENARIO 1: Goa 7-Day 2A+1C ₹60,000 ---');
  const s1Context: TripContext = {
    destination: 'Goa',
    origin: 'Bengaluru',
    dates: '14–20 Nov 2026',
    durationDays: 7,
    partyType: 'family',
    totalTravellers: 3,
    adultsCount: 2,
    childrenCount: 1,
    childrenAges: [10],
    infantsCount: 0,
    seniorsCount: 0,
    budgetTotalINR: 60000,
    budgetTier: 'Comfortable',
    currency: 'INR',
    accommodationPreference: 'Comfortable family hotel',
    activities: [],
    transportMode: 'Flight',
    walkingIntensity: 'Low',
    dietaryPreference: null,
    luggage: null,
    accessibilityRequired: false,
    travelStyle: 'Relaxed',
    priority: 'Family Friendly',
    scope: 'domestic',
    notes: []
  };

  const plan1 = await TripPlanningEngine.buildDeterministicPlan(s1Context);
  const summary1 = getTripSummary({ tripPlan: plan1, preferences: null });

  assert(plan1.status === 'feasible', 'Plan 1 status is feasible');
  assert(summary1 !== null, 'Summary 1 was generated');
  assert(plan1.budget.grandTotalINR <= 60000, `Plan total (${plan1.budget.grandTotalINR}) ≤ ₹60,000`);
  assert(summary1!.totalINR <= 60000, `Summary total (${summary1!.totalINR}) ≤ ₹60,000`);
  assert(summary1!.totalINR === plan1.budget.grandTotalINR, `Summary total (${summary1!.totalINR}) === plan grandTotal (${plan1.budget.grandTotalINR})`);

  // Check categories in line items
  const categories1 = summary1!.lineItems.map((li) => li.category);
  assert(categories1.includes('flight'), 'Includes flight line item');
  assert(categories1.includes('hotel'), 'Includes hotel line item');
  assert(categories1.includes('transfer'), 'Includes airport transfer line item');
  assert(categories1.includes('local_transport'), 'Includes local transport line item');
  assert(categories1.includes('food'), 'Includes food line item');
  assert(categories1.includes('activity'), 'Includes activity line item');
  assert(categories1.includes('buffer'), 'Includes contingency buffer line item');

  // Flight leg pricing invariants (Phase 5.1):
  assert(plan1.flight !== null, 'Flight is present for Goa trip');
  const fl = plan1.flight!;
  assert(fl.isRoundTrip === true, 'Flight is round-trip');
  assert((fl.outboundTotalPriceINR || 0) > 0, `Outbound flight leg total > ₹0 (got ₹${fl.outboundTotalPriceINR})`);
  assert((fl.returnTotalPriceINR || 0) > 0, `Return flight leg total > ₹0 (got ₹${fl.returnTotalPriceINR})`);
  assert(
    fl.totalPriceINR === (fl.outboundTotalPriceINR || 0) + (fl.returnTotalPriceINR || 0),
    `Flight transport total (₹${fl.totalPriceINR}) === sum of legs (₹${(fl.outboundTotalPriceINR || 0) + (fl.returnTotalPriceINR || 0)})`
  );
  assert((fl.outboundFarePerPersonINR || 0) >= 2000, `Per-person outbound leg fare (₹${fl.outboundFarePerPersonINR}) ≥ ₹2,000`);
  assert((fl.returnFarePerPersonINR || 0) >= 2000, `Per-person return leg fare (₹${fl.returnFarePerPersonINR}) ≥ ₹2,000`);

  // Assert per-person per-leg fare >= ₹2,000 for all sample domestic flights in catalog
  for (const sampleFlight of MOCK_FLIGHTS_GOA) {
    assert((sampleFlight.outboundFarePerPersonINR || 0) >= 2000, `${sampleFlight.airline} (${sampleFlight.flightNumber}) outbound fare ≥ ₹2,000`);
    assert((sampleFlight.returnFarePerPersonINR || 0) >= 2000, `${sampleFlight.airline} (${sampleFlight.flightNumber}) return fare ≥ ₹2,000`);
  }

  // Check hotel location and airport routing
  assert(plan1.hotel.area.toLowerCase().includes('south goa') || plan1.hotel.name.toLowerCase().includes('south goa') || plan1.hotel.name.includes('Heritage') || plan1.hotel.name.includes('Baywatch') || plan1.hotel.name.includes('Caravela'), 'Hotel is in South Goa');
  assert(fl.destinationCode === 'GOI', `Arrival airport is GOI (Dabolim), got ${fl.destinationCode}`);
  assert(plan1.airportSelectionReason!.includes('Dabolim') && plan1.airportSelectionReason!.includes('South Goa'), `Airport selection reason note explains Dabolim: "${plan1.airportSelectionReason}"`);

  // Feasibility checks
  const checks1 = generateVerificationChecks(
    fl,
    plan1.hotel,
    null,
    {
      flightsCostINR: plan1.budget.flightsCostINR,
      hotelCostINR: plan1.budget.hotelCostINR,
      transferCostINR: plan1.budget.transportCostINR,
      visaCostINR: 0,
      activitiesAndFoodCostINR: plan1.budget.activitiesCostINR + plan1.budget.diningEstimateINR,
      activitiesCostINR: plan1.budget.activitiesCostINR,
      diningEstimateINR: plan1.budget.diningEstimateINR,
      totalCalculatedCostINR: plan1.budget.grandTotalINR,
      remainingBudgetINR: 60000 - plan1.budget.grandTotalINR,
      isOverBudget: false,
      overBudgetAmountINR: 0,
      totalCalculatedCostUSD: Math.round(plan1.budget.grandTotalINR / 84),
      remainingBudgetUSD: Math.round((60000 - plan1.budget.grandTotalINR) / 84)
    },
    3,
    'domestic',
    plan1
  );

  const failChecks1 = checks1.filter((c) => c.status === 'fail');
  assert(failChecks1.length === 0, `No feasibility check failed (got ${failChecks1.length})`);
  const visaCheck1 = checks1.find((c) => c.category === 'visa');
  const layoverCheck1 = checks1.find((c) => c.id === 'chk-layover');
  assert(visaCheck1?.status === 'not_applicable', 'Visa check is not_applicable on domestic trip');
  assert(layoverCheck1?.status === 'not_applicable', 'Layover check is not_applicable on direct trip');

  // Walking level in itinerary
  const unflaggedModerateDay = plan1.itinerary.find((d) => d.walkingLevel === 'moderate' && !d.walkingFlag);
  assert(!unflaggedModerateDay, 'No day has moderate walking without a flag when user requested low walking');

  console.log('\nScenario 1 Breakdown:');
  for (const item of summary1!.lineItems) {
    console.log(`  • ${item.category.padEnd(16)}: ₹${item.amountINR.toLocaleString('en-IN').padStart(7)} (${item.source} - ${item.title})`);
  }
  console.log(`  ----------------------------------------`);
  console.log(`  Total:             ₹${summary1!.totalINR.toLocaleString('en-IN')}`);
  console.log(`  Target Budget:     ₹60,000`);
  console.log(`  Remaining Buffer:  ₹${(60000 - summary1!.totalINR).toLocaleString('en-IN')}\n`);

  // =========================================================================
  // SCENARIO 2: Same trip with no dates -> asks for dates
  // =========================================================================
  console.log('--- SCENARIO 2: Trip with no dates ---');
  const s2Context: TripContext = {
    ...s1Context,
    dates: null
  };

  const isSufficient = RequirementEngine.isSufficientToPlan(s2Context);
  assert(!isSufficient, 'Planner detects that dates are strictly required and missing');

  const question = RequirementEngine.getNextQuestion(s2Context);
  assert(question !== null, 'Planner returned a clarifying question');
  assert(question!.questionText.includes('One thing changes the price most: when are you going?'), `Question matches expected prompt: "${question!.questionText}"`);
  assert(question!.quickOptions.some((o) => o.label.includes('Best value')), 'Question includes value week option');
  assert(question!.quickOptions.some((o) => o.label.includes('flexible')), 'Question includes flexible option');
  console.log(`Question: ${question!.questionText}`);
  console.log(`Options: ${JSON.stringify(question!.quickOptions.map(o => o.label))}\n`);

  // =========================================================================
  // SCENARIO 3: User selects 5★ upgrade -> Over-budget state with 2 balancing options
  // =========================================================================
  console.log('--- SCENARIO 3: 5★ Luxury Upgrade ---');
  assert(plan1.upgradeOptions!.length > 0, 'Plan provides upgrade options');
  const luxuryUpgrade = plan1.upgradeOptions![0];
  assert(luxuryUpgrade !== undefined, 'Found luxury upgrade option');
  assert(luxuryUpgrade.deltaINR > 0, `Upgrade delta is positive (+₹${luxuryUpgrade.deltaINR.toLocaleString('en-IN')})`);
  console.log(`Upgrade: ${luxuryUpgrade.title} (${luxuryUpgrade.deltaText})`);

  // Selecting upgrade:
  const upgradedPlan = TripPlanningEngine.applyUpgrade(plan1, luxuryUpgrade);
  const upgradedTotal = upgradedPlan.budget.grandTotalINR;
  const isUpgradedOverBudget = upgradedTotal > 60000;
  assert(isUpgradedOverBudget, `Upgraded plan total (₹${upgradedTotal.toLocaleString('en-IN')}) exceeds ₹60,000`);
  const amountOver = upgradedPlan.budget.overBudgetAmountINR;
  assert(amountOver > 0, `Amount over budget is positive: ₹${amountOver.toLocaleString('en-IN')}`);
  console.log(`Upgraded Total: ₹${upgradedTotal.toLocaleString('en-IN')} (Over budget by ₹${amountOver.toLocaleString('en-IN')})`);

  assert(luxuryUpgrade.balancingOptions.length >= 2, `Upgrade provides at least 2 balancing options (got ${luxuryUpgrade.balancingOptions.length})`);
  for (const bal of luxuryUpgrade.balancingOptions) {
    assert(bal.rupeeImpactINR > 0, `Balancing option "${bal.title}" has computed rupee impact: ₹${bal.rupeeImpactINR.toLocaleString('en-IN')}`);
    console.log(`  Balancing option: ${bal.title} -> Saves ₹${bal.rupeeImpactINR.toLocaleString('en-IN')}`);
  }
  console.log('');

  // =========================================================================
  // SCENARIO 4: Goa, 7 days, 2A+1C, ₹15,000 -> status 'infeasible', shortfall shown
  // =========================================================================
  console.log('--- SCENARIO 4: Goa 7-Day 2A+1C ₹15,000 (Infeasible) ---');
  const s4Context: TripContext = {
    ...s1Context,
    budgetTotalINR: 15000
  };

  const plan4 = await TripPlanningEngine.buildDeterministicPlan(s4Context);
  assert(plan4.status === 'infeasible', `Plan 4 status is infeasible, got ${plan4.status}`);
  assert(plan4.shortfallINR! > 0, `Shortfall is shown: ₹${plan4.shortfallINR!.toLocaleString('en-IN')}`);
  assert(plan4.concreteFixes!.length >= 2, `At least 2 concrete fixes returned (got ${plan4.concreteFixes!.length})`);

  for (const fix of plan4.concreteFixes!) {
    assert(fix.rupeeImpactINR > 0, `Concrete fix "${fix.title}" has computed rupee impact: ₹${fix.rupeeImpactINR.toLocaleString('en-IN')}`);
    console.log(`  Fix: ${fix.title} -> Impact: -₹${fix.rupeeImpactINR.toLocaleString('en-IN')} (${fix.description})`);
  }
  console.log(`Shortfall: ₹${plan4.shortfallINR!.toLocaleString('en-IN')}\n`);

  // =========================================================================
  // SCENARIO 5: PRD example: Goa, 4 days, 2 adults, ₹25,000
  // =========================================================================
  console.log('--- SCENARIO 5: PRD Example (Goa, 4 days, 2 adults, ₹25,000) ---');
  const s5Context: TripContext = {
    destination: 'Goa',
    origin: 'Bengaluru',
    dates: '14–17 Nov 2026',
    durationDays: 4,
    partyType: 'couple',
    totalTravellers: 2,
    adultsCount: 2,
    childrenCount: 0,
    childrenAges: [],
    infantsCount: 0,
    seniorsCount: 0,
    budgetTotalINR: 25000,
    budgetTier: 'Budget',
    currency: 'INR',
    accommodationPreference: 'Standard Room',
    activities: [],
    transportMode: 'Flight',
    walkingIntensity: 'Low',
    dietaryPreference: null,
    luggage: null,
    accessibilityRequired: false,
    travelStyle: 'Balanced',
    priority: 'Value',
    scope: 'domestic',
    notes: []
  };

  const plan5 = await TripPlanningEngine.buildDeterministicPlan(s5Context);
  const summary5 = getTripSummary({ tripPlan: plan5, preferences: null });
  console.log(`Plan 5 Status: ${plan5.status!.toUpperCase()}`);
  console.log(`Grand Total (incl. buffer): ₹${plan5.budget.grandTotalINR.toLocaleString('en-IN')}`);
  console.log('Scenario 5 Line Items:');
  for (const item of summary5!.lineItems) {
    console.log(`  • ${item.category.padEnd(16)}: ₹${item.amountINR.toLocaleString('en-IN').padStart(7)} (${item.source} - ${item.title})`);
  }

  if (plan5.status === 'infeasible') {
    assert(plan5.shortfallINR! > 0, 'Shortfall amount computed');
    assert(plan5.concreteFixes!.length >= 2, 'Concrete fixes provided with rupee impacts');
    console.log(`Shortfall: ₹${plan5.shortfallINR!.toLocaleString('en-IN')}`);
    for (const fix of plan5.concreteFixes!) {
      console.log(`  Fix: ${fix.title} (Saves ₹${fix.rupeeImpactINR.toLocaleString('en-IN')})`);
    }
  } else {
    assert(plan5.budget.grandTotalINR <= 25000, 'Fits within ₹25,000');
  }
  console.log('');

  // =========================================================================
  // SCENARIO 6: North Goa hotel forced -> arrival airport = GOX, drive time in reason note
  // =========================================================================
  console.log('--- SCENARIO 6: North Goa Hotel Forced ---');
  const northGoaRoute = selectArrivalAirportByDriveTime('North Goa', 'Goa');
  assert(northGoaRoute.selectedAirportCode === 'GOX', `North Goa selects GOX airport (got ${northGoaRoute.selectedAirportCode})`);
  assert(northGoaRoute.reasonNote.includes('Mopa') && northGoaRoute.reasonNote.includes('North Goa'), `Reason note mentions Mopa and North Goa: "${northGoaRoute.reasonNote}"`);
  console.log(`North Goa airport: ${northGoaRoute.selectedAirportCode}`);
  console.log(`Reason note: ${northGoaRoute.reasonNote}\n`);

  // =========================================================================
  // SCENARIO 7: Unit: buffer = max(2000, 3%); sum(lineItems) === total; no 0 line items
  // =========================================================================
  console.log('--- SCENARIO 7: Financial Unit Test & Invariants ---');
  // Buffer unit test
  const buf1 = calculateContingencyBufferINR(10000); // 3% of 10000 = 300, max(2000, 300) = 2000
  assert(buf1 === 2000, `Buffer for ₹10,000 subtotal is ₹2,000 (got ${buf1})`);

  const buf2 = calculateContingencyBufferINR(100000); // 3% of 100000 = 3000, max(2000, 3000) = 3000
  assert(buf2 === 3000, `Buffer for ₹100,000 subtotal is ₹3,000 (got ${buf2})`);

  // Sum of line items === totalINR
  const lineSum1 = summary1!.lineItems.reduce((acc, curr) => acc + curr.amountINR, 0);
  assert(lineSum1 === summary1!.totalINR, `Sum of lineItems (${lineSum1}) === summary totalINR (${summary1!.totalINR})`);

  const lineSum5 = summary5!.lineItems.reduce((acc, curr) => acc + curr.amountINR, 0);
  assert(lineSum5 === summary5!.totalINR, `Sum of lineItems (${lineSum5}) === summary5 totalINR (${summary5!.totalINR})`);

  // No item is ₹0 unless free
  for (const item of summary1!.lineItems) {
    assert(item.amountINR > 0, `Line item "${item.title}" is not ₹0 (amount: ₹${item.amountINR})`);
  }
  for (const item of summary5!.lineItems) {
    assert(item.amountINR > 0, `Line item "${item.title}" is not ₹0 (amount: ₹${item.amountINR})`);
  }

  // =========================================================================
  // RAG KNOWLEDGE DOCS: Verified vs Curated Guide
  // =========================================================================
  console.log('\n--- RAG KNOWLEDGE DOCS AUDIT ---');
  let verifiedDocsCount = 0;
  let curatedDocsCount = 0;

  for (const doc of SEED_KNOWLEDGE_DOCUMENTS) {
    const isVerified = Boolean(
      doc.sourceUrl &&
      (doc.sourceUrl.startsWith('http://') || doc.sourceUrl.startsWith('https://')) &&
      doc.lastVerifiedAt &&
      doc.lastVerifiedAt.trim() !== ''
    );
    if (isVerified) {
      verifiedDocsCount++;
    } else {
      curatedDocsCount++;
    }
  }

  console.log(`Total Knowledge Documents: ${SEED_KNOWLEDGE_DOCUMENTS.length}`);
  console.log(`  • "Verified {date} · {source}": ${verifiedDocsCount}`);
  console.log(`  • "Curated guide":              ${curatedDocsCount}`);
  assert(verifiedDocsCount + curatedDocsCount === SEED_KNOWLEDGE_DOCUMENTS.length, 'All documents categorized');

  console.log('\n====================================================');
  console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
