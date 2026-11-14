/**
 * Real places for each day — names Google Maps finds exactly — grouped by area, so a day's
 * stops are near each other and the days nearest your stay come first.
 *
 * Every stop has the name as it appears on Google Maps (`mapQuery`), so "Open in Google Maps"
 * and the map on the page land on the right pin. Drive times are typical, by car, off-peak.
 */

import type { ActivityDayItem } from '../types/travelBooking';

export type Slot = 'Morning' | 'Afternoon' | 'Evening';

export interface DayStop {
  /** Short name shown in the plan, e.g. "Basilica of Bom Jesus" */
  name: string;
  slot: Slot;
  /** One line on what you do there */
  what: string;
  /** What Google Maps should search, e.g. "Basilica of Bom Jesus, Old Goa" */
  mapQuery: string;
}

export interface DayTemplate {
  zone: string;
  title: string;
  stops: DayStop[];
  /** a long day out (leave early) */
  fullDay?: boolean;
  /** things to know: closed days, seasons, timings */
  note?: string;
}

interface DestinationPlaces {
  match: RegExp;
  /** which zone a stay area belongs to */
  zoneOf: Array<{ zone: string; area: RegExp }>;
  defaultZone: string;
  /** typical one-way drive between zones, hours */
  driveH: Record<string, Record<string, number>>;
  days: DayTemplate[];
}

const s = (name: string, slot: Slot, what: string, mapQuery: string): DayStop => ({ name, slot, what, mapQuery });

