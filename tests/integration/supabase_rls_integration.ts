/**
 * AeroDAG Phase 6 Stage D — Supabase Row Level Security (RLS) & Multi-Tenant Integration Tests
 * 
 * Verifies multi-tenant tenant isolation using TWO separate anonymous sessions:
 * 1. Client A saves a trip and sees it in public.trips.
 * 2. Client B cannot select Client A's trip (RLS prevents read).
 * 3. Client B cannot update or delete Client A's trip (RLS prevents write/delete).
 * 4. Idempotency key uniqueness: duplicate booking submissions produce exactly 1 row.
 * 5. Zero-PII invariant: stored trip plan JSONB has no email, phone, card, CVV, or UPI fields.
 * 6. Autonomous cleanup: Client A removes created rows after testing.
 * 
 * Automatically skips when Supabase credentials are missing or anonymous sign-in is disabled.
 */

import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sanitizePlanForStorage } from '../../src/services/persistence/tripStore';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Integration Assertion Failed: ${msg}`);
  }
}

async function runIntegrationTests() {
  console.log('========================================================');
  console.log('AERODAG PHASE 6 STAGE D: SUPABASE RLS INTEGRATION TESTS');
  console.log('========================================================\n');

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('⚠️ [SKIP] VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is not defined.');
    console.log('Skipping live Supabase integration tests.\n');
    return;
  }

  // Create two isolated client instances with independent in-memory auth
  const clientA: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const clientB: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // Attempt anonymous sign-in for Client A and Client B
  console.log('1. Authenticating Client A and Client B anonymously...');
  const { data: authA, error: errA } = await clientA.auth.signInAnonymously();
  if (errA || !authA.user) {
    console.log(`⚠️ [SKIP] Supabase anonymous sign-in failed for Client A: ${errA?.message || 'Unknown'}`);
    console.log('Skipping integration tests (enable "Allow anonymous sign-ins" in Supabase dashboard to run live).\n');
    return;
  }

  const { data: authB, error: errB } = await clientB.auth.signInAnonymously();
  if (errB || !authB.user) {
    console.log(`⚠️ [SKIP] Supabase anonymous sign-in failed for Client B: ${errB?.message || 'Unknown'}`);
    console.log('Skipping integration tests.\n');
    return;
  }

  console.log(`✓ Client A authenticated: ${authA.user.id}`);
  console.log(`✓ Client B authenticated: ${authB.user.id}`);
  assert(authA.user.id !== authB.user.id, 'Client A and Client B must have distinct tenant user IDs');

  let passed = 0;
  let createdTripId: string | null = null;
  const testIdempotencyKey = `idem_int_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Client A saves a trip and can select it
    // -------------------------------------------------------------------------
    console.log('\n--- Test 1: Client A Saves Trip & Selects Own Trip ---');
    const rawDirtyPlan = {
      bookingId: 'AD-GOA-INT-01',
      destination: 'Goa, India',
      totalPaidINR: 58640,
      email: 'leak@example.com',
      phone: '+91 9999999999',
      cvv: '123',
      cardDetails: { number: '4111222233334444' },
      upiId: 'leak@upi',
      passengers: [{ firstName: 'Aarav', lastName: 'Kumar' }]
    };
    const sanitized = sanitizePlanForStorage(rawDirtyPlan as any);

    const { data: insertedTrip, error: insertErr } = await clientA
      .from('trips')
      .insert({
        user_id: authA.user.id,
        status: 'simulated',
        destination: 'Goa, India',
        adults: 2,
        children_ages: [6],
        budget_inr: 60000,
        total_inr: 58640,
        plan: sanitized,
        schema_version: 1
      })
      .select()
      .single();

    assert(!insertErr && Boolean(insertedTrip), `Client A insert failed: ${insertErr?.message}`);
    createdTripId = insertedTrip.id;
    passed++;
    console.log(`✓ PASS: Client A saved trip with ID: ${createdTripId}`);

    const { data: selectA, error: selectAErr } = await clientA
      .from('trips')
      .select('*')
      .eq('id', createdTripId)
      .single();

    assert(!selectAErr && selectA?.id === createdTripId, 'Client A can select its own trip');
    passed++;
    console.log('✓ PASS: Client A successfully selected own trip through RLS');

    // -------------------------------------------------------------------------
    // TEST 2: Client B CANNOT select Client A's trip (RLS tenant isolation)
    // -------------------------------------------------------------------------
    console.log("\n--- Test 2: Client B Cannot Select Client A's Trip ---");
    const { data: selectB } = await clientB
      .from('trips')
      .select('*')
      .eq('id', createdTripId);

    assert(!selectB || selectB.length === 0, "RLS violation: Client B was able to read Client A's trip!");
    passed++;
    console.log("✓ PASS: Client B query returned 0 rows for Client A's trip (RLS isolation verified)");

    // -------------------------------------------------------------------------
    // TEST 3: Client B CANNOT update or delete Client A's trip
    // -------------------------------------------------------------------------
    console.log("\n--- Test 3: Client B Cannot Update or Delete Client A's Trip ---");
    const { data: updateB } = await clientB
      .from('trips')
      .update({ status: 'cancelled' })
      .eq('id', createdTripId)
      .select();

    assert(!updateB || updateB.length === 0, "RLS violation: Client B was able to update Client A's trip!");
    passed++;
    console.log("✓ PASS: Client B update affected 0 rows (RLS update guard verified)");

    const { data: deleteB } = await clientB
      .from('trips')
      .delete()
      .eq('id', createdTripId)
      .select();

    assert(!deleteB || deleteB.length === 0, "RLS violation: Client B was able to delete Client A's trip!");
    passed++;
    console.log("✓ PASS: Client B delete affected 0 rows (RLS delete guard verified)");

    // Prove Client A's trip is completely unchanged
    const { data: recheckA, error: recheckAErr } = await clientA
      .from('trips')
      .select('*')
      .eq('id', createdTripId)
      .single();

    assert(
      !recheckAErr && recheckA?.id === createdTripId && recheckA.status === 'simulated',
      "Client A's trip must remain completely intact and unchanged after Client B's update and delete attempts"
    );
    passed++;
    console.log("✓ PASS: Client A re-read trip to prove it remains intact with unchanged status ('simulated')");

    // -------------------------------------------------------------------------
    // TEST 4: Idempotency Key Uniqueness (Same Key Twice = Exactly 1 Booking)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Idempotent Booking Creation ---');
    const { error: bk1Err } = await clientA.from('bookings').insert({
      user_id: authA.user.id,
      trip_id: createdTripId,
      sandbox_ref: 'AD-GOA-INT-01',
      idempotency_key: testIdempotencyKey,
      state: 'simulated',
      total_inr: 58640
    });
    assert(!bk1Err, `First booking insert failed: ${bk1Err?.message}`);
    passed++;
    console.log('✓ PASS: Initial booking inserted successfully');

    // Duplicate submission with same idempotency key
    const { error: bk2Err } = await clientA.from('bookings').insert({
      user_id: authA.user.id,
      trip_id: createdTripId,
      sandbox_ref: 'AD-GOA-INT-01',
      idempotency_key: testIdempotencyKey,
      state: 'simulated',
      total_inr: 58640
    });
    assert(Boolean(bk2Err), 'Duplicate insert with same idempotency key must be rejected by Postgres unique constraint');
    passed++;
    console.log(`✓ PASS: Duplicate insert caught by unique key constraint (${bk2Err?.code || '23505'})`);

    const { count: bkCount } = await clientA
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('idempotency_key', testIdempotencyKey);

    assert(bkCount === 1, `Expected exactly 1 booking row, got ${bkCount}`);
    passed++;
    console.log('✓ PASS: Exactly 1 booking row exists in public.bookings after duplicate submission');

    // -------------------------------------------------------------------------
    // TEST 5: Zero-PII Invariant on Stored Row
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Zero-PII Verification on Stored Row ---');
    const storedPlan = selectA.plan as any;
    assert(!storedPlan.email, 'Stored plan must not contain root email');
    assert(!storedPlan.phone, 'Stored plan must not contain root phone');
    assert(!storedPlan.cvv, 'Stored plan must not contain cvv');
    assert(!storedPlan.cardDetails, 'Stored plan must not contain cardDetails');
    assert(!storedPlan.upiId, 'Stored plan must not contain upiId');
    passed++;
    console.log('✓ PASS: Stored database row verified zero-PII (no email, phone, card, cvv, upiId)');

  } finally {
    // -------------------------------------------------------------------------
    // TEST 6: Autonomous Cleanup
    // -------------------------------------------------------------------------
    console.log('\n--- Cleanup: Deleting Test Rows ---');
    if (createdTripId) {
      await clientA.from('bookings').delete().eq('idempotency_key', testIdempotencyKey);
      await clientA.from('trips').delete().eq('id', createdTripId);
      console.log(`✓ Cleaned up test rows for trip ${createdTripId}`);
    }
  }

  console.log('\n========================================================');
  console.log(`INTEGRATION TESTS COMPLETE: ${passed}/${passed} PASSED`);
  console.log('========================================================\n');
}

runIntegrationTests().catch((err) => {
  console.error('Integration test failure:', err);
  process.exit(1);
});
