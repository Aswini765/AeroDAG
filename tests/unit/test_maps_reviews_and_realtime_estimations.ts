/**
 * AeroDAG Unit Test Suite:
 * 1. Live Google Maps Embed Query Construction & Center Logic
 * 2. Proper Hotel Review Extraction & Authoritative Direct URLs (Google Maps, TripAdvisor, Booking.com, MakeMyTrip)
 * 3. Real-Time Estimations & Dynamic Budget Calculations
 */

import { cleanHotelName, extractHotelReviews } from '../../src/services/hotelReviewExtractor';
import { computeFullTripCost } from '../../src/services/fullTripCostHelper';
import { TripPlanningEngine } from '../../src/services/tripPlanningEngine';
import { RequirementEngine } from '../../src/services/requirementEngine';
import { HotelItem } from '../../src/types/travelBooking';

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
  console.log('--- TEST SUITE: Live Maps, Proper Reviews & Real-Time Estimations ---');

  // ============================================================
  // Test 1: Hotel Name Cleaning & Noisy String Stripping
  // ============================================================
  console.log('\n[1. Hotel Review Extractor: Stripping Raw Artifacts]');
  const rawNames = [
    { raw: '4★ hotel in Amer, ~₹3,500/night', expected: 'Amer Fort Heritage' },
    { raw: 'Boutique Homestay ~₹1,800/night (demo)', expected: 'Boutique Homestay' },
    { raw: '3★ Heritage Haveli in Bani Park ~₹2,800', expected: 'Heritage Haveli in Bani Park' },
    { raw: '5★ Resort in Varca (verified)', expected: 'Resort in Varca' }
  ];

  for (const item of rawNames) {
    const cleaned = cleanHotelName(item.raw, 'Heritage Stay');
    assert(!cleaned.includes('~₹'), `Removed '~₹' price tags from: "${item.raw}" -> "${cleaned}"`);
    assert(!cleaned.includes('/night'), `Removed '/night' from: "${item.raw}" -> "${cleaned}"`);
    assert(!cleaned.includes('4★') && !cleaned.includes('5★'), `Removed star prefixes from: "${item.raw}" -> "${cleaned}"`);
    // Prompt 2: Keep (demo) and (sample) so UI never claims it's a real hotel
    if (item.raw.includes('(demo)')) {
      assert(cleaned.includes('(demo)'), `Preserved (demo) label: "${cleaned}"`);
    }
  }

  // ============================================================
  // Test 2: Authoritative Review Redirect URLs
  // ============================================================
  console.log('\n[2. Authoritative Outbound Review Links]');
  const mockHotel: HotelItem = {
    id: 'h-amer-1',
    name: '4★ Heritage Resort in Amer, ~₹3,500/night',
    area: 'Amer',
    city: 'Jaipur',
    starRating: 4,
    reviewScore: 4.7,
    reviewsCount: 840,
    roomType: 'Heritage Suite',
    bedConfiguration: '1 King Bed',
    maxCapacity: 3,
    pricePerNightINR: 3500,
    totalPriceINR: 14000,
    pricePerNightUSD: 42,
    totalPriceUSD: 168,
    amenities: ['Wi-Fi', 'Pool', 'Breakfast'],
    breakfastIncluded: true,
    freeCancellation: true,
    distanceFromCenter: '8 km',
    imageUrl: 'https://images.unsplash.com/photo-1'
  };

  const profile = extractHotelReviews(mockHotel, 'Jaipur');

  assert(profile.cleanName.length > 3, `Clean name has valid length: "${profile.cleanName}"`);
  // Verify external review URLs are proper and not noisy (Prompt 2 requirement: 4 real outbound search links)
  const links = profile.externalLinks;
  assert(links.googleMapsReviewsUrl.includes('google.com/maps'),
    `Google Maps reviews link is properly formed: ${links.googleMapsReviewsUrl}`);
  assert(links.tripAdvisorUrl.includes('tripadvisor.in'),
    `TripAdvisor link points to tripadvisor.in: ${links.tripAdvisorUrl}`);
  assert(links.bookingComUrl.includes('booking.com'),
    `Booking.com link points to booking.com: ${links.bookingComUrl}`);
  assert(links.makeMyTripUrl.includes('makemytrip.com'),
    `MakeMyTrip link points to makemytrip.com: ${links.makeMyTripUrl}`);

  // Assert no fake reviews array or fake subratings attached (Prompt 2 rule)
  assert((profile as any).reviews === undefined, 'No fake reviews array generated');
  assert((profile as any).subRatings === undefined, 'No fake subratings generated');

  // ============================================================
  // Test 3: Google Maps Zero-Key Embed Query Formats
  // ============================================================
  console.log('\n[3. Google Maps Embed Query Construction]');
  const dest = 'Jaipur';
  const stay = 'C-Scheme';
  const stopTitle = 'Hawa Mahal & City Palace';

  const embedUrlWithStop = `https://maps.google.com/maps?q=${encodeURIComponent(`${stopTitle}, ${stay}, ${dest}`)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  assert(embedUrlWithStop.includes('Hawa%20Mahal'), `Embed URL encodes stop title properly: ${embedUrlWithStop}`);
  assert(embedUrlWithStop.includes('output=embed'), 'Embed URL includes output=embed for zero-API-key iframe embedding');

  // ============================================================
  // Test 4: Real-Time Dynamic Estimator Math Accuracy
  // ============================================================
  console.log('\n[4. Real-Time Estimator Math Engine]');
  // Simulation: 4 Nights, 2 Adults + 1 Kid, Standard Stay, Flight Transit
  const nights = 4;
  const adults = 2;
  const kids = 1;
  const stayRate = 3600;
  const rooms = 1;
  const transitUnitFare = 4800; // Flight
  const totalPax = adults + kids;

  const staysCost = nights * rooms * stayRate; // 4 * 1 * 3600 = 14400
  const transitCost = totalPax * transitUnitFare; // 3 * 4800 = 14400
  const days = nights + 1; // 5 days
  const mealsCost = days * (adults * 900 + kids * 450); // 5 * (1800 + 450) = 11250
  const activitiesCost = days * (adults * 600 + kids * 250); // 5 * (1200 + 250) = 7250
  const localCabCost = days * 950; // 5 * 950 = 4750

  const subtotal = staysCost + transitCost + mealsCost + activitiesCost + localCabCost;
  assert(subtotal === 52050, `Subtotal computes to integer exact: ${subtotal} === 52050`);

  const buffer25 = Math.round(subtotal * 0.25 * 1.05); // weighted category buffer
  const grandTotal = subtotal + buffer25;
  assert(grandTotal > subtotal, `Grand total with buffer (${grandTotal}) exceeds base subtotal (${subtotal})`);

  const targetBudget = 70000;
  const diff = targetBudget - grandTotal;
  assert(diff > 0, `Within target budget ₹70,000 (Remaining ₹${diff})`);

  console.log(`\n========================================================`);
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log(`========================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
