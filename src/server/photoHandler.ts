/**
 * GET /api/photo?q=<place or hotel>&near=<destination>&kind=place|hotel&area=<stay area>
 *
 * One endpoint, three photo sources, tried in this order:
 *  1. Google Places API (New): the real photo of that exact hotel / place.
 *     Needs GOOGLE_PLACES_API_KEY (paid API with a monthly free allowance; billing must be on).
 *  2. Wikipedia / Wikimedia Commons: real photos of landmarks and towns. No key.
 *  3. Wikimedia Commons: real photos of beaches, villages and streets that have no Wikipedia
 *     page photo (e.g. Sernabatim Beach). No key.
 *  4. Unsplash: free stock photos of the area. Needs UNSPLASH_ACCESS_KEY (demo: 50 lookups/hour;
 *     each answer is cached, so that is plenty). Pexels (PEXELS_API_KEY) still works if you have one.
 *
 * Every answer says where the photo came from and whether it shows the exact place
 * (`exact: true`) or only the area — the app labels it so, never passing an area photo off as the hotel.
 * Keys stay on the server; the browser only ever calls /api/photo.
 */
import type { Request, Response } from 'express';

export interface PhotoResult {
  url: string;
  source: 'google' | 'wikipedia' | 'commons' | 'unsplash' | 'pexels';
  /** true = photo of this exact hotel / place; false = a photo of the area around it */
  exact: boolean;
  /** what the photo shows, e.g. "Calangute Beach" */
  shows: string;
  credit: string;
  creditUrl: string;
}

const TTL_MS = 50 * 60 * 1000; // Google photo links are short-lived: keep answers < 1 hour
const cache = new Map<string, { at: number; value: PhotoResult | null }>();

const GENERIC = new Set(['the', 'of', 'and', 'in', 'temple', 'beach', 'fort', 'lake', 'park', 'falls', 'market', 'road', 'hills', 'national', 'museum', 'palace', 'river', 'valley', 'view', 'point', 'india', 'hotel', 'resort', 'spa', 'inn', 'stay', 'homestay', 'north', 'south']);
const words = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !GENERIC.has(w));
function relevant(want: string, got: string): boolean {
  const w = words(want);
  if (w.length === 0) return true;
  const g = new Set(words(got));
  return w.some((x) => g.has(x));
}

async function getJson(url: string, init?: RequestInit, timeoutMs = 7000): Promise<any | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) return undefined;
    return await res.json();
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/** 1. Google Places (New): Text Search → first photo → short-lived photoUri */
async function fromGoogle(text: string, key: string): Promise<PhotoResult | null> {
  const search = await getJson('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.displayName,places.googleMapsUri,places.photos'
    },
    body: JSON.stringify({ textQuery: text, languageCode: 'en', regionCode: 'IN', pageSize: 1 })
  });
  const place = search?.places?.[0];
  const photo = place?.photos?.[0];
  if (!photo?.name) return null;
  const media = await getJson(
    `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=800&skipHttpRedirect=true&key=${encodeURIComponent(key)}`
  );
  if (!media?.photoUri) return null;
  const author = photo.authorAttributions?.[0];
  return {
    url: media.photoUri,
    source: 'google',
    exact: true,
    shows: place.displayName?.text || text,
    credit: author?.displayName ? `${author.displayName} · Google` : 'Google',
    creditUrl: author?.uri || place.googleMapsUri || 'https://maps.google.com'
  };
}

/** 2. Wikipedia page image (real landmark / town photos, free with credit) */
async function fromWikipedia(query: string, mustMatch: string): Promise<PhotoResult | null | undefined> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrlimit=3&gsrsearch=${encodeURIComponent(query)}&prop=pageimages|info&piprop=thumbnail&pithumbsize=800&inprop=url`;
  const data = await getJson(url, { headers: { 'User-Agent': 'AeroDAG/1.0 (trip planner; photo lookup)' } });
  if (data === undefined) return undefined;
  const pages = Object.values<any>(data?.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
  const hit = pages.find((p) => p.thumbnail?.source && relevant(mustMatch, p.title));
  if (!hit) return null;
  return { url: hit.thumbnail.source, source: 'wikipedia', exact: true, shows: hit.title, credit: `Wikipedia · ${hit.title}`, creditUrl: hit.fullurl };
}

/** 3. Wikimedia Commons: a photo file whose name mentions the place */
async function fromCommons(query: string, mustMatch: string): Promise<PhotoResult | null | undefined> {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=6&gsrsearch=${encodeURIComponent(`${query} filetype:bitmap`)}&prop=imageinfo&iiprop=url|mime|extmetadata&iiurlwidth=800`;
  const data = await getJson(url, { headers: { 'User-Agent': 'AeroDAG/1.0 (trip planner; photo lookup)' } });
  if (data === undefined) return undefined;
  const pages = Object.values<any>(data?.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
  const hit = pages.find((p) => {
    const info = p.imageinfo?.[0];
    const title = String(p.title || '').replace(/^File:/, '').replace(/\.[a-z]+$/i, '').replace(/[_-]+/g, ' ');
    return info?.thumburl && /image\/(jpeg|png|webp)/.test(info.mime || '') && relevant(mustMatch, title) && !/map|logo|flag|locator|svg|plan\b|diagram/i.test(title);
  });
  if (!hit) return null;
  const info = hit.imageinfo[0];
  const artist = String(info.extmetadata?.Artist?.value || '').replace(/<[^>]+>/g, '').trim().slice(0, 60);
  return {
    url: info.thumburl,
    source: 'commons',
    exact: true,
    shows: mustMatch,
    credit: `${artist ? artist + ' · ' : ''}Wikimedia Commons`,
    creditUrl: info.descriptionurl || 'https://commons.wikimedia.org'
  };
}

