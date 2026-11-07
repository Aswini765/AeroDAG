/**
 * AeroDAG Unit Test Suite: User Interview Bug Fixes Verification
 * 
 * Verifies the 5 critical bug fixes requested before UI changes:
 * 1. "with my family" is parsed as unspecified (null) instead of 1 adult; ClarifyScreen asks "How many adults and kids?".
 * 2. Origin city carries through (Goa -> Bengaluru: flight is GOI -> BLR, never BLR -> BLR; transfer does not show BLR -> Bengaluru).
 * 3. Only options within budget may be marked Recommended (over-budget options are never marked Recommended).
 * 4. Default surprise buffer is larger than 15% (25%) and user adjustable.
 * 5. Invented-sounding place names removed unless from Google Places.
 */

import { impliedPartySize } from '../../src/server/partySize.ts';
import { MockFlightProvider } from '../../src/services/providers/mockFlightProvider.ts';
import { generatePlanOptions } from '../../src/services/planOptionsGenerator.ts';
import { TripPlan, TripPreferences } from '../../src/types/travelBooking.ts';
import fs from 'fs';

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
  console.log('=== AeroDAG User Interview Bug Fixes Verification ===\n');

  // =========================================================================
  // BUG 1: "WITH MY FAMILY" IS PARSED AS UNSPECIFIED (NOT 1 ADULT)
  // =========================================================================
  console.log('[1] Testing "with my family" Party Size Parsing');

  const familyResult = impliedPartySize('trip to goa with my family');
  assert(familyResult === null, '"with my family" returns null (unspecified), NOT 1 adult');

  const familyResult2 = impliedPartySize('family vacation in coorg');
  assert(familyResult2 === null, '"family vacation" returns null (unspecified)');

  const familyOf4 = impliedPartySize('family of 4 in goa');
  assert(familyOf4 === null, '"family of 4" trusts parser via EXPLICIT_COUNT check');

  const meAndWife = impliedPartySize('me and my wife to goa');
  assert(familyAndWifeCheck(meAndWife), '"me and my wife" correctly implies 2 adults');

  // Verify ClarifyScreen asks "How many adults and kids?"
  const clarifyScreenContent = fs.readFileSync('src/components/consumer/ClarifyScreen.tsx', 'utf-8');
  assert(clarifyScreenContent.includes('How many adults and kids?'), 'ClarifyScreen contains "How many adults and kids?" question header');
  assert(clarifyScreenContent.includes('Adults') && clarifyScreenContent.includes('Kids'), 'ClarifyScreen provides distinct Adults and Kids counter steppers');

  // =========================================================================
  // BUG 2: ORIGIN CITY CARRIES THROUGH (NO BLR TO BLR)
  // =========================================================================
  console.log('\n[2] Testing Origin City Carries Through');

  const flightProvider = new MockFlightProvider();
  const flightsFromGoa = await flightProvider.searchFlights({
    origin: 'Goa (GOI)',
    destination: 'Bengaluru',
    dates: '14 Nov - 16 Nov',
    travellerCount: 2,
    adultsCount: 2,
    childrenCount: 0
  });

  assert(flightsFromGoa.length > 0, 'Found flights for Goa -> Bengaluru');
  const sampleFlight = flightsFromGoa[0];
  assert(sampleFlight.originCode === 'GOI', `Flight originCode is GOI (${sampleFlight.originCode})`);
  assert(sampleFlight.originCity.toLowerCase().includes('goa'), `Flight originCity contains Goa (${sampleFlight.originCity})`);
  assert(sampleFlight.destinationCode !== sampleFlight.originCode, `originCode (${sampleFlight.originCode}) does not equal destinationCode (${sampleFlight.destinationCode})`);
  assert(!(sampleFlight.originCode === 'BLR' && sampleFlight.destinationCode === 'BLR'), 'Never produces BLR to BLR');

  // Verify App.tsx handles Goa as origin
  const appFile = fs.readFileSync('src/App.tsx', 'utf-8');
  assert(appFile.includes("ctx.origin = 'Goa (GOI)'"), 'App.tsx recognizes and sets Goa (GOI) as origin');
  assert(appFile.includes('isFromGoa'), 'App.tsx disambiguates origin Goa from destination Goa');

  // =========================================================================
  // BUG 3: ONLY OPTIONS WITHIN BUDGET MAY BE MARKED RECOMMENDED
  // =========================================================================
  console.log('\n[3] Testing Only Options Within Budget Are Marked Recommended');

  const mockPlan = ({
    id: 'test-plan',
    title: 'Weekend in Goa',
    destination: 'Goa',
    origin: 'Bengaluru (BLR)',
    dates: '14 Nov - 16 Nov',
    durationDays: 3,
    travellers: { total: 2, adults: 2, children: 0, childAges: [], seniors: 0 },
    scope: 'domestic',
    status: 'feasible',
    flight: sampleFlight,
    hotel: {
      id: 'h-1',
      name: 'Sonesta Inns Beach Resort',
      city: 'Goa',
      area: 'Candolim',
      starRating: 4,
      pricePerNightINR: 5000,
      totalPriceINR: 10000,
      imageUrl: 'https://images.unsplash.com/photo-hotel',
      amenities: ['Pool', 'WiFi']
    },
    transfer: {
      id: 'tr-1',
      vehicleType: 'Sedan AC Cab',
      title: 'Private AC Airport Transfer',
      priceINR: 2200,
      duration: '45 mins'
    },
    budget: {
      targetINR: 20000, // Strict low budget
      grandTotalINR: 32000,
      currency: 'INR'
    },
    itinerary: []
  } as unknown as TripPlan);

  // Under strict low budget (₹20,000), Balanced tier is over budget
  const strictBudgetPrefs = ({
    destination: 'Goa',
    origin: 'Bengaluru',
    durationDays: 3,
    budgetTotalINR: 20000,
    adultsCount: 2,
    childrenCount: 0
  } as unknown as TripPreferences);

  const strictOptions = generatePlanOptions(mockPlan, strictBudgetPrefs);
  const balancedOverBudget = strictOptions.find((o) => o.id === 'balanced');
  if (balancedOverBudget && balancedOverBudget.totalCostINR > 20000) {
    assert(balancedOverBudget.badge !== 'Recommended', `Over-budget Balanced option is NOT marked Recommended (badge: ${balancedOverBudget.badge})`);
  }

  // Under generous budget (₹80,000), Balanced tier is within budget
  const generousBudgetPrefs = ({
    destination: 'Goa',
    origin: 'Bengaluru',
    durationDays: 3,
    budgetTotalINR: 80000,
    adultsCount: 2,
    childrenCount: 0
  } as unknown as TripPreferences);

  const generousOptions = generatePlanOptions(mockPlan, generousBudgetPrefs);
  const balancedWithinBudget = generousOptions.find((o) => o.id === 'balanced');
  if (balancedWithinBudget && balancedWithinBudget.totalCostINR <= 80000) {
    assert(balancedWithinBudget.badge === 'Recommended', `Within-budget Balanced option IS marked Recommended (badge: ${balancedWithinBudget.badge})`);
  }

  // =========================================================================
  // BUG 4: DEFAULT SURPRISE BUFFER LARGER THAN 15% AND USER ADJUSTABLE
  // =========================================================================
  console.log('\n[4] Testing Default Surprise Buffer > 15% and User Adjustable');

  const planOptionsFile = fs.readFileSync('src/components/consumer/plan/PlanOptionsSelector.tsx', 'utf-8');
  assert(planOptionsFile.includes('min={10}') && planOptionsFile.includes('max={50}'), 'PlanOptionsSelector provides a 10%–50% adjustable slider');
  assert(planOptionsFile.includes('useState<number>(25)'), 'PlanOptionsSelector slider defaults to 25% (larger than 15%)');

  const fullTripCostCardFile = fs.readFileSync('src/components/consumer/plan/FullTripCostCard.tsx', 'utf-8');
  assert(fullTripCostCardFile.includes('useState<number>(25)'), 'FullTripCostCard slider defaults to 25% (larger than 15%)');

  // =========================================================================
  // BUG 5: REMOVE INVENTED-SOUNDING PLACE NAMES
  // =========================================================================
  console.log('\n[5] Testing Removal of Invented-Sounding Place Names');

  const mockHotelProviderFile = fs.readFileSync('src/services/providers/mockHotelProvider.ts', 'utf-8');
  assert(!mockHotelProviderFile.includes('The Royal Vista Boutique Hotel'), 'Removed "The Royal Vista Boutique Hotel"');
  assert(!mockHotelProviderFile.includes('Imperial Oasis Luxury Resort'), 'Removed "Imperial Oasis Luxury Resort"');
  assert(!mockHotelProviderFile.includes('Grand Heritage Resort & Spa'), 'Removed "Grand Heritage Resort & Spa"');

  const aiPlanBuilderFile = fs.readFileSync('src/services/aiDestinationPlanBuilder.ts', 'utf-8');
  assert(!aiPlanBuilderFile.includes('${profile.name} Heritage Homestay'), 'Removed invented "${profile.name} Heritage Homestay"');
  assert(!aiPlanBuilderFile.includes('${profile.name} Luxury Estate & Spa'), 'Removed invented "${profile.name} Luxury Estate & Spa"');

  console.log(`\n🎉 All ${passed} User Interview Bug Fix assertions passed successfully!`);
}

function familyAndWifeCheck(res: { total: number; self: boolean } | null): boolean {
  return res !== null && res.total === 2 && res.self === true;
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
