/**
 * AeroDAG Unit Test: AI Destination Profile Validator & Plan Builder
 * 
 * Verifies:
 * - Strict schema validation: good JSON passes, bad airport codes & negative costs are rejected, 50h drives are clamped to 24
 * - Plan builder with fixed sample profile for "Ooty" (Zero network calls)
 * - Destination isolation: NO Goa / Kochi / Dabolim text in Ooty plan
 * - Accurate profile cost derivation
 * - 3 plan options differ (Budget <= Balanced <= Comfort)
 */

import { validateDestinationProfile } from '../../src/server/destinationProfileHandler.ts';
import { buildPlanFromDestinationProfile } from '../../src/services/aiDestinationPlanBuilder.ts';
import { generatePlanOptions } from '../../src/services/planOptionsGenerator.ts';
import { TripContext } from '../../src/services/requirementEngine.ts';
import { DestinationProfile } from '../../src/types/destinationProfile.ts';

let passed = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  passed++;
  console.log(`✅ ${message}`);
}

async function runTests() {
  console.log('=== AeroDAG AI Destination Profile & Dynamic Plan Builder Tests ===\n');

  // =========================================================================
  // TEST SUITE 1: Profile Schema Validator (Strict Rejection & Clamping)
  // =========================================================================
  console.log('[1] Testing Destination Profile Validator');

  const validOotyProfileRaw = {
    name: 'Ooty',
    state: 'Tamil Nadu',
    isInIndia: true,
    nearestAirports: [
      {
        code: 'CJB',
        name: 'Coimbatore International Airport',
        driveHoursToCenter: 2.5
      }
    ],
    nearestRailway: {
      name: 'Udagamandalam / Mettupalayam Railway Station',
      driveHoursToCenter: 1.5
    },
    stayAreas: [
      { name: 'Ooty Lake & Town Center', whyStayHere: 'Walking distance to markets and boat house', priceLevel: 'budget' },
      { name: 'Coonoor Road & Valley', whyStayHere: 'Serene tea garden views and pleasant breeze', priceLevel: 'mid' },
      { name: 'Lovedale & Fernhill', whyStayHere: 'Colonial heritage estates and pine forests', priceLevel: 'premium' }
    ],
    topSights: [
      { name: 'Government Botanical Gardens', area: 'Ooty Lake & Town Center', hoursNeeded: 2 },
      { name: 'Doddabetta Peak Viewpoint', area: 'Coonoor Road & Valley', hoursNeeded: 2.5 },
      { name: 'Pykara Waterfalls & Lake', area: 'Lovedale & Fernhill', hoursNeeded: 3 },
      { name: 'Nilgiri Mountain Railway Heritage Ride', area: 'Ooty Lake & Town Center', hoursNeeded: 2 },
      { name: 'Government Rose Garden', area: 'Ooty Lake & Town Center', hoursNeeded: 1.5 },
      { name: 'Avalanche Lake & Forest Reserve', area: 'Lovedale & Fernhill', hoursNeeded: 4 }
    ],
    typicalDailyCostPerPersonINR: {
      stay: {
        budget: 1200,
        mid: 2600,
        premium: 6000
      },
      food: 750,
      localTransport: 550,
      activities: 450
    },
    bestMonths: 'October to May (Pleasant weather, blooming flowers)',
    weatherNote: 'Daytime 18°C–22°C pleasant sun; evenings drop to 10°C–12°C (carry woollens).',
    localTips: [
      'Book Nilgiri Mountain Toy Train tickets on IRCTC 30 days in advance.',
      'Carry warm jackets for evenings and windy mountain peaks.',
      'Taste fresh homemade artisan chocolates from local bakeries.'
    ],
    vegFriendly: 'high'
  };

  // Case 1a: Good JSON passes
  const goodRes = validateDestinationProfile(validOotyProfileRaw);
  assert(goodRes.valid === true, 'Valid Ooty profile JSON passes schema validation');
  assert(goodRes.profile !== undefined && 'isInIndia' in goodRes.profile && goodRes.profile.isInIndia === true, 'Profile marked as in India');
  const validProfile = goodRes.profile as DestinationProfile;
  assert(validProfile.name === 'Ooty', 'Name preserved as Ooty');
  assert(validProfile.nearestAirports[0].code === 'CJB', 'Airport code CJB preserved');
  assert(validProfile.nearestAirports[0].driveHoursToCenter === 2.5, 'Airport drive hours 2.5h preserved');

  // Case 1b: Bad airport code is rejected (not 3 uppercase letters)
  const badCodeRes = validateDestinationProfile({
    ...validOotyProfileRaw,
    nearestAirports: [
      {
        code: 'INVALID_AIRPORT_CODE',
        name: 'Coimbatore Airport',
        driveHoursToCenter: 2.5
      }
    ]
  });
  assert(badCodeRes.valid === false, 'Bad airport code (e.g. INVALID_AIRPORT_CODE) is rejected');
  assert(badCodeRes.errors !== undefined && badCodeRes.errors.length > 0, 'Rejection includes specific error message');

  const numberCodeRes = validateDestinationProfile({
    ...validOotyProfileRaw,
    nearestAirports: [
      {
        code: '12',
        name: 'Coimbatore Airport',
        driveHoursToCenter: 2.5
      }
    ]
  });
  assert(numberCodeRes.valid === false, 'Numeric 2-letter airport code is rejected');

  // Case 1c: Negative costs are rejected
  const negCostRes = validateDestinationProfile({
    ...validOotyProfileRaw,
    typicalDailyCostPerPersonINR: {
      ...validOotyProfileRaw.typicalDailyCostPerPersonINR,
      stay: {
        ...validOotyProfileRaw.typicalDailyCostPerPersonINR.stay,
        budget: -500
      }
    }
  });
  assert(negCostRes.valid === false, 'Negative stay budget cost (-500) is rejected');

  const negFoodRes = validateDestinationProfile({
    ...validOotyProfileRaw,
    typicalDailyCostPerPersonINR: {
      ...validOotyProfileRaw.typicalDailyCostPerPersonINR,
      food: -200
    }
  });
  assert(negFoodRes.valid === false, 'Negative food cost (-200) is rejected');

  // Case 1d: 50-hour drives are clamped to 24h
  const crazyDriveRes = validateDestinationProfile({
    ...validOotyProfileRaw,
    nearestAirports: [
      {
        code: 'CJB',
        name: 'Coimbatore International Airport',
        driveHoursToCenter: 50 // Outrageous 50-hour drive
      }
    ]
  });
  assert(crazyDriveRes.valid === true, '50-hour airport drive is clamped without crashing');
  assert((crazyDriveRes.profile as DestinationProfile).nearestAirports[0].driveHoursToCenter === 24, '50h drive hours clamped to 24h maximum');

  // Case 1e: Negative drive hours clamped to 0
  const negDriveRes = validateDestinationProfile({
    ...validOotyProfileRaw,
    nearestAirports: [
      {
        code: 'CJB',
        name: 'Coimbatore International Airport',
        driveHoursToCenter: -10
      }
    ]
  });
  assert(negDriveRes.valid === true, 'Negative airport drive hours clamped');
  assert((negDriveRes.profile as DestinationProfile).nearestAirports[0].driveHoursToCenter === 0, 'Negative drive hours clamped to 0');

  // Case 1f: Costs clamped between ₹200 and ₹50,000
  const hugeCostRes = validateDestinationProfile({
    ...validOotyProfileRaw,
    typicalDailyCostPerPersonINR: {
      ...validOotyProfileRaw.typicalDailyCostPerPersonINR,
      food: 999999, // Exceeds 50,000
      activities: 50 // Below 200
    }
  });
  assert(hugeCostRes.valid === true, 'Extreme costs clamped within ₹200–₹50,000/day range');
  assert((hugeCostRes.profile as DestinationProfile).typicalDailyCostPerPersonINR.food === 50000, 'Food cost clamped to ₹50,000 cap');
  assert((hugeCostRes.profile as DestinationProfile).typicalDailyCostPerPersonINR.activities === 200, 'Activities cost clamped to ₹200 floor');

  // Case 1g: Non-India destination returns { unsupported: true }
  const parisRes = validateDestinationProfile({
    name: 'Paris',
    state: 'France',
    isInIndia: false,
    nearestAirports: [{ code: 'CDG', name: 'Charles de Gaulle', driveHoursToCenter: 1 }]
  });
  assert(parisRes.valid === true, 'International place parsed');
  assert(parisRes.profile !== undefined && 'unsupported' in parisRes.profile && parisRes.profile.unsupported === true, 'International place returned as unsupported: true');

  // =========================================================================
  // TEST SUITE 2: AI Destination Plan Builder with Fixed Ooty Profile
  // =========================================================================
  console.log('\n[2] Testing AI Destination Plan Builder (Fixed Ooty Profile, No Network)');

  const mockOotyContext: Partial<TripContext> = {
    origin: 'Bengaluru (BLR)',
    destination: 'Ooty',
    dates: '10–14 Nov 2026',
    durationDays: 4,
    adultsCount: 2,
    childrenCount: 0,
    seniorsCount: 0,
    totalTravellers: 2,
    budgetTotalINR: 40000,
    travelStyle: 'Balanced',
    walkingIntensity: 'Low',
    partyType: 'couple',
    scope: 'domestic',
    notes: []
  };

  const ootyPlan = buildPlanFromDestinationProfile(mockOotyContext, validProfile);

  // Assertions on the built plan:
  assert(ootyPlan.isAiEstimatedDestination === true, 'Plan is flagged as isAiEstimatedDestination');
  assert(ootyPlan.destination.includes('Ooty'), 'Plan destination contains Ooty');
  assert(ootyPlan.durationDays === 4, 'Plan duration is 4 days');
  assert(ootyPlan.travellers.total === 2, 'Total travellers is 2');

  // Destination Isolation Check: ZERO mentions of Goa, Kochi, Dabolim, or Mopa in the Ooty plan
  const planSerialized = JSON.stringify(ootyPlan).toLowerCase();
  assert(!planSerialized.includes('goa'), 'Ooty plan contains ZERO mentions of "goa"');
  assert(!planSerialized.includes('kochi'), 'Ooty plan contains ZERO mentions of "kochi"');
  assert(!planSerialized.includes('dabolim'), 'Ooty plan contains ZERO mentions of "dabolim"');
  assert(!planSerialized.includes('mopa'), 'Ooty plan contains ZERO mentions of "mopa"');

  // Check airport transfer
  assert(ootyPlan.transfer.pickupLocation === 'CJB Airport', 'Transfer pickup is CJB Airport');
  assert(ootyPlan.transfer.duration === 'approx. 2.5 hours', 'Transfer duration matches profile drive hours (approx. 2.5 hours)');
  assert(ootyPlan.flight !== null && ootyPlan.flight.destinationCode === 'CJB', 'Flight destination code is CJB');

  // Check hotel stay derivation
  assert(ootyPlan.availableHotels.length === 3, 'Provides 3 sample hotels at distinct price levels');
  const [budgetHtl, midHtl, premiumHtl] = ootyPlan.availableHotels;
  assert(budgetHtl.tag === 'Within Budget', 'First hotel is Within Budget');
  assert(midHtl.tag === 'Best Match', 'Second hotel is Best Match');
  assert(premiumHtl.tag === 'Luxury Splurge', 'Third hotel is Luxury Splurge');
  assert(budgetHtl.pricePerNightINR < midHtl.pricePerNightINR, 'Budget hotel price < Mid hotel price');
  assert(midHtl.pricePerNightINR < premiumHtl.pricePerNightINR, 'Mid hotel price < Premium hotel price');

  // Check costs come from profile:
  // Nights = 3
  const nights = 3;
  const expectedMidHotelCost = validProfile.typicalDailyCostPerPersonINR.stay.mid * 2 * nights;
  assert(ootyPlan.hotel.totalPriceINR === expectedMidHotelCost, `Hotel total cost (₹${ootyPlan.hotel.totalPriceINR}) derived from profile stay rate (₹${expectedMidHotelCost})`);

  const expectedFoodCost = validProfile.typicalDailyCostPerPersonINR.food * 4 * 2;
  assert(ootyPlan.budget.foodCostINR === expectedFoodCost, `Food cost (₹${ootyPlan.budget.foodCostINR}) derived from profile daily food rate (₹${expectedFoodCost})`);

  const expectedLocalTransportCost = validProfile.typicalDailyCostPerPersonINR.localTransport * 4 * 2;
  assert(ootyPlan.budget.localTransportCostINR === expectedLocalTransportCost, `Local transport cost (₹${ootyPlan.budget.localTransportCostINR}) derived from profile rate (₹${expectedLocalTransportCost})`);

  // Itinerary sights grouping
  assert(ootyPlan.itinerary.length === 4, 'Itinerary has 4 days');
  assert(ootyPlan.itinerary[0].morning.includes('Government Botanical Gardens'), 'Day 1 morning features Botanical Gardens');

  // =========================================================================
  // TEST SUITE 3: Plan Options Differ (Budget <= Balanced <= Comfort)
  // =========================================================================
  console.log('\n[3] Testing Plan Options Generation for AI Destination');

  const options = generatePlanOptions(ootyPlan);
  assert(options.length === 3, 'Generated 3 distinct options (Budget, Balanced, Comfort)');

  const [optBudget, optBalanced, optComfort] = options;
  assert(optBudget.tier === 'Budget', 'First option is Budget');
  assert(optBalanced.tier === 'Balanced', 'Second option is Balanced');
  assert(optComfort.tier === 'Comfort', 'Third option is Comfort');

  assert(
    optBudget.totalCostINR < optBalanced.totalCostINR,
    `Budget total (₹${optBudget.totalCostINR}) < Balanced total (₹${optBalanced.totalCostINR})`
  );
  assert(
    optBalanced.totalCostINR < optComfort.totalCostINR,
    `Balanced total (₹${optBalanced.totalCostINR}) < Comfort total (₹${optComfort.totalCostINR})`
  );

  // Star ratings are unchanged from actual hotel items (3★, 4★, 5★)
  assert(optBudget.stayStars === 3, 'Budget stay star rating is 3★');
  assert(optBalanced.stayStars === 4, 'Balanced stay star rating is 4★');
  assert(optComfort.stayStars === 5, 'Comfort stay star rating is 5★');

  // diffFromBalanced notes present
  assert(
    typeof optBudget.diffFromBalanced === 'string' && optBudget.diffFromBalanced.includes('cheaper'),
    `Budget diffFromBalanced note includes cheaper: "${optBudget.diffFromBalanced}"`
  );
  assert(
    typeof optComfort.diffFromBalanced === 'string' && optComfort.diffFromBalanced.length > 0,
    `Comfort diffFromBalanced note is populated: "${optComfort.diffFromBalanced}"`
  );

  console.log(`\n========================================================`);
  console.log(`PASSED (${passed} / ${passed} assertions)`);
  console.log(`========================================================`);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
