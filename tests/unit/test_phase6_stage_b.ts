/**
 * AeroDAG Phase 6 — Stage B Unit Tests: Supabase Client & Auth Module
 */

import 'dotenv/config';
import {
  isSupabaseConfigured,
  initializeAuth,
  linkEmailToCurrentUser,
  signOutAndResetGuest,
  supabase
} from '../../src/services/persistence/supabaseClient';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runStageBTests() {
  console.log('--- Running Phase 6 Stage B Unit Tests ---');
  let passed = 0;

  // Test 1: Module exports and interface compliance
  assert(typeof isSupabaseConfigured === 'boolean', 'isSupabaseConfigured should be boolean');
  assert(typeof initializeAuth === 'function', 'initializeAuth should be function');
  assert(typeof linkEmailToCurrentUser === 'function', 'linkEmailToCurrentUser should be function');
  assert(typeof signOutAndResetGuest === 'function', 'signOutAndResetGuest should be function');
  console.log('✓ PASS: Supabase client & auth functions properly exported');
  passed++;

  // Test 2: Input validation for linkEmailToCurrentUser
  const emptyRes = await linkEmailToCurrentUser('');
  assert(!emptyRes.success, 'Empty email should fail validation');
  assert(!!emptyRes.error && emptyRes.error.includes('valid email'), 'Should return invalid email message');
  passed++;

  const invalidRes = await linkEmailToCurrentUser('notanemail');
  assert(!invalidRes.success, 'Invalid email without @ should fail validation');
  passed++;

  const whitespaceRes = await linkEmailToCurrentUser('   ');
  assert(!whitespaceRes.success, 'Whitespace email should fail validation');
  passed++;
  console.log('✓ PASS: Email validation correctly rejects invalid and empty formats');

  // Test 3: initializeAuth returns structured auth state without crashing
  const authState = await initializeAuth();
  assert(typeof authState === 'object' && authState !== null, 'Auth state should be an object');
  assert(typeof authState.isAnonymous === 'boolean', 'isAnonymous should be boolean');
  assert(typeof authState.isOffline === 'boolean', 'isOffline should be boolean');
  console.log(`✓ PASS: initializeAuth executes cleanly (isOffline: ${authState.isOffline}, isAnonymous: ${authState.isAnonymous})`);
  passed++;

  // Test 4: signOutAndResetGuest executes safely and does not throw
  const signOutRes = await signOutAndResetGuest();
  assert(typeof signOutRes === 'object', 'signOutAndResetGuest should return object');
  assert(typeof signOutRes.success === 'boolean', 'signOutAndResetGuest success should be boolean');
  console.log('✓ PASS: signOutAndResetGuest safely handles session reset');
  passed++;

  // Test 5: Verify offline mode fallback resilience
  if (!isSupabaseConfigured) {
    assert(authState.isOffline === true, 'Offline mode should be true when Supabase is not configured');
    assert(supabase === null, 'Supabase client should be null when not configured');
    console.log('✓ PASS: Graceful offline fallback verified');
    passed++;
  } else {
    assert(supabase !== null, 'Supabase client should be instantiated when configured');
    console.log('✓ PASS: Supabase client active and configured');
    passed++;
  }

  console.log(`\n========================================================`);
  console.log(`STAGE B UNIT VERIFICATION SUMMARY: ${passed} PASSED`);
  console.log(`========================================================`);
}

runStageBTests().catch((err) => {
  console.error('Stage B tests failed:', err);
  process.exit(1);
});
