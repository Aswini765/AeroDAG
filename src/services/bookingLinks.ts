/**
 * Booking hand-off links that open the partner site with the trip already filled in
 * (place, dates, guests) — so the user doesn't retype anything.
 *
 * MakeMyTrip hotel search:  /hotels/hotel-listing/?checkin=MMDDYYYY&checkout=MMDDYYYY&roomStayQualifier=2e0e&searchText=Coorg
 *   roomStayQualifier = "<adults>e<children>e" followed by each child's age and "e".
 * MakeMyTrip flight search: /flight/search?itinerary=BLR-GOI-20/11/2026_GOI-BLR-23/11/2026&tripType=R&paxType=A-2_C-0_I-0
 */
import { resolveTravelDates } from './dateResolver';

const pad = (n: number) => String(n).padStart(2, '0');
const mmddyyyy = (d: Date) => `${pad(d.getMonth() + 1)}${pad(d.getDate())}${d.getFullYear()}`;
const ddmmyyyy = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

export interface BookingParty {
  adults: number;
  children?: number;
  childAges?: number[];
}

function cleanPlace(place: string): string {
  return (place || '').replace(/,\s*India$/i, '').split(',')[0].replace(/\s*\([^)]*\)/, '').trim();
}

export function buildHotelSearchUrl(place: string, dates: string, party: BookingParty): string {
  const city = cleanPlace(place) || 'India';
  const params = new URLSearchParams();
  const resolved = dates ? resolveTravelDates(dates) : null;
  if (resolved && resolved.ok) {
    // Check-out is the morning after the last night
    const checkout = new Date(resolved.end.getFullYear(), resolved.end.getMonth(), resolved.end.getDate() + (resolved.days > 1 ? 0 : 1));
    params.set('checkin', mmddyyyy(resolved.start));
    params.set('checkout', mmddyyyy(checkout));
  }
  const adults = Math.max(1, party.adults || 1);
  const ages = (party.childAges || []).filter((a) => typeof a === 'number' && a >= 0);
  const children = Math.max(ages.length, party.children || 0);
  const childPart = children > 0
    ? `${children}e${Array.from({ length: children }, (_, i) => `${ages[i] ?? 8}e`).join('')}`
    : '0e';
  params.set('roomStayQualifier', `${adults}e${childPart}`);
  params.set('searchText', city);
  params.set('country', 'IN');
  return `https://www.makemytrip.com/hotels/hotel-listing/?${params.toString()}`;
}

export function buildFlightSearchUrl(
  fromCode: string | undefined | null,
  toCode: string | undefined | null,
  dates: string,
  party: BookingParty,
  /** Fly home from a different airport (open-jaw), e.g. in to JSA, out of JDH */
  returnFromCode?: string | null
): string | null {
  const from = (fromCode || '').toUpperCase();
  const to = (toCode || '').toUpperCase();
  const back = (returnFromCode || to).toUpperCase();
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to) || from === to) return null;
  const resolved = dates ? resolveTravelDates(dates) : null;
  if (!resolved || !resolved.ok) return null;
  const adults = Math.max(1, party.adults || 1);
  const children = Math.max(0, party.children || 0);
  const openJaw = /^[A-Z]{3}$/.test(back) && back !== to;
  const itinerary = `${from}-${to}-${ddmmyyyy(resolved.start)}_${back}-${from}-${ddmmyyyy(resolved.end)}`;
  return `https://www.makemytrip.com/flight/search?itinerary=${itinerary}&tripType=${openJaw ? 'M' : 'R'}&paxType=A-${adults}_C-${children}_I-0&intl=false&cabinClass=E`;
}

/** Bus search on redBus (route pages are /bus-tickets/<from>-to-<to>). */
export function buildBusSearchUrl(fromCity: string, toCity: string): string {
  const slug = (t: string) => cleanPlace(t).toLowerCase().replace(/^new\s+/, '').replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
  const from = slug(fromCity);
  const to = slug(toCity);
  return from && to ? `https://www.redbus.in/bus-tickets/${from}-to-${to}` : 'https://www.redbus.in/';
}

export const IRCTC_SEARCH_URL = 'https://www.irctc.co.in/nget/train-search';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "20–22 Nov" or "30 Nov – 2 Dec" */
export function formatDateRange(start: Date, end: Date): string {
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()}–${end.getDate()} ${MONTHS[end.getMonth()]}`;
  }
  return `${start.getDate()} ${MONTHS[start.getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]}`;
}

/** Hotel search with exact check-in / check-out dates (used per stop on multi-stop trips). */
export function buildHotelSearchUrlForDates(place: string, checkin: Date, checkout: Date, party: BookingParty): string {
  const city = cleanPlace(place) || 'India';
  const params = new URLSearchParams();
  params.set('checkin', mmddyyyy(checkin));
  params.set('checkout', mmddyyyy(checkout));
  const adults = Math.max(1, party.adults || 1);
  const ages = (party.childAges || []).filter((a) => typeof a === 'number' && a >= 0);
  const children = Math.max(ages.length, party.children || 0);
  const childPart = children > 0
    ? `${children}e${Array.from({ length: children }, (_, i) => `${ages[i] ?? 8}e`).join('')}`
    : '0e';
  params.set('roomStayQualifier', `${adults}e${childPart}`);
  params.set('searchText', city);
  params.set('country', 'IN');
  return `https://www.makemytrip.com/hotels/hotel-listing/?${params.toString()}`;
}

export interface StayLeg {
  place: string;
  nights: number;
  checkin: Date | null;
  checkout: Date | null;
  /** "20–22 Nov", or '' when the trip dates can't be read */
  dateLabel: string;
  url: string;
}

/**
 * One booking leg per place you sleep, with its own dates:
 * Munnar 20–22 Nov, then Alleppey 22–24 Nov.
 */
export function getStayLegs(
  plan: { dates: string; destination: string; durationDays: number; stays?: Array<{ baseName: string; nights: number }>; hotel?: { city?: string; area?: string } | null },
  party: BookingParty
): StayLeg[] {
  const resolved = plan.dates ? resolveTravelDates(plan.dates) : null;
  const totalNights = Math.max(1, (plan.durationDays || 2) - 1);
  const stays = plan.stays && plan.stays.length > 0
    ? plan.stays.map((s) => ({ place: s.baseName, nights: Math.max(1, s.nights) }))
    : [{ place: cleanPlace(plan.destination) || plan.hotel?.city || plan.hotel?.area || '', nights: totalNights }];

  let cursor = resolved && resolved.ok ? new Date(resolved.start.getFullYear(), resolved.start.getMonth(), resolved.start.getDate()) : null;
  return stays.map((s) => {
    if (!cursor) {
      return { place: s.place, nights: s.nights, checkin: null, checkout: null, dateLabel: '', url: buildHotelSearchUrl(s.place, plan.dates, party) };
    }
    const checkin = cursor;
    const checkout = new Date(checkin.getFullYear(), checkin.getMonth(), checkin.getDate() + s.nights);
    cursor = checkout;
    return {
      place: s.place,
      nights: s.nights,
      checkin,
      checkout,
      dateLabel: formatDateRange(checkin, checkout),
      url: buildHotelSearchUrlForDates(s.place, checkin, checkout, party)
    };
  });
}
