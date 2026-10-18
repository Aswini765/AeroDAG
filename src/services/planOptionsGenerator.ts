/**
 * AeroDAG Plan Options Generator
 * 
 * Generates 2–3 options (Budget / Balanced / Comfort) differing in:
 * - Hotel tier (clean value stay vs handpicked boutique vs 4-5★ premium resort)
 * - Transport (economical train/flight vs direct standard vs fastest premium flight/express)
 * 
 * Each option provides:
 * - total cost (with buffer)
 * - per-person cost
 * - stay area & name
 * - real stayStars (never altered!)
 * - travel mode & travel time
 * - diffFromBalanced (e.g. "₹4,200 cheaper · train instead of flight")
 */

import { TripPlan, TripPreferences, HotelItem, FlightItem, TrainItem } from '../types/travelBooking';
import { TripPlanningEngine } from './tripPlanningEngine';
import { computeFullTripCost } from './fullTripCostHelper';
import {
  MOCK_HOTELS_GOA,
  MOCK_HOTELS_COORG,
  MOCK_HOTELS_KERALA,
  MOCK_HOTELS_MYSURU
} from './destinationsData';

export interface PlanTierOption {
  id: 'budget' | 'balanced' | 'comfort';
  tier: 'Budget' | 'Balanced' | 'Comfort';
  title: string;
  badge: string;
  tagline: string;
  totalCostINR: number;
  perPersonCostINR: number;
  stayArea: string;
  stayName: string;
  stayStars: number;
  travelMode: 'Flight' | 'Train' | 'Cab' | 'Road';
  travelTime: string;
  travelDetail: string;
  hotel: HotelItem;
  flight?: FlightItem | null;
  train?: TrainItem | null;
  plan: TripPlan;
  diffFromBalanced: string;
}

function parseDurationMinutes(durationStr?: string): number {
  if (!durationStr) return 999;
  const hMatch = durationStr.match(/(\d+)\s*h/i);
  const mMatch = durationStr.match(/(\d+)\s*m/i);
  const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
  const minutes = mMatch ? parseInt(mMatch[1], 10) : 0;
  return hours * 60 + minutes || 999;
}

