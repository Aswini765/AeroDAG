import { curatedDays, curatedDayItem } from './dayPlaces';
/**
 * Day-plan text, cleaned of filler so each line says something a traveller can use.
 * ("Smooth check-in … Unpack, rest, and settle into …. Dedicated rest downtime." → "Check in at … and rest.")
 */
const RULES: Array<[RegExp, string]> = [
  [/Smooth check-in at ([^.]+)\.\s*Unpack, rest, and settle into [^.]+\.?/gi, 'Check in at $1 and rest.'],
  [/\s*Dedicated rest downtime\.?/gi, ''],
  [/Light orientation stroll along ([^.]+)\.?/gi, 'Easy walk around $1.'],
  [/Welcome dinner featuring authentic regional cuisine\.?/gi, 'Dinner nearby.'],
  [/Relaxed evening dinner at a popular local restaurant enjoying regional cuisine\.?/gi, 'Dinner at a local place serving regional food.'],
  [/Local sightseeing and leisurely cultural lunch in ([^.]+)\.?/gi, 'Lunch and a slow afternoon in $1.'],
  [/\s{2,}/g, ' ']
];

export function cleanDayText(text?: string | null): string {
  let t = (text || '').trim();
  for (const [re, rep] of RULES) t = t.replace(re, rep);
  return t.trim();
}

import type { TripPlan } from '../types/travelBooking';

/**
 * Keep the day plan consistent with the option the user picked:
 * the Budget option goes by train/bus to a guesthouse, so Day 1 must not say
 * "Flight … private chauffeur … Baywatch Resort".
 */
export function alignItineraryToPlan(plan: TripPlan): TripPlan['itinerary'] {
  const it = plan.itinerary || [];
  if (it.length === 0) return it;
  const origin = (plan.origin || '').replace(/\s*\([^)]*\)/, '').trim();
  const place = (plan.stays?.[0]?.baseName || plan.destination || '').replace(/,.*$/, '').trim();
  const stayName = plan.stays && plan.stays.length > 1 ? `your stay in ${place}` : (plan.hotel?.name || 'your stay').replace(/,\s*~₹.*$/, '');
  const otherHotels = (plan.availableHotels || [])
    .map((h) => h.name.replace(/,\s*~₹.*$/, ''))
    .filter((n) => n && n !== stayName && n.length > 6);
  const swapHotel = (t: string) => otherHotels.reduce((acc, n) => acc.split(n).join(stayName), t || '');

  const ground = !plan.flight && plan.selectedTrain;
  const road = !plan.flight && !plan.selectedTrain && plan.transfer;
  const day1 = it[0].morning || '';
  const saysFlight = /\bflight|\bfly\b|airport|dabolim|mopa/i.test(day1);
  const saysDrive = /^drive\b|road drive|\bcab\b|chauffeur/i.test(day1);
  const saysBusOrTrain = /\bbus\b|\btrain\b|express|volvo/i.test(day1);
  // Day 1 describes a different way of travelling than the option picked
  const mentionsFlight = (saysFlight && !plan.flight) || (saysDrive && Boolean(ground)) || (saysBusOrTrain && Boolean(road || plan.flight));

  // Days built from real places follow the stay: pick a stay in another part of Goa and
  // the middle days are re-planned around it (nearest places first).
  const stayArea = `${plan.hotel?.area || ''} ${plan.hotel?.name || ''}`;
  const middle = it.slice(1, -1);
  const curatedNow = middle.length > 0 && middle.every((d) => d.stops && d.stops.length)
    ? curatedDays(plan.destination, stayArea, middle.length)
    : null;
  const gentle = (plan.travellers?.seniors || 0) > 0;
  const firstZone = curatedNow && curatedNow[0] ? curatedNow[0].title : null;
  const needsReplan = Boolean(curatedNow && firstZone && middle[0].title !== firstZone);
  const added = plan.userChoices?.addedStops || [];
  const stayShort = (plan.hotel?.area || '').split(',')[0].trim();

  return it.map((d0, i) => {
    let d = d0;
    if (needsReplan && i > 0 && i < it.length - 1 && curatedNow![i - 1]) {
      const dining = (d0.localDining && d0.localDining.length >= 2 ? [d0.localDining[0], d0.localDining[1]] : [d0.localDining?.[0] || 'a local restaurant', 'a local café']) as [string, string];
      d = curatedDayItem(curatedNow![i - 1], i + 1, { name: plan.hotel.name, area: plan.hotel.area }, dining, gentle);
    }
    // Day 1's evening walk is near wherever you're staying now
    if (i === 0 && stayShort && d.stops && d.stops.length === 1 && d.stops[0].slot === 'Evening' && d.stops[0].name !== stayShort && (d.evening || '').includes(d.stops[0].name)) {
      const where = (plan.destination || '').replace(/,.*$/, '').trim();
      d = {
        ...d,
        evening: (d.evening || '').replace(d.stops[0].name, stayShort),
        stops: [{ name: stayShort, slot: 'Evening' as const, mapQuery: new RegExp(where, 'i').test(plan.hotel.area) ? plan.hotel.area : `${plan.hotel.area}, ${where}` }]
      };
    }
    // Places the traveller added to this day
    const mine = added.filter((a) => a.day === i + 1);
    if (mine.length) {
      const where = (plan.destination || '').replace(/,.*$/, '').trim();
      const extra = mine.filter((a) => !(d.afternoon || '').includes(`Visit ${a.place}.`));
      d = {
        ...d,
        afternoon: `${(d.afternoon || '').replace(/\.?\s*$/, '.')}${extra.map((a) => ` Visit ${a.place}.`).join('')}`,
        stops: d.stops && d.stops.length
          ? [...d.stops, ...mine.filter((a) => !d.stops!.some((x) => x.name === a.place)).map((a) => ({ name: a.place, slot: 'Afternoon' as const, mapQuery: `${a.place}, ${where}` }))]
          : d.stops
      };
    }
    let morning = swapHotel(d.morning);
    let afternoon = swapHotel(d.afternoon);
    let evening = swapHotel(d.evening);
    if (i === 0 && mentionsFlight) {
      morning = ground
        ? `${plan.selectedTrain!.mode === 'bus' ? plan.selectedTrain!.trainName : `Train (${plan.selectedTrain!.trainName})`} from ${origin} to ${place}, then an auto to ${stayName}.`
        : road
        ? (/selfdrive/.test(plan.transfer.id || '') ? `Drive your own car from ${origin} to ${place}.` : `Drive from ${origin} to ${place} (${plan.transfer.vehicleType}).`)
        : plan.flight
        ? `Fly ${plan.flight.originCode} → ${plan.flight.destinationCode}, then by road to ${stayName}.`
        : morning;
    }
    if (i === it.length - 1 && it.length > 1 && (ground || road) && /\bflight|airport\b/i.test(`${d.afternoon} ${d.evening}`)) {
      afternoon = `Leave for ${origin} by ${ground ? (plan.selectedTrain!.mode === 'bus' ? 'bus' : 'train') : 'road'}.`;
      evening = 'Home.';
    }
    return { ...d, morning, afternoon, evening };
  });
}

