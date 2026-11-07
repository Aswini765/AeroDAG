/**
 * AeroDAG — Full Trip Cost Helper
 * 
 * Computes authoritative full cost lines:
 * - Stay
 * - Travel to destination
 * - Local transport (Estimate)
 * - Food (Estimate)
 * - Activities (Estimate)
 * - Shopping/misc (Estimate)
 * - 15% "buffer for surprises" line
 * - Total with the buffer
 * - "Per person: ₹X", counting children as people
 * - Budget status: under / close (within 10%) / over, with one-line tip when over.
 */

import { TripPlan, TripPreferences, FlightItem, HotelItem, TrainItem } from '../types/travelBooking';
import {
  calculateFoodEstimateINR,
  calculateLocalTransportEstimateINR,
  calculateActivitiesEstimateINR,
  calculateShoppingMiscEstimateINR,
  calculateSurpriseBufferINR,
  SURPRISE_BUFFER_PERCENT
} from '../config/estimateRates';

export interface CostLineItem {
  id: string;
  name: string;
  amountINR: number;
  isEstimate: boolean;
  subtitle?: string;
}

export interface CategoryBufferBreakdown {
  stayBufferINR: number;
  travelBufferINR: number;
  localTransportBufferINR: number;
  foodBufferINR: number;
  activitiesBufferINR: number;
  shoppingBufferINR: number;
  effectiveBufferPercent: number;
}

export interface FullTripCostCalculation {
  lines: CostLineItem[];
  subtotalINR: number;
  bufferPercent: number;
  bufferAmountINR: number;
  totalWithBufferINR: number;
  totalTravellers: number;
  perPersonINR: number;
  targetBudgetINR: number;
  budgetStatus: 'under' | 'close' | 'over';
  budgetDifferenceINR: number;
  statusLabel: string;
  statusTip?: string;
  categoryBuffers?: CategoryBufferBreakdown;
}

export function computeCategoryWeightedBuffer(
  lines: CostLineItem[],
  baseBufferPercent: number = 25
): {
  bufferAmountINR: number;
  categoryBuffers: CategoryBufferBreakdown;
} {
  // Category weights: Food & Shopping have the highest observed overruns (24-70%),
  // while pre-booked stay & travel have lower variance.
  const stayLine = lines.find((l) => l.id === 'cost-stay')?.amountINR || 0;
  const travelLine = lines.find((l) => l.id === 'cost-travel')?.amountINR || 0;
  const localTransportLine = lines.find((l) => l.id === 'cost-local-transport')?.amountINR || 0;
  const foodLine = lines.find((l) => l.id === 'cost-food')?.amountINR || 0;
  const activitiesLine = lines.find((l) => l.id === 'cost-activities')?.amountINR || 0;
  const shoppingLine = lines.find((l) => l.id === 'cost-shopping')?.amountINR || 0;

  const multiplier = baseBufferPercent / 25;
  const stayBufferINR = Math.round(stayLine * (0.10 * multiplier));
  const travelBufferINR = Math.round(travelLine * (0.05 * multiplier));
  const localTransportBufferINR = Math.round(localTransportLine * (0.25 * multiplier));
  const foodBufferINR = Math.round(foodLine * (0.35 * multiplier));
  const activitiesBufferINR = Math.round(activitiesLine * (0.15 * multiplier));
  const shoppingBufferINR = Math.round(shoppingLine * (0.40 * multiplier));

  const totalBuffer = stayBufferINR + travelBufferINR + localTransportBufferINR + foodBufferINR + activitiesBufferINR + shoppingBufferINR;
  const subtotal = stayLine + travelLine + localTransportLine + foodLine + activitiesLine + shoppingLine;
  const effectiveBufferPercent = subtotal > 0 ? Math.round((totalBuffer / subtotal) * 100) : baseBufferPercent;

  return {
    bufferAmountINR: totalBuffer,
    categoryBuffers: {
      stayBufferINR,
      travelBufferINR,
      localTransportBufferINR,
      foodBufferINR,
      activitiesBufferINR,
      shoppingBufferINR,
      effectiveBufferPercent
    }
  };
}

