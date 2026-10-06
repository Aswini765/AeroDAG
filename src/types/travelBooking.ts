/**
 * Consumer Travel Platform Types for AeroDAG
 */

export type Currency = 'INR' | 'USD' | 'EUR' | 'SGD' | 'AED' | 'JPY';

export type TripScope = 'domestic' | 'international';

export type BookingState =
  | 'SEARCHED'
  | 'AVAILABLE'
  | 'SELECTED'
  | 'HELD'
  | 'PAYMENT_PROCESSING'
  | 'CONFIRMED'
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
  adjacentFamilySeatsGuaranteed: boolean;
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
  capacityVerifiedForFamily: boolean;
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
}

export interface ActivityDayItem {
  day: number;
  dateStr: string;
  title: string;
  theme: string;
  morning: string;
  afternoon: string;
  evening: string;
  familyFriendlyScore: number;
  estimatedCostINR: number;
  estimatedCostUSD: number;
  localDining: string[];
  transitTip: string;
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
}

export interface VerificationCheck {
  id: string;
  title: string;
  category: 'capacity' | 'budget' | 'visa' | 'schedule';
  status: 'PASS' | 'NEEDS_REVIEW' | 'REPLAN' | 'FAILED';
  detail: string;
}

export interface RefinementLogItem {
  id: string;
  timestamp: string;
  userPrompt: string;
  actionTaken: string;
  impactSummary: string;
}

export interface Passenger {
  type: 'ADULT' | 'CHILD';
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
  passengers: Passenger[];
  selectedFlight?: FlightItem;
  selectedTrain?: TrainItem;
  selectedHotel: HotelItem;
  selectedTransfer: TransferItem;
  itinerary: ActivityDayItem[];
  visa: VisaDetails;
  scope?: TripScope;
}