const PLACES: DestinationPlaces[] = [
  {
    match: /\bgoa\b/i,
    zoneOf: [
      { zone: 'South', area: /south goa|colva|benaulim|sernabatim|betalbatim|varca|cavelossim|majorda|margao|palolem|agonda|canacona|utorda|mobor/i },
      { zone: 'North', area: /north goa|calangute|baga|candolim|anjuna|vagator|arpora|sinquerim|morjim|mandrem|arambol|assagao|siolim/i },
      { zone: 'Panaji', area: /panaji|panjim|miramar|dona paula|old goa|ribandar|fontainhas/i }
    ],
    defaultZone: 'Panaji',
    driveH: {
      South: { South: 0.5, Panaji: 1, North: 1.75, Ponda: 1, Dudhsagar: 2 },
      Panaji: { South: 1, Panaji: 0.25, North: 0.5, Ponda: 0.75, Dudhsagar: 1.75 },
      North: { South: 1.75, Panaji: 0.5, North: 0.25, Ponda: 1.25, Dudhsagar: 2.25 }
    },
    days: [
      {
        zone: 'South', title: 'South Goa: Cabo de Rama Fort & Palolem Beach',
        stops: [
          s('Cabo de Rama Fort', 'Morning', 'Old clifftop fort with sea views; go early before the heat', 'Cabo de Rama Fort, Canacona, Goa'),
          s('Palolem Beach', 'Afternoon', 'Calm crescent beach, lunch at a beach shack, safe shallow swim', 'Palolem Beach, Canacona, Goa'),
          s('Colva Beach', 'Evening', 'Sunset walk on the long sandy beach near your stay', 'Colva Beach, Goa')
        ]
      },
      {
        zone: 'Panaji', title: 'Old Goa churches & Panaji',
        stops: [
          s('Basilica of Bom Jesus', 'Morning', 'UNESCO-listed 16th-century church; free entry, dress modestly', 'Basilica of Bom Jesus, Old Goa'),
          s('Se Cathedral', 'Morning', 'Across the road from the Basilica — one of Asia\'s largest churches', 'Se Cathedral, Old Goa'),
          s('Fontainhas', 'Afternoon', 'Colourful Latin Quarter lanes of Panaji, easy walk and cafés', 'Fontainhas, Panaji, Goa'),
          s('Mandovi river cruise', 'Evening', 'One-hour sunset cruise with Goan music (from Santa Monica Jetty)', 'Santa Monica Jetty, Panaji, Goa')
        ]
      },
      {
        zone: 'Ponda', title: 'Spice farm & Margao market',
        stops: [
          s('Sahakari Spice Farm', 'Morning', 'Guided walk through spice gardens, Goan lunch on a banana leaf', 'Sahakari Spice Farm, Ponda, Goa'),
          s('Margao Municipal Market', 'Afternoon', 'Local market for cashews, spices and Goan sweets', 'Margao Municipal Market, Margao, Goa'),
          s('Benaulim Beach', 'Evening', 'Quiet beach for sunset, fresh seafood nearby', 'Benaulim Beach, Goa')
        ]
      },
      {
        zone: 'North', title: 'North Goa: Fort Aguada & the beaches',
        stops: [
          s('Fort Aguada', 'Morning', '17th-century Portuguese fort and lighthouse above the sea', 'Fort Aguada, Candolim, Goa'),
          s('Candolim Beach', 'Afternoon', 'Wide, calmer beach for a swim and lunch', 'Candolim Beach, Goa'),
          s('Baga Beach', 'Evening', 'Lively beach for sunset and dinner at a shack', 'Baga Beach, Goa')
        ]
      },
      {
        zone: 'North', title: 'Chapora Fort, Vagator & Anjuna',
        stops: [
          s('Chapora Fort', 'Morning', 'Short climb to fort ruins with views over Vagator', 'Chapora Fort, Goa'),
          s('Vagator Beach', 'Afternoon', 'Red cliffs and a smaller beach', 'Vagator Beach, Goa'),
          s('Anjuna Beach', 'Evening', 'Sunset; the flea market here runs on Wednesdays only', 'Anjuna Beach, Goa')
        ],
        note: 'Anjuna Flea Market is on Wednesdays (roughly November to April).'
      },
      {
        zone: 'Dudhsagar', title: 'Dudhsagar Falls (full day)', fullDay: true,
        stops: [
          s('Dudhsagar Falls', 'Morning', 'Shared forest-department jeep from Collem to the 310 m falls', 'Dudhsagar Falls, Goa'),
          s('Collem jeep counter', 'Afternoon', 'Jeep back to Collem, late lunch, drive back', 'Collem, Goa')
        ],
        note: 'Jeep safaris run after the monsoon (roughly October to May); closed in heavy rain.'
      }
    ]
  },
  {
    match: /\bcoorg\b|kodagu|madikeri/i,
    zoneOf: [
      { zone: 'Madikeri', area: /madikeri|mercara|galibeedu|abbey/i },
      { zone: 'Kushalnagar', area: /kushalnagar|bylakuppe|dubare|siddapur/i },
      { zone: 'Virajpet', area: /virajpet|gonikoppal|pollibetta/i }
    ],
    defaultZone: 'Madikeri',
    driveH: {
      Madikeri: { Madikeri: 0.25, Kushalnagar: 0.75, Bhagamandala: 1, Virajpet: 0.75 },
      Kushalnagar: { Madikeri: 0.75, Kushalnagar: 0.25, Bhagamandala: 1.5, Virajpet: 1 },
      Virajpet: { Madikeri: 0.75, Kushalnagar: 1, Bhagamandala: 1.25, Virajpet: 0.25 }
    },
    days: [
      {
        zone: 'Madikeri', title: 'Abbey Falls, Madikeri Fort & Raja\'s Seat',
        stops: [
          s('Abbey Falls', 'Morning', 'Short walk down through coffee estates to the falls', 'Abbey Falls, Madikeri'),
          s('Madikeri Fort', 'Afternoon', 'Old fort and small museum in town', 'Madikeri Fort, Madikeri'),
          s('Raja\'s Seat', 'Evening', 'Garden viewpoint for sunset over the hills', 'Raja\'s Seat, Madikeri')
        ]
      },
      {
        zone: 'Kushalnagar', title: 'Dubare elephants & the Golden Temple',
        stops: [
          s('Dubare Elephant Camp', 'Morning', 'Watch elephants bathe in the river (go by 9 AM)', 'Dubare Elephant Camp, Kodagu'),
          s('Namdroling Monastery', 'Afternoon', 'The "Golden Temple" Tibetan monastery at Bylakuppe', 'Namdroling Monastery, Bylakuppe'),
          s('Nisargadhama', 'Evening', 'Bamboo-forest island park on the Kaveri', 'Nisargadhama, Kushalnagar')
        ]
      },
      {
        zone: 'Bhagamandala', title: 'Talakaveri & Bhagamandala',
        stops: [
          s('Bhagamandala Temple', 'Morning', 'Temple at the meeting of three rivers', 'Bhagamandala Temple, Kodagu'),
          s('Talakaveri', 'Afternoon', 'Source of the Kaveri, high on the Brahmagiri hills', 'Talakaveri, Kodagu')
        ]
      }
    ]
  },
  {
    match: /^(munnar|kerala)$/i,
    zoneOf: [{ zone: 'Munnar', area: /.*/ }],
    defaultZone: 'Munnar',
    driveH: { Munnar: { Munnar: 0.5, Mattupetty: 0.5, TopStation: 1.25 } },
    days: [
      {
        zone: 'Munnar', title: 'Eravikulam National Park & the Tea Museum',
        stops: [
          s('Eravikulam National Park', 'Morning', 'Park bus up to see Nilgiri tahr; book tickets online', 'Eravikulam National Park, Munnar'),
          s('Tata Tea Museum', 'Afternoon', 'How tea is made, with a tasting', 'Tata Tea Museum, Munnar'),
          s('Pothamedu View Point', 'Evening', 'Sunset over tea gardens', 'Pothamedu View Point, Munnar')
        ],
        note: 'Eravikulam usually closes for the Nilgiri tahr calving season (about February–March).'
      },
      {
        zone: 'Mattupetty', title: 'Mattupetty Dam & Echo Point',
        stops: [
          s('Mattupetty Dam', 'Morning', 'Lake with pedal and speed boats', 'Mattupetty Dam, Munnar'),
          s('Echo Point', 'Afternoon', 'Lakeside viewpoint', 'Echo Point, Munnar'),
          s('Attukal Waterfalls', 'Evening', 'Easy waterfall stop on the way back', 'Attukal Waterfalls, Munnar')
        ]
      },
      {
        zone: 'TopStation', title: 'Top Station viewpoint', fullDay: true,
        stops: [
          s('Top Station', 'Morning', 'Highest viewpoint in Munnar, over the Western Ghats', 'Top Station, Munnar'),
          s('Kundala Lake', 'Afternoon', 'Boating on a quiet lake on the way back', 'Kundala Lake, Munnar')
        ]
      }
    ]
  },
  {
    match: /mysuru|mysore/i,
    zoneOf: [{ zone: 'City', area: /.*/ }],
    defaultZone: 'City',
    driveH: { City: { City: 0.25, Chamundi: 0.5, KRS: 0.75, Srirangapatna: 0.5 } },
    days: [
      {
        zone: 'City', title: 'Mysore Palace & Devaraja Market',
        stops: [
          s('Mysore Palace', 'Morning', 'The palace interiors; audio guide available', 'Mysore Palace, Mysuru'),
          s('Devaraja Market', 'Afternoon', 'Flowers, sandalwood, Mysore Pak', 'Devaraja Market, Mysuru'),
          s('St. Philomena\'s Cathedral', 'Evening', 'Neo-Gothic cathedral, lit up in the evening', 'St. Philomena\'s Cathedral, Mysuru')
        ],
        note: 'The palace is lit with about 100,000 bulbs on Sundays and holidays, 7:00–7:45 PM.'
      },
      {
        zone: 'Chamundi', title: 'Chamundi Hills & Jaganmohan Palace',
        stops: [
          s('Chamundeshwari Temple', 'Morning', 'Hilltop temple with city views; Nandi statue on the way', 'Chamundeshwari Temple, Mysuru'),
          s('Jaganmohan Palace', 'Afternoon', 'Art gallery with Raja Ravi Varma paintings', 'Jaganmohan Palace, Mysuru')
        ]
      },
      {
        zone: 'Srirangapatna', title: 'Srirangapatna & Brindavan Gardens',
        stops: [
          s('Ranganathittu Bird Sanctuary', 'Morning', 'Boat ride past nesting birds and crocodiles', 'Ranganathittu Bird Sanctuary'),
          s('Tipu Sultan\'s Summer Palace', 'Afternoon', 'Teak-wood summer palace at Srirangapatna', 'Tipu Sultan Summer Palace, Srirangapatna'),
          s('Brindavan Gardens', 'Evening', 'Terraced gardens with the evening musical fountain', 'Brindavan Gardens, KRS')
        ]
      }
    ]
  }
];