export function generatePlanOptions(
  basePlan: TripPlan,
  preferences?: TripPreferences | null
): PlanTierOption[] {
  // Collect candidate hotels
  let availableHotels: HotelItem[] = (basePlan.availableHotels && basePlan.availableHotels.length > 0)
    ? [...basePlan.availableHotels]
    : [basePlan.hotel].filter((h): h is HotelItem => Boolean(h));

  // If availableHotels has <= 1 hotel, load mock hotels for destination to guarantee real choice
  if (availableHotels.length <= 1) {
    const dest = (basePlan.destination || '').toLowerCase();
    let fallbackHotels: HotelItem[] = [];
    if (dest.includes('goa')) fallbackHotels = MOCK_HOTELS_GOA;
    else if (dest.includes('coorg')) fallbackHotels = MOCK_HOTELS_COORG;
    else if (dest.includes('kerala') || dest.includes('munnar') || dest.includes('alleppey')) fallbackHotels = MOCK_HOTELS_KERALA;
    else if (dest.includes('mysuru') || dest.includes('mysore')) fallbackHotels = MOCK_HOTELS_MYSURU;

    for (const fh of fallbackHotels) {
      if (!availableHotels.some((h) => h.id === fh.id || h.name === fh.name)) {
        availableHotels.push(fh);
      }
    }
  }

  // Also include any upgrade hotel if available
  if (basePlan.upgradeOptions && basePlan.upgradeOptions.length > 0) {
    for (const up of basePlan.upgradeOptions) {
      if (up.hotel && !availableHotels.some((h) => h.id === up.hotel.id)) {
        availableHotels.push(up.hotel);
      }
    }
  }

  const availableFlights: FlightItem[] = (basePlan.availableFlights && basePlan.availableFlights.length > 0)
    ? basePlan.availableFlights
    : basePlan.flight ? [basePlan.flight] : [];

  const availableTrains: TrainItem[] = (basePlan.availableTrains && basePlan.availableTrains.length > 0)
    ? basePlan.availableTrains
    : basePlan.selectedTrain ? [basePlan.selectedTrain] : [];

  // Sort hotels by price per night
  const sortedHotelsAsc = [...availableHotels].sort((a, b) => a.pricePerNightINR - b.pricePerNightINR);
  const sortedHotelsDesc = [...availableHotels].sort((a, b) => b.pricePerNightINR - a.pricePerNightINR);

  // 1. BALANCED OPTION (Reference Baseline)
  const balancedHotel = basePlan.hotel;
  let balancedTravelMode: 'Flight' | 'Train' | 'Cab' | 'Road' = 'Flight';
  let balancedTravelTime = 'approx. 1h 50m';
  let balancedTravelDetail = 'Direct scheduled travel';

  if (basePlan.selectedTrain) {
    balancedTravelMode = 'Train';
    balancedTravelTime = basePlan.selectedTrain.duration || 'approx. 6h';
    balancedTravelDetail = `${basePlan.selectedTrain.trainName} · Express`;
  } else if (basePlan.flight) {
    balancedTravelMode = 'Flight';
    balancedTravelTime = basePlan.flight.duration || 'approx. 1h 50m';
    balancedTravelDetail = `${basePlan.flight.airline} · Non-stop`;
  } else if (basePlan.transfer) {
    balancedTravelMode = 'Cab';
    balancedTravelTime = basePlan.transfer.duration || 'approx. 3h 30m';
    balancedTravelDetail = basePlan.transfer.vehicleType;
  }

  const balancedCost = computeFullTripCost(basePlan, preferences);

  const balancedOption: PlanTierOption = {
    id: 'balanced',
    tier: 'Balanced',
    title: 'Balanced',
    badge: 'Recommended',
    tagline: 'Handpicked boutique stay with optimal travel pacing',
    totalCostINR: balancedCost.totalWithBufferINR,
    perPersonCostINR: balancedCost.perPersonINR,
    stayArea: balancedHotel.area || balancedHotel.city || 'Central Area',
    stayName: balancedHotel.name,
    stayStars: balancedHotel.starRating, // ALWAYS show real starRating! Never overwrite!
    travelMode: balancedTravelMode,
    travelTime: balancedTravelTime,
    travelDetail: balancedTravelDetail,
    hotel: balancedHotel,
    flight: basePlan.flight,
    train: basePlan.selectedTrain,
    plan: basePlan,
    diffFromBalanced: 'Current plan · Recommended'
  };

  // 2. BUDGET OPTION
  // Cheapest hotel + cheapest transit
  const cheaperHotels = sortedHotelsAsc.filter((h) => h.pricePerNightINR < balancedHotel.pricePerNightINR);
  const budgetHotel = cheaperHotels[0] || sortedHotelsAsc[0] || balancedHotel;

  let budgetFlight: FlightItem | null = null;
  let budgetTrain: TrainItem | null = null;
  let budgetTravelMode: 'Flight' | 'Train' | 'Cab' | 'Road' = balancedTravelMode;
  let budgetTravelTime = balancedTravelTime;
  let budgetTravelDetail = balancedTravelDetail;
  let travelDiff = '';

  if (availableTrains.length > 0) {
    const sortedTrainsAsc = [...availableTrains].sort((a, b) => a.totalPriceINR - b.totalPriceINR);
    const chosenTrain = sortedTrainsAsc[0];
    if (chosenTrain) {
      budgetTrain = chosenTrain;
      budgetFlight = null;
      budgetTravelMode = 'Train';
      budgetTravelTime = chosenTrain.duration || 'approx. 8h 30m';
      budgetTravelDetail = `${chosenTrain.trainName} (${chosenTrain.selectedClass || '3A'})`;
      if (balancedTravelMode === 'Flight') {
        travelDiff = 'train instead of flight';
      }
    }
  } else if (availableFlights.length > 0) {
    const sortedFlightsAsc = [...availableFlights].sort((a, b) => a.totalPriceINR - b.totalPriceINR);
    const chosenFlight = sortedFlightsAsc[0];
    if (chosenFlight) {
      budgetFlight = chosenFlight;
      budgetTrain = null;
      budgetTravelMode = 'Flight';
      budgetTravelTime = chosenFlight.duration || 'approx. 2h 15m';
      budgetTravelDetail = `${chosenFlight.airline} (${chosenFlight.flightNumber})`;
      if (basePlan.flight && chosenFlight.id !== basePlan.flight.id) {
        travelDiff = 'cheaper flight';
      }
    }
  }

  const budgetPlan = TripPlanningEngine.swapComponent(basePlan, {
    hotel: budgetHotel,
    flight: budgetFlight,
    train: budgetTrain
  });
  const budgetCost = computeFullTripCost(budgetPlan, preferences);

  const budgetDiffINR = balancedCost.totalWithBufferINR - budgetCost.totalWithBufferINR;
  let budgetDiffText = 'Value stay & smart economical transit';
  if (budgetDiffINR > 0) {
    budgetDiffText = travelDiff
      ? `₹${budgetDiffINR.toLocaleString('en-IN')} cheaper · ${travelDiff}`
      : `₹${budgetDiffINR.toLocaleString('en-IN')} cheaper · value stay`;
  }

  const budgetOption: PlanTierOption = {
    id: 'budget',
    tier: 'Budget',
    title: 'Budget Friendly',
    badge: 'Best Value',
    tagline: 'Clean, value-rated stay & smart economical transport',
    totalCostINR: budgetCost.totalWithBufferINR,
    perPersonCostINR: budgetCost.perPersonINR,
    stayArea: budgetHotel.area || budgetHotel.city || 'Central Area',
    stayName: budgetHotel.name,
    stayStars: budgetHotel.starRating, // ALWAYS show real starRating! Never overwrite!
    travelMode: budgetTravelMode,
    travelTime: budgetTravelTime,
    travelDetail: budgetTravelDetail,
    hotel: budgetHotel,
    flight: budgetFlight,
    train: budgetTrain,
    plan: budgetPlan,
    diffFromBalanced: budgetDiffText
  };

  // 3. COMFORT OPTION
  // Higher-priced hotel from availableHotels/upgradeOptions + fastest transit
  const higherHotels = sortedHotelsDesc.filter((h) => h.pricePerNightINR > balancedHotel.pricePerNightINR);
  const comfortHotel = higherHotels[0] || basePlan.upgradeOptions?.[0]?.hotel || sortedHotelsDesc[0] || balancedHotel;

  let comfortFlight: FlightItem | null = null;
  let comfortTrain: TrainItem | null = null;
  let comfortTravelMode: 'Flight' | 'Train' | 'Cab' | 'Road' = balancedTravelMode;
  let comfortTravelTime = balancedTravelTime;
  let comfortTravelDetail = balancedTravelDetail;
  let comfortTravelDiff = '';

  if (availableFlights.length > 0) {
    const fastestFlights = [...availableFlights].sort(
      (a, b) => parseDurationMinutes(a.duration) - parseDurationMinutes(b.duration)
    );
    const chosenFlight = fastestFlights[0];
    if (chosenFlight) {
      comfortFlight = chosenFlight;
      comfortTrain = null;
      comfortTravelMode = 'Flight';
      comfortTravelTime = chosenFlight.duration || 'approx. 1h 35m';
      comfortTravelDetail = `${chosenFlight.airline} (${chosenFlight.flightNumber}) · Fastest`;
      if (balancedTravelMode === 'Train') {
        comfortTravelDiff = 'flight instead of train';
      }
    }
  } else if (availableTrains.length > 0) {
    const vbTrain = availableTrains.find((t) => t.trainName.toLowerCase().includes('vande')) || availableTrains[0];
    if (vbTrain) {
      comfortTrain = vbTrain;
      comfortFlight = null;
      comfortTravelMode = 'Train';
      comfortTravelTime = vbTrain.duration || 'approx. 5h';
      comfortTravelDetail = `${vbTrain.trainName} · Executive / Chair Car`;
    }
  }

  const comfortPlan = TripPlanningEngine.swapComponent(basePlan, {
    hotel: comfortHotel,
    flight: comfortFlight,
    train: comfortTrain
  });
  const comfortCost = computeFullTripCost(comfortPlan, preferences);

  const comfortDiffINR = comfortCost.totalWithBufferINR - balancedCost.totalWithBufferINR;
  let comfortDiffText = 'Premium resort & fastest connection';
  if (comfortDiffINR > 0) {
    const starText = comfortHotel.starRating > balancedHotel.starRating ? `${comfortHotel.starRating}★ stay` : 'upgraded stay';
    comfortDiffText = comfortTravelDiff
      ? `+₹${comfortDiffINR.toLocaleString('en-IN')} · ${comfortTravelDiff}`
      : `+₹${comfortDiffINR.toLocaleString('en-IN')} · ${starText}`;
  }

  const comfortOption: PlanTierOption = {
    id: 'comfort',
    tier: 'Comfort',
    title: 'Comfort Plus',
    badge: 'Premium Stay',
    tagline: '4–5★ resort stay with fastest non-stop transit',
    totalCostINR: comfortCost.totalWithBufferINR,
    perPersonCostINR: comfortCost.perPersonINR,
    stayArea: comfortHotel.area || comfortHotel.city || 'Scenic Zone',
    stayName: comfortHotel.name,
    stayStars: comfortHotel.starRating, // ALWAYS show real starRating! Never overwrite!
    travelMode: comfortTravelMode,
    travelTime: comfortTravelTime,
    travelDetail: comfortTravelDetail,
    hotel: comfortHotel,
    flight: comfortFlight,
    train: comfortTrain,
    plan: comfortPlan,
    diffFromBalanced: comfortDiffText
  };

  // Check for duplicates between options
  const allOptions = [budgetOption, balancedOption, comfortOption];
  const distinctOptions: PlanTierOption[] = [];
  const seenKeys = new Set<string>();

  for (const opt of allOptions) {
    const transitKey = opt.flight?.id || opt.train?.id || opt.travelMode;
    const key = `${opt.hotel.id}_${transitKey}_${opt.totalCostINR}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      distinctOptions.push(opt);
    }
  }

  // Ensure balanced is retained if possible
  if (!distinctOptions.some((o) => o.id === 'balanced') && allOptions.some((o) => o.id === 'balanced')) {
    distinctOptions.splice(1, 0, balancedOption);
  }

  return distinctOptions;
}
