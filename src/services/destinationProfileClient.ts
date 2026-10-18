/**
 * AeroDAG — Client-side Destination Profile Service & 7-Day Local Cache
 * 
 * Manages fetching AI destination profiles with:
 * - In-session Map cache (never re-fetches in same session)
 * - 7-day localStorage cache (persists between visits)
 * - 10-second timeout handling
 */

import { DestinationProfile, DestinationProfileApiResponse } from '../types/destinationProfile.ts';

// In-session cache: guarantees we never call Gemini twice for the same place in one session
const sessionProfileCache = new Map<string, DestinationProfileApiResponse>();

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const STORAGE_PREFIX = 'aerodag_profile_';

interface StoredCacheItem {
  data: DestinationProfileApiResponse;
  timestamp: number;
}

export async function fetchDestinationProfile(
  destination: string,
  origin: string = 'Bengaluru'
): Promise<DestinationProfileApiResponse | null> {
  const cleanDest = destination.trim();
  if (!cleanDest) return null;
  const cacheKey = cleanDest.toLowerCase();

  // 1. In-session memory check
  if (sessionProfileCache.has(cacheKey)) {
    return sessionProfileCache.get(cacheKey)!;
  }

  // 2. localStorage check (7 days TTL)
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${cacheKey}`);
    if (stored) {
      const parsed: StoredCacheItem = JSON.parse(stored);
      if (parsed && parsed.timestamp && Date.now() - parsed.timestamp < SEVEN_DAYS_MS) {
        sessionProfileCache.set(cacheKey, parsed.data);
        return parsed.data;
      }
    }
  } catch {
    // Ignore localStorage errors (private browsing, quotas)
  }

  // 3. Network fetch with 10s timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch('/api/destination-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        destination: cleanDest,
        origin: origin.trim()
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      // 429, 503, or 422
      return null;
    }

    const data: DestinationProfileApiResponse = await res.json();

    // Cache in session
    sessionProfileCache.set(cacheKey, data);

    // Cache in localStorage
    try {
      const item: StoredCacheItem = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(`${STORAGE_PREFIX}${cacheKey}`, JSON.stringify(item));
    } catch {
      // Ignore quota exceptions
    }

    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn(`[destinationProfileClient] Failed to fetch profile for "${cleanDest}":`, err?.message || err);
    return null;
  }
}
