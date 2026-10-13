/**
 * AeroDAG Persistent Memory Store
 * 
 * Implements privacy-conscious, tenant-isolated memory architecture for:
 * 1. User travel preferences (with explicit user verification & consent)
 * 2. Past completed trip records
 * 3. Ephemeral conversation scratchpad
 * 4. Semantic / keyword memory search
 * 5. TTL expiration and GDPR erasure
 */

import {
  MemoryCategory,
  MemoryConsentLevel,
  MemoryEntry,
  MemorySearchFilter,
  PastTripRecord,
  StoredUserPreference
} from './types';
import { MemoryPrivacySanitizer } from './privacySanitizer';

export class MemoryAuthorizationError extends Error {
  constructor(userId: string, targetUserId: string) {
    super(`Tenant isolation breach: User '${userId}' cannot access memory belonging to '${targetUserId}'`);
    this.name = 'MemoryAuthorizationError';
  }
}

export class PersistentMemoryStore {
  private static instance: PersistentMemoryStore | null = null;
  // Key: `${tenantId}:${userId}:${category}:${key}` -> MemoryEntry
  private store = new Map<string, MemoryEntry>();

  static getInstance(): PersistentMemoryStore {
    if (!this.instance) {
      this.instance = new PersistentMemoryStore();
    }
    return this.instance;
  }

  static resetInstance(): void {
    if (this.instance) {
      this.instance.store.clear();
      this.instance = null;
    }
  }

  private buildKey(tenantId: string, userId: string, category: MemoryCategory, key: string): string {
    return `${tenantId}:${userId}:${category}:${key}`;
  }

  /**
   * Sets or updates an explicit user travel preference
   */
  setPreference(
    userId: string,
    tenantId: string,
    preference: StoredUserPreference,
    consent: MemoryConsentLevel = 'EXPLICIT_USER_APPROVED'
  ): MemoryEntry<StoredUserPreference> {
    MemoryPrivacySanitizer.sanitizeForStorage(preference, preference.key);

    const storeKey = this.buildKey(tenantId, userId, 'USER_PREFERENCE', preference.key);
    const now = new Date().toISOString();

    const entry: MemoryEntry<StoredUserPreference> = {
      id: `mem_pref_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      tenantId,
      category: 'USER_PREFERENCE',
      key: preference.key,
      data: preference,
      provenance: {
        source: preference.isUserVerified ? 'CONFIRMED_PREFERENCE' : 'USER_EXPLICIT_INPUT',
        confidence: preference.isUserVerified ? 1.0 : 0.9,
        timestamp: now
      },
      consentLevel: consent,
      createdAt: now,
      updatedAt: now,
      tags: [preference.category, 'preference']
    };

    this.store.set(storeKey, entry);
    return entry;
  }

  /**
   * Retrieves all verified preferences for a specific user and tenant
   */
  getPreferences(userId: string, tenantId: string): StoredUserPreference[] {
    const prefix = `${tenantId}:${userId}:USER_PREFERENCE:`;
    const results: StoredUserPreference[] = [];

    for (const [key, entry] of this.store.entries()) {
      if (key.startsWith(prefix)) {
        if (!this.isExpired(entry)) {
          results.push(entry.data);
        }
      }
    }

    return results;
  }

  /**
   * Deletes a user preference (user-correctable)
   */
  deletePreference(userId: string, tenantId: string, prefKey: string): boolean {
    const storeKey = this.buildKey(tenantId, userId, 'USER_PREFERENCE', prefKey);
    return this.store.delete(storeKey);
  }

  /**
   * Stores a completed past trip record
   */
  recordPastTrip(
    userId: string,
    tenantId: string,
    trip: PastTripRecord
  ): MemoryEntry<PastTripRecord> {
    MemoryPrivacySanitizer.sanitizeForStorage(trip, trip.tripId);

    const storeKey = this.buildKey(tenantId, userId, 'PAST_TRIP_SUMMARY', trip.tripId);
    const now = new Date().toISOString();

    const entry: MemoryEntry<PastTripRecord> = {
      id: `mem_trip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      tenantId,
      category: 'PAST_TRIP_SUMMARY',
      key: trip.tripId,
      data: trip,
      provenance: {
        source: 'SAVED_TRIP_OUTCOME',
        confidence: 1.0,
        timestamp: now
      },
      consentLevel: 'EXPLICIT_USER_APPROVED',
      createdAt: now,
      updatedAt: now,
      tags: [trip.destination.toLowerCase(), 'completed_trip']
    };

    this.store.set(storeKey, entry);
    return entry;
  }

  /**
   * Retrieves all past trips for a user
   */
  getPastTrips(userId: string, tenantId: string): PastTripRecord[] {
    const prefix = `${tenantId}:${userId}:PAST_TRIP_SUMMARY:`;
    const results: PastTripRecord[] = [];

    for (const [key, entry] of this.store.entries()) {
      if (key.startsWith(prefix)) {
        if (!this.isExpired(entry)) {
          results.push(entry.data);
        }
      }
    }

    return results;
  }

  /**
   * Searches relevant memories using tags and keywords
   */
  searchRelevantMemories(
    userId: string,
    tenantId: string,
    query: string,
    filter?: MemorySearchFilter
  ): MemoryEntry[] {
    const userPrefix = `${tenantId}:${userId}:`;
    const lowerQuery = query.toLowerCase().trim();
    const matches: MemoryEntry[] = [];

    for (const [key, entry] of this.store.entries()) {
      if (!key.startsWith(userPrefix)) continue;
      if (this.isExpired(entry)) continue;

      if (filter?.category && entry.category !== filter.category) continue;

      const serialized = JSON.stringify(entry.data).toLowerCase();
      const hasKeyword = serialized.includes(lowerQuery) || entry.tags.some((t) => t.toLowerCase().includes(lowerQuery));

      if (hasKeyword) {
        matches.push(entry);
      }

      if (filter?.limit && matches.length >= filter.limit) break;
    }

    return matches;
  }

  /**
   * Clears all memory entries for a user (GDPR Right to Be Forgotten)
   */
  clearUserMemories(userId: string, tenantId: string): number {
    const userPrefix = `${tenantId}:${userId}:`;
    let deletedCount = 0;

    for (const key of Array.from(this.store.keys())) {
      if (key.startsWith(userPrefix)) {
        this.store.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Evicts expired memory entries
   */
  expireStaleMemories(): number {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAtMs && entry.expiresAtMs <= now) {
        this.store.delete(key);
        expiredCount++;
      }
    }

    return expiredCount;
  }

  private isExpired(entry: MemoryEntry): boolean {
    return !!entry.expiresAtMs && entry.expiresAtMs <= Date.now();
  }
}