/**
 * The real places in one line of a day plan, e.g.
 *   "Visit Talley Valley Wildlife Sanctuary in Bulla (approx. 6h)." → "Talley Valley Wildlife Sanctuary"
 *   "Check in and rest, then an easy visit to Hadimba Temple."     → "Hadimba Temple"
 *   "Dinner at a local place serving regional food."               → null (not a place)
 */
export function placeFromLine(line?: string | null): string | null {
  let t = cleanDayText(line).replace(/\s*\(approx[^)]*\)/gi, '').trim();
  if (!t) return null;
  // Travel, meals, rest and going home are not places to pin
  if (/^(fly|flight|return flight|drive|train|overnight|ac bus|travel|leave for|head home|home\b|breakfast|relaxed breakfast|lunch|dinner|early dinner|rest\b|free day|slow morning|optional day trip|check in and rest\.?$|sunset and dinner|arrival|arrive|transfer|hotel checkout|check-?out|journey)/i.test(t)) {
    const inner = t.match(/(?:easy visit to|then visit|then an easy visit to)\s+([^.,;]+)/i);
    return inner ? tidy(inner[1]) : null;
  }
  const visitTo = t.match(/(?:easy visit to|visit to)\s+([^.,;]+)/i);
  if (visitTo) return tidy(visitTo[1]);
  // Hand-written guides: "Mysore Palace Guided Heritage Walk: Explore the grand Durbar hall…"
  const titled = t.match(/^([A-Z][^:]{2,60}):/);
  if (titled && !/^(afternoon|morning|evening|leisure|hotel checkout|check-?out|arrive|arrival|return|departure|transfer)/i.test(titled[1])) {
    return tidy(titled[1].split(/\s+&\s+/)[0]);
  }
  const lead = t.match(/^(?:visit|explore|see|morning guided heritage walk around|guided walk (?:around|through)|easy walk around|walk (?:around|through|along)|boat ride (?:on|at|in)|sunrise at|sunset at|trek to|hike to|day trip to|cruise on|take a ride on)\s+([^.,;]+)/i);
  if (lead) return tidy(lead[1]);
  // A short line that is just a name ("Hadimba Temple.", "Patwon ki Haveli.")
  const first = t.split(/[.;]/)[0].trim();
  if (first && first.split(/\s+/).length <= 6 && /^[A-Z]/.test(first) && !/\b(and|with|your|you|near)\b/i.test(first)) return tidy(first);
  return null;
}

