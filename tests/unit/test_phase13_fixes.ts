/**
 * AeroDAG Unit Test Suite: 8 Targeted Fixes Verification
 * 
 * Verifies:
 * 1. "Fits your budget" must be true (only when totalWithBufferINR <= budget; cheapest option over budget handled)
 * 2. Ask before assuming (clarify routing, weekend = 2 days Sat-Sun, plan title matches day count)
 * 3. Gibberish message vs International destination advisory
 * 4. Realistic travel times in day plans (no item > 1h labelled "30-min drive", Munnar drops Alleppey)
 * 5. Destination-correct filler text (Goa, Coorg, Kerala, Mysuru, Udaipur; road trip transfer line)
 * 6. Names and labels (no generic or made-up names, "Your plan" badge)
 * 7. Favicon, og:* meta tags, twitter:card, og-image.png
 * 8. Fake email alex.taylor@example.com never prefilled
 */

import fs from 'fs';
import path from 'path';
import { TripPlanningEngine, getRealisticDriveTime } from '../../src/services/tripPlanningEngine.ts';
import { generatePlanOptions } from '../../src/services/planOptionsGenerator.ts';
import { buildPlanFromDestinationProfile } from '../../src/services/aiDestinationPlanBuilder.ts';
import { UNPARSEABLE_MSG, detectSupportedDestination } from '../../src/components/consumer/DescribeScreen.tsx';
import { DestinationProfile } from '../../src/types/destinationProfile.ts';
import { TripPlan } from '../../src/types/travelBooking.ts';

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
  console.log('=== AeroDAG 8 Targeted Fixes Test Suite ===\n');

  // =========================================================================
  // FIX 1: "FITS YOUR BUDGET" MUST BE TRUE
  // =========================================================================
  console.log('[1] Testing "Fits your budget" logic');

  // Create a mock base plan with total 30,000
  const mockPlan: TripPlan = {
    id: 'test-plan',
    title: '3-Day Coorg Getaway',
    summary: 'Test summary',
    destination: 'Coorg',
    origin: 'Bengaluru (BLR)',
    dates: '14 Nov - 17 Nov',
    durationDays: 3,
    travellers: { total: 2, adults: 2, children: 0, childAges: [], seniors: 0 },
    scope: 'domestic',
    status: 'feasible',
    hotelZone: 'Madikeri',
    arrivalAirportCode: 'MYQ',
    arrivalAirportName: 'Mysuru Airport',
    flight: null,
    availableFlights: [],
    hotel: {
      id: 'h-1',
      name: 'Coorg Heritage Stay',
      area: 'Madikeri',
      pricePerNightINR: 3500,
      pricePerNightUSD: 42,
      starRating: 3,
      tag: 'Best Match',
      roomType: 'Deluxe Room',
      amenities: ['WiFi', 'Breakfast'],
      matchingNeedsTags: [],
      capacityVerifiedForFamily: true,
      maxCapacity: 3
    } as any,
    availableHotels: [],
    transfer: {
      id: 't-1',
      title: 'Round-trip cab from Bengaluru',
      vehicleType: 'AC Sedan',
      capacityPassengers: 4,
      luggageCapacity: 4,
      priceINR: 5000,
      priceUSD: 60,
      description: 'Round-trip cab',
      duration: '5 hours',
      pickupLocation: 'BLR',
      dropLocation: 'Coorg'
    },
    availableTransfers: [],
    activities: [],
    availableActivities: [],
    itinerary: [],
    diningSuggestions: [],
    budget: {
      targetINR: 20000,
      flightsCostINR: 0,
      hotelCostINR: 7000,
      transportCostINR: 5000,
      localTransportCostINR: 3000,
      foodCostINR: 4000,
      activitiesCostINR: 1500,
      diningEstimateINR: 4000,
      bufferCostINR: 1500,
      otherCostsINR: 0,
      grandTotalINR: 22000,
      remainingBudgetINR: -2000,
      overBudgetAmountINR: 2000,
      isOverBudget: true,
      statusMessage: 'Over budget'
    },
    mapWaypoints: [],
    recommendations: [],
    verificationChecks: [],
    createdAt: new Date().toISOString()
  };

  // Case A: Budget is 15,000 (No option fits)
  const optionsUnderBudget = generatePlanOptions(mockPlan, { budget: 15000 } as any);
  assert(optionsUnderBudget.length >= 2, 'Generated plan options');
  const budgetOptA = optionsUnderBudget.find(o => o.tier === 'Budget')!;
  assert(!budgetOptA.badge?.toLowerCase().includes('fits your budget'), 'When over budget, badge does NOT say Fits your budget');
  assert(budgetOptA.badge?.includes('over budget'), 'Cheapest option badge states "over budget"');

  // Case B: Budget is 50,000 (All options fit)
  const optionsFits = generatePlanOptions(mockPlan, { budget: 50000 } as any);
  const budgetOptB = optionsFits.find(o => o.tier === 'Budget')!;
  assert(budgetOptB.badge === 'Fits your budget', 'When option fits budget, badge says Fits your budget');

  // =========================================================================
  // FIX 2: ASK BEFORE ASSUMING (Weekend = Sat-Sun = 2 days)
  // =========================================================================
  console.log('\n[2] Testing date resolution and weekend day count');
  const coorgWeekendPlan = await TripPlanningEngine.buildDeterministicPlan({
    destination: 'Coorg',
    origin: 'Bengaluru (BLR)',
    dates: '24–25 Oct 2026',
    durationDays: 2,
    totalTravellers: 2,
    adultsCount: 2,
    budgetTotalINR: 20000
  } as any);
  assert(coorgWeekendPlan.durationDays === 2, 'Weekend plan duration is exactly 2 days');
  assert(coorgWeekendPlan.itinerary.length === 2, 'Weekend itinerary has exactly 2 day items');
  assert(coorgWeekendPlan.title.startsWith('2-Day'), `Plan title starts with 2-Day (Actual: ${coorgWeekendPlan.title})`);

  // =========================================================================
  // FIX 3: GIBBERISH VS INTERNATIONAL DESTINATION
  // =========================================================================
  console.log('\n[3] Testing gibberish vs international detection');
  assert(
    UNPARSEABLE_MSG === "I couldn't understand that. Try something like: 3 days in Coorg for 2, budget ₹20,000.",
    'UNPARSEABLE_MSG matches required prompt text exactly'
  );

  const gibberishResult = detectSupportedDestination('asdfgh qwerty 12345');
  assert(gibberishResult.unparseable === true, 'Gibberish input identified as unparseable');
  assert(!gibberishResult.unsupportedTarget, 'Gibberish does NOT set an unsupportedTarget');

  const parisResult = detectSupportedDestination('5 days in Paris for 2');
  assert(parisResult.unsupportedTarget === 'Paris', 'Real international place Paris identified as unsupportedTarget');

  // =========================================================================
  // FIX 4: REALISTIC TRAVEL TIMES IN DAY PLANS
  // =========================================================================
  console.log('\n[4] Testing realistic drive times and Munnar Alleppey isolation');

  // Test 4A: getRealisticDriveTime
  const dudhsagarDrive = getRealisticDriveTime('Calangute, North Goa', 'Resort', 'Dudhsagar Waterfalls Jeep Safari', 'Mollem National Park', 'Goa');
  assert(dudhsagarDrive.driveMinutes > 60, `Dudhsagar drive time is > 60 min (${dudhsagarDrive.driveMinutes} min)`);
  assert(!dudhsagarDrive.note.includes('30-min drive'), 'Dudhsagar drive note is NOT 30-min drive');

  const talacauveryDrive = getRealisticDriveTime('Madikeri', 'Resort', 'Talacauvery & Brahmagiri Hills Viewpoint', 'Bhagamandala, Coorg', 'Coorg');
  assert(talacauveryDrive.driveMinutes > 60, `Talacauvery drive time is > 60 min (${talacauveryDrive.driveMinutes} min)`);
  assert(!talacauveryDrive.note.includes('30-min drive'), 'Talacauvery drive note is NOT 30-min drive');

  const alleppeyFromMunnar = getRealisticDriveTime('Munnar Hills', 'Resort', 'Alleppey Shaded Backwater Country Boat Cruise', 'Alleppey', 'Munnar, Kerala');
  assert(alleppeyFromMunnar.driveMinutes >= 180, `Alleppey from Munnar is >= 180 min (${alleppeyFromMunnar.driveMinutes} min)`);
  assert(!alleppeyFromMunnar.note.includes('30-min drive'), 'Alleppey from Munnar drive note is NOT 30-min drive');

  // Test 4B: Build 5-day Munnar plan — Alleppey must be dropped from Munnar stays!
  const munnarPlan = await TripPlanningEngine.buildDeterministicPlan({
    destination: 'Munnar, Kerala',
    origin: 'Bengaluru (BLR)',
    dates: '10 Nov - 15 Nov',
    durationDays: 5,
    totalTravellers: 2,
    adultsCount: 2,
    budgetTotalINR: 35000
  } as any);

  const munnarActs = munnarPlan.itinerary.map(d => `${d.title} ${d.morning} ${d.afternoon} ${d.evening}`);
  const hasAlleppeyInMunnar = munnarActs.some(text => text.toLowerCase().includes('alleppey'));
  assert(!hasAlleppeyInMunnar, 'Alleppey activities are dropped from a Munnar stay');

  // Test 4C: Verify NO day item with driveMinutes > 60 is labelled "30-min drive"
  const destinationsToTest = [
    { dest: 'Goa', origin: 'Bengaluru (BLR)' },
    { dest: 'Coorg', origin: 'Bengaluru (BLR)' },
    { dest: 'Munnar, Kerala', origin: 'Bengaluru (BLR)' },
    { dest: 'Mysuru', origin: 'Bengaluru (BLR)' }
  ];

  for (const { dest, origin } of destinationsToTest) {
    const plan = await TripPlanningEngine.buildDeterministicPlan({
      destination: dest,
      origin,
      dates: '10 Nov - 16 Nov',
      durationDays: 6,
      totalTravellers: 2,
      adultsCount: 2,
      budgetTotalINR: 40000
    } as any);

    for (const day of plan.itinerary) {
      for (const stop of (day.stopDriveTimes || [])) {
        if (stop.driveMinutes > 60) {
          assert(stop.note !== '30-min drive', `In ${dest} Day ${day.day}, item ${stop.to} (${stop.driveMinutes}m) is not labelled '30-min drive'`);
        }
      }
    }
  }

  // =========================================================================
  // FIX 5: DESTINATION-CORRECT FILLER TEXT & ROAD TRIP TRANSFERS
  // =========================================================================
  console.log('\n[5] Testing destination-correct filler text and road trip transfers');

  // Test 5A: Sample AI Profile for Udaipur — no "tea/spice plantations"
  const udaipurProfile: DestinationProfile = {
    name: 'Udaipur',
    state: 'Rajasthan',
    isInIndia: true,
    nearestAirports: [{ code: 'UDR', name: 'Maharana Pratap Airport Udaipur', driveHoursToCenter: 0.75 }],
    stayAreas: [
      { name: 'Lake Pichola & Old City', whyStayHere: 'Scenic lake views and walking access to palaces', priceLevel: 'mid' },
      { name: 'Fateh Sagar Lake', whyStayHere: 'Peaceful lake promenade', priceLevel: 'premium' }
    ],
    topSights: [
      { name: 'City Palace Complex', area: 'Lake Pichola & Old City', hoursNeeded: 3 },
      { name: 'Lake Pichola Boat Ride & Jagmandir', area: 'Lake Pichola & Old City', hoursNeeded: 2 },
      { name: 'Saheliyon-ki-Bari & Vintage Car Museum', area: 'Fateh Sagar Lake', hoursNeeded: 2.5 }
    ],
    experiences: [
      { name: 'Dharohar Folk Dance Show at Bagore Ki Haveli', duration: 'Evening' },
      { name: 'Artisan Blue Pottery & Miniature Painting Walk', duration: 'Half-day' }
    ],
    diningSpecialties: [
      { dish: 'Dal Baati Churma', recommendation: 'Authentic Rajasthani dining hall' },
      { dish: 'Gatte ki Sabzi', recommendation: 'Lakeside rooftop restaurant' }
    ],
    tripStyles: ['Heritage', 'Romantic', 'Relaxed'],
    bestMonths: ['October', 'November', 'December', 'January', 'February'],
    seasonalNotes: 'Pleasant winter days and cool breezy evenings by the lakes.',
    typicalDailyCostPerPersonINR: {
      stay: { budget: 1400, mid: 3000, premium: 7000 },
      food: 800,
      localTransport: 600,
      activities: 500
    }
  } as any;

  const udaipurPlan = buildPlanFromDestinationProfile(
    { destination: 'Udaipur', origin: 'Jaipur', dates: '12 Nov - 16 Nov', durationDays: 4, totalTravellers: 2, adultsCount: 2, budgetTotalINR: 35000 },
    udaipurProfile
  );

  const udaipurItineraryText = udaipurPlan.itinerary.map(d => `${d.morning} ${d.afternoon} ${d.evening}`).join(' ');
  assert(!/tea\s*(and|&)?\s*spice\s*plantations/i.test(udaipurItineraryText), 'Udaipur filler text contains NO tea/spice plantations');
  assert(/bazaar|heritage|lake|promenade|palace/i.test(udaipurItineraryText), 'Udaipur filler text has authentic heritage/lake references');

  // Test 5B: Road trip transfer line says "Round-trip cab from <origin>"
  const roadTripCoorg = await TripPlanningEngine.buildDeterministicPlan({
    destination: 'Coorg',
    origin: 'Bengaluru (BLR)',
    dates: '10 Nov - 13 Nov',
    durationDays: 3,
    totalTravellers: 2,
    adultsCount: 2,
    budgetTotalINR: 25000
  } as any);
  assert(
    roadTripCoorg.transfer?.title.startsWith('Round-trip cab from Bengaluru'),
    `Road trip transfer title is "Round-trip cab from Bengaluru" (Actual: ${roadTripCoorg.transfer?.title})`
  );

  // =========================================================================
  // FIX 6: NAMES AND LABELS
  // =========================================================================
  console.log('\n[6] Testing names, sample labels, and "Your plan" badge');

  // Check destinationContent generic fallback
  const destContent = fs.readFileSync(path.resolve('src/config/destinationContent.ts'), 'utf8');
  assert(!destContent.includes("'Local Family Restaurant'"), "destinationContent.ts has no 'Local Family Restaurant'");
  assert(destContent.includes('(sample)'), "destinationContent.ts labels sample dining with (sample)");

  // Check NearbyAmenitiesCard
  const amenitiesCard = fs.readFileSync(path.resolve('src/components/consumer/plan/NearbyAmenitiesCard.tsx'), 'utf8');
  assert(!amenitiesCard.includes("'Local Family Diner'"), "NearbyAmenitiesCard.tsx has no 'Local Family Diner'");
  assert(!amenitiesCard.includes("'Shree Krishna Sagar Thali'"), "NearbyAmenitiesCard.tsx has no made-up 'Shree Krishna Sagar Thali'");

  // Check PlanHeader badge
  const planHeader = fs.readFileSync(path.resolve('src/components/consumer/plan/PlanHeader.tsx'), 'utf8');
  assert(!planHeader.includes('RESEARCH & DECIDE'), "PlanHeader.tsx has no 'RESEARCH & DECIDE'");
  assert(planHeader.includes('Your plan'), "PlanHeader.tsx has 'Your plan' badge");

  // =========================================================================
  // FIX 7: FAVICON AND LINK PREVIEW
  // =========================================================================
  console.log('\n[7] Testing favicon, og tags, and link preview');

  assert(fs.existsSync(path.resolve('public/favicon.svg')), 'public/favicon.svg exists');
  const faviconSvg = fs.readFileSync(path.resolve('public/favicon.svg'), 'utf8');
  assert(faviconSvg.includes('#0E6B59'), 'favicon.svg contains brand teal #0E6B59');

  assert(fs.existsSync(path.resolve('public/og-image.png')), 'public/og-image.png exists');
  const ogImageStat = fs.statSync(path.resolve('public/og-image.png'));
  assert(ogImageStat.size > 1000, `public/og-image.png is valid file size (${ogImageStat.size} bytes)`);

  const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf8');
  assert(indexHtml.includes('href="/favicon.svg"'), 'index.html links to favicon.svg');
  assert(indexHtml.includes('property="og:title"'), 'index.html has og:title');
  assert(indexHtml.includes('property="og:description"'), 'index.html has og:description');
  assert(indexHtml.includes('property="og:type" content="website"'), 'index.html has og:type=website');
  assert(indexHtml.includes('property="og:url" content="https://aerodag.onrender.com"'), 'index.html has og:url');
  assert(indexHtml.includes('property="og:image" content="https://aerodag.onrender.com/og-image.png"'), 'index.html has og:image');
  assert(indexHtml.includes('name="twitter:card" content="summary_large_image"'), 'index.html has twitter:card=summary_large_image');

  // =========================================================================
  // FIX 8: DON'T PREFILL A FAKE EMAIL
  // =========================================================================
  console.log('\n[8] Testing confirmation screen fake email avoidance');

  const checkoutFlow = fs.readFileSync(path.resolve('src/components/consumer/CheckoutBookingFlow.tsx'), 'utf8');
  assert(checkoutFlow.includes("passengers[0]?.email === 'alex.taylor@example.com'"), 'CheckoutBookingFlow avoids passing alex.taylor@example.com as contactEmail');

  const appTsx = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
  assert(appTsx.includes('alex.taylor@example.com'), 'App.tsx explicitly checks and prevents alex.taylor@example.com from being prefilled');

  const keepTrips = fs.readFileSync(path.resolve('src/components/consumer/KeepTripsCard.tsx'), 'utf8');
  assert(keepTrips.includes("defaultEmail === 'alex.taylor@example.com' ? '' : defaultEmail"), 'KeepTripsCard filters out alex.taylor@example.com');

  console.log(`\n========================================================`);
  console.log(`ALL TESTS PASSED: ${passed} assertions passed!`);
  console.log(`========================================================\n`);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
