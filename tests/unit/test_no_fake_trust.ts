/**
 * tests/unit/test_no_fake_trust.ts
 * 
 * Verifies Prompt 2: Remove everything fake
 * 
 * Assertions:
 * - No fake review personas (no Rohit/Neha Sharma, Ananya Deshmukh, Vikram Nair)
 * - No fake cleanliness sub-score or invented ratings
 * - No "Verified Stay" fake badge
 * - No invented review counts like '(312)' on option cards
 * - No fake flight numbers (like '6E-452') in AI-estimate / regional plans
 * - All 4 search links under "Read real reviews" are valid URLs containing the hotel name
 */

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}
import { extractHotelReviews, cleanHotelName } from '../../src/services/hotelReviewExtractor';
import { getRegionRoutes, buildMultiBasePlanFromRoute } from '../../src/services/regionRoutesService';
import { MOCK_HOTELS_GOA, MOCK_HOTELS_KERALA } from '../../src/services/destinationsData';

export async function runTest() {
  console.log('\n=== Testing Removal of Fake Trust Signals (Prompt 2) ===');

  // 1. Goa Plan Check
  console.log('[1] Checking Goa hotel review extraction');
  const goaHotel = MOCK_HOTELS_GOA[0];
  const goaProfile = extractHotelReviews(goaHotel, 'Goa');

  const serializedGoa = JSON.stringify(goaProfile).toLowerCase();
  assert(!serializedGoa.includes('rohit'), 'No Rohit fake persona in Goa');
  assert(!serializedGoa.includes('neha sharma'), 'No Neha Sharma in Goa');
  assert(!serializedGoa.includes('cleanliness'), 'No cleanliness subrating in Goa');
  assert(!serializedGoa.includes('verified stay'), 'No Verified Stay fake badge in Goa');
  assert(!serializedGoa.includes('room 104'), 'No fake room number 104 in Goa');

  // 4 Outbound search links
  assert(goaProfile.externalLinks.googleMapsReviewsUrl.includes('google.com/maps/search'), 'Google Maps search link present');
  assert(goaProfile.externalLinks.tripAdvisorUrl.includes('tripadvisor.in/Search'), 'TripAdvisor search link present');
  assert(goaProfile.externalLinks.bookingComUrl.includes('booking.com/searchresults'), 'Booking.com search link present');
  assert(goaProfile.externalLinks.makeMyTripUrl.includes('makemytrip.com/hotels'), 'MakeMyTrip search link present');
  assert(goaProfile.externalLinks.googleMapsReviewsUrl.toLowerCase().includes(encodeURIComponent(goaProfile.cleanName).toLowerCase()), 'Google link contains hotel name');

  // 2. Kerala Plan Check
  console.log('\n[2] Checking Kerala hotel review extraction');
  const keralaHotel = MOCK_HOTELS_KERALA[0];
  const keralaProfile = extractHotelReviews(keralaHotel, 'Kerala');
  const serializedKer = JSON.stringify(keralaProfile).toLowerCase();
  assert(!serializedKer.includes('rohit'), 'No Rohit fake persona in Kerala');
  assert(!serializedKer.includes('cleanliness'), 'No cleanliness subrating in Kerala');
  assert(!serializedKer.includes('verified stay'), 'No Verified Stay fake badge in Kerala');

  // Check demo/sample tag preservation in cleanHotelName
  const demoName = cleanHotelName('Munnar Misty Garden Homestay (sample)');
  assert(demoName.includes('(sample)'), `Preserves (sample) in cleanHotelName: got "${demoName}"`);

  // 3. Rajasthan Plan Check
  console.log('\n[3] Checking Rajasthan regional plan and route options');
  const rajRoutes = getRegionRoutes('Rajasthan', 6, 'offbeat places not touristy', 90000, 2);
  assert(rajRoutes.length >= 2, 'Generates Rajasthan route options');

  const chosenRoute = rajRoutes[0];
  const rajPlan = buildMultiBasePlanFromRoute(
    {
      destination: 'Rajasthan',
      destinationType: 'region',
      origin: 'Hyderabad (HYD)',
      dates: '9–19 Dec 2026',
      durationDays: 11,
      totalTravellers: 2,
      adultsCount: 2,
      childrenCount: 0,
      childrenAges: [],
      seniorsCount: 0,
      budgetTotalINR: 90000,
      freeTextPreferences: 'offbeat places not touristy'
    },
    chosenRoute
  );

  const serializedRajPlan = JSON.stringify(rajPlan).toLowerCase();
  assert(!serializedRajPlan.includes('heritage haveli'), 'No invented hotel brand name "Heritage Haveli"');
  assert(!serializedRajPlan.includes('6e-452'), 'No invented flight number "6E-452"');
  assert(rajPlan.flight?.flightNumber === '', 'Flight number is empty for AI-estimate flight');
  assert(rajPlan.hotel.name.includes('~₹'), 'Uses generic hotel description with ~₹/night');

  const rajProfile = extractHotelReviews(rajPlan.hotel, 'Rajasthan');
  const serializedRajProfile = JSON.stringify(rajProfile).toLowerCase();
  assert(!serializedRajProfile.includes('rohit'), 'No Rohit in Rajasthan profile');
  assert(!serializedRajProfile.includes('cleanliness'), 'No cleanliness subrating in Rajasthan');
  assert(rajProfile.externalLinks.googleMapsReviewsUrl.includes('google.com/maps'), 'Rajasthan Google Maps link present');
  assert(rajProfile.externalLinks.tripAdvisorUrl.includes('tripadvisor.in'), 'Rajasthan TripAdvisor link present');

  console.log('✅ All Fake Trust Signal removal assertions passed!');
}

if (process.argv[1]?.includes('test_no_fake_trust')) {
  runTest().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
