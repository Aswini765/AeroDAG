/**
 * Every way to get from the traveller's city to the destination — worked out for THEIR
 * starting city, never borrowed from another city's data.
 *
 * Checked routes (schedules and fares looked up, Nov 2026) are labelled "Checked";
 * everything else is labelled "Estimate" with how it was worked out.
 *
 *  ✈️ Flight    — checked non-stop flights where we have them; else time from distance
 *  🚆 Train     — checked trains (17309 Bengaluru–Goa, 18047 Kolkata–Goa) with real class fares;
 *                 else an estimate from the distance using the same per-km rates
 *  🚌 Bus       — overnight AC sleeper, only where the road is ≤ 1,000 km
 *  🚗 Own car   — fuel (km ÷ mileage × price) + tolls + a hotel night for each stop on the way
 *  🚕 Cab       — private cab with driver, only up to ~900 km
 *
 * All prices are "there and back" for the whole group, so they add straight into the total.
 */
import { TripPlan, FlightItem, TrainItem, TransferItem } from '../types/travelBooking';
import { AIRPORT_COORDS, coordsFor, distanceKm, realisticReturnFarePerPerson } from './travelRealism';
import { originCodeFor } from './originCities';

export type TravelMode = 'flight' | 'train' | 'bus' | 'selfdrive' | 'cab';

export interface TrainClassFare { code: 'SL' | '3A' | '2A'; name: string; fareINR: number }

