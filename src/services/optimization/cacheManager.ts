/**
 * AeroDAG Safe Cache Manager
 * 
 * Provides bounded, TTL-enforced, namespace-isolated in-memory caching.
 * 
 * CRITICAL SAFETY RULES:
 * 1. Booking states, payment states, and payment credentials MUST NEVER be cached.
 * 2. Cross-user private session states MUST NEVER be cached in shared namespaces.
 * 3. Real-time availability must NEVER be treated as confirmed booking state.
 * 4. All cached items expire deterministically according to TTL.
 */

import { CacheNamespace, CacheEntry, CacheStats } from './types';

export class UnsafeCacheAttemptError extends Error {
  constructor(message: string) {
    super(`Unsafe Cache Attempt Blocked: ${message}`);
    this.name = 'UnsafeCacheAttemptError';
  }
}

export class SafeCacheManager {
  private static instance: SafeCacheManager | null = null;

  private store: Map<string, CacheEntry<any>> = new Map();
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private readonly maxEntries = 5000;

  // Prohibited keywords in cache keys or content
  private readonly prohibitedPatterns = [
    /payment_state/i,
    /payment_credential/i,
    /credit_card/i,
    /cvv/i,
    /booking_confirmed/i,
    /booking_state/i,
    /hold_id/i,
    /auth_token/i,
    /session_credential/i,
    /bookingstatus/i,
    /paymentstatus/i,
    /holdstatus/i,
    /paymentauthorization/i,
    /confirmationcode/i,
    /refundstatus/i
  ];

  private constructor() {}

  static getInstance(): SafeCacheManager {
    if (!SafeCacheManager.instance) {
      SafeCacheManager.instance = new SafeCacheManager();
    }
    return SafeCacheManager.instance;
  }

  /**
   * Generates a deterministic namespaced key
   */
  generateKey(namespace: CacheNamespace, identifier: string | Record<string, unknown>): string {
    const serialized = typeof identifier === 'string'
      ? identifier.trim().toLowerCase()
      : JSON.stringify(identifier, Object.keys(identifier).sort());
    return `${namespace}:${serialized}`;
  }

  /**
   * Retrieves an item from cache if present and unexpired
   */
  get<T>(namespace: CacheNamespace, key: string): T | undefined {
    const fullKey = key.startsWith(`${namespace}:`) ? key : `${namespace}:${key}`;
    const entry = this.store.get(fullKey);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(fullKey);
      this.misses++;
      return undefined;
    }

    entry.hits++;
    this.hits++;
    return entry.value as T;
  }

  /**
   * Stores an item with strict safety guardrails and deterministic TTL
   */
  set<T>(namespace: CacheNamespace, key: string, value: T, ttlMs: number): void {
    const fullKey = key.startsWith(`${namespace}:`) ? key : `${namespace}:${key}`;

    // Safety Guardrail: Prevent caching sensitive payment / booking state
    this.assertSafety(fullKey, value);

    // Evict oldest if reaching capacity
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
        this.evictions++;
      }
    }

    const now = Date.now();
    this.store.set(fullKey, {
      key: fullKey,
      value,
      createdAt: now,
      expiresAt: now + Math.max(100, ttlMs),
      hits: 0,
      namespace
    });
  }

  /**
   * Checks whether an unexpired key exists in the cache
   */
  has(namespace: CacheNamespace, key: string): boolean {
    const fullKey = key.startsWith(`${namespace}:`) ? key : `${namespace}:${key}`;
    const entry = this.store.get(fullKey);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(fullKey);
      return false;
    }
    return true;
  }

  /**
   * Explicitly invalidates a key or entire namespace
   */
  invalidate(namespace: CacheNamespace, key?: string): void {
    if (key) {
      const fullKey = key.startsWith(`${namespace}:`) ? key : `${namespace}:${key}`;
      this.store.delete(fullKey);
    } else {
      const prefix = `${namespace}:`;
      for (const k of this.store.keys()) {
        if (k.startsWith(prefix)) {
          this.store.delete(k);
        }
      }
    }
  }

  /**
   * Invalidates an entire namespace
   */
  invalidateNamespace(namespace: CacheNamespace): void {
    this.invalidate(namespace);
  }

  /**
   * Clears all cache entries
   */
  clearAll(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Alias for clearAll
   */
  clear(): void {
    this.clearAll();
  }

  /**
   * Returns cache utilization and hit ratio statistics
   */
  getStats(): CacheStats {
    const totalOps = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      size: this.store.size,
      hitRatio: totalOps === 0 ? 0 : Number((this.hits / totalOps).toFixed(3))
    };
  }

  private assertSafety(key: string, value: unknown): void {
    // 1. Check key pattern
    for (const pattern of this.prohibitedPatterns) {
      if (pattern.test(key)) {
        throw new UnsafeCacheAttemptError(`Attempted to cache prohibited entity matching ${pattern}`);
      }
    }

    // 2. Check value shallow properties if object
    if (value && typeof value === 'object') {
      const keys = Object.keys(value as Record<string, unknown>);
      for (const k of keys) {
        if (
          k.toLowerCase().includes('cardnumber') ||
          k.toLowerCase().includes('cvv') ||
          k.toLowerCase().includes('bookingstate') ||
          k.toLowerCase().includes('paymentstate') ||
          k.toLowerCase().includes('bookingstatus') ||
          k.toLowerCase().includes('paymentstatus') ||
          k.toLowerCase().includes('holdstatus') ||
          k.toLowerCase().includes('refundstatus')
        ) {
          throw new UnsafeCacheAttemptError(`Object contains sensitive property '${k}'`);
        }
      }
    }
  }
}

export function getSafeCacheManager(): SafeCacheManager {
  return SafeCacheManager.getInstance();
}
