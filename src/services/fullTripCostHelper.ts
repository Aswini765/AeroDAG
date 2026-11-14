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
  calculateSurpriseBufferINR
} from '../config/estimateRates';
import { roomsNeeded } from './travelRealism';

export const SURPRISE_BUFFER_PERCENT = 15;

export interface CostLineItem {
  id: string;
  name: string;
  amountINR: number;
  isEstimate: boolean;
  /** a fare we looked up (e.g. a train's class fare), not a demo price */
  checked?: boolean;
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
  baseBufferPercent: number = 15
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
  // + nights before Day 1 when the train gets in a day early (picked on the plan page)
  const nights = Math.max(1, durationDays - 1) + Math.max(0, (plan as any).userChoices?.extraNights || 0);

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

  // 1. Stay — priced per room, and a group books as many rooms as it really needs
  const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
  const people = `${totalTravellers} ${totalTravellers === 1 ? 'person' : 'people'}`;
  const hasMultipleStays = Array.isArray(plan.stays) && plan.stays.length > 1;
  const isDorm = (h?: HotelItem | null) => Boolean(h && /dorm|hostel bed/i.test(`${h.roomType} ${h.name}`));
  const roomsFor = (h?: HotelItem | null) => isDorm(h) ? totalTravellers : roomsNeeded(adults, children, seniors, h?.maxCapacity);
  const perNightOf = (h: HotelItem, n: number) => h.pricePerNightINR > 0 ? h.pricePerNightINR : Math.round((h.totalPriceINR || 0) / Math.max(1, n));
  const rooms = roomsFor(plan.hotel);
  const multiStayCost = hasMultipleStays
    ? plan.stays!.reduce((sum, st) => sum + perNightOf(st.hotel, st.nights) * st.nights * roomsFor(st.hotel), 0)
    : 0;
  const hotelNightsCost = hasMultipleStays
    ? multiStayCost
    : plan.hotel
    ? perNightOf(plan.hotel, nights) * nights * rooms
    : (plan.budget?.hotelCostINR || 0);

  const roomWord = (h?: HotelItem | null, r: number = rooms) => isDorm(h) ? `${r} bed${r > 1 ? 's' : ''}` : `${r} room${r > 1 ? 's' : ''}`;
  const staySubtitle = hasMultipleStays
    ? `${plan.stays!.map((st) => `${st.nights} night${st.nights > 1 ? 's' : ''} in ${st.baseName}`).join(' + ')}${roomsFor(plan.stays![0].hotel) > 1 ? ` · ${roomWord(plan.stays![0].hotel, roomsFor(plan.stays![0].hotel))}` : ''}`
    : plan.hotel
    ? (hotelNightsCost > 0
        ? `${plan.hotel.name} · ${rooms > 1 || isDorm(plan.hotel) ? `${roomWord(plan.hotel)} × ` : ''}${fmtINR(perNightOf(plan.hotel, nights))}/night × ${nights} night${nights > 1 ? 's' : ''}`
        : `${plan.hotel.name} · ${nights} night${nights > 1 ? 's' : ''}`)
    : `${nights} night${nights > 1 ? 's' : ''}`;

