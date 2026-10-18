/**
 * Consumer Travel Platform Types for AeroDAG
 */

export type Currency = 'INR' | 'USD' | 'EUR' | 'SGD' | 'AED' | 'JPY';

export type TripScope = 'domestic' | 'international';

export type ProvenanceSource = 'live' | 'estimate' | 'sample' | 'reserved' | 'stated' | 'assumed';

export type BookingState =
  | 'SEARCHED'
  | 'AVAILABLE'
  | 'SELECTED'
  | 'HELD'
  | 'PAYMENT_PROCESSING'
  | 'CONFIRMED'
  | 'SIMULATED'
  | 'EXPIRED'
  | 'UNAVAILABLE'
  | 'HOLD_EXPIRED'
  | 'PAYMENT_FAILED'
  | 'CANCEL_REQUESTED'
  | 'CANCELLED'
  | 'REFUND_PROCESSING'
  | 'REFUNDED'
  | 'REFUND_FAILED'
  | 'FAILED';

export interface TrainItem {
  id: string;
  trainName: string;
  trainNumber: string;
  fromStation: string;
  toStation: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  classes: Array<{
    code: '1A' | '2A' | '3A' | 'CC' | 'EC' | 'SL';
    name: string;
    fareINR: number;
    availability: string;
    isAvailable: boolean;
  }>;
  selectedClass: '1A' | '2A' | '3A' | 'CC' | 'EC' | 'SL';
  pricePerPersonINR: number;
  totalPriceINR: number;
  foodIncluded: boolean;
  isVandeBharatOrRajdhani: boolean;
  source?: ProvenanceSource;
  sourceLabel?: string;
  retrievedAt?: string;
}

export interface FlightItem {
  id: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  originCode: string;
  originCity: string;
  destinationCode: string;
  destinationCity: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: string;
  layoverDetails?: string;
  pricePerPersonINR: number;
  totalPriceINR: number;
  pricePerPersonUSD: number;
  totalPriceUSD: number;
  baggage: string;
  cabinClass: string;
  refundable: boolean;
  seatAvailability: number;
  tag?: 'Best for Families' | 'Lowest Fare' | 'Fastest' | 'Recommended';
  adjacentFamilySeatsGuaranteed?: boolean;
  adjacentFamilySeatsRequested?: boolean;
  isRoundTrip?: boolean;
  returnFlightNumber?: string;
  returnDepartureTime?: string;
  returnArrivalTime?: string;
  outboundFarePerPersonINR?: number;
  returnFarePerPersonINR?: number;
  outboundTotalPriceINR?: number;
  returnTotalPriceINR?: number;
  source?: ProvenanceSource;
  sourceLabel?: string;
  retrievedAt?: string;
}

export interface HotelItem {
  id: string;
  name: string;
  area: string;
  city: string;
  starRating: number;
  reviewScore: number;
  reviewsCount: number;
  roomType: string;
  bedConfiguration: string;
  maxCapacity: number;
  capacityVerifiedForFamily?: boolean;
  pricePerNightINR: number;
  totalPriceINR: number;
  pricePerNightUSD: number;
  totalPriceUSD: number;
  amenities: string[];
  breakfastIncluded: boolean;
  freeCancellation: boolean;
  distanceFromCenter: string;
  imageUrl: string;
  tag?: 'Best Match' | 'Family-Friendly' | 'Within Budget' | 'Luxury Splurge';
  source?: ProvenanceSource;
  sourceLabel?: string;
  retrievedAt?: string;
  cancellationPolicy?: string;
  googleMapsVerified?: boolean;
  googleMapsUrl?: string;
  subZoneType?: 'peaceful_family' | 'vibrant_nightlife' | 'nature_retreat' | 'heritage_cultural';
  verifiedReviews?: VerifiedReviewItem[];
  matchingNeedsTags?: string[];
}

export interface TransferItem {
  id: string;
  title: string;
  vehicleType: string;
  capacityPassengers: number;
  luggageCapacity: number;
  priceINR: number;
  priceUSD: number;
  description: string;
  duration: string;
  pickupLocation: string;
  dropLocation: string;
  source?: ProvenanceSource;
  sourceLabel?: string;
  retrievedAt?: string;
  driverBehaviorRating?: number;
  driverVettingNote?: string;
  seatTypeVerified?: string;
}

export interface VerifiedReviewItem {
  id: string;
  author: string;
  persona: string;
  rating: number;
  date: string;
  verifiedStay: boolean;
  comment: string;
  highlightBadge?: string;
}

