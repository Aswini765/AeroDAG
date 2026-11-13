/**
 * "How do you want to get there?" — Flight vs Train/Bus vs Road for THIS trip.
 *
 * Every option is the current plan with only the travel swapped, priced by the same
 * cost engine (computeFullTripCost), so the total on each card is exactly the total the
 * plan shows after tapping it. Times come from the listed flight / train, or for the road
 * from the distance (≈55 km/h on plains, 42 km/h in the hills, incl. short stops).
 */
import { TripPlan, TripPreferences, TransferItem } from '../types/travelBooking';
import { computeFullTripCost } from './fullTripCostHelper';
import { TripPlanningEngine } from './tripPlanningEngine';
import { coordsFor, getRouteRealism } from './travelRealism';
import { originCodeFor } from './originCities';

export type GettingThereKey = 'flight' | 'train' | 'bus' | 'road';

export interface GettingThereOption {
  key: GettingThereKey;
  label: string;
  /** "IndiGo · non-stop", "Yesvantpur – Vasco da Gama Express (17309)" */
  detail: string;
  /** "1h 10m in the air · about 4h 40m door to door" */
  timeText: string;
  /** door-to-door hours, one way (for comparing) */
  hours: number;
  overnight: boolean;
  totalINR: number;
  isCurrent: boolean;
  plan: TripPlan;
}

/** "1h 10m" / "14h 00m" / "approx. 11 hours" → hours */
export function parseHours(text?: string): number | null {
  if (!text) return null;
  const h = text.match(/(\d+(?:\.\d+)?)\s*h/i);
  const m = text.match(/(\d+)\s*m(?!o)/i);
  if (!h && !m) return null;
  return (h ? parseFloat(h[1]) : 0) + (m ? parseInt(m[1], 10) / 60 : 0);
}

export function fmtHours(h: number): string {
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60 / 5) * 5;
  if (mins === 60) return `${whole + 1}h`;
  return mins ? `${whole}h ${mins}m` : `${whole}h`;
}

/** Airport check-in (~1.5h before), getting out (~0.5h) and drives to/from both airports (~1.5h) */
const AIRPORT_OVERHEAD_H = 3.5;
/** Getting to/from the station or bus stand */
const STATION_OVERHEAD_H = 1;

const isRoadTransfer = (t?: TransferItem | null) => Boolean(t && t.id && /-road(-\d+)?$/.test(t.id));

/** The local cab to/from the airport or station — never the long-distance road cab */
function localTransfer(plan: TripPlan): TransferItem {
  if (!isRoadTransfer(plan.transfer)) return plan.transfer;
  const local = (plan.availableTransfers || []).find((t) => !isRoadTransfer(t));
  if (local) return local;
  return {
    ...plan.transfer,
    id: 'tr-local-cab',
    title: 'Cab to and from the airport / station',
    vehicleType: 'Private AC Sedan',
    priceINR: 0, // the cost engine adds its standard local transfer
    priceUSD: 0,
    duration: 'approx. 45 min',
    description: 'Local cab between the airport or station and your stay.'
  };
}

/**
 * Road distances checked against published route guides (Nov 2026), used instead of the
 * straight-line estimate. Bengaluru → Goa (Panaji) via NH48 / Hubballi: about 560 km,
 * 10–11 hours (Savaari: 570 km, 10h 30m; Tejas Travels: 555 km, ~10h).
 */
const KNOWN_ROADS: Array<{ from: RegExp; to: RegExp; km: number; hours: number; via: string }> = [
  { from: /bengaluru|bangalore|\bBLR\b/i, to: /goa/i, km: 560, hours: 10.5, via: 'NH48 via Hubballi' }
];

function roadTransferFor(plan: TripPlan): TransferItem | null {
  if (isRoadTransfer(plan.transfer)) return plan.transfer;
  const listed = (plan.availableTransfers || []).find(isRoadTransfer);
  if (listed) return listed;
  const originCode = plan.flight?.originCode || plan.availableFlights?.[0]?.originCode || originCodeFor(plan.origin);
  const destCode = plan.flight?.destinationCode || plan.availableFlights?.[0]?.destinationCode;
  const realism = getRouteRealism({
    fromCoords: coordsFor(plan.origin, originCode),
    toCoords: coordsFor(plan.destination, destCode),
    destinationState: (plan as any).destinationState || plan.destination,
    travellers: plan.travellers?.total || 2,
    hasAirport: true
  });
  if (!realism || realism.roadKm > 900) return null; // more than ~16h each way: not a sensible drive
  const known = KNOWN_ROADS.find((r) => r.from.test(plan.origin) && r.to.test(plan.destination));
  if (known) {
    realism.roadKm = known.km;
    realism.roadHours = known.hours;
    realism.road = { ...realism.road, totalINR: Math.round(known.km * 2 * (realism.road.mode === 'tempo' ? 26 : 15) + 2 * (realism.road.mode === 'tempo' ? 700 : 500)) };
  }
  const origin = plan.origin.replace(/\s*\([^)]*\)/, '');
  const isTempo = realism.road.mode === 'tempo';
  return {
    ...plan.transfer,
    id: `tr-${plan.destination.toLowerCase().replace(/[^a-z]+/g, '-')}-road`,
    title: `${isTempo ? 'Tempo traveller' : 'Private AC cab'} from ${origin} and back`,
    vehicleType: isTempo ? 'Tempo traveller (12-seater)' : (plan.travellers?.total || 2) > 3 ? 'AC Innova / SUV' : 'AC Sedan',
    priceINR: realism.road.totalINR,
    priceUSD: Math.round(realism.road.totalINR / 84),
    duration: `approx. ${fmtHours(realism.roadHours)}`,
    pickupLocation: `${origin} pickup`,
    dropLocation: plan.hotel?.area || plan.destination,
    description: `Door-to-door ${isTempo ? 'tempo traveller' : 'private cab'} from ${origin}: about ${Math.round(realism.roadKm / 10) * 10} km${known ? ` (${known.via})` : ''}, ${fmtHours(realism.roadHours)} each way. Price: ₹15/km both ways + driver allowance (estimate).`,
    source: 'estimate',
    sourceLabel: 'Estimate'
  };
}