  const stayIsEstimate = hasMultipleStays
    ? plan.stays!.every((st) => st.hotel.source === 'estimate')
    : plan.hotel?.source === 'estimate';
  const stayLine: CostLineItem = {
    id: 'cost-stay',
    name: hasMultipleStays ? `Stays (${plan.stays!.length} places)` : 'Stay',
    amountINR: Math.round(hotelNightsCost),
    isEstimate: stayIsEstimate,
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
    const flightWhat = plan.flight.returnFromCode && plan.flight.returnFromCode !== plan.flight.destinationCode
      ? `Flights ${plan.flight.originCode}→${plan.flight.destinationCode}, ${plan.flight.returnFromCode}→${plan.flight.originCode}`
      : `${isRound ? 'Return' : 'One-way'} flights`;
    travelSubtitle = transferCost > 0
      ? `${flightWhat} for ${people} (${fmtINR(flightCost)}) + ${transferItem?.vehicleType || 'Private AC Sedan'} to and from the airport (${fmtINR(transferCost)})`
      : `${flightWhat} for ${people} (${fmtINR(flightCost)})`;
  } else if (plan.selectedTrain) {
    // Listed train fares (IRCTC-style) are one way: count there and back.
    // Our own bus/train estimates are already return totals.
    const oneWayListed = plan.selectedTrain.source !== 'estimate';
    const trainOnce = plan.selectedTrain.totalPriceINR || (plan.selectedTrain.pricePerPersonINR * totalTravellers) || 0;
    const trainCost = oneWayListed ? trainOnce * 2 : trainOnce;
    const isBus = plan.selectedTrain.mode === 'bus';
    // Getting to and from a station or bus stand is an auto / local cab, not an airport sedan
    const stationTransfer = Math.min(transferCost || 0, 300 * 2 * Math.max(1, Math.ceil(totalTravellers / 3)));
    travelCost = trainCost + stationTransfer;
    const what = isBus ? `${plan.selectedTrain.trainName} for ${people}` : `Train both ways for ${people}${plan.selectedTrain.selectedClass ? ` (${plan.selectedTrain.selectedClass})` : ''}`;
    travelSubtitle = stationTransfer > 0
      ? `${what} (${fmtINR(trainCost)}) + autos to and from the ${isBus ? 'bus stand' : 'station'} (${fmtINR(stationTransfer)})`
      : `${what} (${fmtINR(trainCost)})`;
  } else if (plan.transfer) {
    travelCost = plan.transfer.priceINR || transferCost || 0;
    travelSubtitle = `${plan.transfer.vehicleType || 'Private cab'} there and back`;
  } else if (plan.budget?.flightsCostINR) {
    travelCost = plan.budget.flightsCostINR + transferCost;
    travelSubtitle = `Getting there and back for ${people}`;
  } else if (transferCost > 0) {
    travelCost = transferCost;
    travelSubtitle = `${transferItem?.vehicleType || 'Private cab'} there and back`;
  }
  // A fare we estimated (not a listed sample) is labelled "Estimate"
  const travelSource = plan.flight?.source || plan.selectedTrain?.source || transferItem?.source;
  const travelLine: CostLineItem = {
    id: 'cost-travel',
    name: 'Travel to destination',
    amountINR: Math.round(travelCost),
    isEstimate: travelSource === 'estimate',
    checked: travelSource !== 'estimate' && /^Checked/.test(plan.selectedTrain?.sourceLabel || plan.flight?.sourceLabel || ''),
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
  if (plan.costTier === 'budget') {
    // Budget travellers use autos, shared jeeps and rented scooters, not a cab for the day
    localTransportCost = Math.round(localTransportCost * 0.6);
  }
  // Driving your own car: you get around in it, so no cabs — just fuel for local driving and parking
  const ownCar = /selfdrive/.test(plan.transfer?.id || '') && !plan.flight && !plan.selectedTrain;
  let localSubtitle = `Cabs and autos while you're there · about ${fmtINR(localTransportCost / durationDays)} a day`;
  if (ownCar) {
    const sd = (plan as any).userChoices?.selfDrive as { kmpl?: number; fuelPriceINR?: number; cars?: number; fuel?: string } | undefined;
    const kmpl = Math.max(5, sd?.kmpl || 15);
    const price = sd?.fuelPriceINR || 108;
    const cars = Math.max(1, sd?.cars || 1);
    const kmPerDay = 40;
    const parkingPerDay = 100;
    const perDay = Math.round((kmPerDay / kmpl) * price * cars + parkingPerDay * cars);
    localTransportCost = perDay * durationDays;
    localSubtitle = `Your own car: about ${kmPerDay} km a day (${fmtINR(Math.round((kmPerDay / kmpl) * price))} fuel) + ${fmtINR(parkingPerDay)} parking${cars > 1 ? `, × ${cars} cars` : ''} · ${fmtINR(perDay)} a day`;
  }
  const localTransportLine: CostLineItem = {
    id: 'cost-local-transport',
    name: 'Local transport',
    amountINR: Math.round(localTransportCost),
    isEstimate: true,
    subtitle: localSubtitle
  };

  // 4. Food (Estimate)
  let foodCost = plan.budget?.foodCostINR || plan.budget?.diningEstimateINR;
  if (foodCost && plan.costTier === 'budget') {
    // The Budget option eats at local dhabas and canteens: about 35% less
    foodCost = Math.round(foodCost * 0.65);
  }
  if (!foodCost || foodCost <= 0) {
    const foodTier = plan.costTier
      ? plan.costTier
      : (preferences?.budgetTier === 'Frugal')
      ? 'budget'
      : (preferences?.budgetTier === 'Luxury' ? 'comfort' : 'mid');
    foodCost = calculateFoodEstimateINR({
      adultsCount: adults,
      childrenCount: children,
      durationDays,
      tier: foodTier
    });
  }
  // Extra days at the destination because of train times (picked on the plan page) also need food
  const extraDays = Math.max(0, (plan as any).userChoices?.extraNights || 0);
  const foodDays = durationDays + extraDays;
  const foodPerPersonDay = foodCost / (totalTravellers * durationDays);
  if (extraDays > 0) foodCost = foodPerPersonDay * totalTravellers * foodDays;
  const foodLine: CostLineItem = {
    id: 'cost-food',
    name: 'Food',
    amountINR: Math.round(foodCost),
    isEstimate: true,
    subtitle: `About ${fmtINR(foodPerPersonDay)} per person a day × ${people} × ${foodDays} days${extraDays ? ` (incl. ${extraDays} extra for train times)` : ''}`
  };

  // 5. Activities (Estimate)
  let activitiesCost = plan.budget?.activitiesCostINR;
  if (!activitiesCost || activitiesCost <= 0) {
    const actTotal = (plan.itinerary || []).reduce((acc, d) => acc + (d.estimatedCostINR || 0), 0);
    activitiesCost = actTotal > 0
      ? actTotal
      : calculateActivitiesEstimateINR({ totalTravellers, durationDays });
  }
  // Keep activities believable: ₹250–₹2,500 per person per day (tickets, boat rides, guides)
  const actMin = 250 * totalTravellers * durationDays;
  const actMax = 2500 * totalTravellers * durationDays;
  activitiesCost = Math.min(actMax, Math.max(actMin, activitiesCost || 0));
  if (plan.costTier === 'budget') activitiesCost = Math.max(actMin, Math.round(activitiesCost * 0.7));
  const activitiesLine: CostLineItem = {
    id: 'cost-activities',
    name: 'Activities',
    amountINR: Math.round(activitiesCost),
    isEstimate: true,
    subtitle: 'Entry tickets and outings in your day plan'
  };

  // 6. Shopping/misc (Estimate)
  const shoppingBase = calculateShoppingMiscEstimateINR({ totalTravellers, durationDays });
  const shoppingCost = plan.costTier === 'budget' ? Math.round(shoppingBase * 0.6) : shoppingBase;
  const shoppingLine: CostLineItem = {
    id: 'cost-shopping',
    name: 'Shopping/misc',
    amountINR: Math.round(shoppingCost),
    isEstimate: true,
    subtitle: 'Small buys, tips and souvenirs'
  };

  // Subtotal before buffer
  const lines: CostLineItem[] = [
    stayLine,
    travelLine
  ];

  if (plan.interCityTravel) {
    lines.push({
      id: 'cost-intercity-travel',
      name: 'Travel between stops',
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

  // 7. Buffer for surprises (Default fixed at 15% per Prompt 1 rule; accepts custom override if explicitly provided)
  const bufferPercent = options?.customBufferPercent !== undefined
    ? options.customBufferPercent
    : SURPRISE_BUFFER_PERCENT;
  const bufferAmountINR = Math.round(subtotalINR * (bufferPercent / 100));
  const categoryBuffers: CategoryBufferBreakdown = computeCategoryWeightedBuffer(lines, bufferPercent).categoryBuffers;

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