export interface ActivityDayItem {
  day: number;
  dateStr: string;
  title: string;
  theme: string;
  morning: string;
  afternoon: string;
  evening: string;
  familyFriendlyScore?: number;
  estimatedCostINR: number;
  estimatedCostUSD: number;
  localDining: string[];
  transitTip: string;
  walkingLevel?: 'very light' | 'light' | 'moderate';
  walkingFlag?: string;
  stopDriveTimes?: Array<{ from: string; to: string; driveMinutes: number; note: string }>;
  source?: ProvenanceSource;
  sourceLabel?: string;
  retrievedAt?: string;
}

export interface VisaDetails {
  country: string;
  visaType: string;
  feePerPersonINR: number;
  feePerPersonUSD: number;
  totalFeeINR: number;
  totalFeeUSD: number;
  processingTime: string;
  passportValidityRequired: string;
  officialSourceUrl: string;
  requiredDocuments: string[];
  notes: string;
  source?: ProvenanceSource;
  sourceLabel?: string;
  retrievedAt?: string;
}

export interface DiningItem {
  id: string;
  name: string;
  cuisine: string;
  area: string;
  priceForTwoINR: number;
  rating: number;
  isPureVeg: boolean;
  isJainFriendly: boolean;
  isFamilyFriendly: boolean;
  recommendedDishes: string[];
  imageUrl: string;
  source?: ProvenanceSource;
  sourceLabel?: string;
  retrievedAt?: string;
}

export interface VerificationCheck {
  id: string;
  title: string;
  category: 'capacity' | 'budget' | 'visa' | 'schedule';
  status: 'PASS' | 'NEEDS_REVIEW' | 'REPLAN' | 'FAILED' | 'pass' | 'warn' | 'fail' | 'not_applicable';
  detail: string;
  warningFix?: string;
  whatWasChecked?: string;
}

export interface RefinementLogItem {
  id: string;
  timestamp: string;
  userPrompt: string;
  actionTaken: string;
  impactSummary: string;
}

export interface Passenger {
  type: 'ADULT' | 'CHILD' | 'SENIOR';
  title: string;
  firstName: string;
  lastName: string;
  age?: number;
  passportNumber?: string;
  aadhaarOrId?: string;
  nationality?: string;
  mealPreference?: string;
}

export interface TripPreferences {
  destination: string;
  origin: string;
  targetDates: string;
  durationDays: number;
  partySize: number;
  adultsCount: number;
  childrenCount: number;
  childrenAges: number[];
  budgetTotalINR: number;
  budgetTotalUSD: number;
  budgetTier: 'Frugal' | 'Comfortable' | 'Premium' | 'Luxury';
  travelStyle: 'Relaxed' | 'Balanced' | 'Action-Packed';
  priority: 'Family Friendly' | 'Lowest Price' | 'Best Hotel' | 'Fastest Travel';
  accommodationPreference: 'Connecting Family Suite' | 'Standard 3-Star' | 'Boutique' | '4-5 Star Luxury';
  dietaryOrNotes: string;
  scope?: TripScope;
  transportMode?: 'Flight' | 'Train' | 'Combo' | 'Cab';
  dietaryPreference?: 'Vegetarian' | 'Jain' | 'Non-Veg' | 'Any';
  selectedTrain?: TrainItem;
  tripNeeds?: string[];
}

export interface ConfirmedBookingRecord {
  bookingId: string;
  pnr: string;
  hotelVoucherId: string;
  trainPnr?: string;
  createdAt: string;
  status: BookingState;
  tripTitle: string;
  destination: string;
  origin: string;
  travelDates: string;
  totalPaidINR: number;
  totalPaidUSD: number;
  budgetTotalINR?: number;
  remainingBudgetINR?: number;
  passengers: Passenger[];
  selectedFlight?: FlightItem | null;
  selectedTrain?: TrainItem | null;
  selectedHotel?: HotelItem | null;
  selectedTransfer?: TransferItem | null;
  itinerary: ActivityDayItem[];
  visa?: VisaDetails | null;
  scope?: TripScope;
  savedPlan?: TripPlan;
  savedPreferences?: TripPreferences;
}

export type ActivityCategory =
  | 'Beach'
  | 'Nature'
  | 'Culture'
  | 'Sightseeing'
  | 'Food'
  | 'Shopping'
  | 'Adventure'
  | 'Relaxation';

export interface ActivityItem {
  id: string;
  name: string;
  category: ActivityCategory;
  location: string;
  duration: string;
  ageSuitability: string;
  minAge?: number;
  estimatedPriceINR: number;
  walkingLevel: 'Low' | 'Moderate' | 'Active';
  walkingIntensity?: 'Low' | 'Moderate' | 'High';
  familySuitabilityScore?: number;
  seniorSuitability?: boolean;
  description: string;
  timeSlot?: 'Morning' | 'Afternoon' | 'Evening';
  imageUrl?: string;
  dayNumber?: number;
  isIncluded?: boolean;
  source?: ProvenanceSource;
  sourceLabel?: string;
  retrievedAt?: string;
}