function placesFor(destination: string): DestinationPlaces | undefined {
  // Match the place itself ("Alleppey, Kerala" is Alleppey, not Munnar)
  const name = (destination || '').split(',')[0].trim();
  return PLACES.find((p) => p.match.test(name));
}

/** The stay's zone, e.g. "South" for Sernabatim Beach, South Goa */
export function stayZone(destination: string, stayArea: string): string | null {
  const d = placesFor(destination);
  if (!d) return null;
  return (d.zoneOf.find((z) => z.area.test(stayArea)) || { zone: d.defaultZone }).zone;
}

export interface PlannedDay extends DayTemplate {
  /** one-way drive from the stay, hours */
  driveFromStayH: number;
}

/**
 * The best `count` days for a stay: days in the stay's own area first, then the nearest,
 * long full-day trips last. Returns null when we have no curated places for this destination.
 */
export function curatedDays(destination: string, stayArea: string, count: number): PlannedDay[] | null {
  const d = placesFor(destination);
  if (!d || count <= 0) return null;
  const zone = stayZone(destination, stayArea) || d.defaultZone;
  const drive = (z: string) => d.driveH[zone]?.[z] ?? d.driveH[d.defaultZone]?.[z] ?? 1;
  const ranked = d.days
    .map((t, i) => ({ ...t, driveFromStayH: drive(t.zone), i }))
    .sort((a, b) => Number(Boolean(a.fullDay)) - Number(Boolean(b.fullDay)) || a.driveFromStayH - b.driveFromStayH || a.i - b.i);
  return ranked.slice(0, count).map(({ i, ...rest }) => rest);
}

