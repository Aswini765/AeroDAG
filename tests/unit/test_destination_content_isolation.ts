/**
 * AeroDAG Unit Test: Destination Content Isolation
 * 
 * Verifies that:
 * 1. 7-day plans for Goa, Coorg, Kerala, and Mysuru contain strictly destination-own content.
 * 2. No other destination's restaurants or areas appear:
 *    - "Panaji", "Martin's Corner", "Calangute" never appear in Coorg, Kerala, or Mysuru.
 *    - "beach", "sandcastle" never appear in Coorg or Mysuru.
 * 3. No activity is repeated across multiple days.
 * 4. With fewer sights than days, free/rest days ("Free morning · explore at your own pace") are used instead of repeating.
 */

import { TripPlanningEngine } from '../../src/services/tripPlanningEngine';
import { RequirementEngine } from '../../src/services/requirementEngine';
import { TripPlan } from '../../src/types/travelBooking';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${msg}`);
  }
}

async function runTests() {
  console.log('--- TEST SUITE: Destination Content Isolation & Non-Repeating Itineraries ---');

  const destinations = [
    {
      name: 'Goa',
      input: 'Goa',
      origin: 'Bengaluru (BLR)',
      forbiddenKeywords: ['Munnar', 'Madikeri', 'Chamundi', 'Mylari'],
      mustHaveKeywords: ['Goa']
    },
    {
      name: 'Coorg',
      input: 'Coorg',
      origin: 'Bengaluru (BLR)',
      forbiddenKeywords: ['Panaji', "Martin's Corner", 'Calangute', 'Baga', 'beach', 'sandcastle', 'Munnar', 'Alleppey'],
      mustHaveKeywords: ['Coorg']
    },
    {
      name: 'Kerala',
      input: 'Munnar, Kerala',
      origin: 'Bengaluru (BLR)',
      forbiddenKeywords: ['Panaji', "Martin's Corner", 'Calangute', 'Baga', 'sandcastle', 'Madikeri', 'Mysuru'],
      mustHaveKeywords: ['Munnar']
    },
    {
      name: 'Mysuru',
      input: 'Mysuru',
      origin: 'Bengaluru (BLR)',
      forbiddenKeywords: ['Panaji', "Martin's Corner", 'Calangute', 'Baga', 'beach', 'sandcastle', 'Munnar', 'Madikeri'],
      mustHaveKeywords: ['Mysuru', 'Palace']
    }
  ];

  for (const dest of destinations) {
    console.log(`\n[Scenario: 7-Day Plan for ${dest.name}]`);
    const ctx = RequirementEngine.createEmptyContext();
    ctx.destination = dest.input;
    ctx.origin = dest.origin;
    ctx.durationDays = 7;
    ctx.dates = '14–20 Nov 2026';
    ctx.budgetTotalINR = 75000;
    ctx.partyType = 'family';
    ctx.adultsCount = 2;
    ctx.childrenCount = 1;
    ctx.childrenAges = [8];
    ctx.totalTravellers = 3;
    ctx.tripNeeds = ['Travelling with kids'];

    const plan: TripPlan = await TripPlanningEngine.buildDeterministicPlan(ctx);
    assert(plan.durationDays === 7, `${dest.name} plan has 7 days`);
    assert(plan.itinerary.length === 7, `${dest.name} itinerary has 7 day items`);

    // 1. Check for forbidden keywords across all days
    const allItineraryText = plan.itinerary.map(d =>
      `${d.title} ${d.theme} ${d.morning} ${d.afternoon} ${d.evening} ${(d.localDining || []).join(' ')}`
    ).join(' ').toLowerCase();

    for (const forbidden of dest.forbiddenKeywords) {
      const found = allItineraryText.includes(forbidden.toLowerCase());
      assert(!found, `${dest.name} does NOT contain forbidden keyword "${forbidden}"`);
    }

    // 2. Check dining suggestions are destination-specific
    for (const dining of plan.diningSuggestions) {
      for (const forbidden of dest.forbiddenKeywords) {
        const found = dining.name.toLowerCase().includes(forbidden.toLowerCase()) ||
                      dining.area.toLowerCase().includes(forbidden.toLowerCase());
        assert(!found, `${dest.name} dining "${dining.name} (${dining.area})" does NOT contain forbidden "${forbidden}"`);
      }
    }

    // 3. Check that no activity repeats on multiple days
    const intermediateDays = plan.itinerary.slice(1, plan.itinerary.length - 1);
    const activityTitles: string[] = [];
    let hasRestDay = false;

    for (const day of intermediateDays) {
      const cleanTitle = (day.title || '').replace(/^Day\s*\d+\s*[:·\-–—]\s*/i, '').trim();
      if (cleanTitle.toLowerCase().includes('free day') || day.morning.includes('Free morning · explore at your own pace')) {
        hasRestDay = true;
      } else {
        assert(!activityTitles.includes(cleanTitle), `${dest.name} Day ${day.day} activity "${cleanTitle}" does NOT repeat earlier days`);
        activityTitles.push(cleanTitle);
      }
    }

    // 4. If total available activities was less than intermediate days (5 days), assert rest day was used
    if (plan.availableActivities.length < 5) {
      assert(hasRestDay, `${dest.name} uses free/rest day with 'Free morning · explore at your own pace' when activities < 5`);
    }
  }

  // Scenario 5: Extended 9-day trip to test rest day fallback explicitly
  console.log('\n[Scenario 5: 9-Day Trip with Fewer Sights than Days]');
  const ctx9 = RequirementEngine.createEmptyContext();
  ctx9.destination = 'Coorg';
  ctx9.origin = 'Bengaluru (BLR)';
  ctx9.durationDays = 9;
  ctx9.dates = '10–18 Nov 2026';
  ctx9.budgetTotalINR = 80000;
  ctx9.partyType = 'family';
  ctx9.adultsCount = 2;
  ctx9.totalTravellers = 2;

  const plan9: TripPlan = await TripPlanningEngine.buildDeterministicPlan(ctx9);
  const intermediate9 = plan9.itinerary.slice(1, plan9.itinerary.length - 1);
  const restDays = intermediate9.filter(d =>
    d.morning.includes('Free morning · explore at your own pace') ||
    d.title.toLowerCase().includes('free day')
  );

  assert(restDays.length > 0, `9-day trip has at least 1 free/rest day (${restDays.length} rest days)`);
  assert(restDays[0].morning.includes('Free morning · explore at your own pace'), 'Rest day contains exact phrase "Free morning · explore at your own pace"');

  // Verify titles strip leading Day N:
  for (const day of plan9.itinerary) {
    assert(!/^Day\s*\d+\s*:/i.test(day.title), `Day ${day.day} title "${day.title}" does not start with redundant "Day ${day.day}:"`);
  }

  console.log(`\n========================================================`);
  console.log(`TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log(`========================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