export interface TravelOption {
  /** stable key, saved in plan.userChoices.travelKey */
  key: string;
  mode: TravelMode;
  title: string;
  /** "IndiGo 6E 634 · non-stop", "Amaravati Express (18047)" */
  detail: string;
  /** one way, on board / at the wheel */
  oneWayHours: number;
  /** extra one-way time getting to/from airports or stations */
  overheadHours: number;
  /** nights spent on the road each way (long drives) */
  haltNightsEachWay: number;
  /** return, whole group, before local cabs */
  travelCostINR: number;
  /** how the price is made, in plain words */
  howPriced: string[];
  checked: boolean;
  sourceNote: string;
  schedule?: { departs: string; arrives: string; arrivesDayOffset: number; runsOn?: number[] /* 0=Sun */ };
  /** the checked train back home (trains only) */
  returnSchedule?: ReturnTrain;
  /** for trains: the classes to pick from (fares one way, per person) */
  classes?: TrainClassFare[];
  /** km by road (for road modes) */
  roadKm?: number;
  /** trains to places with no station: the cab from the nearest station (both ways, whole group) */
  lastLeg?: { station: string; km: number; cabINR: number };
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

// ---------- checked data ----------

interface CheckedTrain {
  from: RegExp; to: RegExp; number: string; name: string; fromStation: string; toStation: string;
  departs: string; arrives: string; arrivesDayOffset: number; hours: number; km: number; runsOn?: number[];
  fares: TrainClassFare[]; note: string;
  /** the train back home */
  ret: ReturnTrain;
}
export interface ReturnTrain { number: string; name: string; departs: string; arrives: string; arrivesDayOffset: number; runsOn?: number[] }
const CHECKED_TRAINS: CheckedTrain[] = [
  {
    from: /bengaluru|bangalore|\bBLR\b|yesvantpur/i, to: /goa/i,
    number: '17309', name: 'Yesvantpur – Vasco da Gama Express', fromStation: 'Yesvantpur Jn (YPR)', toStation: 'Vasco da Gama (VSG)',
    departs: '15:00', arrives: '05:15', arrivesDayOffset: 1, hours: 14.25, km: 664,
    fares: [{ code: 'SL', name: 'Sleeper', fareINR: 365 }, { code: '3A', name: 'AC 3-tier', fareINR: 1000 }, { code: '2A', name: 'AC 2-tier', fareINR: 1440 }],
    note: 'Runs daily. Timetable and fares checked on ixigo / Wikipedia, Nov 2026.',
    ret: { number: '17310', name: 'Vasco da Gama – Yesvantpur Express', departs: '22:55', arrives: '12:35', arrivesDayOffset: 1 }
  },
  {
    from: /kolkata|calcutta|howrah|shalimar|\bCCU\b/i, to: /goa/i,
    number: '18047', name: 'Amaravati Express', fromStation: 'Shalimar, Kolkata (SHM)', toStation: 'Vasco da Gama (VSG)',
    departs: '23:10', arrives: '16:10', arrivesDayOffset: 2, hours: 41, km: 2157, runsOn: [1, 2, 4, 6],
    fares: [{ code: 'SL', name: 'Sleeper', fareINR: 745 }, { code: '3A', name: 'AC 3-tier', fareINR: 1990 }, { code: '2A', name: 'AC 2-tier', fareINR: 2940 }],
    note: 'Runs Mon, Tue, Thu, Sat from Shalimar. Timetable and fares checked on erail / ixigo, Nov 2026.',
    ret: { number: '18048', name: 'Amaravati Express', departs: '06:30', arrives: '23:45', arrivesDayOffset: 1, runsOn: [0, 2, 4, 5] }
  }
];

interface CheckedFlight {
  from: string; to: RegExp; airline: string; code: string; number: string; departs: string; arrives: string; hours: number; note: string;
}
const CHECKED_FLIGHTS: CheckedFlight[] = [
  { from: 'CCU', to: /goa/i, airline: 'IndiGo', code: '6E', number: '6E 634', departs: '12:05', arrives: '14:45', hours: 2 + 40 / 60, note: 'The only non-stop, daily (flightmapper, Nov 2026).' }
];

/** Road distances checked against route guides (Nov 2026) */
const CHECKED_ROADS: { from: RegExp; to: RegExp; km: number; hours: number; note: string }[] = [
  { from: /bengaluru|bangalore|\bBLR\b/i, to: /goa/i, km: 560, hours: 10.5, note: 'NH48 via Hubballi, ~560 km (Savaari, Tejas Travels)' },
  { from: /kolkata|calcutta|\bCCU\b/i, to: /goa/i, km: 2060, hours: 30, note: 'About 2,050–2,130 km (rome2rio, Holidify)' },
  { from: /bengaluru|bangalore|\bBLR\b/i, to: /coorg|madikeri|kodagu/i, km: 265, hours: 5.5, note: 'Via Mysuru (NH275), ~250–270 km, 5–6 h (Tejas Travels, tourtravelworld)' }
];

/** Fuel prices checked (Nov 2026); other cities use the national figure, labelled */
export const FUEL_PRICES: { city: RegExp; name: string; petrol: number; diesel: number; checked: boolean }[] = [
  { city: /kolkata|calcutta|\bCCU\b/i, name: 'Kolkata', petrol: 113.51, diesel: 99.82, checked: true },
  { city: /delhi|\bDEL\b/i, name: 'Delhi', petrol: 102.12, diesel: 95.20, checked: true },
  { city: /mumbai|bombay|\bBOM\b/i, name: 'Mumbai', petrol: 111.21, diesel: 97.83, checked: true }
];
export function fuelPriceFor(origin: string): { petrol: number; diesel: number; checked: boolean; name: string } {
  const hit = FUEL_PRICES.find((f) => f.city.test(origin));
  return hit || { petrol: 108, diesel: 98, checked: false, name: 'India (approx.)' };
}

/** Car tolls on national highways, per km (estimate; plazas charge ~₹1.5–2.5/km for cars) */
export const TOLL_PER_KM = 1.7;
/** A budget hotel room for a night on the way (estimate) */
export const HALT_ROOM_INR = 2000;
/** Hours you can sensibly drive in a day */
export const DRIVE_HOURS_PER_DAY = 11;

// ---------- helpers ----------

/** Per-km class fares fitted to the checked trains (664 km and 2,157 km) */
export function estimateTrainFares(railKm: number): TrainClassFare[] {
  return [
    { code: 'SL', name: 'Sleeper', fareINR: Math.round((196 + 0.2545 * railKm) / 5) * 5 },
    { code: '3A', name: 'AC 3-tier', fareINR: Math.round((560 + 0.663 * railKm) / 5) * 5 },
    { code: '2A', name: 'AC 2-tier', fareINR: Math.round((773 + 1.005 * railKm) / 5) * 5 }
  ];
}

/** "08:30 AM" → "08:30", "02:15 PM" → "14:15" */
function to24(t?: string): string | null {
  const m = (t || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  if (m[3]) { const pm = /pm/i.test(m[3]); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

function hm(h: number): string {
  const whole = Math.floor(h);
  const m = Math.round((h - whole) * 60);
  return m ? `${whole}h ${String(m).padStart(2, '0')}m` : `${whole}h`;
}

export interface RouteGeometry {
  originName: string;
  destName: string;
  originCode: string | null;
  destCode: string | null;
  airKm: number | null;
  roadKm: number | null;
  roadHours: number | null;
  roadChecked: boolean;
  roadNote: string;
}

export function routeGeometry(plan: TripPlan): RouteGeometry {
  const originName = plan.origin.replace(/\s*\([^)]*\)/, '').trim();
  const destName = plan.destination.replace(/,.*$/, '').trim();
  const originCode = originCodeFor(plan.origin);
  const destCode = plan.flight?.destinationCode || plan.availableFlights?.[0]?.destinationCode || null;
  const a = coordsFor(plan.origin, originCode);
  const b = coordsFor(plan.destination, destCode);
  const airKm = originCode && destCode && AIRPORT_COORDS[originCode] && AIRPORT_COORDS[destCode]
    ? distanceKm(AIRPORT_COORDS[originCode], AIRPORT_COORDS[destCode])
    : a && b ? distanceKm(a, b) : null;
  const checked = CHECKED_ROADS.find((r) => r.from.test(plan.origin) && r.to.test(plan.destination));
  if (checked) return { originName, destName, originCode, destCode, airKm, roadKm: checked.km, roadHours: checked.hours, roadChecked: true, roadNote: checked.note };
  if (!a || !b) return { originName, destName, originCode, destCode, airKm, roadKm: null, roadHours: null, roadChecked: false, roadNote: '' };
  const hills = /himachal|uttarakhand|sikkim|darjeeling|ladakh|kashmir|meghalaya|arunachal|ooty|munnar|kodaikanal|coorg|manali|shimla/i.test(plan.destination);
  const roadKm = Math.round(distanceKm(a, b) * (hills ? 1.45 : 1.3));
  return { originName, destName, originCode, destCode, airKm, roadKm, roadHours: Math.round((roadKm / (hills ? 42 : 55)) * 2) / 2, roadChecked: false, roadNote: 'Estimated from the distance (straight line × 1.3)' };
}

// ---------- the options ----------

/** Places with no railway station: the nearest useful station and the road from it (null = no sensible train) */
const NO_RAIL: { to: RegExp; station: string | null; km: number; hours: number }[] = [
  { to: /coorg|madikeri|kodagu/i, station: 'Mysuru', km: 120, hours: 3 },
  { to: /munnar/i, station: 'Aluva', km: 110, hours: 3.5 },
  { to: /wayanad|kalpetta/i, station: 'Kozhikode', km: 75, hours: 2.5 },
  { to: /thekkady|kumily|periyar/i, station: 'Kottayam', km: 115, hours: 3.5 },
  { to: /gangtok|sikkim/i, station: 'New Jalpaiguri', km: 120, hours: 4 },
  { to: /mussoorie/i, station: 'Dehradun', km: 35, hours: 1.5 },
  { to: /mcleod|dharamshala/i, station: 'Pathankot', km: 90, hours: 3 },
  { to: /manali|kasol|leh|ladakh|spiti|auli/i, station: null, km: 0, hours: 0 }
];

export function travelOptions(plan: TripPlan): TravelOption[] {
  const g = routeGeometry(plan);
  const pax = Math.max(1, plan.travellers?.total || 1);
  const out: TravelOption[] = [];
  const sameCity = g.roadKm !== null && g.roadKm < 40;
  if (sameCity) return out;

  // ✈️ Flights
  const checkedFlight = g.originCode ? CHECKED_FLIGHTS.find((f) => f.from === g.originCode && f.to.test(plan.destination)) : undefined;
  const planFlightsFromHere = (plan.availableFlights || []).filter((f) => f.originCode === g.originCode && /^BLR$/.test(f.originCode || ''));
  if (g.originCode && g.destCode && g.airKm && g.airKm > 250) {
    const farePP = realisticReturnFarePerPerson(g.originCode, g.destCode);
    if (checkedFlight) {
      out.push({
        key: `flight-${checkedFlight.number.replace(/\s/g, '')}`, mode: 'flight', title: 'Flight',
        detail: `${checkedFlight.airline} ${checkedFlight.number} · non-stop · ${checkedFlight.departs} → ${checkedFlight.arrives}`,
        oneWayHours: checkedFlight.hours, overheadHours: 3.5, haltNightsEachWay: 0,
        travelCostINR: farePP * pax,
        howPriced: [`About ${inr(farePP / 2)} per person each way × ${pax} × 2 ways`, 'Fares rise close to the date — book 3–4 weeks ahead'],
        checked: true, sourceNote: `Flight time checked: ${checkedFlight.note} Fare is an estimate.`,
        schedule: { departs: checkedFlight.departs, arrives: checkedFlight.arrives, arrivesDayOffset: 0 }
      });
    } else if (planFlightsFromHere.length > 0) {
      for (const f of planFlightsFromHere.slice(0, 2)) {
        const h = parseFloat((f.duration.match(/(\d+)h/) || [])[1] || '1') + parseFloat((f.duration.match(/(\d+)m/) || [])[1] || '0') / 60;
        out.push({
          key: `flight-${f.id}`, mode: 'flight', title: 'Flight',
          detail: `${f.airline} ${f.flightNumber} · non-stop · ${f.departureTime} → ${f.arrivalTime}`,
          oneWayHours: h, overheadHours: 3.5, haltNightsEachWay: 0,
          travelCostINR: f.totalPriceINR,
          howPriced: [`${inr(f.pricePerPersonINR)} per person return × ${pax}`],
          checked: false, sourceNote: 'Sample flight and fare — check the live price when you book.',
          schedule: to24(f.departureTime) && to24(f.arrivalTime) ? { departs: to24(f.departureTime)!, arrives: to24(f.arrivalTime)!, arrivesDayOffset: 0 } : undefined
        });
      }
    } else {
      const h = 0.55 + g.airKm / 800;
      out.push({
        key: 'flight-est', mode: 'flight', title: 'Flight',
        detail: `${g.originCode} → ${g.destCode} · non-stop or 1 stop (check airlines)`,
        oneWayHours: Math.round(h * 4) / 4, overheadHours: 3.5, haltNightsEachWay: 0,
        travelCostINR: farePP * pax,
        howPriced: [`About ${inr(farePP / 2)} per person each way × ${pax} × 2 ways`, `Flight time from the distance (${g.airKm.toLocaleString('en-IN')} km)`],
        checked: false, sourceNote: 'Estimate — flight time and fare worked out from the distance.'
      });
    }
  }

  // 🚆 Train
  const ct = CHECKED_TRAINS.find((t) => t.from.test(plan.origin) && t.to.test(plan.destination));
  if (ct) {
    out.push({
      key: `train-${ct.number}`, mode: 'train', title: 'Train', detail: `${ct.name} (${ct.number}) · ${ct.fromStation} → ${ct.toStation}`,
      oneWayHours: ct.hours, overheadHours: 1, haltNightsEachWay: 0, travelCostINR: 0, howPriced: [],
      checked: true, sourceNote: ct.note, classes: ct.fares,
      schedule: { departs: ct.departs, arrives: ct.arrives, arrivesDayOffset: ct.arrivesDayOffset, runsOn: ct.runsOn },
      returnSchedule: ct.ret
    });
  } else if (g.roadKm && g.roadKm >= 120 && NO_RAIL.some((n) => n.to.test(plan.destination))) {
    const n = NO_RAIL.find((x) => x.to.test(plan.destination))!;
    if (n.station && g.roadKm - n.km >= 100) {
      const railKm = Math.round((g.roadKm - n.km) * 1.05);
      const cars = Math.max(1, Math.ceil(pax / 4));
      const cabINR = Math.round((n.km * 18 * cars) / 50) * 50 * 2;
      out.push({
        key: 'train-est', mode: 'train', title: 'Train + cab',
        detail: `Train ${g.originName} → ${n.station}, then ${n.km} km by cab to ${g.destName} (no station at ${g.destName})`,
        oneWayHours: Math.round(railKm / 50) + n.hours, overheadHours: 1, haltNightsEachWay: 0, travelCostINR: 0, howPriced: [],
        checked: false, sourceNote: `Estimate — ${g.destName} has no railway station; nearest is ${n.station}. About ${railKm.toLocaleString('en-IN')} km by rail at ~50 km/h, then a cab (~₹18/km). Check IRCTC for the exact train.`,
        classes: estimateTrainFares(railKm),
        lastLeg: { station: n.station, km: n.km, cabINR }
      });
    }
  } else if (g.roadKm && g.roadKm >= 120) {
    const railKm = Math.round(g.roadKm * 1.05);
    out.push({
      key: 'train-est', mode: 'train', title: 'Train', detail: `Trains ${g.originName} → ${g.destName} (check IRCTC for the exact train)`,
      oneWayHours: Math.round(railKm / 50), overheadHours: 1, haltNightsEachWay: 0, travelCostINR: 0, howPriced: [],
      checked: false, sourceNote: `Estimate — about ${railKm.toLocaleString('en-IN')} km by rail at ~50 km/h; fares from the same per-km rates as checked trains. Some places have no direct train.`,
      classes: estimateTrainFares(railKm)
    });
  }
  // fill each class's group price later (depends on the class picked); default 3A
  for (const o of out) if (o.mode === 'train' && o.classes) {
    const c = o.classes.find((x) => x.code === '3A') || o.classes[0];
    o.travelCostINR = c.fareINR * pax * 2 + (o.lastLeg?.cabINR || 0);
    o.howPriced = [`${c.code} ${inr(c.fareINR)} per person each way × ${pax} × 2 ways`, ...(o.lastLeg ? [`Cab ${o.lastLeg.station} ↔ ${g.destName} both ways ${inr(o.lastLeg.cabINR)}`] : [])];
  }

  // 🚌 Bus (overnight AC sleeper) — only where buses really run, up to ~1,000 km
  if (g.roadKm && g.roadKm >= 150 && g.roadKm <= 1000) {
    const perWay = Math.max(600, Math.round(g.roadKm * 2 / 50) * 50);
    out.push({
      key: 'bus', mode: 'bus', title: 'Bus', detail: g.roadHours! >= 7 ? 'Overnight AC sleeper bus' : 'AC bus',
      oneWayHours: g.roadHours! + 1, overheadHours: 0.75, haltNightsEachWay: 0,
      travelCostINR: perWay * pax * 2,
      howPriced: [`About ${inr(perWay)} per person each way × ${pax} × 2 ways`],
      checked: false, sourceNote: 'Estimate — AC sleeper fares are about ₹2/km; check redBus for the date.'
    });
  }

  // 🚗 Own car (cost is worked out with the fuel settings; default petrol, 15 km/l, 1 car)
  if (g.roadKm && g.roadKm >= 60) {
    const fp = fuelPriceFor(plan.origin);
    const sd = selfDriveCost({ roadKm: g.roadKm, roadHours: g.roadHours!, fuel: 'petrol', kmpl: 15, cars: Math.max(1, Math.ceil(pax / 5)), fuelPriceINR: fp.petrol });
    out.push({
      key: 'selfdrive', mode: 'selfdrive', title: 'Your own car', detail: `${g.roadKm.toLocaleString('en-IN')} km each way`,
      oneWayHours: g.roadHours!, overheadHours: 0, haltNightsEachWay: sd.haltNightsEachWay,
      travelCostINR: sd.totalINR, howPriced: sd.lines,
      checked: g.roadChecked, sourceNote: g.roadNote, roadKm: g.roadKm
    });
  }

  // 🚕 Cab with driver — up to ~900 km
  if (g.roadKm && g.roadKm >= 60 && g.roadKm <= 900) {
    const tempo = pax >= 5;
    const rate = tempo ? 26 : 15;
    const days = 2 + Math.max(0, (plan.durationDays || 1) - 1);
    const allowance = (tempo ? 700 : 500) * 2;
    const total = Math.round(g.roadKm * 2 * rate + allowance);
    out.push({
      key: 'cab', mode: 'cab', title: tempo ? 'Tempo traveller' : 'Cab with driver',
      detail: tempo ? 'Tempo traveller (12-seater), there and back' : `${pax > 3 ? 'AC Innova / SUV' : 'AC sedan'}, there and back`,
      oneWayHours: g.roadHours!, overheadHours: 0, haltNightsEachWay: 0,
      travelCostINR: total,
      howPriced: [`${g.roadKm.toLocaleString('en-IN')} km × 2 ways × ₹${rate}/km + driver allowance ${inr(allowance)}`],
      checked: false, sourceNote: `Estimate — outstation cab rates ₹${rate}/km. ${g.roadNote}.`, roadKm: g.roadKm
    });
    void days;
  }
  return out;
}

export function selfDriveCost(p: { roadKm: number; roadHours: number; fuel: 'petrol' | 'diesel'; kmpl: number; cars: number; fuelPriceINR: number }) {
  const km2 = p.roadKm * 2;
  const litres = km2 / Math.max(5, p.kmpl);
  const fuelINR = Math.round(litres * p.fuelPriceINR * p.cars);
  const tollINR = Math.round(km2 * TOLL_PER_KM * p.cars);
  const haltNightsEachWay = Math.max(0, Math.ceil(p.roadHours / DRIVE_HOURS_PER_DAY) - 1);
  const haltINR = haltNightsEachWay * 2 * HALT_ROOM_INR * p.cars;
  const lines = [
    `Fuel: ${km2.toLocaleString('en-IN')} km ÷ ${p.kmpl} km/l = ${Math.round(litres)} l × ₹${p.fuelPriceINR} (${p.fuel})${p.cars > 1 ? ` × ${p.cars} cars` : ''} = ${inr(fuelINR)}`,
    `Tolls: about ₹${TOLL_PER_KM}/km × ${km2.toLocaleString('en-IN')} km${p.cars > 1 ? ` × ${p.cars} cars` : ''} = ${inr(tollINR)}`
  ];
  if (haltNightsEachWay > 0) lines.push(`Night stops on the way: ${haltNightsEachWay} each way × 2 × ${inr(HALT_ROOM_INR)} a room = ${inr(haltINR)}`);
  return { totalINR: fuelINR + tollINR + haltINR, fuelINR, tollINR, haltINR, haltNightsEachWay, lines };
}

/** The train option's cost for a class */
export function trainCostForClass(o: TravelOption, code: string, pax: number): { totalINR: number; line: string } {
  const c = o.classes?.find((x) => x.code === code) || o.classes?.[0];
  if (!c) return { totalINR: o.travelCostINR, line: '' };
  const cab = o.lastLeg ? ` · cab ${o.lastLeg.station} ↔ there, both ways ${inr(o.lastLeg.cabINR)}` : '';
  return { totalINR: c.fareINR * pax * 2 + (o.lastLeg?.cabINR || 0), line: `${c.code} ${inr(c.fareINR)} per person each way × ${pax} × 2 ways${cab}` };
}

// ---------- applying a choice to the plan ----------

const isRoad = (t?: TransferItem | null) => Boolean(t && /-road(-\d+)?$/.test(t.id || ''));

function localCab(plan: TripPlan, title: string): TransferItem {
  const base = (plan.availableTransfers || []).find((t) => !isRoad(t)) || plan.transfer;
  return { ...base, id: isRoad(base) ? 'tr-local-cab' : base.id, title, priceINR: isRoad(base) ? 0 : base.priceINR, vehicleType: isRoad(base) ? 'Private AC Sedan' : base.vehicleType };
}

/** The plan with this way of travelling. Prices go through the same cost engine as everything else. */
export function applyTravelOption(
  plan: TripPlan,
  o: TravelOption,
  opts: { trainClass?: 'SL' | '3A' | '2A'; selfDrive?: { fuel: 'petrol' | 'diesel'; kmpl: number; cars: number; fuelPriceINR: number }; firstDay?: Date; lastDay?: Date } = {}
): TripPlan {
  const g = routeGeometry(plan);
  const pax = Math.max(1, plan.travellers?.total || 1);
  const base: TripPlan = { ...plan, flight: null, selectedTrain: undefined };
  let next: TripPlan;
  let key = o.key;

  if (o.mode === 'flight') {
    const half = Math.round(o.travelCostINR / pax / 2);
    const flight: FlightItem = {
      id: o.key, airline: o.detail.split(' ')[0], airlineCode: '', flightNumber: o.detail.split('·')[0].trim(),
      originCode: g.originCode || '', originCity: g.originName, destinationCode: g.destCode || '', destinationCity: g.destName,
      departureTime: o.schedule?.departs || '', arrivalTime: o.schedule?.arrives || '', duration: hm(o.oneWayHours),
      stops: /1 stop/.test(o.detail) ? 'Non-stop or 1 stop' : 'Non-stop', isRoundTrip: true,
      outboundFarePerPersonINR: half, returnFarePerPersonINR: half,
      pricePerPersonINR: half * 2, totalPriceINR: o.travelCostINR,
      pricePerPersonUSD: Math.round((half * 2) / 84), totalPriceUSD: Math.round(o.travelCostINR / 84),
      baggage: '15 kg checked + 7 kg cabin', cabinClass: 'Economy', refundable: false, seatAvailability: 9,
      source: 'estimate', sourceLabel: o.checked ? 'Checked schedule · fare estimate' : 'Estimate'
    };
    const sample = (plan.availableFlights || []).find((f) => `flight-${f.id}` === o.key);
    next = { ...base, flight: sample || flight, transfer: localCab(plan, 'Cab to and from the airport') };
  } else if (o.mode === 'train' || o.mode === 'bus') {
    const cls = o.mode === 'train' ? (opts.trainClass || '3A') : undefined;
    const c = o.classes?.find((x) => x.code === cls) || o.classes?.[0];
    const oneWayPP = o.mode === 'train' ? (c?.fareINR || 0) : Math.round(o.travelCostINR / pax / 2);
    const ct = CHECKED_TRAINS.find((t) => `train-${t.number}` === o.key);
    const train: TrainItem = {
      id: o.key + (cls ? `-${cls}` : ''), mode: o.mode,
      trainName: o.mode === 'bus' ? o.detail : (ct?.name || `Train to ${g.destName}`), trainNumber: ct?.number || '',
      fromStation: ct?.fromStation || g.originName, toStation: ct?.toStation || g.destName,
      departureTime: o.schedule?.departs || (o.mode === 'bus' ? 'Evening' : 'Check IRCTC'),
      arrivalTime: o.schedule ? `${o.schedule.arrives}${o.schedule.arrivesDayOffset ? ` (+${o.schedule.arrivesDayOffset} day${o.schedule.arrivesDayOffset > 1 ? 's' : ''})` : ''}` : (o.mode === 'bus' ? 'Next morning' : ''),
      duration: hm(o.oneWayHours),
      classes: (o.classes || []).map((x) => ({ code: x.code, name: x.name, fareINR: x.fareINR, availability: 'Check IRCTC', isAvailable: true })),
      selectedClass: (cls || 'SL') as any,
      pricePerPersonINR: oneWayPP,
      // Checked fares are one way (the cost engine counts both ways); estimates carry the return total
      totalPriceINR: o.checked && o.mode === 'train' ? oneWayPP * pax : oneWayPP * pax * 2,
      foodIncluded: false, isVandeBharatOrRajdhani: false,
      source: o.checked && o.mode === 'train' ? 'sample' : 'estimate', sourceLabel: o.checked ? 'Checked fare' : 'Estimate'
    };
    if (cls) key = `${o.key}-${cls}`;
    if (o.lastLeg) { train.toStation = o.lastLeg.station; train.lastLeg = o.lastLeg; }
    next = { ...base, selectedTrain: train, transfer: localCab(plan, `Auto / local cab to and from the ${o.mode === 'bus' ? 'bus stand' : 'station'}`) };
  } else {
    const sd = opts.selfDrive || { fuel: 'petrol' as const, kmpl: 15, cars: 1, fuelPriceINR: fuelPriceFor(plan.origin).petrol };
    const price = o.mode === 'selfdrive'
      ? selfDriveCost({ roadKm: o.roadKm || g.roadKm || 0, roadHours: o.oneWayHours, ...sd }).totalINR
      : o.travelCostINR;
    const transfer: TransferItem = {
      ...plan.transfer,
      id: o.mode === 'selfdrive' ? 'tr-selfdrive-road' : 'tr-cab-road',
      title: o.mode === 'selfdrive' ? `Drive your own car from ${g.originName} and back` : `${o.title} from ${g.originName} and back`,
      vehicleType: o.mode === 'selfdrive' ? `Your own car (${sd.fuel}${sd.cars > 1 ? `, ${sd.cars} cars` : ''})` : o.detail.replace(/, there and back$/, ''),
      priceINR: price, priceUSD: Math.round(price / 84),
      duration: `about ${hm(o.oneWayHours)} each way`,
      pickupLocation: `${g.originName}`, dropLocation: plan.hotel?.area || g.destName,
      description: o.howPriced.join(' · '),
      source: 'estimate', sourceLabel: 'Estimate'
    };
    next = { ...base, transfer };
  }
  const jd = opts.firstDay && opts.lastDay ? journeyDates(o, opts.firstDay, opts.lastDay) : null;
  const extraNights = jd ? jd.extraNights : 0;
  const by = o.mode === 'train' ? 'train' : o.mode === 'bus' ? 'bus' : o.mode === 'flight' ? 'flight' : 'road';
  const journey = jd && opts.firstDay && opts.lastDay
    ? { arrive: jd.arrive, leaveBack: jd.leaveGoa, home: jd.home, early: jd.early, late: jd.late, by }
    : undefined;
  return {
    ...next,
    userChoices: {
      ...(plan.userChoices || {}),
      travelKey: key,
      extraNights,
      journey,
      selfDrive: o.mode === 'selfdrive' ? opts.selfDrive || plan.userChoices?.selfDrive : plan.userChoices?.selfDrive
    }
  };
}

// ---------- dates: days at the destination don't include the journey ----------

const DAY = 86400000;
const fmtDay = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtTime = (d: Date) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', ' ').toUpperCase();

export interface JourneyDates {
  early: number;      // nights at the stay before Day 1
  late: number;       // nights at the stay after the last day
  leave: string;      // "Sat 14 Nov, 11:10 PM"
  arrive: string;     // "Mon 16 Nov, 4:10 PM"
  leaveGoa: string;   // "Fri 20 Nov"
  home: string;       // "Sun 22 Nov, ~9 AM"
  awayDays: number;   // calendar days away from home
  /** extra hotel nights: arriving before Day 1, or waiting for the train home */
  extraNights: number;
  note?: string;
}

/**
 * When to leave so you reach on Day 1 of your trip, and when you're home.
 * `firstDay` / `lastDay` are the days AT the destination.
 */
export function journeyDates(o: TravelOption, firstDay: Date, lastDay: Date): JourneyDates {
  const totalOneWay = o.oneWayHours + o.overheadHours + o.haltNightsEachWay * (24 - DRIVE_HOURS_PER_DAY);
  let leave: Date;
  let arrive: Date;
  let note: string | undefined;
  if (o.schedule && o.mode === 'train') {
    const [ah, am] = o.schedule.arrives.split(':').map(Number);
    const [dh, dm] = o.schedule.departs.split(':').map(Number);
    // Arrive on or before Day 1
    let dep = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() - o.schedule.arrivesDayOffset, dh, dm);
    if (o.schedule.runsOn && o.schedule.runsOn.length) {
      let tries = 0;
      while (!o.schedule.runsOn.includes(dep.getDay()) && tries < 7) { dep = new Date(dep.getTime() - DAY); tries++; }
      if (tries > 0) note = `This train runs ${o.schedule.runsOn.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')} — the nearest one gets you there ${tries} day${tries > 1 ? 's' : ''} before Day 1.`;
    }
    leave = dep;
    arrive = new Date(dep.getFullYear(), dep.getMonth(), dep.getDate() + o.schedule.arrivesDayOffset, ah, am);
  } else if (o.schedule && o.mode === 'flight') {
    const [dh, dm] = o.schedule.departs.split(':').map(Number);
    const [ah, am] = o.schedule.arrives.split(':').map(Number);
    leave = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate(), dh, dm - 150); // leave home ~2.5h before
    arrive = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate(), ah, am + 60);  // at the stay ~1h after landing
  } else if (o.mode === 'bus' && o.oneWayHours >= 7) {
    // Overnight buses reach in the morning (~7 AM) on Day 1, leaving the evening before
    arrive = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate(), 7, 0);
    leave = new Date(arrive.getTime() - totalOneWay * 3600000);
  } else {
    // Aim to reach the stay by 2 PM on Day 1 (check-in time)
    arrive = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate(), 14, 0);
    leave = new Date(arrive.getTime() - totalOneWay * 3600000);
  }
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const early = Math.max(0, Math.round((startOf(firstDay) - startOf(arrive)) / DAY));
  if (early > 0) note = `${note ? note + ' ' : ''}You get in ${early === 1 ? 'the day' : `${early} days`} before Day 1, so ${early === 1 ? '1 extra night is' : `${early} extra nights are`} added at your stay.`;

  // Going home
  let goBack: Date;
  let home: Date;
  let leaveText: string;
  let late = 0;
  const rt = o.mode === 'train' ? o.returnSchedule : undefined;
  if (rt) {
    // The checked train back: on your last day if it leaves in the evening, else the next morning —
    // then the first day it actually runs.
    const [dh, dm] = rt.departs.split(':').map(Number);
    const [ah, am] = rt.arrives.split(':').map(Number);
    let dep = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + (dh < 12 ? 1 : 0), dh, dm);
    if (rt.runsOn && rt.runsOn.length) {
      let tries = 0;
      while (!rt.runsOn.includes(dep.getDay()) && tries < 7) { dep = new Date(dep.getTime() + DAY); tries++; }
    }
    goBack = dep;
    home = new Date(dep.getFullYear(), dep.getMonth(), dep.getDate() + rt.arrivesDayOffset, ah, am);
    late = Math.max(0, Math.round((startOf(dep) - startOf(lastDay)) / DAY));
    leaveText = `${fmtDay(dep)}, ${fmtTime(dep)} by ${rt.name} (${rt.number})`;
    const runs = rt.runsOn && rt.runsOn.length ? `runs ${rt.runsOn.map((d) => DAYS[d]).join(', ')}` : 'runs daily';
    if (late > 0) {
      note = `${note ? note + ' ' : ''}Going back: ${rt.number} ${runs} and leaves at ${fmtTime(dep)}, so you leave ${fmtDay(dep)} — ${late === 1 ? '1 more night is' : `${late} more nights are`} added at your stay.`;
    } else {
      note = `${note ? note + ' ' : ''}Going back: ${rt.number} (${runs}) leaves ${fmtDay(dep)} at ${fmtTime(dep)} — after you check out, keep your bags at the stay till evening.`;
    }
  } else {
    // Leave the destination on the last day: after check-out (~11 AM), or an evening bus (~8 PM)
    goBack = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate(), o.mode === 'bus' && o.oneWayHours >= 7 ? 20 : 11, 0);
    home = new Date(goBack.getTime() + totalOneWay * 3600000);
    leaveText = fmtDay(goBack);
    if (o.mode === 'train' && o.schedule?.runsOn) note = `${note ? note + ' ' : ''}Check the return train's days on IRCTC before fixing your last day.`;
  }
  const awayDays = Math.round((startOf(home) - startOf(leave)) / DAY) + 1;
  const extraNights = early + late;
  return {
    extraNights,
    early,
    late,
    leave: `${fmtDay(leave)}, ${fmtTime(leave)}`,
    arrive: `${fmtDay(arrive)}, ${fmtTime(arrive)}`,
    leaveGoa: leaveText,
    home: `${fmtDay(home)}, ~${fmtTime(home)}`,
    awayDays,
    note
  };
}

export { hm as formatHours };