export function driveText(h: number): string {
  if (h <= 0.34) return 'about 15–20 min from your stay';
  const mins = Math.round(h * 60);
  if (mins < 60) return `about ${mins} min from your stay`;
  const hh = Math.floor(mins / 60), mm = mins % 60;
  return `about ${hh}h${mm ? ` ${mm}m` : ''} each way from your stay`;
}

/** One day of the plan built from real places (used when planning and when the stay changes). */
export function curatedDayItem(
  t: PlannedDay,
  dayNum: number,
  stay: { name: string; area: string },
  dining: [string, string],
  gentle: boolean
): ActivityDayItem {
  const line = (slot: Slot) => t.stops.filter((x) => x.slot === slot).map((x) => `${x.name}: ${x.what}.`).join(' ');
  const morning = line('Morning') || `Easy morning near ${stay.area}.`;
  const afternoon = gentle && !t.fullDay
    ? `${line('Afternoon') || 'Rest at your stay.'} Take a break at your stay in the heat of the day if you need it.`
    : (line('Afternoon') || 'Rest at your stay.');
  const evening = `${line('Evening') ? line('Evening') + ' ' : ''}Dinner at ${dining[0]}.`;
  return {
    day: dayNum,
    dateStr: `Day ${dayNum}`,
    title: t.title,
    theme: t.fullDay ? 'Full day out' : t.zone,
    morning: t.fullDay ? `Leave early (${driveText(t.driveFromStayH)}). ${morning}` : morning,
    afternoon,
    evening,
    estimatedCostINR: 1000,
    estimatedCostUSD: 12,
    localDining: dining,
    transitTip: `Cab for the day: ${driveText(t.driveFromStayH)}, short hops between stops.`,
    walkingLevel: gentle ? 'light' : 'moderate',
    stopDriveTimes: [{ from: stay.name, to: t.stops[0].name, driveMinutes: Math.round(t.driveFromStayH * 60), note: driveText(t.driveFromStayH) }],
    stops: t.stops.map((x) => ({ name: x.name, slot: x.slot, mapQuery: x.mapQuery })),
    dayNote: t.note
  };
}
