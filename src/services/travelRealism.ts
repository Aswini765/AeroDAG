/**
 * AeroDAG — India travel realism
 *
 * One place for the rules that make a total believable to someone who travels in India:
 * - how many hotel rooms a group really needs
 * - what a return flight on a route really costs (distance-based, small airports cost more)
 * - when people actually go by road, overnight bus or train instead of flying
 * - which places need a permit (Inner Line Permit etc.)
 *
 * Numbers are planning estimates for economy travel booked 2–4 weeks ahead (2026 levels),
 * not live fares. Every plan still labels them "Estimate" / "AI estimate".
 */

/** Approximate airport coordinates [lat, lon] for the codes AeroDAG uses. */
export const AIRPORT_COORDS: Record<string, [number, number]> = {
  AGX: [10.82, 72.18], AMD: [23.07, 72.63], ATQ: [31.71, 74.80], BBI: [20.24, 85.82],
  BDQ: [22.33, 73.22], BHJ: [23.29, 69.67], BHO: [23.29, 77.34], BLR: [13.20, 77.71],
  BOM: [19.09, 72.87], CCJ: [11.14, 75.95], CCU: [22.65, 88.45], CJB: [11.03, 77.04],
  CNN: [11.92, 75.55], COK: [10.15, 76.40], DED: [30.19, 78.18], DEL: [28.56, 77.10],
  DHM: [32.17, 76.26], GAU: [26.11, 91.59], GOI: [15.38, 73.83], GOX: [15.74, 73.86],
  GWL: [26.29, 78.23], HJR: [24.82, 79.92], HYD: [17.24, 78.43], IDR: [22.72, 75.80],
  IXB: [26.68, 88.33], IXC: [30.67, 76.79], IXE: [12.96, 74.89], IXL: [34.14, 77.55],
  IXM: [9.83, 78.09], IXR: [23.31, 85.32], IXZ: [11.64, 92.73], JAI: [26.82, 75.81],
  JDH: [26.25, 73.05], JRH: [26.73, 94.18], JSA: [26.89, 70.86], KUU: [31.88, 77.15],
  LKO: [26.76, 80.89], MAA: [12.99, 80.17], MYQ: [12.23, 76.66], NAG: [21.09, 79.05],
  PAT: [25.59, 85.09], PGH: [29.03, 79.47], PNQ: [18.58, 73.92], RPR: [21.18, 81.74],
  STV: [21.11, 72.74], SXR: [33.99, 74.77], TEZ: [26.71, 92.78], TIR: [13.63, 79.54],
  TRV: [8.48, 76.92], TRZ: [10.77, 78.71], UDR: [24.62, 73.90], VDY: [15.17, 76.63],
  VGA: [16.53, 80.80], VNS: [25.45, 82.86], VTZ: [17.72, 83.22], IXA: [23.89, 91.24],
  IMF: [24.76, 93.90], DIB: [27.48, 95.02], SHL: [25.70, 91.98], AJL: [23.84, 92.62],
  DMU: [25.88, 93.77], IXI: [27.29, 94.10], HGI: [26.97, 93.64], ZER: [27.59, 93.83],
  PYG: [27.23, 88.59], IXU: [19.86, 75.40], HBX: [15.36, 75.08], IXG: [15.86, 74.62],
  RAJ: [22.31, 70.78], IXD: [25.44, 81.73], GOP: [26.74, 83.45], AYJ: [26.75, 82.15],
  IXJ: [32.69, 74.84], TCR: [8.72, 78.03], PNY: [11.97, 79.81], KQH: [26.60, 74.81],
  JLR: [23.18, 80.05]
};

