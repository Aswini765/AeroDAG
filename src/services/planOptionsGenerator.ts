/**
 * AeroDAG Plan Options Generator
 * 
 * Generates 2–3 options (Budget / Balanced / Comfort) differing in:
 * - Hotel tier (clean budget vs handpicked boutique vs 4-5★ premium resort)
 * - Transport (economical train/flight vs direct standard vs fastest premium flight/express)
 * 
 * Each option provides:
 * - total cost (with buffer)
 * - per-person cost
 * - stay area
 * - travel mode & travel time
 */

import { TripPlan, TripPreferences, HotelItem, FlightItem, TrainItem } from '../types/travelBooking';
import { TripPlanningEngine } from './tripPlanningEngine';
import { computeFullTripCost } from './fullTripCostHelper';

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
  const options: PlanTierOption[] = [];

  const availableHotels: HotelItem[] = (basePlan.availableHotels && basePlan.availableHotels.length > 0)
    ? basePlan.availableHotels
    : [basePlan.hotel].filter((h): h is HotelItem => Boolean(h));

  const availableFlights: FlightItem[] = (basePlan.availableFlights && basePlan.availableFlights.length > 0)
    ? basePlan.availableFlights
    : basePlan.flight ? [basePlan.flight] : [];

  const availableTrains: TrainItem[] = (basePlan.availableTrains && basePlan.availableTrains.length > 0)
    ? basePlan.availableTrains
    : basePlan.selectedTrain ? [basePlan.selectedTrain] : [];

  // Sort hotels by price per night
  const sortedHotelsAsc = [...availableHotels].sort((a, b) => a.pricePerNightINR - b.pricePerNightINR);
  const sortedHotelsDesc = [...availableHotels].sort((a, b) => b.pricePerNightINR - a.pricePerNightINR);

  // 1. BUDGET OPTION
  const budgetHotel = sortedHotelsAsc[0] || basePlan.hotel;
  let budgetFlight: FlightItem | null = null;
  let budgetTrain: TrainItem | null = null;
  let budgetTravelMode: 'Flight' | 'Train' | 'Cab' | 'Road' = 'Flight';
  let budgetTravelTime = '2h 15m';
  let budgetTravelDetail = 'Economical transit';

  if (availableTrains.length > 0) {
    const sortedTrainsAsc = [...availableTrains].sort((a, b) => a.totalPriceINR - b.totalPriceINR);
    const chosenTrain = sortedTrainsAsc[0];
    if (chosenTrain) {
      budgetTrain = chosenTrain;
      budgetFlight = null;
      budgetTravelMode = 'Train';
      budgetTravelTime = chosenTrain.duration || '8h 30m';
      budgetTravelDetail = `${chosenTrain.trainName} (${chosenTrain.selectedClass || '3A'})`;
    }
  } else if (availableFlights.length > 0) {
    const sortedFlightsAsc = [...availableFlights].sort((a, b) => a.totalPriceINR - b.totalPriceINR);
    const chosenFlight = sortedFlightsAsc[0];
    if (chosenFlight) {
      budgetFlight = chosenFlight;
      budgetTrain = null;
      budgetTravelMode = 'Flight';
      budgetTravelTime = chosenFlight.duration || '2h 15m';
      budgetTravelDetail = `${chosenFlight.airline} (${chosenFlight.flightNumber})`;
    }
  } else if (basePlan.transfer) {
    budgetTravelMode = 'Cab';
    budgetTravelTime = basePlan.transfer.duration || '4h';
    budgetTravelDetail = basePlan.transfer.vehicleType;
  }

  const budgetPlan = TripPlanningEngine.swapComponent(basePlan, {
    hotel: budgetHotel,
    flight: budgetFlight,
    train: budgetTrain
  });
  const budgetCost = computeFullTripCost(budgetPlan, preferences);

  options.push({
    id: 'budget',
    tier: 'Budget',
    title: 'Budget Friendly',
    badge: 'Best Value',
    tagline: 'Clean, value-rated stay & smart economical transport',
    totalCostINR: budgetCost.totalWithBufferINR,
    perPersonCostINR: budgetCost.perPersonINR,
    stayArea: budgetHotel.area || budgetHotel.city || 'Central Area',
    stayName: budgetHotel.name,
    stayStars: budgetHotel.starRating || 3,
    travelMode: budgetTravelMode,
    travelTime: budgetTravelTime,
    travelDetail: budgetTravelDetail,
    hotel: budgetHotel,
    flight: budgetFlight,
    train: budgetTrain,
    plan: budgetPlan
  });

  // 2. BALANCED OPTION (The primary curated plan)
  const balancedHotel = basePlan.hotel;
  let balancedTravelMode: 'Flight' | 'Train' | 'Cab' | 'Road' = 'Flight';
  let balancedTravelTime = '1h 50m';
  let balancedTravelDetail = 'Direct scheduled travel';

  if (basePlan.selectedTrain) {
    balancedTravelMode = 'Train';
    balancedTravelTime = basePlan.selectedTrain.duration || '6h';
    balancedTravelDetail = `${basePlan.selectedTrain.trainName} · Express`;
  } else if (basePlan.flight) {
    balancedTravelMode = 'Flight';
    balancedTravelTime = basePlan.flight.duration || '1h 50m';
    balancedTravelDetail = `${basePlan.flight.airline} · Non-stop`;
  } else if (basePlan.transfer) {
    balancedTravelMode = 'Cab';
    balancedTravelTime = basePlan.transfer.duration || '3h 30m';
    balancedTravelDetail = basePlan.transfer.vehicleType;
  }

  const balancedCost = computeFullTripCost(basePlan, preferences);

  options.push({
    id: 'balanced',
    tier: 'Balanced',
    title: 'Balanced',
    badge: 'Recommended',
    tagline: 'Handpicked boutique stay with optimal travel pacing',
    totalCostINR: balancedCost.totalWithBufferINR,
    perPersonCostINR: balancedCost.perPersonINR,
    stayArea: balancedHotel.area || balancedHotel.city || 'Central Area',
    stayName: balancedHotel.name,
    stayStars: balancedHotel.starRating || 4,
    travelMode: balancedTravelMode,
    travelTime: balancedTravelTime,
    travelDetail: balancedTravelDetail,
    hotel: balancedHotel,
    flight: basePlan.flight,
    train: basePlan.selectedTrain,
    plan: basePlan
  });

  // 3. COMFORT OPTION
  // Find highest tier / luxury stay
  const upgradeStay = basePlan.upgradeOptions?.[0]?.hotel;
  const comfortHotel = upgradeStay || sortedHotelsDesc[0] || basePlan.hotel;

  let comfortFlight: FlightItem | null = null;
  let comfortTrain: TrainItem | null = null;
  let comfortTravelMode: 'Flight' | 'Train' | 'Cab' | 'Road' = 'Flight';
  let comfortTravelTime = '1h 35m';
  let comfortTravelDetail = 'Fastest premium connection';

  if (availableFlights.length > 0) {
    // Sort flights by shortest duration or non-stop
    const fastestFlights = [...availableFlights].sort(
      (a, b) => parseDurationMinutes(a.duration) - parseDurationMinutes(b.duration)
    );
    const chosenFlight = fastestFlights[0];
    if (chosenFlight) {
      comfortFlight = chosenFlight;
      comfortTrain = null;
      comfortTravelMode = 'Flight';
      comfortTravelTime = chosenFlight.duration || '1h 35m';
      comfortTravelDetail = `${chosenFlight.airline} (${chosenFlight.flightNumber}) · Fastest`;
    }
  } else if (availableTrains.length > 0) {
    // Pick Vande Bharat or 1st AC / Executive
    const vbTrain = availableTrains.find((t) => t.trainName.toLowerCase().includes('vande')) || availableTrains[0];
    if (vbTrain) {
      comfortTrain = vbTrain;
      comfortFlight = null;
      comfortTravelMode = 'Train';
      comfortTravelTime = vbTrain.duration || '5h';
      comfortTravelDetail = `${vbTrain.trainName} · Executive / Chair Car`;
    }
  } else if (basePlan.transfer) {
    comfortTravelMode = 'Cab';
    comfortTravelTime = basePlan.transfer.duration || '3h';
    comfortTravelDetail = 'Premium SUV / Sedan';
  }

  const comfortPlan = TripPlanningEngine.swapComponent(basePlan, {
    hotel: comfortHotel,
    flight: comfortFlight,
    train: comfortTrain
  });
  const comfortCost = computeFullTripCost(comfortPlan, preferences);

  options.push({
    id: 'comfort',
    tier: 'Comfort',
    title: 'Comfort Plus',
    badge: 'Premium Stay',
    tagline: '4–5★ resort stay with fastest non-stop transit',
    totalCostINR: comfortCost.totalWithBufferINR,
    perPersonCostINR: comfortCost.perPersonINR,
    stayArea: comfortHotel.area || comfortHotel.city || 'Scenic Zone',
    stayName: comfortHotel.name,
    stayStars: comfortHotel.starRating >= 4 ? comfortHotel.starRating : 5,
    travelMode: comfortTravelMode,
    travelTime: comfortTravelTime,
    travelDetail: comfortTravelDetail,
    hotel: comfortHotel,
    flight: comfortFlight,
    train: comfortTrain,
    plan: comfortPlan
  });

  return options;
}
