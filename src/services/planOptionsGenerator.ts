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
  stayCostINR: number;
  travelCostINR: number;
  localTransportCostINR: number;
  foodCostINR: number;
  shoppingCostINR: number;
  activitiesCostINR: number;
  bufferCostINR: number;
  subtotalCostINR: number;
  categoryBuffers?: {
    stayBufferINR: number;
    travelBufferINR: number;
    localTransportBufferINR: number;
    foodBufferINR: number;
    activitiesBufferINR: number;
    shoppingBufferINR: number;
    effectiveBufferPercent: number;
  };
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
  preferences?: TripPreferences | null,
  optionsConfig?: {
    customBufferPercent?: number;
    useCategoryWeights?: boolean;
  }
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

  const extractBreakdown = (costCalc: ReturnType<typeof computeFullTripCost>) => ({
    stayCostINR: costCalc.lines.find((l) => l.id === 'cost-stay')?.amountINR || 0,
    travelCostINR: costCalc.lines.find((l) => l.id === 'cost-travel')?.amountINR || 0,
    localTransportCostINR: costCalc.lines.find((l) => l.id === 'cost-local-transport')?.amountINR || 0,
    foodCostINR: costCalc.lines.find((l) => l.id === 'cost-food')?.amountINR || 0,
    activitiesCostINR: costCalc.lines.find((l) => l.id === 'cost-activities')?.amountINR || 0,
    shoppingCostINR: costCalc.lines.find((l) => l.id === 'cost-shopping')?.amountINR || 0,
    bufferCostINR: costCalc.bufferAmountINR,
    subtotalCostINR: costCalc.subtotalINR,
    categoryBuffers: costCalc.categoryBuffers
  });

  const targetBudgetINR = preferences?.budgetTotalINR || basePlan.budget?.targetINR || 0;
  const balancedCost = computeFullTripCost(basePlan, preferences, optionsConfig);
  const isBalancedWithinBudget = targetBudgetINR > 0 ? balancedCost.totalWithBufferINR <= targetBudgetINR : true;

  const balancedOption: PlanTierOption = {
    id: 'balanced',
    tier: 'Balanced',
    title: 'Balanced',
    badge: 'Balanced',
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
    diffFromBalanced: 'Boutique stay & direct travel pacing',
    ...extractBreakdown(balancedCost)
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
  const budgetCost = computeFullTripCost(budgetPlan, preferences, optionsConfig);

  const budgetDiffINR = balancedCost.totalWithBufferINR - budgetCost.totalWithBufferINR;
  let budgetDiffText = 'Value stay & smart economical transit';
  if (budgetDiffINR > 0) {
    budgetDiffText = travelDiff
      ? `₹${budgetDiffINR.toLocaleString('en-IN')} cheaper · ${travelDiff}`
      : `₹${budgetDiffINR.toLocaleString('en-IN')} cheaper · value stay`;
  }

  const prefsBudget = (preferences as any)?.budgetTotalINR || (preferences as any)?.budgetLimitINR || (preferences as any)?.budget || 0;
  const planBudget = basePlan.budget?.targetINR || (basePlan as any)?.tripContext?.budgetTotalINR || (basePlan as any)?.tripContext?.budget || 0;
  const targetBudget = prefsBudget > 0 ? prefsBudget : planBudget;

  let budgetBadge = 'Best Value';
  if (targetBudget > 0) {
    if (budgetCost.totalWithBufferINR <= targetBudget) {
      budgetBadge = 'Fits your budget';
    } else {
      const overBudgetDiff = budgetCost.totalWithBufferINR - targetBudget;
      budgetBadge = `Cheapest option · ₹${overBudgetDiff.toLocaleString('en-IN')} over budget`;
    }
  }

  const budgetOption: PlanTierOption = {
    id: 'budget',
    tier: 'Budget',
    title: 'Budget Friendly',
    badge: budgetBadge,
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
    diffFromBalanced: budgetDiffText,
    ...extractBreakdown(budgetCost)
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
  const comfortCost = computeFullTripCost(comfortPlan, preferences, optionsConfig);

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
    diffFromBalanced: comfortDiffText,
    ...extractBreakdown(comfortCost)
  };

  // PRD & Prompt 5 Rule:
  // 1. Budget < Balanced < Comfort in total, always; each differs in stay or transport mode.
  // If two would be equal, show fewer and say "Only N real options for this trip".
  const sameStay = (budgetOption.hotel.id === balancedOption.hotel.id || budgetOption.hotel.name === balancedOption.hotel.name);
  const sameTransportMode = budgetOption.travelMode === balancedOption.travelMode;
  const budgetDiffersReal = !sameStay || !sameTransportMode;

  const candidateOptions: PlanTierOption[] = [];

  // Budget option included only if strictly cheaper than Balanced AND differs in stay or transport mode
  if (budgetOption.totalCostINR < balancedCost.totalWithBufferINR && budgetDiffersReal) {
    candidateOptions.push(budgetOption);
  }

  // Balanced option is the reference baseline
  candidateOptions.push(balancedOption);

  // Comfort option included only if strictly more expensive than Balanced
  if (comfortOption.totalCostINR > balancedCost.totalWithBufferINR) {
    candidateOptions.push(comfortOption);
  }

  // Enforce strictly unique totals and strictly ascending order: Budget < Balanced < Comfort
  const distinctOptions: PlanTierOption[] = [];
  const seenTotals = new Set<number>();

  for (const opt of candidateOptions) {
    if (!seenTotals.has(opt.totalCostINR)) {
      seenTotals.add(opt.totalCostINR);
      distinctOptions.push(opt);
    }
  }

  // Determine "Recommended": highest-comfort option whose total <= targetBudget
  // Hierarchy: Comfort > Balanced > Budget. None if over budget!
  let recommendedId: 'comfort' | 'balanced' | 'budget' | null = null;
  if (targetBudget > 0) {
    const comfortFits = distinctOptions.find((o) => o.id === 'comfort' && o.totalCostINR <= targetBudget);
    const balancedFits = distinctOptions.find((o) => o.id === 'balanced' && o.totalCostINR <= targetBudget);
    const budgetFits = distinctOptions.find((o) => o.id === 'budget' && o.totalCostINR <= targetBudget);

    if (comfortFits) {
      recommendedId = 'comfort';
    } else if (balancedFits) {
      recommendedId = 'balanced';
    } else if (budgetFits) {
      recommendedId = 'budget';
    }
    // If NONE fits (all > targetBudget), recommendedId remains null!
  }

  for (const opt of distinctOptions) {
    if (recommendedId && opt.id === recommendedId) {
      opt.badge = 'Recommended';
    } else if (targetBudget > 0 && opt.totalCostINR <= targetBudget) {
      opt.badge = opt.id === 'budget' ? 'Fits your budget' : opt.tier;
    } else if (targetBudget > 0 && opt.totalCostINR > targetBudget) {
      const overDiff = opt.totalCostINR - targetBudget;
      opt.badge = `+₹${overDiff.toLocaleString('en-IN')} over budget`;
    } else {
      opt.badge = opt.tier;
    }
  }

  return distinctOptions;
}