/** Town centres people visit that have no airport of their own (approximate). */
export const PLACE_COORDS: Record<string, [number, number]> = {
  ziro: [27.55, 93.83], tawang: [27.59, 91.86], dirang: [27.36, 92.24], rishikesh: [30.09, 78.27],
  haridwar: [29.95, 78.16], mussoorie: [30.46, 78.07], nainital: [29.38, 79.46], manali: [32.24, 77.19],
  kasol: [32.01, 77.31], shimla: [31.10, 77.17], dharamshala: [32.22, 76.32], mcleodganj: [32.24, 76.32],
  spiti: [32.25, 78.03], kaza: [32.23, 78.07], darjeeling: [27.04, 88.26], gangtok: [27.33, 88.61],
  pelling: [27.30, 88.24], lachung: [27.69, 88.74], shillong: [25.57, 91.88], cherrapunji: [25.28, 91.72],
  dawki: [25.18, 92.02], munnar: [10.09, 77.06], alleppey: [9.49, 76.33], wayanad: [11.69, 76.08],
  varkala: [8.73, 76.72], ooty: [11.41, 76.70], kodaikanal: [10.24, 77.49], coorg: [12.42, 75.74],
  madikeri: [12.42, 75.74], chikmagalur: [13.32, 75.77], hampi: [15.33, 76.46], gokarna: [14.55, 74.32],
  pondicherry: [11.93, 79.83], mahabalipuram: [12.62, 80.19], rameswaram: [9.29, 79.31], kanyakumari: [8.08, 77.54],
  'mount abu': [24.59, 72.71], pushkar: [26.49, 74.55], ranthambore: [26.02, 76.50], kumbhalgarh: [25.15, 73.59],
  bundi: [25.44, 75.64], lonavala: [18.75, 73.41], mahabaleshwar: [17.92, 73.66], puri: [19.81, 85.83],
  kaziranga: [26.58, 93.17], majuli: [26.95, 94.17], pahalgam: [34.01, 75.32], gulmarg: [34.05, 74.38],
  nubra: [34.60, 77.55], pangong: [33.75, 78.66], havelock: [11.97, 92.99], orchha: [25.35, 78.64],
  'rann of kutch': [23.73, 69.86], agra: [27.18, 78.01], 'kabini': [11.94, 76.35],
  // Cities people name as the destination (their airports are listed above, but a plan may not carry the code)
  mysuru: [12.30, 76.64], mysore: [12.30, 76.64], udaipur: [24.58, 73.71], jaipur: [26.91, 75.79],
  jodhpur: [26.24, 73.02], jaisalmer: [26.92, 70.91], varanasi: [25.32, 83.01], amritsar: [31.63, 74.87],
  kochi: [9.93, 76.27], cochin: [9.93, 76.27], goa: [15.30, 74.12], leh: [34.15, 77.58], srinagar: [34.08, 74.80],
  madurai: [9.93, 78.12], tirupati: [13.63, 79.42], khajuraho: [24.85, 79.93], kolkata: [22.57, 88.36],
  hyderabad: [17.39, 78.49], chennai: [13.08, 80.27], mumbai: [19.08, 72.88], delhi: [28.61, 77.21],
  bengaluru: [12.97, 77.59], bangalore: [12.97, 77.59], pune: [18.52, 73.86], ahmedabad: [23.03, 72.58]
};

/** Coordinates for a place: its own town centre if we know it, else its airport. */
export function coordsFor(place?: string | null, airportCode?: string | null): [number, number] | null {
  const key = (place || '').toLowerCase().replace(/,.*$/, '').trim();
  if (PLACE_COORDS[key]) return PLACE_COORDS[key];
  const hit = Object.keys(PLACE_COORDS).find((k) => key.includes(k));
  if (hit) return PLACE_COORDS[hit];
  return AIRPORT_COORDS[(airportCode || '').toUpperCase()] || null;
}

/** Small or seasonal airports: fewer flights, higher fares. */
const REGIONAL_AIRPORTS = new Set([
  'KUU', 'DHM', 'TEZ', 'JSA', 'SHL', 'ZER', 'IXI', 'HGI', 'PYG', 'AGX', 'HJR', 'PGH',
  'BHJ', 'IXL', 'DIB', 'JRH', 'DMU', 'AJL', 'IMF', 'MYQ', 'VDY', 'CNN', 'KQH', 'JLR', 'TCR'
]);