/** 4. Unsplash stock photo of the area (credit the photographer and Unsplash, as their rules ask) */
async function fromUnsplash(query: string, key: string, shows: string): Promise<PhotoResult | null> {
  const data = await getJson(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&content_filter=high`,
    { headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' } }
  );
  const p = data?.results?.[0];
  if (!p?.urls?.regular) return null;
  const ref = 'utm_source=aerodag&utm_medium=referral';
  return {
    url: p.urls.regular,
    source: 'unsplash',
    exact: false,
    shows,
    credit: `${p.user?.name || 'Photographer'} · Unsplash`,
    creditUrl: `${p.user?.links?.html || p.links?.html || 'https://unsplash.com'}?${ref}`
  };
}

/** 5. Pexels stock photo of the area */
async function fromPexels(query: string, key: string, shows: string): Promise<PhotoResult | null> {
  const data = await getJson(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
    { headers: { Authorization: key } }
  );
  const p = data?.photos?.[0];
  if (!p?.src) return null;
  return {
    url: p.src.large || p.src.medium,
    source: 'pexels',
    exact: false,
    shows,
    credit: `${p.photographer || 'Photographer'} · Pexels`,
    creditUrl: p.url || 'https://www.pexels.com'
  };
}

/** photo = null with reached = false means no source could be asked (network down): don't remember that. */
export async function findPhoto(params: { q: string; near?: string; kind?: string; area?: string }): Promise<{ photo: PhotoResult | null; reached: boolean }> {
  let reached = false;
  const q = params.q.trim();
  const near = (params.near || '').replace(/,.*$/, '').trim();
  const area = (params.area || '').trim();
  const isHotel = params.kind === 'hotel';
  const googleKey = process.env.GOOGLE_PLACES_API_KEY;
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  const pexelsKey = process.env.PEXELS_API_KEY;
  const withNear = (t: string) => (near && !t.toLowerCase().includes(near.toLowerCase()) ? `${t} ${near}` : t);

  // 1. The exact hotel / place on Google
  if (googleKey) {
    const g = await fromGoogle(near && !q.toLowerCase().includes(near.toLowerCase()) ? `${q}, ${near}` : q, googleKey);
    if (g && (!isHotel || relevant(q, g.shows))) return { photo: g, reached: true };
  }

  // What to look for, most specific first. A hotel: its area ("Sernabatim Beach", then "Candolim"),
  // never a broad region; a place: the place itself.
  const parts = (isHotel ? area : q).split(/[,/]/).map((x) => x.trim()).filter(Boolean);
  const specific = parts.filter((x) => !/^(north|south|east|west|central|old)\s+\w+$/i.test(x) && x.toLowerCase() !== near.toLowerCase());
  const targets = specific.length ? specific.slice(0, 2) : parts.slice(0, 1);
  const tag = (p: PhotoResult): PhotoResult => ({ ...p, exact: isHotel ? false : p.exact });

  // 2. Wikipedia page photo, 3. Wikimedia Commons photo — real photos of the place
  for (const t of targets) {
    const w = await fromWikipedia(withNear(t), t);
    if (w !== undefined) reached = true;
    if (w) return { photo: tag(w), reached: true };
    const c = await fromCommons(withNear(t), t);
    if (c !== undefined) reached = true;
    if (c) return { photo: tag(c), reached: true };
  }

  // 4. Unsplash, 5. Pexels — stock photo of the area (labelled as such)
  const stockQuery = [targets[0] || q, near, 'India'].filter(Boolean).join(' ');
  if (unsplashKey) {
    const u = await fromUnsplash(stockQuery, unsplashKey, targets[0] || q);
    if (u) return { photo: u, reached: true };
  }
  if (pexelsKey) {
    const p = await fromPexels(stockQuery, pexelsKey, targets[0] || q);
    if (p) return { photo: p, reached: true };
  }

  // 6. Last resort for a hotel: a photo of the wider region ("South Goa"), labelled as the area
  if (isHotel) {
    const region = parts.find((x) => /^(north|south|east|west|central)\s+\w+$/i.test(x)) || near;
    if (region) {
      const w = await fromWikipedia(region, region);
      if (w !== undefined) reached = true;
      if (w) return { photo: { ...w, exact: false }, reached: true };
    }
  }
  return { photo: null, reached };
}

export async function handlePhoto(req: Request, res: Response) {
  const q = String(req.query.q || '').slice(0, 120).trim();
  if (!q) return res.status(400).json({ error: 'q is required' });
  const params = {
    q,
    near: String(req.query.near || '').slice(0, 80),
    kind: String(req.query.kind || 'place'),
    area: String(req.query.area || '').slice(0, 80)
  };
  const key = JSON.stringify(params).toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return res.json({ photo: hit.value, reached: true });
  try {
    const { photo, reached } = await findPhoto(params);
    if (reached) {
      cache.set(key, { at: Date.now(), value: photo });
      if (cache.size > 2000) cache.delete(cache.keys().next().value as string);
      res.setHeader('Cache-Control', 'public, max-age=1800');
    }
    return res.json({ photo, reached });
  } catch {
    return res.json({ photo: null, reached: false });
  }
}

/** Which photo sources are switched on (shown nowhere secret: just booleans) */
export function photoSources() {
  return { google: Boolean(process.env.GOOGLE_PLACES_API_KEY), wikipedia: true, commons: true, unsplash: Boolean(process.env.UNSPLASH_ACCESS_KEY), pexels: Boolean(process.env.PEXELS_API_KEY) };
}
