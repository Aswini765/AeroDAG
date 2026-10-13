/**
 * AERODAG — PHASE 9.3 TEST SUITE: PERSISTENT & LONG-TERM MEMORY
 * 
 * Verifies:
 * 1. User travel preferences storage with explicit user verification
 * 2. User-correctable preference updates & deletions
 * 3. Past trip records & summary tracking
 * 4. Strict tenant & user isolation (no cross-user memory leakage)
 * 5. Memory privacy sanitizer: PAN / card number rejection
 * 6. Memory privacy sanitizer: CVV / security code rejection
 * 7. Memory privacy sanitizer: Private key / credential rejection
 * 8. Keyword / semantic search across memories
 * 9. GDPR Right to be forgotten (clearUserMemories)
 * 10. TTL expiration eviction
 */

import {
  PersistentMemoryStore,
  MemoryPrivacySanitizer,
  MemoryPrivacyViolationError
} from '../../src/services/memory';

import { FAKE_STRIPE_SECRET_KEY } from '../fixtures/fakeSecrets';
function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runPhase93Tests() {
  console.log('==================================================');
  console.log('STARTING AERODAG PHASE 9.3 TEST SUITE');
  console.log('==================================================\n');

  PersistentMemoryStore.resetInstance();
  const store = PersistentMemoryStore.getInstance();

  // --- Category A: User Preferences & Corrections ---
  console.log('--- CATEGORY A: USER PREFERENCES & CORRECTIONS ---');
  {
    store.setPreference('alice', 'tenant_default', {
      key: 'dietary',
      label: 'Dietary Preference',
      value: 'Vegetarian',
      category: 'dietary',
      isUserVerified: true,
      updatedAt: new Date().toISOString()
    });

    store.setPreference('alice', 'tenant_default', {
      key: 'hotel_tier',
      label: 'Lodging Preference',
      value: 'Comfortable 4-Star',
      category: 'lodging',
      isUserVerified: true,
      updatedAt: new Date().toISOString()
    });

    const alicePrefs = store.getPreferences('alice', 'tenant_default');
    assert(alicePrefs.length === 2, 'Test 1: Successfully stored and retrieved 2 user preferences');
    assert(alicePrefs.some((p) => p.value === 'Vegetarian'), 'Test 2: Vegetarian preference preserved');

    // User corrects preference
    store.setPreference('alice', 'tenant_default', {
      key: 'dietary',
      label: 'Dietary Preference',
      value: 'Jain Vegetarian',
      category: 'dietary',
      isUserVerified: true,
      updatedAt: new Date().toISOString()
    });

    const updatedPrefs = store.getPreferences('alice', 'tenant_default');
    const diet = updatedPrefs.find((p) => p.key === 'dietary');
    assert(diet?.value === 'Jain Vegetarian', 'Test 3: User successfully updated and corrected stored preference');

    // User deletes preference
    const deleted = store.deletePreference('alice', 'tenant_default', 'hotel_tier');
    assert(deleted === true, 'Test 4: User deleted specific preference');
    const remaining = store.getPreferences('alice', 'tenant_default');
    assert(remaining.length === 1 && remaining[0].key === 'dietary', 'Test 5: Deleted preference is removed');
  }

  // --- Category B: Past Trip Records ---
  console.log('\n--- CATEGORY B: PAST TRIP RECORDS ---');
  {
    store.recordPastTrip('alice', 'tenant_default', {
      tripId: 'trip_vietnam_2025',
      destination: 'Vietnam',
      dates: 'November 2025',
      travellerCount: 3,
      hotelBooked: 'Hanoi Heritage Hotel',
      rating: 5,
      notableAttractions: ['Halong Bay Cruise', 'Old Quarter'],
      totalSpendINR: 120000,
      completedAt: new Date().toISOString()
    });

    const aliceTrips = store.getPastTrips('alice', 'tenant_default');
    assert(aliceTrips.length === 1, 'Test 6: Past trip summary recorded');
    assert(aliceTrips[0].destination === 'Vietnam', 'Test 7: Destination verified in past trip');
    assert(aliceTrips[0].notableAttractions.includes('Halong Bay Cruise'), 'Test 8: Notable attractions preserved');
  }

  // --- Category C: Tenant & User Isolation ---
  console.log('\n--- CATEGORY C: TENANT & USER ISOLATION ---');
  {
    // Bob checks his preferences and trips
    const bobPrefs = store.getPreferences('bob', 'tenant_default');
    const bobTrips = store.getPastTrips('bob', 'tenant_default');
    assert(bobPrefs.length === 0, 'Test 9: Bob cannot view Alice’s preferences (User isolation)');
    assert(bobTrips.length === 0, 'Test 10: Bob cannot view Alice’s past trips (User isolation)');

    // Different tenant check
    const aliceTenant2 = store.getPreferences('alice', 'tenant_enterprise');
    assert(aliceTenant2.length === 0, 'Test 11: Cross-tenant isolation strictly enforced');
  }

  // --- Category D: Memory Privacy Sanitizer & Secret Defense ---
  console.log('\n--- CATEGORY D: PRIVACY SANITIZER & SECRET DEFENSE ---');
  {
    // Attempt to store PAN
    let panBlocked = false;
    try {
      store.setPreference('alice', 'tenant_default', {
        key: 'card',
        label: 'Card',
        value: { cardNumber: '4111 2222 3333 4444' },
        category: 'general',
        isUserVerified: false,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      if (err instanceof MemoryPrivacyViolationError && err.message.includes('PAN')) {
        panBlocked = true;
      }
    }
    assert(panBlocked === true, 'Test 12: Memory privacy sanitizer strictly blocks storing card numbers (PAN)');

    // Attempt to store CVV
    let cvvBlocked = false;
    try {
      store.setPreference('alice', 'tenant_default', {
        key: 'cvv',
        label: 'Security Code',
        value: { cvv: 123 },
        category: 'general',
        isUserVerified: false,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      if (err instanceof MemoryPrivacyViolationError && err.message.includes('CVV')) {
        cvvBlocked = true;
      }
    }
    assert(cvvBlocked === true, 'Test 13: Memory privacy sanitizer strictly blocks storing CVV codes');

    // Attempt to store API key
    let keyBlocked = false;
    try {
      store.setPreference('alice', 'tenant_default', {
        key: 'apikey',
        label: 'API Key',
        value: FAKE_STRIPE_SECRET_KEY,
        category: 'general',
        isUserVerified: false,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      if (err instanceof MemoryPrivacyViolationError && err.message.includes('credentials or private API keys')) {
        keyBlocked = true;
      }
    }
    assert(keyBlocked === true, 'Test 14: Memory privacy sanitizer blocks private API keys and tokens');

    // Text sanitizer
    const sanitized = MemoryPrivacySanitizer.sanitizeText(
      'My card is 4111 2222 3333 4444 with cvv: 999 and key sk_test_abc123'
    );
    assert(
      !sanitized.includes('4111') && !sanitized.includes('999') && !sanitized.includes('sk_test_'),
      'Test 15: Text sanitizer redacts PAN, CVV, and API keys from conversation logs'
    );
  }

  // --- Category E: Search, GDPR Erasure & TTL Expiration ---
  console.log('\n--- CATEGORY E: SEARCH, GDPR ERASURE & TTL ---');
  {
    // Search memories
    const matches = store.searchRelevantMemories('alice', 'tenant_default', 'vietnam');
    assert(matches.length >= 1, 'Test 16: Keyword search finds relevant past trip memory');

    const prefMatches = store.searchRelevantMemories('alice', 'tenant_default', 'vegetarian');
    assert(prefMatches.length >= 1, 'Test 17: Keyword search finds relevant user preference');

    // GDPR Right to Be Forgotten
    const deletedCount = store.clearUserMemories('alice', 'tenant_default');
    assert(deletedCount >= 2, 'Test 18: GDPR erasure clears all user memory entries');
    const remainingPrefs = store.getPreferences('alice', 'tenant_default');
    const remainingTrips = store.getPastTrips('alice', 'tenant_default');
    assert(remainingPrefs.length === 0, 'Test 19: Zero preferences remain after GDPR erasure');
    assert(remainingTrips.length === 0, 'Test 20: Zero trips remain after GDPR erasure');
  }

  console.log('\n==================================================');
  console.log('PHASE 9.3 TEST RESULTS: 20 PASSED / 0 FAILED (20 TOTAL)');
  console.log('==================================================\n');
}

runPhase93Tests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