export interface MapWaypoint {
  id: string;
  name: string;
  type: 'origin' | 'destination' | 'hotel' | 'activity' | 'airport' | 'station';
  area: string;
  coordinates?: { lat: number; lng: number };
  description: string;
  dayNumber?: number;
}

export interface ConcreteBudgetFix {
  id: string;
  title: string;
  description: string;
  rupeeImpactINR: number;
  actionType: 'fewer_nights' | 'mode_switch' | 'budget_hotel' | 'cheaper_dates';
}

export interface BalancingOption {
  id: string;
  title: string;
  description: string;
  rupeeImpactINR: number;
}

export interface PlanUpgradeOption {
  id: string;
  title: string;
  description: string;
  deltaINR: number;
  deltaText: string;
  hotel: HotelItem;
  balancingOptions: BalancingOption[];
}

export interface TripPlanBudget {
  targetINR: number;
  flightsCostINR: number;
  hotelCostINR: number;
  transportCostINR: number; // Airport transfers
  localTransportCostINR?: number; // Local cabs and excursions
  foodCostINR?: number; // Food & dining estimate
  activitiesCostINR: number;
  diningEstimateINR: number;
  bufferCostINR?: number; // Reserved contingency buffer
  otherCostsINR: number;
  grandTotalINR: number;
  remainingBudgetINR: number;
  overBudgetAmountINR: number;
  isOverBudget: boolean;
  statusMessage?: string;
  foreignCurrencyBreakdowns?: Array<{
    amount: number;
    sourceCurrency: string;
    exchangeRate: number;
    rateTimestamp: string;
    targetCurrency: string;
    convertedAmount: number;
    provider: string;
    cached?: boolean;
    isStale?: boolean;
  }>;
}

export interface TripPlan {
  id: string;
  title: string;
  summary: string;
  destination: string;
  origin: string;
  dates: string;
  durationDays: number;
  travellers: {
    total: number;
    adults: number;
    children: number;
    childAges: number[];
    seniors: number;
  };
  scope: TripScope;
  status?: 'feasible' | 'infeasible';
  shortfallINR?: number;
  concreteFixes?: ConcreteBudgetFix[];
  upgradeOptions?: PlanUpgradeOption[];
  airportSelectionReason?: string;
  hotelZone?: string;
  arrivalAirportCode?: string;
  arrivalAirportName?: string;
  flight: FlightItem | null;
  availableFlights: FlightItem[];
  selectedTrain?: TrainItem;
  availableTrains?: TrainItem[];
  hotel: HotelItem;
  availableHotels: HotelItem[];
  transfer: TransferItem;
  availableTransfers: TransferItem[];
  activities: ActivityItem[];
  availableActivities: ActivityItem[];
  itinerary: ActivityDayItem[];
  diningSuggestions: DiningItem[];
  visa?: VisaDetails | null;
  budget: TripPlanBudget;
  mapWaypoints: MapWaypoint[];
  recommendations: string[];
  verificationChecks: VerificationCheck[];
  createdAt: string;
  seasonalRecommendation?: SeasonalRecommendation;
  routeComparison?: RouteDiscoveryComparison;
  budgetBuffer?: RealisticBudgetBuffer;
  trustVerification?: TrustVerificationDetails;
  isAiEstimatedDestination?: boolean;
}

export interface RouteOption {
  mode: 'Flight' | 'Train' | 'Bus' | 'Road' | 'Combo';
  title: string;
  duration: string;
  costINR: number;
  timeSavedText?: string;
  scenicScore: number; // 1 to 10
  scenicHighlight: string;
  sensoryHighlights?: string[];
  tradeOffNote: string;
  isRecommended?: boolean;
}

export interface RouteDiscoveryComparison {
  options: RouteOption[];
  recommendedMode: string;
  sensoryHighlights: string[];
}

export interface SeasonalRecommendation {
  bestTiming: string;
  peakExperience: string;
  crowdLevel: string;
  personaSubzoneNote: string;
  weatherNote: string;
}

export interface RealisticBudgetBuffer {
  percentage: number; // e.g. 15 or 20
  amountINR: number;
  breakdown: {
    onGroundFoodAndSnacksINR: number;
    localTransitAndAutosINR: number;
    shoppingAndIncidentalsINR: number;
  };
  hiddenCostWarnings: string[];
}

export interface TrustVerificationDetails {
  googleMapsVerified: boolean;
  googleMapsUrl?: string;
  streetViewBadge?: string;
  seatTypeVerified?: string;
  driverBehaviorRating?: number;
  driverVettingNote?: string;
  verifiedReviews: VerifiedReviewItem[];
}

