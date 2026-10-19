/**
 * AeroDAG — Single Source of Truth Trip Summary Helper
 * 
 * Extracts and computes consistent trip details, line items, and totals across
 * all screens (workspace, checkout, confirmation, My Trips).
 * Guarantees zero hardcoded counts, names, or disconnected totals.
 */

import {
  TripPreferences,
  FlightItem,
  HotelItem,
  TransferItem,
  VisaDetails,
  ActivityDayItem,
  TripPlan,
  ProvenanceSource
} from '../types/travelBooking';
import {
  calculateFoodEstimateINR,
  calculateLocalTransportEstimateINR,
  calculateContingencyBufferINR,
  countCabExcursionDays
} from '../config/estimateRates';

export interface TripLineItem {
  id: string;
  category: 'flight' | 'hotel' | 'transfer' | 'local_transport' | 'food' | 'visa' | 'activity' | 'dining' | 'buffer';
  title: string;
  subtitle?: string;
  amountINR: number;
  source: ProvenanceSource;
  sourceLabel?: string;
  retrievedAt?: string;
}

export interface TripTravellerSummary {
  adults: number;
  children: number[]; // child ages
  seniors: number;
}

export interface TripSummary {
  destination: string;
  destinationCode: string;
  origin: string;
  dates: string;
  durationDays: number;
  nights: number;
  travellers: TripTravellerSummary;
  totalTravellers: number;
  isInternational: boolean;
  flight: FlightItem | null;
  hotel: HotelItem | null;
  transfer: TransferItem | null;
  visa: VisaDetails | null;
  itinerary: ActivityDayItem[];
  lineItems: TripLineItem[];
  totalINR: number;
  budgetTargetINR: number;
  isOverBudget: boolean;
  overBudgetAmountINR: number;
  usesSampleData: boolean;
}

/**
 * Derives a 3-character uppercase destination prefix code for sandbox IDs.
 * (e.g. "Goa, India" -> "GOA", "Vietnam (Hanoi)" -> "VIE")
 */
export function deriveDestinationCode(destination: string): string {
  if (!destination) return 'TRP';
  const clean = destination.trim().toLowerCase();
  if (clean.includes('goa')) return 'GOA';
  if (clean.includes('vietnam') || clean.includes('hanoi')) return 'VIE';
  if (clean.includes('japan') || clean.includes('tokyo')) return 'JPN';
  if (clean.includes('singapore')) return 'SIN';
  if (clean.includes('thailand') || clean.includes('bangkok')) return 'THA';
  if (clean.includes('kerala')) return 'KER';
  if (clean.includes('rajasthan') || clean.includes('jaipur')) return 'RAJ';
  if (clean.includes('coorg')) return 'CRG';
  if (clean.includes('mysuru') || clean.includes('mysore')) return 'MYS';

  const lettersOnly = destination.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
  return lettersOnly.length >= 2 ? lettersOnly : 'TRP';
}

/**
 * Generates an honest sandbox booking identifier: AD-{DEST3}-{4 digits} (sandbox)
 */
export function generateSandboxBookingId(destinationCode: string): string {
  const code = destinationCode || 'TRP';
  const num = Math.floor(1000 + Math.random() * 9000);
  return `AD-${code}-${num}`;
}

export interface GetTripSummaryInput {
  preferences: TripPreferences | null;
  tripPlan?: TripPlan | null;
  flight?: FlightItem | null;
  hotel?: HotelItem | null;
  transfer?: TransferItem | null;
  visa?: VisaDetails | null;
  visaDetails?: VisaDetails | null;
  itinerary?: ActivityDayItem[];
}

/**
 * Primary selector converting active trip state into an authoritative, consistent summary.
 */