export function gettingThereOptions(plan: TripPlan, preferences?: TripPreferences | null): GettingThereOption[] {
  const out: GettingThereOption[] = [];
  const total = (p: TripPlan) => computeFullTripCost(p, preferences || undefined).totalWithBufferINR;
  const currentMode: GettingThereKey | null = plan.flight
    ? 'flight'
    : plan.selectedTrain
    ? (plan.selectedTrain.mode === 'bus' ? 'bus' : 'train')
    : isRoadTransfer(plan.transfer)
    ? 'road'
    : null;

  // Flight
  const fl = plan.flight || plan.availableFlights?.[0];
  if (fl) {
    const p = plan.flight ? plan : { ...TripPlanningEngine.swapComponent(plan, { flight: fl, train: null }), transfer: localTransfer(plan) };
    const air = parseHours(fl.duration) ?? 1.5;
    out.push({
      key: 'flight',
      label: 'Flight',
      detail: `${fl.airline}${/non-?stop|direct/i.test(fl.stops || '') || !fl.stops ? ' · non-stop' : ` · ${fl.stops}`}`,
      timeText: `${fmtHours(air)} in the air · about ${fmtHours(air + AIRPORT_OVERHEAD_H)} door to door`,
      hours: air + AIRPORT_OVERHEAD_H,
      overnight: false,
      totalINR: total(p),
      isCurrent: currentMode === 'flight',
      plan: p
    });
  }

  // Train or bus (the plan's own, else the cheapest listed)
  const ground = plan.selectedTrain || [...(plan.availableTrains || [])].sort((a, b) => a.totalPriceINR - b.totalPriceINR)[0];
  if (ground) {
    const isBus = ground.mode === 'bus';
    const p = plan.selectedTrain && !plan.flight ? plan : { ...TripPlanningEngine.swapComponent(plan, { flight: null, train: ground }), transfer: localTransfer(plan) };
    const ride = parseHours(ground.duration) ?? 10;
    const overnight = /\+1|next day/i.test(ground.arrivalTime || '') || ride >= 8;
    const times = /\d/.test(ground.departureTime || '') && /\d/.test(ground.arrivalTime || '')
      ? ` · leaves ${ground.departureTime}, arrives ${ground.arrivalTime.replace(/\s*\(\+1 Day\)/i, ' next day')}`
      : '';
    out.push({
      key: isBus ? 'bus' : 'train',
      label: isBus ? 'Bus' : 'Train',
      detail: `${ground.trainName}${ground.trainNumber && /^\d+$/.test(ground.trainNumber) ? ` (${ground.trainNumber})` : ''}${!isBus && ground.selectedClass ? ` · ${ground.selectedClass}` : ''}`,
      timeText: `${fmtHours(ride)} on board${times}`,
      hours: ride + STATION_OVERHEAD_H,
      overnight,
      totalINR: total(p),
      isCurrent: currentMode === 'train' || currentMode === 'bus',
      plan: p
    });
  }

  // Road (door to door)
  const road = roadTransferFor(plan);
  if (road) {
    const p = currentMode === 'road' ? plan : { ...TripPlanningEngine.swapComponent(plan, { flight: null, train: null }), transfer: road };
    const hrs = parseHours(road.duration) ?? 10;
    const km = road.description.match(/about ([\d,]+) km/)?.[1];
    out.push({
      key: 'road',
      label: 'Road',
      detail: road.vehicleType,
      timeText: `about ${fmtHours(hrs)} driving each way${km ? ` · ~${km} km` : ''}`,
      hours: hrs,
      overnight: false,
      totalINR: total(p),
      isCurrent: currentMode === 'road',
      plan: p
    });
  }
  return out;
}

/** One precise sentence to help decide: what flying costs vs saves, and what fits the trip length */
export function gettingThereAdvice(options: GettingThereOption[], durationDays: number): string[] {
  const inr = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`;
  const flight = options.find((o) => o.key === 'flight');
  const ground = options.filter((o) => o.key !== 'flight').sort((a, b) => a.totalINR - b.totalINR)[0];
  const lines: string[] = [];
  if (flight && ground) {
    const saved = ground.hours - flight.hours;
    const diff = flight.totalINR - ground.totalINR;
    if (saved > 1) {
      lines.push(diff > 0
        ? `Flying costs ${inr(diff)} more than the ${ground.label.toLowerCase()} and saves about ${fmtHours(saved)} each way (${fmtHours(saved * 2)} over the trip).`
        : `Flying is ${inr(diff)} cheaper than the ${ground.label.toLowerCase()} and about ${fmtHours(saved)} faster each way.`);
    }
    if (durationDays <= 3 && ground.hours >= 8) {
      lines.push(`With ${durationDays} days, ${fmtHours(ground.hours)} each way by ${ground.label.toLowerCase()} takes a big part of your trip — fly if you can.`);
    } else if (ground.overnight && ground.key !== 'road') {
      lines.push(`The ${ground.label.toLowerCase()} runs overnight: you sleep on the way and arrive in the morning, so you lose less of a day than the hours suggest.`);
    }
  }
  return lines;
}
