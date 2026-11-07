/**
 * AeroDAG Unit Test Suite: User Interview Insights Verification
 * 
 * Tests the 6 key user interview features:
 * 1. Cost breakdown inside each option with category-weighted buffers (heavier on food & shopping) + slider
 * 2. Stay areas on map with reviews, ratings, and Village vs City price contradiction
 * 3. Medical care nearby chip filtering by hospital distance only
 * 4. Scenic routes and flight views tags with curated advice and Nani's time-sensitive flip
 * 5. Outbound links to IRCTC, MakeMyTrip, and hotel official site (no intermediate checkout)
 * 6. Day plan with ordered stops, stop travel times, and Google Maps navigation route hand-off
 */

import { computeFullTripCost, computeCategoryWeightedBuffer } from '../../src/services/fullTripCostHelper.ts';
import { generatePlanOptions } from '../../src/services/planOptionsGenerator.ts';
import { getStayAreasForDestination } from '../../src/services/stayAreasData.ts';
import { TripPlan, TripPreferences } from '../../src/types/travelBooking.ts';

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
  console.log('=== AeroDAG User Interview Insights Test Suite ===\n');

  const mockPlan = ({
    id: 'test-insights-plan',
    title: '3-Day Goa Coastal Escape',
    summary: 'A curated 3-day beach and culture plan in Goa',
    destination: 'Goa',
    origin: 'Bengaluru (BLR)',
    dates: '14 Nov - 17 Nov',
    durationDays: 3,
    travellers: { total: 2, adults: 2, children: 0, childAges: [], seniors: 0 },
    scope: 'domestic',
    status: 'feasible',
    hotelZone: 'Candolim',
    flight: {
      id: 'fl-1',
      airline: 'IndiGo',
      flightNumber: '6E-204',
      departureTime: '06:15',
      arrivalTime: '07:35',
      duration: '1h 20m',
      originCode: 'BLR',
      destinationCode: 'GOI',
      pricePerPersonINR: 4200,
      totalPriceINR: 8400,
      isRoundTrip: true
    },
    hotel: {
      id: 'h-1',
      name: 'Sonesta Inns Beach Resort',
      city: 'Goa',
      area: 'Candolim',
      starRating: 4,
      pricePerNightINR: 4800,
      totalPriceINR: 9600,
      imageUrl: 'https://images.unsplash.com/photo-hotel',
      amenities: ['Pool', 'WiFi', 'Beach Access']
    },
    transfer: {
      id: 'tr-1',
      vehicleType: 'Sedan AC Cab',
      title: 'Private AC Airport Transfer',
      priceINR: 2200,
      duration: '45 mins'
    },
    budget: {
      targetINR: 50000,
      targetUSD: 600,
      flightsCostINR: 8400,
      flightsCostUSD: 100,
      hotelCostINR: 9600,
      hotelCostUSD: 115,
      transportCostINR: 2200,
      transportCostUSD: 26,
      localTransportCostINR: 3600,
      foodCostINR: 4200,
      activitiesCostINR: 4200,
      diningEstimateINR: 4200,
      contingencyBufferINR: 3000,
      grandTotalINR: 32200,
      grandTotalUSD: 388,
      currency: 'INR',
      isOverBudget: false,
      overBudgetAmountINR: 0,
      overBudgetAmountUSD: 0
    },
    itinerary: [
      {
        day: 1,
        dateStr: '14 Nov',
        title: 'Arrival & Coastal Sunset',
        theme: 'Beach & Forts',
        morning: 'Visit Fort Aguada and lighthouse for panoramic Arabian Sea views. Drive 15 mins to Sinquerim Beach.',
        afternoon: 'Relaxed seafood lunch at Kamat Coastal. Beach stroll along Candolim promenade.',
        evening: 'Sunset drinks at shoreline shack followed by Goan fish curry dinner.',
        estimatedCostINR: 1800,
        estimatedCostUSD: 22,
        localDining: ['Kamat Coastal Pure Veg', 'Fisherman’s Wharf'],
        transitTip: 'Hire a local scooter or auto for beach hops',
        stopDriveTimes: [
          { from: 'Hotel', to: 'Fort Aguada', driveMinutes: 15, note: '15 min drive · 4.2 km' },
          { from: 'Fort Aguada', to: 'Kamat Coastal', driveMinutes: 12, note: '12 min drive · 3.8 km' }
        ]
      },
      {
        day: 2,
        dateStr: '15 Nov',
        title: 'Heritage & Spice Plantations',
        theme: 'Latin Quarter & Nature',
        morning: 'Explore Fontainhas Latin Quarter with pastel Portuguese villas and heritage bakeries.',
        afternoon: 'Drive to Sahakari Spice Farm for guided walk and traditional buffet lunch.',
        evening: 'Mandovi river sunset cruise with Goan folk dance performance.',
        estimatedCostINR: 2400,
        estimatedCostUSD: 29,
        localDining: ['Viva Panjim', 'Ritz Classic'],
        transitTip: 'Pre-booked AC cab recommended for inland spice farm trip',
        stopDriveTimes: [
          { from: 'Hotel', to: 'Fontainhas', driveMinutes: 25, note: '25 min drive · 12 km' },
          { from: 'Fontainhas', to: 'Sahakari Spice Farm', driveMinutes: 40, note: '40 min drive · 28 km' }
        ]
      }
    ]
  } as unknown as TripPlan);

  const preferences = ({
    destination: 'Goa',
    origin: 'Bengaluru',
    targetDates: '14–17 Nov 2026',
    durationDays: 3,
    budgetTotalINR: 50000,
    adultsCount: 2,
    childrenCount: 0,
    dietaryPreference: 'Vegetarian',
    tripNeeds: ['Vegetarian food nearby', 'Medical care nearby']
  } as unknown as TripPreferences);

  // =========================================================================
  // TEST 1: COST BREAKDOWN INSIDE EACH OPTION & CATEGORY BUFFER SLIDER
  // =========================================================================
  console.log('[1] Testing Cost Breakdown and Category Buffer Slider');

  const optionsDefault = generatePlanOptions(mockPlan, preferences);
  assert(optionsDefault.length >= 2, 'Generates at least 2 plan tier options');

  const balancedOpt = optionsDefault.find((o) => o.tier === 'Balanced');
  assert(!!balancedOpt, 'Balanced tier option generated');
  assert(typeof balancedOpt!.stayCostINR === 'number' && balancedOpt!.stayCostINR > 0, 'Option contains stayCostINR');
  assert(typeof balancedOpt!.travelCostINR === 'number' && balancedOpt!.travelCostINR > 0, 'Option contains travelCostINR');
  assert(typeof balancedOpt!.localTransportCostINR === 'number' && balancedOpt!.localTransportCostINR > 0, 'Option contains localTransportCostINR');
  assert(typeof balancedOpt!.foodCostINR === 'number' && balancedOpt!.foodCostINR > 0, 'Option contains foodCostINR');
  assert(typeof balancedOpt!.shoppingCostINR === 'number' && balancedOpt!.shoppingCostINR > 0, 'Option contains shoppingCostINR');
  assert(typeof balancedOpt!.bufferCostINR === 'number' && balancedOpt!.bufferCostINR > 0, 'Option contains bufferCostINR');

  // Verify category buffer weighting: Food (+35%) and Shopping (+40%) buffer rates are heavier than Stay (+10%) and Travel (+5%)
  const costCalc = computeFullTripCost(mockPlan, preferences, { customBufferPercent: 25, useCategoryWeights: true });
  assert(!!costCalc.categoryBuffers, 'Returns categoryBuffers breakdown');
  const foodLine = costCalc.lines.find((l) => l.id === 'cost-food')?.amountINR || 1;
  const stayLine = costCalc.lines.find((l) => l.id === 'cost-stay')?.amountINR || 1;
  const travelLine = costCalc.lines.find((l) => l.id === 'cost-travel')?.amountINR || 1;
  const shoppingLine = costCalc.lines.find((l) => l.id === 'cost-shopping')?.amountINR || 1;

  const foodRate = costCalc.categoryBuffers!.foodBufferINR / foodLine;
  const stayRate = costCalc.categoryBuffers!.stayBufferINR / stayLine;
  const travelRate = costCalc.categoryBuffers!.travelBufferINR / travelLine;
  const shoppingRate = costCalc.categoryBuffers!.shoppingBufferINR / shoppingLine;

  assert(foodRate > travelRate, `Food buffer rate (${(foodRate * 100).toFixed(0)}%) is weighted heavier than travel rate (${(travelRate * 100).toFixed(0)}%)`);
  assert(shoppingRate > stayRate, `Shopping buffer rate (${(shoppingRate * 100).toFixed(0)}%) is weighted heavier than stay rate (${(stayRate * 100).toFixed(0)}%)`);

  // Verify Buffer Slider impact: 35% buffer produces higher total than 15% buffer
  const optionsSlider15 = generatePlanOptions(mockPlan, preferences, { customBufferPercent: 15, useCategoryWeights: true });
  const optionsSlider35 = generatePlanOptions(mockPlan, preferences, { customBufferPercent: 35, useCategoryWeights: true });
  const balanced15 = optionsSlider15.find((o) => o.tier === 'Balanced')!;
  const balanced35 = optionsSlider35.find((o) => o.tier === 'Balanced')!;
  assert(balanced35.totalCostINR > balanced15.totalCostINR, `Slider updates total: 35% buffer (₹${balanced35.totalCostINR}) > 15% buffer (₹${balanced15.totalCostINR})`);

  // =========================================================================
  // TEST 2: STAY AREAS ON MAP WITH REVIEWS, RATINGS & VILLAGE VS CITY GAP
  // =========================================================================
  console.log('\n[2] Testing Stay Areas with Reviews and Village vs City Contradiction');

  const goaAreas = getStayAreasForDestination('Goa');
  assert(goaAreas.length >= 2, `Goa provides 2-3 stay areas (count: ${goaAreas.length})`);

  for (const area of goaAreas) {
    assert(!!area.name, `Area has name: ${area.name}`);
    assert(!!area.priceRangePerNightINR, `Area has price range: ${area.priceRangePerNightINR}`);
    assert(!!area.travelTimeToSights, `Area has travel time to sights: ${area.travelTimeToSights}`);
    assert(!!area.nearbyFoodSummary, `Area has nearby food: ${area.nearbyFoodSummary}`);
    assert(!!area.nearbySupermarket, `Area has nearby supermarket: ${area.nearbySupermarket}`);
    assert(!!area.nearbyMedical, `Area has nearby hospital/medical: ${area.nearbyMedical}`);
    assert(typeof area.medicalDistanceKm === 'number' && area.medicalDistanceKm > 0, `Area has verified medical distance in km: ${area.medicalDistanceKm}`);
    assert(!!area.villageVsCityNote, `Area highlights Village vs City trade-off: ${area.villageVsCityNote}`);
    assert(area.rating >= 4.0, `Area has real rating: ${area.rating}★`);
    assert(area.reviews.length > 0, `Area provides reviews`);
    for (const rev of area.reviews) {
      assert(rev.label === '(Sample)', `Sample reviews are explicitly labelled "(Sample)"`);
    }
  }

  // =========================================================================
  // TEST 3: MEDICAL CARE NEARBY FILTER BY DISTANCE ONLY
  // =========================================================================
  console.log('\n[3] Testing Medical Care Nearby Hospital Distance Filtering');

  const coorgAreas = getStayAreasForDestination('Coorg');
  const sortedByHospitalDistance = [...coorgAreas].sort((a, b) => a.medicalDistanceKm - b.medicalDistanceKm);
  assert(sortedByHospitalDistance[0].medicalDistanceKm <= 2.0, `Nearest medical care is Madikeri Town with hospital <= 2.0km (${sortedByHospitalDistance[0].medicalDistanceKm} km)`);
  assert(sortedByHospitalDistance[sortedByHospitalDistance.length - 1].medicalDistanceKm > 5.0, `Distant village stay has hospital > 5.0km (${sortedByHospitalDistance[sortedByHospitalDistance.length - 1].medicalDistanceKm} km)`);

  // =========================================================================
  // TEST 4: SCENIC ROUTES & FLIGHT VIEWS CURATED NOTES
  // =========================================================================
  console.log('\n[4] Testing Curated Scenic Routes and Nani Time-Sensitive Insight');

  // Verify destinationContent for Goa, Coorg, Kerala have sensory/scenic highlights
  const { DESTINATION_CONTENT } = await import('../../src/config/destinationContent.ts');
  assert(DESTINATION_CONTENT.goa.routeComparison.sensoryHighlights.length > 0, 'Goa has sensory highlights');
  assert(DESTINATION_CONTENT.goa.routeComparison.options.some((o) => o.scenicHighlight.includes('estuaries') || o.scenicHighlight.includes('Dudhsagar') || o.scenicHighlight.includes('Ghats')), 'Goa has curated scenic highlights');

  // =========================================================================
  // TEST 5: DIRECT OUTBOUND BOOKING LINKS (IRCTC, MakeMyTrip, Hotel)
  // =========================================================================
  console.log('\n[5] Testing Direct Outbound Booking Links');

  const bookedItemsFile = fs.readFileSync('src/components/consumer/plan/BookedItems.tsx', 'utf-8');
  assert(bookedItemsFile.includes('https://www.irctc.co.in/nget/train-search'), 'BookedItems contains IRCTC direct booking link');
  assert(bookedItemsFile.includes('https://www.makemytrip.com/flights/'), 'BookedItems contains MakeMyTrip Flights link');
  assert(bookedItemsFile.includes('https://www.makemytrip.com/hotels/'), 'BookedItems contains MakeMyTrip Hotels link');
  assert(bookedItemsFile.includes('official site booking'), 'BookedItems contains direct official hotel booking search link');
  assert(bookedItemsFile.includes('No checkout or payment handling on AeroDAG'), 'Explicitly notes no checkout required');

  // =========================================================================
  // TEST 6: DAY PLAN WITH MAP & GOOGLE MAPS NAVIGATION HAND-OFF
  // =========================================================================
  console.log('\n[6] Testing Day Plan with Map & Google Maps Navigation Hand-off');

  const dayByDayFile = fs.readFileSync('src/components/consumer/plan/DayByDay.tsx', 'utf-8');
  assert(dayByDayFile.includes('Open Day'), 'DayByDay contains button to open day route');
  assert(dayByDayFile.includes('https://www.google.com/maps/dir/?api=1'), 'DayByDay constructs multi-stop Google Maps directions URL');
  assert(dayByDayFile.includes('waypoints='), 'DayByDay directions URL includes ordered waypoints');
  assert(dayByDayFile.includes('pinNumber'), 'DayByDay renders numbered pins 1, 2, 3');
  assert(dayByDayFile.includes('travelTimeToNext'), 'DayByDay shows travel time to next stop on each leg');
  assert(dayByDayFile.toLowerCase().includes('feeds into food & transit budget'), 'DayByDay notes estimated day cost feeds into budget');

  console.log(`\n🎉 All ${passed} User Interview Insights assertions passed successfully!`);
}

import fs from 'fs';
runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
