/**
 * AeroDAG Phase 6 — Stage C Unit Tests: TripStore, Idempotency, Schema Validation & Sanitization
 */

import {
  InMemoryTripStore,
  parseDateRange,
  sanitizePlanForStorage,
  validateTripPlan,
  getTripStore
} from '../../src/services/persistence/tripStore';
import { ConfirmedBookingRecord } from '../../src/types/travelBooking';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runStageCTests() {
  console.log('--- Running Phase 6 Stage C Unit Tests ---');
  let passed = 0;

  // Test 1: Date Range Parsing
  const parsed1 = parseDateRange('14–20 Nov 2026');
  assert(parsed1.startDate === '2026-11-14', 'Parsed start date should be 2026-11-14');
  assert(parsed1.endDate === '2026-11-20', 'Parsed end date should be 2026-11-20');
  passed++;

  const parsed2 = parseDateRange('1-5 Dec 2026');
  assert(parsed2.startDate === '2026-12-01', 'Parsed start date should be 2026-12-01');
  assert(parsed2.endDate === '2026-12-05', 'Parsed end date should be 2026-12-05');
  passed++;

  const parsedInvalid = parseDateRange('Flexible dates next month');
  assert(parsedInvalid.startDate === null && parsedInvalid.endDate === null, 'Invalid dates should return null');
  passed++;
  console.log('✓ PASS: Travel dates natural language parsing verified');

  // Test 2: Zero PII Sanitization
  const dirtyRecord: any = {
    bookingId: 'AD-GOA-0142 (sandbox)',
    pnr: 'AD-GOA-0142',
    destination: 'Goa',
    origin: 'Bengaluru (BLR)',
    totalPaidINR: 60000,
    email: 'private@test.com',
    phone: '+91 9999999999',
    cvv: '123',
    cardDetails: { number: '4111222233334444' },
    upiId: 'test@upi',
    passengers: [
      {
        type: 'ADULT',
        title: 'Mr',
        firstName: 'Alex',
        lastName: 'Taylor',
        email: 'alex@example.com',
        phone: '+91 9876543210',
        aadhaarOrId: '1234-5678-9012',
        cvv: '999'
      }
    ],
    itinerary: []
  };

  const clean = sanitizePlanForStorage(dirtyRecord) as any;
  assert(!clean.email, 'Root email must be deleted');
  assert(!clean.phone, 'Root phone must be deleted');
  assert(!clean.cvv, 'CVV must be deleted');
  assert(!clean.cardDetails, 'Card details must be deleted');
  assert(!clean.upiId, 'UPI ID must be deleted');
  assert(!clean.passengers[0].email, 'Passenger email must be stripped');
  assert(!clean.passengers[0].phone, 'Passenger phone must be stripped');
  assert(!clean.passengers[0].aadhaarOrId, 'Aadhaar/ID must be stripped');
  assert(clean.passengers[0].firstName === 'Alex', 'Safe passenger name preserved');
  passed++;
  console.log('✓ PASS: Zero-PII sanitization strips all payment, contact, and ID data');

  // Test 3: Schema Version Validation
  const validTripRow = {
    id: 'trip_123',
    schema_version: 1,
    status: 'simulated',
    plan: {
      bookingId: 'AD-GOA-0142 (sandbox)',
      destination: 'Goa',
      totalPaidINR: 58640
    }
  };
  const validated = validateTripPlan(validTripRow);
  assert(validated !== null, 'Valid schema_version 1 should pass validation');
  assert(validated?.bookingId === 'AD-GOA-0142 (sandbox)', 'Booking ID preserved');
  passed++;

  const unknownSchemaTripRow = {
    id: 'trip_legacy',
    schema_version: 99,
    status: 'simulated',
    plan: { bookingId: 'AD-GOA-0142' }
  };
  const skipped = validateTripPlan(unknownSchemaTripRow);
  assert(skipped === null, 'Unknown schema version must be skipped safely');
  passed++;

  const brokenTripRow = {
    id: 'trip_broken',
    schema_version: 1,
    status: 'simulated',
    plan: null
  };
  const skippedBroken = validateTripPlan(brokenTripRow);
  assert(skippedBroken === null, 'Broken plan JSONB must be skipped safely');
  passed++;
  console.log('✓ PASS: Plan schema validation enforces schema_version 1 and guards My Trips from crashing');

  // Test 4: InMemoryTripStore Idempotency & Lifecycle
  const store = new InMemoryTripStore();
  const sampleTrip: ConfirmedBookingRecord = {
    bookingId: 'AD-GOA-0142 (sandbox)',
    pnr: 'AD-GOA-0142',
    hotelVoucherId: 'HTL-GOA-901 (sandbox)',
    createdAt: 'Nov 12, 2026',
    status: 'SIMULATED',
    tripTitle: '7 days in South Goa',
    destination: 'Goa, India',
    origin: 'Bengaluru (BLR)',
    travelDates: '14–20 Nov 2026',
    totalPaidINR: 58640,
    totalPaidUSD: 698,
    passengers: [{ type: 'ADULT', title: 'Mr', firstName: 'John', lastName: 'Doe' }],
    itinerary: []
  };

  const idemKey = 'idem_checkout_12345';
  const save1 = await store.saveSimulatedBooking(sampleTrip, idemKey);
  assert(!save1.isExisting, 'First submit should be new record');
  passed++;

  // Double submit with same idempotency key
  const save2 = await store.saveSimulatedBooking(sampleTrip, idemKey);
  assert(save2.isExisting === true, 'Second submit with same idempotency key must return existing booking');
  passed++;

  const list = await store.listTrips();
  assert(list.length === 1, 'Exactly one trip must exist after double submission');
  passed++;

  // Cancel trip
  const cancelled = await store.cancelTrip('AD-GOA-0142 (sandbox)');
  assert(cancelled === true, 'cancelTrip should succeed');
  const listAfterCancel = await store.listTrips();
  assert(listAfterCancel.length === 0, 'Cancelled trip should not be listed');
  passed++;
  console.log('✓ PASS: TripStore idempotency (1 booking on double-click) and lifecycle confirmed');

  // Test 5: getTripStore Factory
  const offlineStore = getTripStore(true);
  assert(offlineStore instanceof InMemoryTripStore, 'getTripStore(true) should return InMemoryTripStore');
  passed++;
  console.log('✓ PASS: getTripStore factory correctly provisions adapter');

  console.log(`\n========================================================`);
  console.log(`STAGE C UNIT VERIFICATION SUMMARY: ${passed} PASSED`);
  console.log(`========================================================`);
}

runStageCTests().catch((err) => {
  console.error('Stage C tests failed:', err);
  process.exit(1);
});
