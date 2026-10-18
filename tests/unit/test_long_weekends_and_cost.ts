/**
 * AeroDAG Unit Test: Long-Weekend Finder & Per-Person Cost Calculator
 */

import { findLongWeekends } from '../../src/services/longWeekendFinder';
import { computeFullTripCost } from '../../src/services/fullTripCostHelper';
import { TripPlan } from '../../src/types/travelBooking';

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
  console.log('=== AeroDAG Long Weekends & Per-Person Cost Tests ===\n');

  // TEST 1: Long Weekend Finder with fixed date (e.g. 1 Jan 2026)
  const baseDate = new Date(2026, 0, 1);
  const weekends2026 = findLongWeekends(baseDate, 12);
  assert(weekends2026.length >= 4, `Found at least 4 long weekends in 2026 (found ${weekends2026.length})`);

  // Verify only fixed national holidays are present
  const validHolidays = new Set(['Republic Day', 'Independence Day', 'Gandhi Jayanti', 'Christmas']);
  const allHolidaysValid = weekends2026.every((w) => validHolidays.has(w.holidayName));
  assert(allHolidaysValid, 'Only fixed national holidays used (26 Jan, 15 Aug, 2 Oct, 25 Dec)');

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

  // TEST 2: Per-Person Cost calculation with children counted as people
  const mockPlan: TripPlan = {
    id: 'test-plan-1',
    title: 'Goa 5 Days',
    summary: 'Family trip',
    destination: 'Goa, India',
    origin: 'Bengaluru (BLR)',
    dates: '14–19 Nov 2026',
    durationDays: 5,
    travellers: {
      total: 3,
      adults: 2,
      children: 1,
      childAges: [10],
      seniors: 0
    },
    scope: 'domestic',
    flight: {
      id: 'fl-1',
      airline: 'IndiGo',
      airlineCode: '6E',
      flightNumber: '6E-451',
      originCode: 'BLR',
      originCity: 'Bengaluru',
      destinationCode: 'GOI',
      destinationCity: 'Goa',
      departureTime: '08:00',
      arrivalTime: '09:15',
      duration: '1h 15m',
      stops: 'Non-stop',
      pricePerPersonINR: 5000,
      totalPriceINR: 15000,
      pricePerPersonUSD: 60,
      totalPriceUSD: 180,
      baggage: '15kg',
      cabinClass: 'Economy',
      refundable: true,
      seatAvailability: 4
    },
    availableFlights: [],
    hotel: {
      id: 'htl-1',
      name: 'Sea Breeze Resort',
      area: 'Cavelossim',
      city: 'Goa',
      starRating: 4,
      reviewScore: 4.5,
      reviewsCount: 120,
      roomType: 'Family Suite',
      bedConfiguration: '1 King + 1 Sofa',
      maxCapacity: 4,
      pricePerNightINR: 4000,
      totalPriceINR: 16000, // 4 nights * 4000
      pricePerNightUSD: 50,
      totalPriceUSD: 200,
      amenities: ['Pool', 'Kitchenette'],
      breakfastIncluded: true,
      freeCancellation: true,
      distanceFromCenter: '2 km',
      imageUrl: ''
    },
    availableHotels: [],
    transfer: {
      id: 'tr-1',
      title: 'AC Sedan',
      vehicleType: 'Sedan',
      capacityPassengers: 4,
      luggageCapacity: 3,
      priceINR: 1500,
      priceUSD: 18,
      description: 'Airport to hotel',
      duration: '45 mins',
      pickupLocation: 'GOI',
      dropLocation: 'Hotel'
    },
    availableTransfers: [],
    activities: [],
    availableActivities: [],
    itinerary: [],
    diningSuggestions: [],
    budget: {
      targetINR: 60000,
      flightsCostINR: 15000,
      hotelCostINR: 16000,
      transportCostINR: 1500,
      localTransportCostINR: 3600,
      foodCostINR: 7000,
      activitiesCostINR: 3000,
      diningEstimateINR: 7000,
      bufferCostINR: 2000,
      otherCostsINR: 0,
      grandTotalINR: 46100,
      remainingBudgetINR: 13900,
      overBudgetAmountINR: 0,
      isOverBudget: false
    },
    mapWaypoints: [],
    recommendations: [],
    verificationChecks: [],
    createdAt: new Date().toISOString()
  };

  const cost = computeFullTripCost(mockPlan);

  // Assert lines count (Stay, Travel, Local transport, Food, Activities, Shopping/misc)
  assert(cost.lines.length === 6, 'Contains all 6 cost lines');
  assert(cost.lines.some((l) => l.name === 'Stay'), 'Contains Stay line');
  assert(cost.lines.some((l) => l.name === 'Travel to destination'), 'Contains Travel to destination line');
  assert(cost.lines.some((l) => l.name === 'Local transport' && l.isEstimate), 'Contains Local transport line labelled Estimate');
  assert(cost.lines.some((l) => l.name === 'Food' && l.isEstimate), 'Contains Food line labelled Estimate');
  assert(cost.lines.some((l) => l.name === 'Activities' && l.isEstimate), 'Contains Activities line labelled Estimate');
  assert(cost.lines.some((l) => l.name === 'Shopping/misc' && l.isEstimate), 'Contains Shopping/misc line labelled Estimate');

  // Buffer: 15%
  assert(cost.bufferPercent === 15, 'Surprise buffer is 15%');
  const expectedBuffer = Math.round(cost.subtotalINR * 0.15);
  assert(cost.bufferAmountINR === expectedBuffer, `Buffer amount is 15% of subtotal (${cost.bufferAmountINR} === ${expectedBuffer})`);
  assert(cost.totalWithBufferINR === cost.subtotalINR + expectedBuffer, 'Total with buffer is subtotal + buffer');

  // Travellers & Per-person: children counted as people
  assert(cost.totalTravellers === 3, 'Total travellers correctly counts 2 adults + 1 child = 3');
  const expectedPerPerson = Math.round(cost.totalWithBufferINR / 3);
  assert(cost.perPersonINR === expectedPerPerson, `Per-person cost is total / 3 (${cost.perPersonINR} === ${expectedPerPerson})`);

  // Budget status: 60,000 target, cost is within budget
  assert(cost.budgetStatus === 'under' || cost.budgetStatus === 'close', `Budget status is ${cost.budgetStatus}`);

  // Test over-budget scenario
  const overPlan: TripPlan = {
    ...mockPlan,
    budget: {
      ...mockPlan.budget,
      targetINR: 40000 // below total with buffer
    }
  };
  const overCost = computeFullTripCost(overPlan);
  assert(overCost.budgetStatus === 'over', 'Over-budget status correctly identified');
  // TEST 3: B1 2–3 Plan Options Generator (Budget / Balanced / Comfort)
  const { generatePlanOptions } = await import('../../src/services/planOptionsGenerator');
  const options = generatePlanOptions(mockPlan);
  assert(options.length === 3, 'Generates 3 plan options (Budget, Balanced, Comfort)');
  const [budgetOpt, balancedOpt, comfortOpt] = options;
  assert(budgetOpt.tier === 'Budget', 'First option is Budget');
  assert(balancedOpt.tier === 'Balanced', 'Second option is Balanced');
  assert(comfortOpt.tier === 'Comfort', 'Third option is Comfort');
  assert(budgetOpt.totalCostINR > 0 && budgetOpt.perPersonCostINR > 0, 'Budget option has valid total and per-person cost');
  assert(balancedOpt.totalCostINR > 0 && balancedOpt.perPersonCostINR > 0, 'Balanced option has valid total and per-person cost');
  assert(comfortOpt.totalCostINR > 0 && comfortOpt.perPersonCostINR > 0, 'Comfort option has valid total and per-person cost');
  assert(typeof budgetOpt.stayArea === 'string' && budgetOpt.stayArea.length > 0, 'Budget option specifies stay area');
  assert(typeof budgetOpt.travelMode === 'string' && typeof budgetOpt.travelTime === 'string', 'Budget option specifies travel mode and time');

  // TEST 4: B5 Share with family text formatting (No PII)
  const { formatTripShareText } = await import('../../src/services/shareTripHelper');
  const shareText = formatTripShareText(mockPlan);
  assert(shareText.includes('Goa'), 'Share text includes destination');
  assert(shareText.includes('14–19 Nov 2026'), 'Share text includes dates');
  assert(shareText.includes('2 adults, 1 child'), 'Share text includes travellers breakdown');
  assert(shareText.includes('Total Real Cost:'), 'Share text includes total real cost');
  assert(shareText.includes('Per Person:'), 'Share text includes per-person cost');
  assert(shareText.includes('15% Buffer for Surprises:'), 'Share text includes 15% buffer line');
  assert(!shareText.includes('@') && !shareText.includes('email'), 'Share text contains zero email or PII');

  // TEST 5: B2 Destination suggestions from trip type
  const { suggestFromTripType } = await import('../../src/services/destinationSuggestions');
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
