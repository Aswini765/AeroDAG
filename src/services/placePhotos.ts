/**
 * Real photos of hotels and places.
 *
 * The browser asks our own server (GET /api/photo), which tries, in order:
 * Google Places (exact hotel / place, needs GOOGLE_PLACES_API_KEY) → Wikipedia (no key)
 * → Pexels stock photo of the area (needs PEXELS_API_KEY). If the server is an older build
 * without /api/photo, we ask Wikipedia straight from the browser.
 * Every photo says where it came from, and whether it is the exact place or only its area.
 */
export interface PlacePhoto {
  url: string;
  /** What the credit says, e.g. "Wikipedia · Calangute" or "Ravi K · Google" */
  pageTitle: string;
  pageUrl: string;
  source?: 'google' | 'wikipedia' | 'commons' | 'unsplash' | 'pexels';
  /** false = a photo of the area around the hotel, not the hotel itself */
  exact?: boolean;
  /** what the photo shows */
  shows?: string;
}

const memo = new Map<string, Promise<PlacePhoto | null>>();
const STORE_KEY = 'aerodag-place-photos-v4';

function readStore(): Record<string, PlacePhoto | null> {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
  } catch {
    return {};
  }
}
function writeStore(key: string, value: PlacePhoto | null) {
  try {
    const all = readStore();
    all[key] = value;
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
  } catch {
    // storage may be unavailable; the in-memory cache still works
  }
}

/** Words that, if they are all a search hit shares with the place, make it a wrong match. */
const GENERIC = new Set(['the', 'of', 'and', 'in', 'temple', 'beach', 'fort', 'lake', 'park', 'falls', 'market', 'road', 'hills', 'national', 'museum', 'palace', 'river', 'valley', 'view', 'point', 'india']);

function relevant(place: string, title: string): boolean {
  const words = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !GENERIC.has(w));
  const want = words(place);
  if (want.length === 0) return true;
  const got = new Set(words(title));
  return want.some((w) => got.has(w));
}

/** null = Wikipedia has no fitting photo; undefined = couldn't ask (offline / blocked): don't remember that */
async function searchWikipedia(query: string, place: string): Promise<PlacePhoto | null | undefined> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=3&gsrsearch=${encodeURIComponent(query)}&prop=pageimages|info&piprop=thumbnail&pithumbsize=640&inprop=url`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return undefined;
    const data = await res.json();
    const pages = Object.values<any>(data?.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
    const hit = pages.find((p) => p.thumbnail?.source && relevant(place, p.title));
    return hit ? { url: hit.thumbnail.source, pageTitle: `Wikipedia · ${hit.title}`, pageUrl: hit.fullurl, source: 'wikipedia', exact: true, shows: hit.title } : null;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/** null = no photo; undefined = the server has no /api/photo (old build) or is unreachable */
async function askServer(place: string, where: string, opts: PhotoOptions): Promise<PlacePhoto | null | undefined> {
  const qs = new URLSearchParams({ q: place, near: where, kind: opts.kind || 'place', area: opts.area || '' });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(`/api/photo?${qs.toString()}`, { signal: controller.signal });
    if (!res.ok || !(res.headers.get('content-type') || '').includes('json')) return undefined;
    const data = await res.json();
    const p = data?.photo;
    if (!p) return data?.reached === false ? undefined : null;
    return { url: p.url, pageTitle: p.credit, pageUrl: p.creditUrl, source: p.source, exact: p.exact, shows: p.shows };
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

export interface PhotoOptions {
  /** 'hotel': try the exact hotel; otherwise show its area, labelled as the area */
  kind?: 'place' | 'hotel';
  /** the hotel's area, e.g. "Calangute, North Goa" */
  area?: string;
}

/** Photo of a place ("Hadimba Temple") or hotel in a destination ("Manali"), or null if none fits. */
export function getPlacePhoto(place: string, destination?: string, opts: PhotoOptions = {}): Promise<PlacePhoto | null> {
  const where = (destination || '').replace(/,.*$/, '').trim();
  const key = `${opts.kind || 'place'}|${place}|${where}|${opts.area || ''}`.toLowerCase();
  if (memo.has(key)) return memo.get(key)!;
  const stored = readStore();
  if (key in stored) {
    const p = Promise.resolve(stored[key]);
    memo.set(key, p);
    return p;
  }
  const p = (async () => {
    const server = await askServer(place, where, opts);
    if (server) {
      // Google photo links expire within the hour: keep them in memory only
      if (server.source !== 'google') writeStore(key, server);
      return server;
    }
    if (server === null) { writeStore(key, null); return null; }

    // Old server: Wikipedia straight from the browser (for a hotel, its area)
    const target = opts.kind === 'hotel' ? (opts.area || where).replace(/,.*$/, '') : place;
    if (!target) { memo.delete(key); return null; }
    const queries = where && target.toLowerCase() !== where.toLowerCase() ? [`${target} ${where}`, target] : [target];
    let reached = false;
    for (const q of queries) {
      const hit = await searchWikipedia(q, target);
      if (hit) {
        const value = opts.kind === 'hotel' ? { ...hit, exact: false } : hit;
        writeStore(key, value);
        return value;
      }
      if (hit === null) reached = true;
    }
    if (reached) writeStore(key, null); // Wikipedia answered: there's really no fitting photo
    else memo.delete(key);               // couldn't reach it: try again next time
    return null;
  })();
  memo.set(key, p);
  return p;
}
