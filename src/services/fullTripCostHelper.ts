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
}

export function computeFullTripCost(
  plan: TripPlan,
  preferences?: TripPreferences | null
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
  const hotelNightsCost = plan.hotel
    ? (plan.hotel.totalPriceINR || plan.hotel.pricePerNightINR * nights)
    : (plan.budget?.hotelCostINR || 0);
  const stayLine: CostLineItem = {
    id: 'cost-stay',
    name: 'Stay',
    amountINR: Math.round(hotelNightsCost),
    isEstimate: false,
    subtitle: plan.hotel
      ? `${plan.hotel.name} · ${nights} night${nights > 1 ? 's' : ''}`
      : `${nights} night${nights > 1 ? 's' : ''}`
  };

  // 2. Travel to destination (flight / train + transfer counted once)
  const transferItem = (plan as any).selectedTransfer || plan.transfer;
  const transferCost = (transferItem && transferItem.priceINR && transferItem.priceINR > 0)
    ? transferItem.priceINR
    : 0;

  let travelCost = 0;
  let travelSubtitle = 'Direct transport';
  if (plan.flight) {
    const flightCost = plan.flight.totalPriceINR || (plan.flight.pricePerPersonINR * totalTravellers) || 0;
    travelCost = flightCost + transferCost;
    const isRound = plan.flight.isRoundTrip !== false;
    travelSubtitle = transferCost > 0
      ? `${plan.flight.airline} (${isRound ? 'Return' : 'One-way'}) + ${transferItem?.vehicleType || 'Transfer'} · ${totalTravellers} traveller${totalTravellers > 1 ? 's' : ''}`
      : `${plan.flight.airline} (${isRound ? 'Return' : 'One-way'}) · ${totalTravellers} traveller${totalTravellers > 1 ? 's' : ''}`;
  } else if (plan.selectedTrain) {
    const trainCost = plan.selectedTrain.totalPriceINR || (plan.selectedTrain.pricePerPersonINR * totalTravellers) || 0;
    travelCost = trainCost + transferCost;
    travelSubtitle = transferCost > 0
      ? `${plan.selectedTrain.trainName} + ${transferItem?.vehicleType || 'Transfer'} · ${totalTravellers} traveller${totalTravellers > 1 ? 's' : ''}`
      : `${plan.selectedTrain.trainName} · ${totalTravellers} traveller${totalTravellers > 1 ? 's' : ''}`;
  } else if (plan.transfer) {
    travelCost = plan.transfer.priceINR || 0;
    travelSubtitle = `${plan.transfer.vehicleType || 'Private Cab Transfer'}`;
  } else if (plan.budget?.flightsCostINR) {
    travelCost = plan.budget.flightsCostINR + transferCost;
    travelSubtitle = `Transit to destination · ${totalTravellers} travellers`;
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
    travelLine,
    localTransportLine,
    foodLine,
    activitiesLine,
    shoppingLine
  ];

  const subtotalINR = lines.reduce((acc, item) => acc + item.amountINR, 0);

  // 7. 15% Buffer for surprises
  const bufferAmountINR = calculateSurpriseBufferINR(subtotalINR);

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
    statusTip = `Tip: Switch to a train or choose a standard stay below to save ₹${budgetDifferenceINR.toLocaleString('en-IN')} and fit within budget.`;
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
    bufferPercent: SURPRISE_BUFFER_PERCENT,
    bufferAmountINR,
    totalWithBufferINR,
    totalTravellers,
    perPersonINR,
    targetBudgetINR,
    budgetStatus,
    budgetDifferenceINR,
    statusLabel,
    statusTip
  };
}