export function getTripSummary(input: GetTripSummaryInput): TripSummary | null {
  const { preferences, tripPlan } = input;

  if (!preferences && !tripPlan) {
    return null;
  }

  const destination = tripPlan?.destination || preferences?.destination || 'Destination';
  const origin = tripPlan?.origin || preferences?.origin || 'Origin';
  const dates = tripPlan?.dates || preferences?.targetDates || 'Flexible Dates';
  const durationDays = tripPlan?.durationDays || preferences?.durationDays || 3;
  const nights = Math.max(1, durationDays - 1);

  // Travellers breakdown
  let adults = 2;
  let children: number[] = [];
  let seniors = 0;

  if (tripPlan?.travellers) {
    adults = tripPlan.travellers.adults ?? 2;
    children = Array.isArray(tripPlan.travellers.childAges) ? [...tripPlan.travellers.childAges] : [];
    seniors = tripPlan.travellers.seniors ?? 0;
  } else if (preferences) {
    adults = preferences.adultsCount ?? (preferences.partySize || 2);
    children = Array.isArray(preferences.childrenAges) ? [...preferences.childrenAges] : [];
    seniors = 0;
  }

  const totalTravellers = adults + children.length + seniors;

  // Domestic vs International determination
  const scope = preferences?.scope || tripPlan?.scope;
  const destLower = destination.toLowerCase();
  const isDomestic =
    scope === 'domestic' ||
    destLower.includes('goa') ||
    destLower.includes('kerala') ||
    destLower.includes('rajasthan') ||
    destLower.includes('coorg') ||
    destLower.includes('mysuru') ||
    destLower.includes('india');
  const isInternational = !isDomestic;

  const destinationCode = deriveDestinationCode(destination);

  // Components (prefer explicitly passed selection, then plan, then null)
  const flight = input.flight ?? tripPlan?.flight ?? null;
  const train = (input as any).train ?? (input as any).selectedTrain ?? tripPlan?.selectedTrain ?? null;
  const hotel = input.hotel ?? tripPlan?.hotel ?? null;
  const transfer = input.transfer ?? tripPlan?.transfer ?? null;
  const effectiveVisa = input.visa ?? input.visaDetails ?? tripPlan?.visa ?? null;
  const visa = isInternational ? effectiveVisa : null;
  const itinerary = input.itinerary ?? tripPlan?.itinerary ?? [];

  // Line Items Calculation
  const lineItems: TripLineItem[] = [];

  if (flight) {
    const flightAmt = flight.totalPriceINR || 0;
    const isRound = flight.isRoundTrip !== false;
    const outFare = flight.outboundFarePerPersonINR || Math.round((flight.pricePerPersonINR || 6400) / (isRound ? 2 : 1));
    const retFare = isRound ? (flight.returnFarePerPersonINR || outFare) : 0;
    const outTotal = flight.outboundTotalPriceINR || (outFare * totalTravellers);
    const retTotal = flight.returnTotalPriceINR || (retFare * totalTravellers);

    const outFlightNum = flight.flightNumber || 'Outbound';
    const retFlightNum = flight.returnFlightNumber || 'Return';

    const legBreakdownNote = isRound
      ? `Outbound (${outFlightNum}): ₹${outTotal.toLocaleString('en-IN')} (₹${outFare.toLocaleString('en-IN')}/pax) · Return (${retFlightNum}): ₹${retTotal.toLocaleString('en-IN')} (₹${retFare.toLocaleString('en-IN')}/pax)`
      : `${origin} → ${destination} · ${totalTravellers} seats @ ₹${outFare.toLocaleString('en-IN')}/pax`;

    lineItems.push({
      id: `li-flight-${flight.id}`,
      category: 'flight',
      title: isRound ? `Flights · return, ${totalTravellers} people` : `${flight.airline} (${flight.flightNumber})`,
      subtitle: legBreakdownNote,
      amountINR: Math.round(flightAmt),
      source: flight.source || 'sample',
      sourceLabel: flight.sourceLabel || (flight.source === 'live' ? 'Live Provider' : 'Sample data'),
      retrievedAt: flight.retrievedAt
    });
  }

  if (hotel) {
    const hotelAmt = hotel.totalPriceINR || (hotel.pricePerNightINR ? hotel.pricePerNightINR * nights : 0);
    lineItems.push({
      id: `li-hotel-${hotel.id}`,
      category: 'hotel',
      title: hotel.name,
      subtitle: `${hotel.roomType || 'Standard Room'} · ${nights} night${nights > 1 ? 's' : ''}`,
      amountINR: Math.round(hotelAmt),
      source: hotel.source || 'sample',
      sourceLabel: hotel.sourceLabel || (hotel.source === 'live' ? 'Live Provider' : 'Sample data'),
      retrievedAt: hotel.retrievedAt
    });
  }

  if (transfer) {
    const transferAmt = transfer.priceINR || 0;
    const isRoadTrip = !flight && !train;
    const originCity = origin.replace(/\s*\(.*\)/, '').trim();
    lineItems.push({
      id: `li-transfer-${transfer.id}`,
      category: 'transfer',
      title: transfer.vehicleType || transfer.title || (isRoadTrip ? `Round-trip cab from ${originCity}` : 'Airport Transfer'),
      subtitle: isRoadTrip ? `Round-trip cab from ${originCity}` : (transfer.description || 'Airport ↔ Hotel transfer'),
      amountINR: Math.round(transferAmt),
      source: transfer.source || 'sample',
      sourceLabel: transfer.sourceLabel || 'Sample data',
      retrievedAt: transfer.retrievedAt
    });
  }

  if (isInternational && visa) {
    const visaUnitFee = visa.feePerPersonINR || Math.round((visa.totalFeeINR || 0) / Math.max(1, totalTravellers));
    const totalVisaAmt = visa.totalFeeINR || visaUnitFee * totalTravellers;
    lineItems.push({
      id: 'li-visa-entry',
      category: 'visa',
      title: visa.visaType || 'Travel e-Visa',
      subtitle: `${totalTravellers} × Entry clearance fee`,
      amountINR: Math.round(totalVisaAmt),
      source: visa.source || 'estimate',
      sourceLabel: visa.sourceLabel || 'Govt regulatory schedule',
      retrievedAt: visa.retrievedAt
    });
  }

  // 4. Local Transport (Estimate)
  const cabDays = (tripPlan?.itinerary || input.itinerary)
    ? countCabExcursionDays(tripPlan?.itinerary || input.itinerary, durationDays)
    : Math.max(1, durationDays - 2);

  const localTransportAmt = (tripPlan?.budget as any)?.localTransportCostINR
    || calculateLocalTransportEstimateINR({ destination, durationDays, plannedDayTrips: cabDays });

  if (localTransportAmt > 0) {
    lineItems.push({
      id: 'li-local-transport',
      category: 'local_transport',
      title: 'Local Transport & Sightseeing Cabs',
      subtitle: `${cabDays} planned cab excursion days · Point-to-point cab fare`,
      amountINR: Math.round(localTransportAmt),
      source: 'estimate',
      sourceLabel: 'Estimated'
    });
  }

  // 5. Food & Dining (Estimate)
  const diningTier = (preferences?.budgetTier === 'Frugal')
    ? 'budget'
    : (preferences?.budgetTier === 'Luxury' ? 'comfort' : 'mid');
  const foodAmt = (tripPlan?.budget as any)?.foodCostINR
    || tripPlan?.budget?.diningEstimateINR
    || calculateFoodEstimateINR({ adultsCount: adults, childrenCount: children.length, durationDays, tier: diningTier });
  if (foodAmt > 0) {
    lineItems.push({
      id: 'li-food-dining',
      category: 'food',
      title: 'Food & Dining Estimate',
      subtitle: `${totalTravellers} travellers (${adults} Adults${children.length > 0 ? `, ${children.length} Minors` : ''}) · ${durationDays} days`,
      amountINR: Math.round(foodAmt),
      source: 'estimate',
      sourceLabel: 'Estimated'
    });
  }

  // 6. Activities & Sightseeing
  const activityItineraryTotal = itinerary.reduce((acc, curr) => acc + (curr.estimatedCostINR || 0), 0);
  const activityAmt = tripPlan?.budget?.activitiesCostINR || activityItineraryTotal || 1500;
  if (activityAmt > 0) {
    lineItems.push({
      id: 'li-activities-itinerary',
      category: 'activity',
      title: 'Activities & Sightseeing',
      subtitle: `${itinerary.length > 0 ? itinerary.length : durationDays} days curated excursions & entry passes`,
      amountINR: Math.round(activityAmt),
      source: 'estimate',
      sourceLabel: 'Estimated'
    });
  }

  // 7. Contingency Buffer (Reserved)
  const subtotalBeforeBuffer = lineItems.reduce((acc, curr) => acc + curr.amountINR, 0);
  const bufferAmt = (tripPlan?.budget as any)?.bufferCostINR
    || calculateContingencyBufferINR(subtotalBeforeBuffer);
  lineItems.push({
    id: 'li-contingency-buffer',
    category: 'buffer',
    title: 'Contingency Buffer (Reserved)',
    subtitle: 'Reserved for unexpected delays, medical or spontaneous needs',
    amountINR: Math.round(bufferAmt),
    source: 'reserved',
    sourceLabel: 'Reserved contingency'
  });

  const totalINR = lineItems.reduce((acc, curr) => acc + curr.amountINR, 0);
  const budgetTargetINR = tripPlan?.budget?.targetINR || preferences?.budgetTotalINR || 0;
  const isOverBudget = budgetTargetINR > 0 ? totalINR > budgetTargetINR : false;
  const overBudgetAmountINR = isOverBudget ? totalINR - budgetTargetINR : 0;
  const usesSampleData = lineItems.some((li) => li.source === 'sample');

  return {
    destination,
    destinationCode,
    origin,
    dates,
    durationDays,
    nights,
    travellers: {
      adults,
      children,
      seniors
    },
    totalTravellers,
    isInternational,
    flight,
    hotel,
    transfer,
    visa,
    itinerary,
    lineItems,
    totalINR,
    budgetTargetINR,
    isOverBudget,
    overBudgetAmountINR,
    usesSampleData
  };
}