export function computeFullTripCost(
  plan: TripPlan,
  preferences?: TripPreferences | null,
  options?: {
    customBufferPercent?: number;
    useCategoryWeights?: boolean;
  }
): FullTripCostCalculation {
  const durationDays = Math.max(1, plan.durationDays || 3);
  const nights = Math.max(1, durationDays - 1);

  // Travellers breakdown (children count as people)
  const adults = plan.travellers?.adults ?? preferences?.adultsCount ?? 2;
  const childAges = Array.isArray(plan.travellers?.childAges)
    ? plan.travellers.childAges
    : Array.isArray(preferences?.childrenAges)
    ? preferences.childrenAges
    : [];
  const children = plan.travellers?.children ?? childAges.length ?? 0;
  const seniors = plan.travellers?.seniors ?? 0;
  const totalTravellers = Math.max(1, adults + children + seniors);

  // 1. Stay
  const hasMultipleStays = Array.isArray(plan.stays) && plan.stays.length > 1;
  const multiStayCost = hasMultipleStays
    ? plan.stays!.reduce((sum, s) => sum + (s.hotel.totalPriceINR || s.hotel.pricePerNightINR * s.nights), 0)
    : 0;
  const hotelNightsCost = hasMultipleStays
    ? multiStayCost
    : plan.hotel
    ? (plan.hotel.totalPriceINR || plan.hotel.pricePerNightINR * nights)
    : (plan.budget?.hotelCostINR || 0);

  const staySubtitle = hasMultipleStays
    ? `${plan.stays!.map((s) => `${s.nights}N in ${s.baseName}`).join(' + ')}`
    : plan.hotel
    ? `${plan.hotel.name} · ${nights} night${nights > 1 ? 's' : ''}`
    : `${nights} night${nights > 1 ? 's' : ''}`;

  const stayLine: CostLineItem = {
    id: 'cost-stay',
    name: hasMultipleStays ? `Stays (${plan.stays!.length} bases)` : 'Stay',
    amountINR: Math.round(hotelNightsCost),
    isEstimate: false,
    subtitle: staySubtitle
  };

  // 2. Travel to destination (flight / train + transfer counted once)
  const transferItem = (plan as any).selectedTransfer || plan.transfer;
  let transferCost = (transferItem && typeof transferItem.priceINR === 'number' && transferItem.priceINR > 0)
    ? transferItem.priceINR
    : ((plan.budget?.transportCostINR && plan.budget.transportCostINR > 0)
      ? plan.budget.transportCostINR
      : 0);

  // If a transfer is selected or required for flight/train transit but transferCost is 0, add standard transfer
  if (transferCost <= 0 && (transferItem || plan.flight || plan.selectedTrain)) {
    transferCost = (plan.scope === 'international') ? 3200 : 1800;
  }

  let travelCost = 0;
  let travelSubtitle = 'Direct transport';
  if (plan.flight) {
    const flightCost = plan.flight.totalPriceINR || (plan.flight.pricePerPersonINR * totalTravellers) || 0;
    travelCost = flightCost + transferCost;
    const isRound = plan.flight.isRoundTrip !== false;
    travelSubtitle = transferCost > 0
      ? `${plan.flight.airline} (${isRound ? 'Return' : 'One-way'}) + ${transferItem?.vehicleType || 'Private AC Sedan'} · ${totalTravellers} traveller${totalTravellers > 1 ? 's' : ''}`
      : `${plan.flight.airline} (${isRound ? 'Return' : 'One-way'}) · ${totalTravellers} traveller${totalTravellers > 1 ? 's' : ''}`;
  } else if (plan.selectedTrain) {
    const trainCost = plan.selectedTrain.totalPriceINR || (plan.selectedTrain.pricePerPersonINR * totalTravellers) || 0;
    travelCost = trainCost + transferCost;
    travelSubtitle = transferCost > 0
      ? `${plan.selectedTrain.trainName} + ${transferItem?.vehicleType || 'Private AC Sedan'} · ${totalTravellers} traveller${totalTravellers > 1 ? 's' : ''}`
      : `${plan.selectedTrain.trainName} · ${totalTravellers} traveller${totalTravellers > 1 ? 's' : ''}`;
  } else if (plan.transfer) {
    travelCost = plan.transfer.priceINR || transferCost || 0;
    travelSubtitle = `${plan.transfer.vehicleType || 'Private Cab Transfer'}`;
  } else if (plan.budget?.flightsCostINR) {
    travelCost = plan.budget.flightsCostINR + transferCost;
    travelSubtitle = `Transit to destination · ${totalTravellers} travellers`;
  } else if (transferCost > 0) {
    travelCost = transferCost;
    travelSubtitle = `${transferItem?.vehicleType || 'Private Cab Transfer'}`;
  }
  const travelLine: CostLineItem = {
    id: 'cost-travel',
    name: 'Travel to destination',
    amountINR: Math.round(travelCost),
    isEstimate: false,
    subtitle: travelSubtitle
  };

  // 3. Local transport (Estimate)
  let localTransportCost = plan.budget?.localTransportCostINR;
  if (!localTransportCost || localTransportCost <= 0) {
    localTransportCost = calculateLocalTransportEstimateINR({
      destination: plan.destination,
      durationDays,
      itinerary: plan.itinerary
    });
  }
  const localTransportLine: CostLineItem = {
    id: 'cost-local-transport',
    name: 'Local transport',
    amountINR: Math.round(localTransportCost),
    isEstimate: true,
    subtitle: 'Local sightseeing cabs & on-ground transit'
  };

  // 4. Food (Estimate)
  let foodCost = plan.budget?.foodCostINR || plan.budget?.diningEstimateINR;
  if (!foodCost || foodCost <= 0) {
    const foodTier = (preferences?.budgetTier === 'Frugal')
      ? 'budget'
      : (preferences?.budgetTier === 'Luxury' ? 'comfort' : 'mid');
    foodCost = calculateFoodEstimateINR({
      adultsCount: adults,
      childrenCount: children,
      durationDays,
      tier: foodTier
    });
  }
  const foodLine: CostLineItem = {
    id: 'cost-food',
    name: 'Food',
    amountINR: Math.round(foodCost),
    isEstimate: true,
    subtitle: `Daily meals & refreshments across ${durationDays} days`
  };

  // 5. Activities (Estimate)
  let activitiesCost = plan.budget?.activitiesCostINR;
  if (!activitiesCost || activitiesCost <= 0) {
    const actTotal = (plan.itinerary || []).reduce((acc, d) => acc + (d.estimatedCostINR || 0), 0);
    activitiesCost = actTotal > 0
      ? actTotal
      : calculateActivitiesEstimateINR({ totalTravellers, durationDays });
  }
  const activitiesLine: CostLineItem = {
    id: 'cost-activities',
    name: 'Activities',
    amountINR: Math.round(activitiesCost),
    isEstimate: true,
    subtitle: 'Curated sightseeing entries & excursions'
  };

  // 6. Shopping/misc (Estimate)
  const shoppingCost = calculateShoppingMiscEstimateINR({ totalTravellers, durationDays });
  const shoppingLine: CostLineItem = {
    id: 'cost-shopping',
    name: 'Shopping/misc',
    amountINR: Math.round(shoppingCost),
    isEstimate: true,
    subtitle: 'Personal shopping, souvenirs & incidental needs'
  };

  // Subtotal before buffer
  const lines: CostLineItem[] = [
    stayLine,
    travelLine
  ];

  if (plan.interCityTravel) {
    lines.push({
      id: 'cost-intercity-travel',
      name: 'Inter-city travel',
      amountINR: Math.round(plan.interCityTravel.priceINR || 6500),
      isEstimate: false,
      subtitle: plan.interCityTravel.title || 'Private AC Cab between bases'
    });
  }

  lines.push(
    localTransportLine,
    foodLine,
    activitiesLine,
    shoppingLine
  );

  const subtotalINR = lines.reduce((acc, item) => acc + item.amountINR, 0);

  // 7. Buffer for surprises (supports custom percent & category-weighted buffers)
  let bufferPercent = SURPRISE_BUFFER_PERCENT;
  let bufferAmountINR = 0;
  let categoryBuffers: CategoryBufferBreakdown;

  if (options?.useCategoryWeights) {
    const basePct = options.customBufferPercent ?? 25;
    const weighted = computeCategoryWeightedBuffer(lines, basePct);
    bufferAmountINR = weighted.bufferAmountINR;
    categoryBuffers = weighted.categoryBuffers;
    bufferPercent = weighted.categoryBuffers.effectiveBufferPercent;
  } else if (options?.customBufferPercent !== undefined) {
    bufferPercent = options.customBufferPercent;
    bufferAmountINR = Math.round(subtotalINR * (bufferPercent / 100));
    categoryBuffers = computeCategoryWeightedBuffer(lines, bufferPercent).categoryBuffers;
  } else {
    bufferPercent = SURPRISE_BUFFER_PERCENT;
    bufferAmountINR = calculateSurpriseBufferINR(subtotalINR);
    categoryBuffers = computeCategoryWeightedBuffer(lines, bufferPercent).categoryBuffers;
  }

  // 8. Total with the buffer
  const totalWithBufferINR = subtotalINR + bufferAmountINR;

  // "Per person: ₹X", with children counted as people
  const perPersonINR = Math.round(totalWithBufferINR / totalTravellers);

  // Budget status: under / close (within 10%) / over
  const targetBudgetINR = plan.budget?.targetINR || preferences?.budgetTotalINR || 60000;
  let budgetStatus: 'under' | 'close' | 'over';
  let budgetDifferenceINR = 0;
  let statusLabel = '';
  let statusTip: string | undefined = undefined;

  if (totalWithBufferINR > targetBudgetINR) {
    budgetStatus = 'over';
    budgetDifferenceINR = totalWithBufferINR - targetBudgetINR;
    statusLabel = `₹${budgetDifferenceINR.toLocaleString('en-IN')} over budget`;

    // Compute actual real savings for real alternatives (Prompt 4 rule)
    let trainSaving = 0;
    if (plan.flight && plan.availableTrains && plan.availableTrains.length > 0) {
      const cheapestTrain = [...plan.availableTrains].sort((a, b) => a.totalPriceINR - b.totalPriceINR)[0];
      const flightTotal = plan.flight.totalPriceINR || (plan.flight.pricePerPersonINR * totalTravellers);
      if (cheapestTrain && cheapestTrain.totalPriceINR < flightTotal) {
        trainSaving = Math.round((flightTotal - cheapestTrain.totalPriceINR) * (1 + bufferPercent / 100));
      }
    }

    let staySaving = 0;
    if (plan.availableHotels && plan.availableHotels.length > 0 && plan.hotel) {
      const cheaperHotels = [...plan.availableHotels].filter((h) => h.pricePerNightINR < plan.hotel.pricePerNightINR);
      if (cheaperHotels.length > 0) {
        const cheapest = cheaperHotels.sort((a, b) => a.pricePerNightINR - b.pricePerNightINR)[0];
        const diffPerNight = plan.hotel.pricePerNightINR - cheapest.pricePerNightINR;
        staySaving = Math.round(diffPerNight * nights * (1 + bufferPercent / 100));
      }
    }

    if (trainSaving > 0 && totalWithBufferINR - trainSaving <= targetBudgetINR) {
      statusTip = `Tip: Switch to a train to save ₹${trainSaving.toLocaleString('en-IN')} and fit within budget.`;
    } else if (staySaving > 0 && totalWithBufferINR - staySaving <= targetBudgetINR) {
      statusTip = `Tip: Choose a standard stay below to save ₹${staySaving.toLocaleString('en-IN')} and fit within budget.`;
    } else if (trainSaving > 0 && staySaving > 0 && totalWithBufferINR - (trainSaving + staySaving) <= targetBudgetINR) {
      statusTip = `Tip: Switch to a train and standard stay to save ₹${(trainSaving + staySaving).toLocaleString('en-IN')} and fit within budget.`;
    } else if (trainSaving > 0) {
      statusTip = `Tip: Switch to a train to save ₹${trainSaving.toLocaleString('en-IN')} (reduces total to ₹${(totalWithBufferINR - trainSaving).toLocaleString('en-IN')}).`;
    } else if (staySaving > 0) {
      statusTip = `Tip: Choose a standard stay below to save ₹${staySaving.toLocaleString('en-IN')} (reduces total to ₹${(totalWithBufferINR - staySaving).toLocaleString('en-IN')}).`;
    } else {
      statusTip = `Trip is ₹${budgetDifferenceINR.toLocaleString('en-IN')} over budget. Adjust nights or explore concrete levers below.`;
    }
  } else if (totalWithBufferINR >= targetBudgetINR * 0.90) {
    budgetStatus = 'close';
    budgetDifferenceINR = targetBudgetINR - totalWithBufferINR;
    statusLabel = 'Close to budget (within 10%)';
  } else {
    budgetStatus = 'under';
    budgetDifferenceINR = targetBudgetINR - totalWithBufferINR;
    statusLabel = `₹${budgetDifferenceINR.toLocaleString('en-IN')} under budget`;
  }

  return {
    lines,
    subtotalINR,
    bufferPercent,
    bufferAmountINR,
    totalWithBufferINR,
    totalTravellers,
    perPersonINR,
    targetBudgetINR,
    budgetStatus,
    budgetDifferenceINR,
    statusLabel,
    statusTip,
    categoryBuffers
  };
}