/** States where roads are mountain roads: longer and slower than the straight line suggests. */
const HILL_STATES = /himachal|uttarakhand|jammu|kashmir|ladakh|sikkim|arunachal|meghalaya|nagaland|mizoram|manipur|darjeeling/i;

export function distanceKm(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
}

export function airportDistanceKm(fromCode?: string | null, toCode?: string | null): number | null {
  const a = AIRPORT_COORDS[(fromCode || '').toUpperCase()];
  const b = AIRPORT_COORDS[(toCode || '').toUpperCase()];
  if (!a || !b) return null;
  return distanceKm(a, b);
}

/**
 * Realistic return economy fare per person for a domestic route.
 * Anchors: BLR–GOI ≈ ₹6,000 · DEL–BOM ≈ ₹9,500 · BLR–DED ≈ ₹12,500; small airports +30%.
 * Never below ₹6,000 return — that is about the floor for any domestic return booked ahead.
 */
export function realisticReturnFarePerPerson(fromCode?: string | null, toCode?: string | null): number {
  const km = airportDistanceKm(fromCode, toCode);
  const base = km === null ? 9000 : 3500 + 5.2 * km;
  const regional = REGIONAL_AIRPORTS.has((toCode || '').toUpperCase()) || REGIONAL_AIRPORTS.has((fromCode || '').toUpperCase());
  const fare = Math.max(6000, base * (regional ? 1.3 : 1));
  return Math.round(fare / 100) * 100;
}

export type GroundMode = 'cab' | 'tempo' | 'bus' | 'train';

export interface GroundOption {
  mode: GroundMode;
  /** "Overnight AC Volvo bus" */
  label: string;
  /** Return, whole group */
  totalINR: number;
  perPersonReturnINR: number;
  /** One way, door to door, rounded */
  hours: number;
  roadKm: number;
}

export interface RouteRealism {
  straightKm: number;
  roadKm: number;
  roadHours: number;
  isHills: boolean;
  /** How most people actually make this trip, for this party size */
  balancedMode: 'flight' | GroundMode;
  /** Cheapest sensible way */
  budget: GroundOption;
  /** Comfortable door-to-door road option (cab or tempo traveller) */
  road: GroundOption;
}

/**
 * How people really travel a route.
 * - Up to ~450 km by road: drive (cab for up to 4, tempo traveller for 5+), or bus/train for 1–2 people.
 * - Groups of 5+ go by tempo traveller up to ~700 km (Delhi → Manali is the classic case).
 * - Further than that: fly; the budget way is an overnight bus (≤1,000 km) or train.
 */
