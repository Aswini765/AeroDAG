/**
 * AeroDAG Unit Test: Long-Weekend Finder, Single Cost Truth, Plan Options & Destination Isolation
 */

import { findLongWeekends } from '../../src/services/longWeekendFinder';
import { computeFullTripCost } from '../../src/services/fullTripCostHelper';
import { generatePlanOptions } from '../../src/services/planOptionsGenerator';
import { formatTripShareText } from '../../src/services/shareTripHelper';
import { suggestFromTripType } from '../../src/services/destinationSuggestions';
import { getDestinationContent, DESTINATION_CONTENT } from '../../src/config/destinationContent';
import { TripPlan, TripPreferences } from '../../src/types/travelBooking';

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
  console.log('=== AeroDAG Long Weekends, Cost & Destination Verification Tests ===\n');

  // =========================================================================
  // TEST 1: Long Weekend Finder: Skip Weekend Holidays, Only 3+ Days, Sorted
  // =========================================================================
  console.log('[1] Testing Long Weekend Finder (Skip Saturday/Sunday holidays, 3+ days only)');

  const baseDate2026 = new Date(2026, 0, 1);
  const weekends2026 = findLongWeekends(baseDate2026, 12);

  // In 2026:
  // - 26 Jan 2026 (Mon): Sat-Mon = 3 days (Kept)
  // - 15 Aug 2026 (Sat): Saturday holiday (Dropped per requirement)
  // - 2 Oct 2026 (Fri): Fri-Sun = 3 days (Kept)
  // - 25 Dec 2026 (Fri): Fri-Sun = 3 days (Kept)
  assert(weekends2026.length === 3, `Found exactly 3 long weekends in 2026 (found ${weekends2026.length})`);

  const indep2026 = weekends2026.find((w) => w.holidayName === 'Independence Day');
  assert(!indep2026, '15 Aug 2026 (Saturday) is dropped from long weekends');

  // Verify only fixed national holidays are present
  const validHolidays = new Set(['Republic Day', 'Gandhi Jayanti', 'Christmas']);
  const allHolidaysValid = weekends2026.every((w) => validHolidays.has(w.holidayName));
  assert(allHolidaysValid, 'Only non-weekend national holidays retained in 2026');

  // Verify all returned weekends have daysCount >= 3
  const allAtLeast3Days = weekends2026.every((w) => w.daysCount >= 3);
  assert(allAtLeast3Days, 'Every returned long weekend has at least 3 days');

  // Verify sorted chronologically by startDate
  const isSorted2026 = weekends2026.every((w, idx) => {
    if (idx === 0) return true;
    return w.startDate.getTime() >= weekends2026[idx - 1].startDate.getTime();
  });
  assert(isSorted2026, 'Long weekends are sorted chronologically by date');

  // 2 Oct 2026 is a Friday: Fri 2 Oct – Sun 4 Oct · 0 leave days
  const gandhi = weekends2026.find((w) => w.holidayName === 'Gandhi Jayanti' && w.startDate.getFullYear() === 2026);
  assert(!!gandhi, 'Found Gandhi Jayanti 2026 long weekend');
  if (gandhi) {
    assert(gandhi.startDate.getDate() === 2 && gandhi.startDate.getMonth() === 9, 'Starts on 2 Oct 2026');
    assert(gandhi.endDate.getDate() === 4 && gandhi.endDate.getMonth() === 9, 'Ends on 4 Oct 2026');
    assert(gandhi.leaveDays === 0, 'Gandhi Jayanti 2026 requires 0 leave days');
    assert(gandhi.daysCount === 3, 'Gandhi Jayanti 2026 is a 3-day weekend');
    assert(gandhi.note === 'Check your own office/school holiday list', 'Includes holiday note');
  }

  // Check 2027: 15 Aug 2027 is a Sunday -> must be dropped
  const baseDate2027 = new Date(2027, 0, 1);
  const weekends2027 = findLongWeekends(baseDate2027, 12);
  const indep2027 = weekends2027.find((w) => w.holidayName === 'Independence Day');
  assert(!indep2027, '15 Aug 2027 (Sunday) is dropped from long weekends');
  assert(weekends2027.every((w) => w.daysCount >= 3), 'All 2027 weekends are 3+ days');

  // =========================================================================
  // TEST 2: Single Source of Truth for Full Trip Cost (Problem 2)
  // =========================================================================
  console.log('\n[2] Testing Single Source of Truth for Total Cost across UI & Services');

  const mockKeralaPlan: TripPlan = {
    id: 'kerala-7d-trip',
    title: '7 Days in Munnar & Kerala',
    summary: 'Family trip from Bengaluru',
    destination: 'Kerala, India',
    origin: 'Bengaluru (BLR)',
    dates: '19–26 Oct 2026',
    durationDays: 7,
    travellers: {
      total: 3,
      adults: 2,
      children: 1,
      childAges: [4],
      seniors: 0
    },
    scope: 'domestic',
    flight: {
      id: 'fl-cok-1',
      airline: 'IndiGo',
      airlineCode: '6E',
      flightNumber: '6E-342',
      originCode: 'BLR',
      originCity: 'Bengaluru',
      destinationCode: 'COK',
      destinationCity: 'Kochi',
      departureTime: '07:15',
      arrivalTime: '08:25',
      duration: '1h 10m',
      stops: 'Non-stop',
      pricePerPersonINR: 3200,
      totalPriceINR: 9600,
      pricePerPersonUSD: 40,
      totalPriceUSD: 120,
      baggage: '15kg',
      cabinClass: 'Economy',
      refundable: true,
      seatAvailability: 4
    },
    availableFlights: [],
    hotel: {
      id: 'ht-kerala-tea',
      name: 'Tea Valley Homestay & Resort',
      area: 'Munnar',
      city: 'Munnar',
      starRating: 3,
      reviewScore: 4.6,
      reviewsCount: 310,
      roomType: 'Deluxe Family Valley Room',
      bedConfiguration: '1 King Bed + 1 Extra Bed',
      maxCapacity: 4,
      pricePerNightINR: 2800,
      totalPriceINR: 19600, // 7 nights * 2800
      pricePerNightUSD: 35,
      totalPriceUSD: 245,
      amenities: ['Tea Garden Walk', 'Mountain View', 'Breakfast Included'],
      breakfastIncluded: true,
      freeCancellation: true,
      distanceFromCenter: '4 km from Munnar town',
      imageUrl: ''
    },
    availableHotels: [],
    transfer: {
      id: 'tr-kerala-sedan',
      title: 'AC Sedan Airport Transfer & Sightseeing',
      vehicleType: 'Sedan',
      capacityPassengers: 4,
      luggageCapacity: 3,
      priceINR: 4500,
      priceUSD: 55,
      description: 'Kochi Airport to Munnar transfer',
      duration: 'approx. 3.5 hours',
      pickupLocation: 'COK Airport',
      dropLocation: 'Munnar Resort'
    },
    availableTransfers: [],
    activities: [],
    availableActivities: [],
    itinerary: [],
    diningSuggestions: [],
    budget: {
      targetINR: 60000,
      flightsCostINR: 9600,
      hotelCostINR: 19600,
      transportCostINR: 4500,
      localTransportCostINR: 5040,
      foodCostINR: 11760,
      activitiesCostINR: 4200,
      diningEstimateINR: 11760,
      bufferCostINR: 8205,
      otherCostsINR: 0,
      grandTotalINR: 62905,
      remainingBudgetINR: 0,
      overBudgetAmountINR: 2905,
      isOverBudget: true
    },
    mapWaypoints: [],
    recommendations: [],
    verificationChecks: [],
    createdAt: new Date().toISOString()
  };

  const preferences: TripPreferences = {
    destination: 'Kerala',
    origin: 'Bengaluru',
    targetDates: '19–26 Oct 2026',
    durationDays: 7,
    partySize: 3,
    adultsCount: 2,
    childrenCount: 1,
    childrenAges: [4],
    budgetTotalINR: 60000,
    budgetTotalUSD: 720,
    budgetTier: 'Comfortable',
    travelStyle: 'Balanced',
    priority: 'Family Friendly',
    accommodationPreference: 'Standard 3-Star',
    dietaryOrNotes: 'Vegetarian',
    dietaryPreference: 'Vegetarian',
    tripNeeds: ['Vegetarian food']
  };

  // Authoritative single calculation
  const cost = computeFullTripCost(mockKeralaPlan, preferences);

  // Line item checks
  assert(cost.lines.length === 6, 'Contains all 6 standard cost lines');
  assert(cost.bufferPercent === 15, 'Buffer is exactly 15%');
  const expectedBuffer = Math.round(cost.subtotalINR * 0.15);
  assert(cost.bufferAmountINR === expectedBuffer, `Buffer is 15% of subtotal (${cost.bufferAmountINR} === ${expectedBuffer})`);
  assert(cost.totalWithBufferINR === cost.subtotalINR + expectedBuffer, 'Total with buffer === subtotal + buffer');

  // Verify formatTripShareText uses the identical total
  const shareText = formatTripShareText(mockKeralaPlan, preferences);
  const formattedTotal = cost.totalWithBufferINR.toLocaleString('en-IN');
  const formattedBuffer = cost.bufferAmountINR.toLocaleString('en-IN');
  const formattedPerPerson = cost.perPersonINR.toLocaleString('en-IN');
  assert(shareText.includes(`₹${formattedTotal}`), `Share text displays identical total (₹${formattedTotal})`);
  assert(shareText.includes(`₹${formattedBuffer}`), `Share text displays identical buffer (₹${formattedBuffer})`);
  assert(shareText.includes(`₹${formattedPerPerson}`), `Share text displays identical per-person cost (₹${formattedPerPerson})`);

  // Verify over-budget threshold logic
  const overagePercent = ((cost.totalWithBufferINR - 60000) / 60000) * 100;
  const isSlightlyOver = overagePercent > 0 && overagePercent <= 10;
  assert(isSlightlyOver, `Kerala plan is slightly over budget by ${overagePercent.toFixed(1)}% (<= 10%, should show full plan with banner)`);

  // =========================================================================
  // TEST 3: Real Differences Between Budget / Balanced / Comfort (Problem 3)
  // =========================================================================
  console.log('\n[3] Testing Real Differences Between Budget / Balanced / Comfort');

  const options = generatePlanOptions(mockKeralaPlan, preferences);
  assert(options.length >= 2, `Generates distinct plan options (count: ${options.length})`);

  // If 3 options, verify strict ordering: Budget <= Balanced <= Comfort
  const budgetOption = options.find((o) => o.tier === 'Budget');
  const balancedOption = options.find((o) => o.tier === 'Balanced');
  const comfortOption = options.find((o) => o.tier === 'Comfort');

  assert(!!budgetOption, 'Budget tier is generated');
  assert(!!balancedOption, 'Balanced tier is generated');

  if (budgetOption && balancedOption) {
    assert(
      budgetOption.totalCostINR <= balancedOption.totalCostINR,
      `Budget cost (₹${budgetOption.totalCostINR}) <= Balanced cost (₹${balancedOption.totalCostINR})`
    );
  }

  if (balancedOption && comfortOption) {
    assert(
      balancedOption.totalCostINR <= comfortOption.totalCostINR,
      `Balanced cost (₹${balancedOption.totalCostINR}) <= Comfort cost (₹${comfortOption.totalCostINR})`
    );
  }

  // Verify that star ratings are NOT artificially altered (never force 5★ if hotel is 3★ or 4★)
  options.forEach((opt) => {
    assert(
      opt.stayStars === opt.hotel.starRating,
      `Option '${opt.tier}' star rating (${opt.stayStars}★) matches hotel real star rating (${opt.hotel.starRating}★)`
    );
  });

  // Verify diffFromBalanced string is populated for non-Balanced options
  if (budgetOption) {
    assert(
      typeof budgetOption.diffFromBalanced === 'string' && budgetOption.diffFromBalanced.length > 0,
      `Budget option has diffFromBalanced note: "${budgetOption.diffFromBalanced}"`
    );
  }
  if (comfortOption) {
    assert(
      typeof comfortOption.diffFromBalanced === 'string' && comfortOption.diffFromBalanced.length > 0,
      `Comfort option has diffFromBalanced note: "${comfortOption.diffFromBalanced}"`
    );
  }

  // =========================================================================
  // TEST 4: Destination Content Isolation (Problem 5)
  // =========================================================================
  console.log('\n[4] Testing Destination Content Isolation (No Goa/Beach leaks into Coorg/Kerala)');

  const coorgContent = getDestinationContent('Coorg');
  const coorgJson = JSON.stringify(coorgContent).toLowerCase();

  assert(!coorgJson.includes('goa'), 'Coorg content does not contain "goa"');
  assert(!coorgJson.includes('dabolim'), 'Coorg content does not contain "dabolim"');
  assert(!coorgJson.includes('beach'), 'Coorg content does not contain "beach"');
  assert(!coorgJson.includes('high-speed rail'), 'Coorg content does not contain "high-speed rail"');
  assert(coorgJson.includes('5.5 hours'), 'Coorg content has honest approx. 5.5 hours road travel');

  const keralaContent = getDestinationContent('Kerala');
  const keralaJson = JSON.stringify(keralaContent).toLowerCase();

  assert(!keralaJson.includes('goa'), 'Kerala content does not contain "goa"');
  assert(!keralaJson.includes('dabolim'), 'Kerala content does not contain "dabolim"');
  assert(!keralaJson.includes('high-speed rail'), 'Kerala content does not contain "high-speed rail"');
  assert(keralaJson.includes('10–11 hours'), 'Kerala content road from BLR shows approx. 10–11 hours');

  const mysuruContent = getDestinationContent('Mysuru');
  const mysuruJson = JSON.stringify(mysuruContent).toLowerCase();

  assert(!mysuruJson.includes('goa'), 'Mysuru content does not contain "goa"');
  assert(!mysuruJson.includes('dabolim'), 'Mysuru content does not contain "dabolim"');
  assert(!mysuruJson.includes('beach'), 'Mysuru content does not contain "beach"');
  assert(!mysuruJson.includes('high-speed rail'), 'Mysuru content does not contain "high-speed rail"');

  const goaContent = getDestinationContent('Goa');
  const goaJson = JSON.stringify(goaContent).toLowerCase();

  assert(!goaJson.includes('coorg'), 'Goa content does not contain "coorg"');
  assert(!goaJson.includes('munnar'), 'Goa content does not contain "munnar"');
  assert(!goaJson.includes('mysuru'), 'Goa content does not contain "mysuru"');

  // =========================================================================
  // TEST 5: Trip Type Suggestions
  // =========================================================================
  console.log('\n[5] Testing Destination Suggestions from Trip Type');

  const beachMatch = suggestFromTripType('relaxing beach vacation');
  assert(beachMatch?.destination === 'Goa', 'Beach maps to Goa');
  const hillMatch = suggestFromTripType('scenic hill station with coffee estates');
  assert(hillMatch?.destination === 'Coorg', 'Hills map to Coorg');
  const natureMatch = suggestFromTripType('nature backwaters and wildlife');
  assert(natureMatch?.destination === 'Kerala', 'Nature maps to Kerala');
  const heritageMatch = suggestFromTripType('historic palaces and heritage temples');
  assert(heritageMatch?.destination === 'Mysuru', 'Heritage maps to Mysuru');

  console.log(`\n========================================================`);
  console.log(`PASSED (${passed} / ${passed} assertions)`);
  console.log(`========================================================`);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