function tidy(name: string): string | null {
  let n0 = name.trim();
  // Drop activity words at the end: "Mysore Palace Guided Heritage Walk" → "Mysore Palace"
  for (let i = 0; i < 3; i++) {
    n0 = n0.replace(/\s+(guided heritage walk|guided walk|heritage walk|walking tour|experience|tasting|safari|tour|visit|walk|stroll|trek|cruise)$/i, '').trim();
  }
  const n = n0
    .replace(/\s+in\s+[A-Z][\w\s]*$/, '')       // "Hadimba Temple in Mall Road" → "Hadimba Temple"
    .replace(/^(the)\s+/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return n.length >= 3 ? n : null;
}

/** Unique places for one day, in order. */
export interface MapStop {
  /** shown in the plan, e.g. "Basilica of Bom Jesus" */
  name: string;
  /** what Google Maps searches, e.g. "Basilica of Bom Jesus, Old Goa" */
  query: string;
}

type DayLike = {
  morning?: string; afternoon?: string; evening?: string;
  stops?: Array<{ name: string; mapQuery: string }>;
};

/**
 * The day's places for the map. Days built from real places carry them (`day.stops`, with the
 * exact Google Maps name); older days are read from the text.
 */
export function mapStopsForDay(day: DayLike, destination: string): MapStop[] {
  const where = (destination || '').replace(/,.*$/, '').trim();
  if (day.stops && day.stops.length) {
    const out: MapStop[] = [];
    for (const st of day.stops) {
      if (!out.some((o) => o.name.toLowerCase() === st.name.toLowerCase())) out.push({ name: st.name, query: st.mapQuery || `${st.name}, ${where}` });
    }
    return out;
  }
  return stopsForDay(day).map((n) => ({ name: n, query: where && !n.toLowerCase().includes(where.toLowerCase()) ? `${n}, ${where}` : n }));
}

export function stopsForDay(day: DayLike): string[] {
  if (day.stops && day.stops.length) return day.stops.map((x) => x.name);
  const out: string[] = [];
  for (const line of [day.morning, day.afternoon, day.evening]) {
    const p = placeFromLine(line);
    if (p && !out.some((o) => o.toLowerCase() === p.toLowerCase())) out.push(p);
  }
  // Places the traveller added ("Visit Dudhsagar Falls.") later in a line
  for (const line of [day.morning, day.afternoon, day.evening]) {
    for (const m of cleanDayText(line).matchAll(/(?:^|\.\s+)Visit ([A-Z][^.;]{2,50})\./g)) {
      const p = tidy(m[1]);
      if (p && !out.some((o) => o.toLowerCase() === p.toLowerCase())) out.push(p);
    }
  }
  return out;
}

function stayQuery(destination: string, stayArea?: string): string {
  const where = (destination || '').replace(/,.*$/, '').trim();
  const stay = (stayArea || where).trim();
  return new RegExp(where, 'i').test(stay) ? stay : `${stay}, ${where}`;
}

const asStops = (stops: Array<string | MapStop>, destination: string): MapStop[] => {
  const where = (destination || '').replace(/,.*$/, '').trim();
  return stops.map((x) => (typeof x === 'string' ? { name: x, query: `${x}, ${where}` } : x));
};

/** Google Maps directions from your stay through every stop of the day (opens in the app or a new tab). */
export function dayRouteUrl(stops: Array<string | MapStop>, destination: string, stayArea?: string): string {
  const list = asStops(stops, destination);
  const origin = stayQuery(destination, stayArea);
  const others = list.filter((x) => x.query.toLowerCase() !== origin.toLowerCase() && !origin.toLowerCase().startsWith(x.name.toLowerCase()));
  if (others.length === 0) {
    // Nothing to route to (arrival / rest day): just show the stay's area
    const q = list[0]?.query || origin;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}&hl=en`;
  }
  const last = others[others.length - 1];
  const via = others.slice(0, -1);
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(last.query)}${via.length ? `&waypoints=${via.map((v) => encodeURIComponent(v.query)).join('%7C')}` : ''}&travelmode=driving&hl=en`;
}

/**
 * The map on the page.
 * With a Maps Embed API key (VITE_GOOGLE_MAPS_EMBED_KEY — Google's supported, no-charge embed):
 * the day's driving route from your stay through every stop.
 * Without a key: Google's old key-free embed of one place (undocumented, may stop working) —
 * the "Open in Google Maps" button always works either way.
 */
export function dayEmbedUrl(stops: Array<string | MapStop>, destination: string, stayArea?: string, focus?: MapStop | null, key?: string): string {
  const list = asStops(stops, destination);
  const origin = stayQuery(destination, stayArea);
  const others = list.filter((x) => x.query.toLowerCase() !== origin.toLowerCase() && !origin.toLowerCase().startsWith(x.name.toLowerCase()));
  if (key) {
    const k = encodeURIComponent(key);
    if (focus) return `https://www.google.com/maps/embed/v1/place?key=${k}&q=${encodeURIComponent(focus.query)}&language=en&region=IN`;
    if (others.length === 0) return `https://www.google.com/maps/embed/v1/place?key=${k}&q=${encodeURIComponent(list[0]?.query || origin)}&language=en&region=IN`;
    const via = others.slice(0, -1).map((o) => encodeURIComponent(o.query)).join('%7C');
    return `https://www.google.com/maps/embed/v1/directions?key=${k}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(others[others.length - 1].query)}${via ? `&waypoints=${via}` : ''}&mode=driving&language=en&region=IN`;
  }
  const q = focus ? focus.query : (others[0]?.query || list[0]?.query || origin);
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=${focus || others.length ? 14 : 13}&hl=en&output=embed`;
}