export function getRouteRealism(params: {
  fromCoords: [number, number] | null;
  toCoords: [number, number] | null;
  destinationState?: string;
  travellers: number;
  hasAirport: boolean;
}): RouteRealism | null {
  const { fromCoords, toCoords, travellers, hasAirport } = params;
  if (!fromCoords || !toCoords) return null;
  const isHills = HILL_STATES.test(params.destinationState || '');
  const straightKm = distanceKm(fromCoords, toCoords);
  const roadKm = Math.round(straightKm * (isHills ? 1.45 : 1.3));
  const roadHours = Math.max(1, Math.round(roadKm / (isHills ? 42 : 55)));
  const pax = Math.max(1, travellers);

  const tripDays = 2; // there and back
  const cabTotal = Math.round(roadKm * 2 * 15 + tripDays * 500); // sedan / SUV for up to 4
  const tempoTotal = Math.round(roadKm * 2 * 26 + tripDays * 700); // 12-seater tempo traveller
  const road: GroundOption = pax >= 5
    ? { mode: 'tempo', label: 'Tempo traveller (12-seater) there and back', totalINR: tempoTotal, perPersonReturnINR: Math.round(tempoTotal / pax), hours: roadHours, roadKm }
    : { mode: 'cab', label: 'Private cab there and back', totalINR: cabTotal, perPersonReturnINR: Math.round(cabTotal / pax), hours: roadHours, roadKm };

  const useBus = roadKm <= 1000 || isHills;
  const perPersonOneWay = useBus
    ? Math.max(600, Math.round(roadKm * 2))          // AC sleeper / Volvo
    : Math.max(700, Math.round(straightKm * 1.25 * 1.3)); // 3AC
  const budget: GroundOption = useBus
    ? { mode: 'bus', label: roadHours >= 7 ? 'Overnight AC sleeper / Volvo bus' : 'AC bus', totalINR: perPersonOneWay * 2 * pax, perPersonReturnINR: perPersonOneWay * 2, hours: roadHours, roadKm }
    : { mode: 'train', label: 'Train (3AC sleeper)', totalINR: perPersonOneWay * 2 * pax, perPersonReturnINR: perPersonOneWay * 2, hours: Math.round(straightKm * 1.25 / 55), roadKm };

  let balancedMode: RouteRealism['balancedMode'] = 'flight';
  // No airport and far away: we can't name a sensible route, so the plan says "check the best route"
  if (!hasAirport) balancedMode = roadKm <= 900 ? (pax >= 3 ? road.mode : budget.mode) : 'flight';
  else if (roadKm <= 450) balancedMode = pax >= 3 ? road.mode : budget.mode;
  else if (pax >= 5 && roadKm <= 700) balancedMode = 'tempo';

  return { straightKm, roadKm, roadHours, isHills, balancedMode, budget, road };
}

/**
 * Rooms a group really books. Two adults per room; groups of 5+ adults usually take
 * triple sharing (extra bed). Up to two children share with their parents.
 */
export function roomsNeeded(adults: number, children: number, seniors: number, roomCapacity?: number): number {
  const grownUps = Math.max(1, adults + seniors);
  const perRoom = grownUps >= 5 ? 3 : 2;
  const byAdults = Math.ceil(grownUps / perRoom);
  const byHeads = Math.ceil((grownUps + Math.max(0, children)) / Math.max(4, roomCapacity || 0));
  return Math.max(1, byAdults, byHeads);
}

/** Permits Indian travellers need (and often forget). */
const PERMITS: { pattern: RegExp; text: string }[] = [
  { pattern: /\b(arunachal|tawang|ziro|dirang|bomdila|mechuka|namdapha|itanagar)\b/i, text: 'Inner Line Permit (ILP) needed for Arunachal Pradesh — apply online at arunachalilp.com before you go.' },
  { pattern: /\b(nagaland|kohima|dzukou|longwa|mon district)\b/i, text: 'Inner Line Permit (ILP) needed for Nagaland — apply online at ilp.nagaland.gov.in.' },
  { pattern: /\b(mizoram|aizawl)\b/i, text: 'Inner Line Permit (ILP) needed for Mizoram — apply online before travel.' },
  { pattern: /\b(manipur|imphal|loktak)\b/i, text: 'Inner Line Permit (ILP) needed for Manipur — apply online before travel.' },
  { pattern: /\b(lachung|lachen|gurudongmar|yumthang|nathu ?la|tsomgo|changu|zuluk|north sikkim)\b/i, text: 'Protected Area Permit needed for North and East Sikkim — your tour operator or hotel arranges it in Gangtok (carry ID and photos).' },
  { pattern: /\b(nubra|pangong|tso moriri|hanle|turtuk)\b/i, text: 'Inner Line Permit needed for Nubra, Pangong and other Ladakh areas — get it online (LAHDC portal) or in Leh.' },
  { pattern: /\b(lakshadweep|agatti|bangaram)\b/i, text: 'Entry permit needed for Lakshadweep — arranged through the Lakshadweep administration or your package.' }
];

export function permitNotes(...placeTexts: (string | undefined | null)[]): string[] {
  const text = placeTexts.filter(Boolean).join(' ');
  return PERMITS.filter((p) => p.pattern.test(text)).map((p) => p.text);
}
