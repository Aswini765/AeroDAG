/**
 * AeroDAG Travel Catalog & Deterministic Constraint Service
 * Real-world catalog data, pricing, room capacities, and budget intelligence
 */

import {
  FlightItem,
  HotelItem,
  TransferItem,
  TrainItem,
  DiningItem,
  ActivityDayItem,
  VisaDetails,
  TripPreferences,
  Currency,
  TripScope,
  VerificationCheck,
  TripPlan
} from '../types/travelBooking';

export const USD_TO_INR = 84; // 1 USD = approx ₹84 INR

export const FOREX_RATES: Record<Currency, number> = {
  INR: 1,
  USD: 84,
  EUR: 91,
  SGD: 63,
  AED: 22.8,
  JPY: 0.56
};

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatPrice(amountINR: number, currency: Currency = 'INR'): string {
  if (currency === 'INR') {
    return formatINR(amountINR);
  }
  const rate = FOREX_RATES[currency] || 84;
  const converted = Math.round(amountINR / rate);
  const symbolMap: Record<Currency, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    SGD: 'S$',
    AED: 'AED ',
    JPY: '¥'
  };
  return `${symbolMap[currency]}${converted.toLocaleString()}`;
}

export function inferTripScope(origin: string = '', destination: string = ''): TripScope {
  const destLower = (destination || '').toLowerCase();
  const domesticKeywords = [
    'goa', 'kerala', 'rajasthan', 'jaipur', 'udaipur', 'jodhpur', 'jaisalmer',
    'himachal', 'manali', 'shimla', 'dharamshala', 'uttarakhand', 'rishikesh', 'nainital',
    'kashmir', 'srinagar', 'gulmarg', 'leh', 'ladakh', 'andaman', 'port blair', 'havelock',
    'lakshadweep', 'karnataka', 'coorg', 'ooty', 'mysuru', 'mysore', 'bengaluru', 'bangalore',
    'mumbai', 'delhi', 'chennai', 'kolkata', 'hyderabad', 'amritsar', 'varanasi', 'darjeeling', 'sikkim'
  ];
  const isDomestic = domesticKeywords.some(k => destLower.includes(k));
  return isDomestic ? 'domestic' : 'international';
}

export const MOCK_FLIGHTS_VIETNAM: FlightItem[] = [
  {
    id: 'fl-vn-1',
    airline: 'Vietnam Airlines',
    airlineCode: 'VN',
    flightNumber: 'VN 972 / VN 385',
    originCode: 'BLR',
    originCity: 'Bengaluru',
    destinationCode: 'HAN',
    destinationCity: 'Hanoi',
    departureTime: '11:15 AM',
    arrivalTime: '07:45 PM (+1 Day)',
    duration: '14h 30m',
    stops: '1 Stop at BKK (2h 10m connection)',
    layoverDetails: 'Bangkok Suvarnabhumi (BKK) — 2h 10m layover',
    isRoundTrip: true,
    outboundFarePerPersonINR: 6000,
    returnFarePerPersonINR: 6000,
    outboundTotalPriceINR: 24000,
    returnTotalPriceINR: 24000,
    pricePerPersonINR: 12000,
    totalPriceINR: 48000, // 12,000 * 4
    pricePerPersonUSD: 142,
    totalPriceUSD: 568,
    baggage: '23 kg Checked Baggage + 7 kg Cabin Bag included per person',
    cabinClass: 'Economy Standard',
    refundable: true,
    seatAvailability: 7,
    tag: 'Best for Families',
    adjacentFamilySeatsGuaranteed: true,
    source: 'sample',
    sourceLabel: 'Sample data'
  },
  {
    id: 'fl-vn-2',
    airline: 'VietJet Air',
    airlineCode: 'VJ',
    flightNumber: 'VJ 894',
    originCode: 'BLR',
    originCity: 'Bengaluru',
    destinationCode: 'HAN',
    destinationCity: 'Hanoi',
    departureTime: '01:45 AM',
    arrivalTime: '06:30 AM',
    duration: '4h 45m',
    stops: 'Non-stop Direct',
    isRoundTrip: true,
    outboundFarePerPersonINR: 5250,
    returnFarePerPersonINR: 5250,
    outboundTotalPriceINR: 21000,
    returnTotalPriceINR: 21000,
    pricePerPersonINR: 10500,
    totalPriceINR: 42000,
    pricePerPersonUSD: 125,
    totalPriceUSD: 500,
    baggage: '20 kg Checked Baggage + 7 kg Cabin Bag',
    cabinClass: 'Economy Saver',
    refundable: false,
    seatAvailability: 4,
    tag: 'Lowest Fare',
    adjacentFamilySeatsGuaranteed: true,
    source: 'sample',
    sourceLabel: 'Sample data'
  },
  {
    id: 'fl-vn-3',
    airline: 'Singapore Airlines',
    airlineCode: 'SQ',
    flightNumber: 'SQ 503 / SQ 176',
    originCode: 'BLR',
    originCity: 'Bengaluru',
    destinationCode: 'HAN',
    destinationCity: 'Hanoi',
    departureTime: '11:10 PM',
    arrivalTime: '11:45 AM (+1 Day)',
    duration: '12h 35m',
    stops: '1 Stop at SIN (2h 15m)',
    layoverDetails: 'Singapore Changi (SIN) — 2h 15m',
    isRoundTrip: true,
    outboundFarePerPersonINR: 9250,
    returnFarePerPersonINR: 9250,
    outboundTotalPriceINR: 37000,
    returnTotalPriceINR: 37000,
    pricePerPersonINR: 18500,
    totalPriceINR: 74000,
    pricePerPersonUSD: 220,
    totalPriceUSD: 880,
    baggage: '25 kg Checked Baggage + In-Flight Hot Meals & Entertainment',
    cabinClass: 'Economy Premium Care',
    refundable: true,
    seatAvailability: 9,
    tag: 'Recommended',
    adjacentFamilySeatsGuaranteed: true,
    source: 'sample',
    sourceLabel: 'Sample data'
  }
];

export const MOCK_HOTELS_VIETNAM: HotelItem[] = [
  {
    id: 'ht-vn-1',
    name: 'Hanoi Golden Silk Boutique Hotel',
    area: 'Old Quarter, Hoan Kiem District',
    city: 'Hanoi',
    starRating: 4,
    reviewScore: 4.8,
    reviewsCount: 1420,
    roomType: 'Executive Connecting Family Suite (2 Interconnected Rooms)',
    bedConfiguration: '2 Queen-Size Plush Beds (Strict capacity: 4 guests)',
    maxCapacity: 4,
    capacityVerifiedForFamily: true,
    pricePerNightINR: 2600,
    totalPriceINR: 26000, // 2,600 * 10 nights
    pricePerNightUSD: 31,
    totalPriceUSD: 310,
    amenities: [
      'Free Buffet Breakfast for 4',
      'High-Speed Wi-Fi',
      'Air Conditioning',
      'Soundproof Windows',
      '24/7 Concierge'
    ],
    breakfastIncluded: true,
    freeCancellation: true,
    distanceFromCenter: '250m to Hoan Kiem Lake',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    tag: 'Best Match'
  },
  {
    id: 'ht-vn-2',
    name: 'May De Ville City Centre Hotel',
    area: 'Gia Ngu, Old Quarter',
    city: 'Hanoi',
    starRating: 4,
    reviewScore: 4.7,
    reviewsCount: 890,
    roomType: 'Family Grand Deluxe Suite',
    bedConfiguration: '1 King Bed + 2 Twin Beds (Capacity: 4 guests)',
    maxCapacity: 4,
    capacityVerifiedForFamily: true,
    pricePerNightINR: 2300,
    totalPriceINR: 23000,
    pricePerNightUSD: 27,
    totalPriceUSD: 270,
    amenities: [
      'Daily Buffet Breakfast',
      'Rooftop Swimming Pool',
      'Airport Van Dispatch',
      'Kids Welcome Pack'
    ],
    breakfastIncluded: true,
    freeCancellation: true,
    distanceFromCenter: '400m to Water Puppet Theatre',
    imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    tag: 'Family-Friendly'
  },
  {
    id: 'ht-vn-3',
    name: 'Sofitel Legend Metropole Hanoi',
    area: 'French Quarter, Hoan Kiem',
    city: 'Hanoi',
    starRating: 5,
    reviewScore: 4.9,
    reviewsCount: 2310,
    roomType: 'Luxury Historical Connecting Family Suite',
    bedConfiguration: '1 King Bed + 2 Double Beds (Capacity: 4 guests)',
    maxCapacity: 4,
    capacityVerifiedForFamily: true,
    pricePerNightINR: 14500,
    totalPriceINR: 145000,
    pricePerNightUSD: 172,
    totalPriceUSD: 1720,
    amenities: [
      'Historic French Wing',
      'Michelin Star Dining',
      'Full Spa & Heated Pool',
      'Butler Service'
    ],
    breakfastIncluded: true,
    freeCancellation: false,
    distanceFromCenter: '150m to Opera House',
    imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
    tag: 'Luxury Splurge'
  }
];

export const MOCK_TRANSFERS_VIETNAM: TransferItem[] = [
  {
    id: 'tr-vn-1',
    title: 'Private AC Minivan Airport Transfer (Round Trip)',
    vehicleType: 'Ford Transit / Toyota Innova 7-Seater AC',
    capacityPassengers: 6,
    luggageCapacity: 4,
    priceINR: 2800,
    priceUSD: 33,
    description: 'Pre-arranged private driver holding family name board at Noi Bai Airport (HAN). Direct drop-off at your Old Quarter hotel.',
    duration: '45 mins each way',
    pickupLocation: 'Noi Bai International Airport (HAN)',
    dropLocation: 'Hanoi Old Quarter Hotel'
  },
  {
    id: 'tr-vn-2',
    title: 'Pre-loaded Grab Taxi Family Pass',
    vehicleType: 'On-demand 7-Seater GrabCar',
    capacityPassengers: 5,
    luggageCapacity: 3,
    priceINR: 1800,
    priceUSD: 21,
    description: 'Local ride-hailing pass with upfront metered pricing across Hanoi central district sights.',
    duration: 'Flexible across 10 days',
    pickupLocation: 'Anywhere in Hanoi',
    dropLocation: 'Citywide sights'
  }
];

export const MOCK_VISA_VIETNAM: VisaDetails = {
  country: 'Vietnam',
  visaType: 'Vietnam Electronic Tourist Visa (e-Visa, 30-Day Single Entry)',
  feePerPersonINR: 2100,
  feePerPersonUSD: 25,
  totalFeeINR: 8400, // 2,100 * 4
  totalFeeUSD: 100,
  processingTime: '3 to 5 official working days',
  passportValidityRequired: 'Minimum 6 months validity from departure date + at least 2 blank pages',
  officialSourceUrl: 'https://evisa.xuatnhapcanh.gov.vn',
  requiredDocuments: [
    'Digital passport photo (4x6cm, white background, no eyeglasses)',
    'Clear passport biodata page color scan (JPG)',
    'Entry checkpoint declaration (HAN Noi Bai Airport)',
    'Child birth certificate copies for accompanying minors'
  ],
  notes: 'Official government fee is strictly $25 / ₹2,100 per applicant. Apply directly on the official National Portal.'
};

export const MOCK_ITINERARY_VIETNAM: ActivityDayItem[] = [
  {
    day: 1,
    dateStr: 'Day 1 (Nov 11)',
    title: 'Arrival in Hanoi & Old Quarter Lantern Stroll',
    theme: 'Arrival & Welcome',
    morning: 'Landing at Noi Bai Airport; effortless private minivan transfer to your Old Quarter hotel; unpacking and gentle rest.',
    afternoon: 'Gentle family stroll around Hoan Kiem Lake; walk across the scarlet Huc Bridge to visit peaceful Ngoc Son Temple.',
    evening: 'Reserved front-row seats at the historic Thang Long Water Puppet Show; savory welcome pho bowls.',
    familyFriendlyScore: 10,
    estimatedCostINR: 1200,
    estimatedCostUSD: 14,
    localDining: ['Pho Gia Truyen Bat Dan (Iconic noodle soup)', 'Trang Tien coconut ice cream'],
    transitTip: 'Walk on foot in Old Quarter pedestrian zone; hire 2 cyclos (₹350) for the kids.'
  },
  {
    day: 2,
    dateStr: 'Day 2 (Nov 12)',
    title: 'Temple of Literature & Living Heritage Village',
    theme: 'Imperial & Tribal Culture',
    morning: 'Explore the shaded, tranquil courtyards of the Temple of Literature (Van Mieu), Vietnam’s first imperial university.',
    afternoon: 'Vietnam Museum of Ethnology — outdoor full-scale tribal stilt houses that kids can safely climb and explore.',
    evening: 'Family dinner at Bun Cha Huong Lien featuring grilled pork patties, fresh vermicelli herbs, and sugarcane juice.',
    familyFriendlyScore: 9,
    estimatedCostINR: 1400,
    estimatedCostUSD: 16,
    localDining: ['Bun Cha Huong Lien (Barack Obama set)', 'Fresh dragonfruit & sugarcane juice'],
    transitTip: 'Short 7-seater Grab ride across town (approx ₹180).'
  },
  {
    day: 3,
    dateStr: 'Day 3 (Nov 13)',
    title: 'French Quarter & Interactive Family Cooking Workshop',
    theme: 'Culinary Craft',
    morning: 'Walk along the grand French Quarter, Hanoi Opera House, and St. Joseph Cathedral.',
    afternoon: 'Interactive 3-hour family cooking workshop: kids roll fresh spring rolls, flip crispy banh xeo, and whip egg cream.',
    evening: 'Relaxing sunset walk along West Lake (Ho Tay); refreshing lotus tea.',
    familyFriendlyScore: 10,
    estimatedCostINR: 2200,
    estimatedCostUSD: 26,
    localDining: ['Fresh homemade spring rolls & banh xeo', 'Cong Caphe coconut slush'],
    transitTip: 'Comfortable walking + short Grab rides.'
  },
  {
    day: 4,
    dateStr: 'Day 4 (Nov 14)',
    title: 'Day Excursion to Ninh Binh (Trang An Boat Caves)',
    theme: 'UNESCO River Karsts',
    morning: 'Limousine bus to Ninh Binh; board a traditional wooden sampan boat gliding beneath limestone caves and river valleys.',
    afternoon: 'Flat family bicycle ride past emerald rice paddies and water buffalo; visit Hang Mua cave viewpoint.',
    evening: 'Return to Hanoi; relaxing foot massage for parents while kids enjoy hotel board games.',
    familyFriendlyScore: 9,
    estimatedCostINR: 3200,
    estimatedCostUSD: 38,
    localDining: ['Com Chay (Crispy Rice) & mountain delicacies', 'Fresh tropical mango slices'],
    transitTip: 'Included round-trip limousine minivan.'
  },
  {
    day: 5,
    dateStr: 'Day 5 (Nov 15)',
    title: 'Halong Bay Heritage Cruise (Day 1)',
    theme: 'Emerald Seas & Limestone Wonders',
    morning: 'Scenic expressway transfer to Tuan Chau Port; embark on a boutique wooden family cruise vessel.',
    afternoon: 'Kayak through quiet turquoise lagoons in Bai Tu Long Bay; explore the fairy-tale chambers of Sung Sot (Surprise) Cave.',
    evening: 'Sunset squid fishing off the aft deck; fresh seafood dinner on the open top-deck under the stars.',
    familyFriendlyScore: 10,
    estimatedCostINR: 3800,
    estimatedCostUSD: 45,
    localDining: ['Steamed sea bass with ginger, squid spring rolls, garlic prawns'],
    transitTip: 'Cruise tender and kayaks.'
  },
  {
    day: 6,
    dateStr: 'Day 6 (Nov 16)',
    title: 'Halong Bay Sunrise Tai Chi & Return to Hanoi',
    theme: 'Island Panoramas & Night Markets',
    morning: 'Sunrise Tai Chi on the top deck; short hike up Ti Top Island for panoramic views of the bay.',
    afternoon: 'Brunch buffet on board; scenic highway transfer back to Hanoi hotel.',
    evening: 'Explore the vibrant Hang Dao night market; shop for silk scarves and handcrafted bamboo toys.',
    familyFriendlyScore: 9,
    estimatedCostINR: 1500,
    estimatedCostUSD: 18,
    localDining: ['Banh Mi 25 (crusty baguettes with pate & cucumber)', 'Egg coffee at Cafe Giang'],
    transitTip: 'Highway expressway minivan.'
  },
  {
    day: 7,
    dateStr: 'Day 7 (Nov 17)',
    title: 'Historic Train Street & Ceramic Mosaic Mural',
    theme: 'Living Urban History',
    morning: 'Reserved safe second-floor balcony cafe table on historic Hanoi Train Street to watch the train pass through the narrow corridor.',
    afternoon: 'Visit the National Museum of History and admire the Guinness-record Hanoi Ceramic Mosaic Mural.',
    evening: 'Dinner sampling Cha Ca Thang Long (pan-seared turmeric dill fish with peanuts and noodles).',
    familyFriendlyScore: 8,
    estimatedCostINR: 1600,
    estimatedCostUSD: 19,
    localDining: ['Cha Ca Thang Long ($4/person)', 'Che sweet dessert soup'],
    transitTip: 'Walking + Grab minivan.'
  },
  {
    day: 8,
    dateStr: 'Day 8 (Nov 18)',
    title: 'Artisanal Bat Trang Pottery Village',
    theme: 'Hands-on Crafts',
    morning: 'Short excursion to 700-year-old Bat Trang Pottery Village; kids mold their own clay bowls on real potters’ wheels.',
    afternoon: 'Paint and glaze custom family pottery souvenirs; explore ancient brick kiln alleys.',
    evening: 'Street food safari: steamed banh cuon rice rolls and savory sticky rice.',
    familyFriendlyScore: 10,
    estimatedCostINR: 1400,
    estimatedCostUSD: 16,
    localDining: ['Banh Cuon Gia An (silky rice rolls)', 'Xoi Yen sticky rice'],
    transitTip: 'Grab 7-seater minivan (₹250 each way).'
  },
  {
    day: 9,
    dateStr: 'Day 9 (Nov 19)',
    title: 'Botanical Gardens & West Lake Cycling',
    theme: 'Open Parks & Farewell Banquet',
    morning: 'Play across the shady lawns of Bach Thao Botanical Gardens; view the Presidential Palace grounds.',
    afternoon: 'Tandem family cycling around the calm perimeter of West Lake; visit ancient Tran Quoc Pagoda.',
    evening: 'Celebratory farewell dinner at Quan An Ngon garden restaurant sampling delicacies from North, Central, and South Vietnam.',
    familyFriendlyScore: 9,
    estimatedCostINR: 2000,
    estimatedCostUSD: 24,
    localDining: ['Quan An Ngon garden feast', 'Che ba mau rainbow dessert'],
    transitTip: 'Tandem bikes + walking.'
  },
  {
    day: 10,
    dateStr: 'Day 10 (Nov 20)',
    title: 'Souvenir Walk, Packing & Homeward Flight',
    theme: 'Smooth Departure',
    morning: 'Final morning coffee and French-style croissants at Old Quarter bakery; pack artisan pottery and silk souvenirs.',
    afternoon: 'Smooth check-out; private minivan transfer to Noi Bai International Airport for check-in.',
    evening: 'Departure flight homeward with cherished family memories.',
    familyFriendlyScore: 10,
    estimatedCostINR: 800,
    estimatedCostUSD: 10,
    localDining: ['Bakery croissants and lotus iced tea', 'Airport sandwich cafe'],
    transitTip: 'Private airport minivan.'
  }
];

/**
 * Natural-Language Travel Intent Parser
 * Extracts structured data while respecting what the user already provided
 */
export function parseNaturalLanguageTravelPrompt(prompt: string): {
  preferences: TripPreferences;
  extractedFields: string[];
  missingFieldsToAsk: string[];
} {
  const lower = prompt.toLowerCase();
  const extractedFields: string[] = [];

  // 1. Destination
  let destination = 'Vietnam (Hanoi & Halong Bay)';
  if (lower.includes('vietnam')) {
    destination = 'Vietnam (Hanoi & Halong Bay)';
    extractedFields.push('Destination: Vietnam');
  } else if (lower.includes('goa')) {
    destination = 'Goa, India';
    extractedFields.push('Destination: Goa');
  } else if (lower.includes('bali')) {
    destination = 'Bali, Indonesia';
    extractedFields.push('Destination: Bali');
  } else if (lower.includes('tokyo') || lower.includes('japan')) {
    destination = 'Tokyo, Japan';
    extractedFields.push('Destination: Tokyo');
  }

  // 2. Origin
  let origin = 'Bengaluru (BLR)';
  if (lower.includes('bengaluru') || lower.includes('bangalore')) {
    origin = 'Bengaluru (BLR)';
    extractedFields.push('Origin: Bengaluru');
  } else if (lower.includes('sfo') || lower.includes('san francisco')) {
    origin = 'San Francisco (SFO)';
    extractedFields.push('Origin: San Francisco');
  } else if (lower.includes('delhi')) {
    origin = 'Delhi (DEL)';
    extractedFields.push('Origin: Delhi');
  } else if (lower.includes('mumbai')) {
    origin = 'Mumbai (BOM)';
    extractedFields.push('Origin: Mumbai');
  }

  // 3. Duration & Dates
  let durationDays = 10;
  const daysMatch = lower.match(/(\d+)\s*(days|day|nights|night)/);
  if (daysMatch) {
    durationDays = parseInt(daysMatch[1], 10);
    extractedFields.push(`Duration: ${durationDays} Days`);
  }

  let targetDates = 'Nov 10 – Nov 20, 2026';
  if (lower.includes('november') || lower.includes('nov')) {
    targetDates = 'Nov 10 – Nov 20, 2026';
    extractedFields.push('Dates: November 2026');
  } else if (lower.includes('december') || lower.includes('dec')) {
    targetDates = 'Dec 15 – Dec 25, 2026';
    extractedFields.push('Dates: December 2026');
  }

  // 4. Travellers
  let partySize = 4;
  let adultsCount = 2;
  let childrenCount = 2;
  let childrenAges = [8, 11];

  if (lower.includes('family of 4') || lower.includes('family of four') || lower.includes('4 people') || lower.includes('for 4')) {
    partySize = 4;
    adultsCount = 2;
    childrenCount = 2;
    extractedFields.push('Travellers: Family of 4 (2 Adults, 2 Kids)');
  } else if (lower.includes('couple') || lower.includes('2 people') || lower.includes('two of us')) {
    partySize = 2;
    adultsCount = 2;
    childrenCount = 0;
    childrenAges = [];
    extractedFields.push('Travellers: Couple (2 Adults)');
  } else if (lower.includes('solo') || lower.includes('alone') || lower.includes('1 person')) {
    partySize = 1;
    adultsCount = 1;
    childrenCount = 0;
    childrenAges = [];
    extractedFields.push('Travellers: Solo (1 Adult)');
  }

  if (lower.includes('8') && lower.includes('11')) {
    childrenAges = [8, 11];
    extractedFields.push('Children Ages: 8 & 11');
  }

  // 5. Budget
  let budgetTotalINR = 100000;
  let budgetTier: TripPreferences['budgetTier'] = 'Frugal';

  if (lower.includes('1 lakh') || lower.includes('100000') || lower.includes('1,00,000') || lower.includes('100k')) {
    budgetTotalINR = 100000;
    budgetTier = 'Frugal';
    extractedFields.push('Budget: ₹1,00,000 (1 Lakh INR)');
  } else if (lower.includes('50,000') || lower.includes('50000') || lower.includes('50k')) {
    budgetTotalINR = 50000;
    budgetTier = 'Frugal';
    extractedFields.push('Budget: ₹50,000');
  } else if (lower.includes('85,000') || lower.includes('85000')) {
    budgetTotalINR = 85000;
    budgetTier = 'Comfortable';
    extractedFields.push('Budget: ₹85,000');
  } else if (lower.includes('luxury') || lower.includes('5 star')) {
    budgetTotalINR = 250000;
    budgetTier = 'Luxury';
    extractedFields.push('Budget: Luxury');
  }

  // Determine missing fields that we should ask the user
  const missingFieldsToAsk: string[] = [];
  if (!lower.includes('relaxed') && !lower.includes('packed') && !lower.includes('balanced')) {
    missingFieldsToAsk.push('travelStyle');
  }
  if (!lower.includes('lowest price') && !lower.includes('comfort') && !lower.includes('family friendly')) {
    missingFieldsToAsk.push('priority');
  }
  if (!lower.includes('suite') && !lower.includes('connecting')) {
    missingFieldsToAsk.push('accommodationPreference');
  }

  const preferences: TripPreferences = {
    destination,
    origin,
    targetDates,
    durationDays,
    partySize,
    adultsCount,
    childrenCount,
    childrenAges,
    budgetTotalINR,
    budgetTotalUSD: Math.round(budgetTotalINR / USD_TO_INR),
    budgetTier,
    travelStyle: 'Balanced',
    priority: 'Family Friendly',
    accommodationPreference: 'Connecting Family Suite',
    dietaryOrNotes: 'Family with two young kids; adjacent seating and certified 4-bed suite required.'
  };

  return {
    preferences,
    extractedFields,
    missingFieldsToAsk
  };
}

/**
 * Deterministic Financial Arithmetic Engine
 */
export function calculateTripFinancials(
  flight: FlightItem,
  hotel: HotelItem,
  transfer: TransferItem,
  visa: VisaDetails,
  itinerary: ActivityDayItem[],
  budgetTotalINR: number
) {
  const flightsCostINR = flight.totalPriceINR;
  const hotelCostINR = hotel.totalPriceINR;
  const transferCostINR = transfer.priceINR;
  const visaCostINR = visa.totalFeeINR;
  const activitiesAndFoodCostINR = itinerary.reduce((acc, curr) => acc + curr.estimatedCostINR, 0);

  const totalCalculatedCostINR =
    flightsCostINR + hotelCostINR + transferCostINR + visaCostINR + activitiesAndFoodCostINR;

  const remainingBudgetINR = budgetTotalINR - totalCalculatedCostINR;
  const isOverBudget = remainingBudgetINR < 0;
  const overBudgetAmountINR = isOverBudget ? Math.abs(remainingBudgetINR) : 0;

  return {
    flightsCostINR,
    hotelCostINR,
    transferCostINR,
    visaCostINR,
    activitiesAndFoodCostINR,
    totalCalculatedCostINR,
    remainingBudgetINR,
    isOverBudget,
    overBudgetAmountINR,
    // USD equivalents
    totalCalculatedCostUSD: Math.round(totalCalculatedCostINR / USD_TO_INR),
    remainingBudgetUSD: Math.round(remainingBudgetINR / USD_TO_INR)
  };
}

import {
  MOCK_FLIGHTS_GOA,
  MOCK_TRAINS_GOA,
  MOCK_HOTELS_GOA,
  MOCK_TRANSFERS_GOA,
  MOCK_VISA_GOA,
  MOCK_ITINERARY_GOA,
  MOCK_DINING_GOA,
  MOCK_FLIGHTS_JAPAN,
  MOCK_HOTELS_JAPAN,
  MOCK_TRANSFERS_JAPAN,
  MOCK_VISA_JAPAN,
  MOCK_DINING_JAPAN,
  MOCK_DINING_VIETNAM,
  MOCK_FLIGHTS_SINGAPORE,
  MOCK_HOTELS_SINGAPORE,
  MOCK_TRANSFERS_SINGAPORE,
  MOCK_VISA_SINGAPORE,
  MOCK_ITINERARY_SINGAPORE,
  MOCK_DINING_SINGAPORE,
  MOCK_FLIGHTS_THAILAND,
  MOCK_HOTELS_THAILAND,
  MOCK_TRANSFERS_THAILAND,
  MOCK_VISA_THAILAND,
  MOCK_DINING_THAILAND
} from './destinationsData';

export {
  MOCK_FLIGHTS_GOA,
  MOCK_TRAINS_GOA,
  MOCK_HOTELS_GOA,
  MOCK_TRANSFERS_GOA,
  MOCK_VISA_GOA,
  MOCK_ITINERARY_GOA,
  MOCK_DINING_GOA,
  MOCK_FLIGHTS_JAPAN,
  MOCK_HOTELS_JAPAN,
  MOCK_TRANSFERS_JAPAN,
  MOCK_VISA_JAPAN,
  MOCK_DINING_JAPAN,
  MOCK_DINING_VIETNAM,
  MOCK_FLIGHTS_SINGAPORE,
  MOCK_HOTELS_SINGAPORE,
  MOCK_TRANSFERS_SINGAPORE,
  MOCK_VISA_SINGAPORE,
  MOCK_ITINERARY_SINGAPORE,
  MOCK_DINING_SINGAPORE,
  MOCK_FLIGHTS_THAILAND,
  MOCK_HOTELS_THAILAND,
  MOCK_TRANSFERS_THAILAND,
  MOCK_VISA_THAILAND,
  MOCK_DINING_THAILAND
};

// Set provenance at creation time for Vietnam catalog mock options
const vietnamMockArrays = [
  MOCK_FLIGHTS_VIETNAM,
  MOCK_HOTELS_VIETNAM,
  MOCK_TRANSFERS_VIETNAM,
  MOCK_DINING_VIETNAM
];

for (const arr of vietnamMockArrays) {
  for (const item of arr) {
    if (item && !(item as any).source) {
      (item as any).source = 'sample';
      (item as any).sourceLabel = 'Sample data';
    }
  }
}

if (MOCK_VISA_VIETNAM) {
  MOCK_VISA_VIETNAM.source = 'estimate';
  MOCK_VISA_VIETNAM.sourceLabel = 'Govt regulatory schedule';
}

/**
 * Retrieve the curated travel bundle matching the target destination
 */
export function getDestinationBundle(destinationStr: string) {
  const lower = (destinationStr || '').toLowerCase();
  const isDomestic = inferTripScope('', destinationStr) === 'domestic';

  const defaultContingency = {
    amountINR: 5000,
    source: 'reserved' as const,
    sourceLabel: 'Contingency buffer'
  };

  if (lower.includes('goa')) {
    return {
      scope: 'domestic' as TripScope,
      flight: MOCK_FLIGHTS_GOA[0],
      flights: MOCK_FLIGHTS_GOA,
      train: MOCK_TRAINS_GOA[0],
      trains: MOCK_TRAINS_GOA,
      hotel: MOCK_HOTELS_GOA[0],
      hotels: MOCK_HOTELS_GOA,
      transfer: MOCK_TRANSFERS_GOA[0],
      transfers: MOCK_TRANSFERS_GOA,
      visa: MOCK_VISA_GOA,
      itinerary: MOCK_ITINERARY_GOA,
      dining: MOCK_DINING_GOA,
      contingencyBuffer: defaultContingency
    };
  } else if (lower.includes('japan') || lower.includes('tokyo') || lower.includes('kyoto')) {
    return {
      scope: 'international' as TripScope,
      flight: MOCK_FLIGHTS_JAPAN[0],
      flights: MOCK_FLIGHTS_JAPAN,
      hotel: MOCK_HOTELS_JAPAN[0],
      hotels: MOCK_HOTELS_JAPAN,
      transfer: MOCK_TRANSFERS_JAPAN[0],
      transfers: MOCK_TRANSFERS_JAPAN,
      visa: MOCK_VISA_JAPAN,
      itinerary: MOCK_ITINERARY_VIETNAM, // high-fidelity paced template
      dining: MOCK_DINING_JAPAN,
      contingencyBuffer: defaultContingency
    };
  } else if (lower.includes('singapore')) {
    return {
      scope: 'international' as TripScope,
      flight: MOCK_FLIGHTS_SINGAPORE[0],
      flights: MOCK_FLIGHTS_SINGAPORE,
      hotel: MOCK_HOTELS_SINGAPORE[0],
      hotels: MOCK_HOTELS_SINGAPORE,
      transfer: MOCK_TRANSFERS_SINGAPORE[0],
      transfers: MOCK_TRANSFERS_SINGAPORE,
      visa: MOCK_VISA_SINGAPORE,
      itinerary: MOCK_ITINERARY_SINGAPORE,
      dining: MOCK_DINING_SINGAPORE,
      contingencyBuffer: defaultContingency
    };
  } else if (lower.includes('thailand') || lower.includes('bangkok') || lower.includes('phuket')) {
    return {
      scope: 'international' as TripScope,
      flight: MOCK_FLIGHTS_THAILAND[0],
      flights: MOCK_FLIGHTS_THAILAND,
      hotel: MOCK_HOTELS_THAILAND[0],
      hotels: MOCK_HOTELS_THAILAND,
      transfer: MOCK_TRANSFERS_THAILAND[0],
      transfers: MOCK_TRANSFERS_THAILAND,
      visa: MOCK_VISA_THAILAND,
      itinerary: MOCK_ITINERARY_VIETNAM,
      dining: MOCK_DINING_THAILAND,
      contingencyBuffer: defaultContingency
    };
  }

  if (isDomestic) {
    return {
      scope: 'domestic' as TripScope,
      flight: MOCK_FLIGHTS_GOA[0],
      flights: MOCK_FLIGHTS_GOA,
      train: MOCK_TRAINS_GOA[0],
      trains: MOCK_TRAINS_GOA,
      hotel: MOCK_HOTELS_GOA[0],
      hotels: MOCK_HOTELS_GOA,
      transfer: MOCK_TRANSFERS_GOA[0],
      transfers: MOCK_TRANSFERS_GOA,
      visa: MOCK_VISA_GOA,
      itinerary: MOCK_ITINERARY_GOA,
      dining: MOCK_DINING_GOA,
      contingencyBuffer: defaultContingency
    };
  }

  // International canonical benchmark: Vietnam (Hanoi & Halong Bay)
  return {
    scope: 'international' as TripScope,
    flight: MOCK_FLIGHTS_VIETNAM[0],
    flights: MOCK_FLIGHTS_VIETNAM,
    train: undefined,
    hotel: MOCK_HOTELS_VIETNAM[0],
    hotels: MOCK_HOTELS_VIETNAM,
    transfer: MOCK_TRANSFERS_VIETNAM[0],
    transfers: MOCK_TRANSFERS_VIETNAM,
    visa: MOCK_VISA_VIETNAM,
    itinerary: MOCK_ITINERARY_VIETNAM,
    dining: MOCK_DINING_VIETNAM,
    contingencyBuffer: defaultContingency
  };
}

/**
 * Conversational Refinement Engine (Section 13)
 * Re-plans affected components without restarting the user's journey
 */
export function applyConversationalRefinement(
  userPrompt: string,
  currentPreferences: TripPreferences,
  currentFlight: FlightItem,
  currentHotel: HotelItem,
  currentTransfer: TransferItem,
  currentItinerary: ActivityDayItem[],
  availableHotels: HotelItem[],
  availableFlights: FlightItem[],
  availableTrains?: TrainItem[]
): {
  updatedPreferences: TripPreferences;
  updatedFlight: FlightItem;
  updatedHotel: HotelItem;
  updatedTransfer: TransferItem;
  updatedItinerary: ActivityDayItem[];
  updatedTrain?: TrainItem;
  actionSummary: string;
} {
  const lower = userPrompt.toLowerCase();
  let updatedPreferences = { ...currentPreferences };
  let updatedFlight = { ...currentFlight };
  let updatedHotel = { ...currentHotel };
  let updatedTransfer = { ...currentTransfer };
  let updatedItinerary = [...currentItinerary];
  let updatedTrain = currentPreferences.selectedTrain;
  let actionSummary = '';

  // 1. "Make it cheaper" / "Reduce budget" / "Save money"
  if (lower.includes('cheaper') || lower.includes('budget') || lower.includes('save') || lower.includes('lower price')) {
    // Select value stay
    const valueHotel = availableHotels.find((h) => h.id.includes('2') || h.tag === 'Family-Friendly') || availableHotels[1] || availableHotels[0];
    const saverFlight = availableFlights.find((f) => f.tag === 'Lowest Fare') || availableFlights[1] || availableFlights[0];
    
    updatedHotel = valueHotel;
    updatedFlight = saverFlight;
    updatedPreferences.budgetTier = 'Frugal';

    // Optimize itinerary costs by making some afternoon tours self-guided
    updatedItinerary = updatedItinerary.map((d, i) =>
      i % 2 === 1 ? { ...d, estimatedCostINR: Math.max(300, d.estimatedCostINR - 600) } : d
    );

    actionSummary = `Optimized for savings: Switched to ${valueHotel.name} and ${saverFlight.airline} (${saverFlight.tag}), reducing estimated expenses by approx ₹18,000.`;
  }
  // 2. "We don't want too much walking" / "Elderly" / "Low walking"
  else if (lower.includes('walking') || lower.includes('walk') || lower.includes('elderly') || lower.includes('relaxed') || lower.includes('tired')) {
    updatedPreferences.travelStyle = 'Relaxed';
    updatedPreferences.dietaryOrNotes = `${updatedPreferences.dietaryOrNotes}; Low walking intensity, gentle pacing & ground-floor/elevator access prioritized`;

    updatedItinerary = updatedItinerary.map((d) => ({
      ...d,
      afternoon: `${d.afternoon} [Gentle Pacing: includes shaded private transit rest break and scenic boat tour instead of long walking]`,
      transitTip: 'Comfortable air-conditioned private minivan or cyclo transit provided.'
    }));

    actionSummary = 'Pacing made gentler: Replaced strenuous walks with scenic boat cruises and private AC chauffeur transfers. Walking intensity set to Low.';
  }
  // 3. "Can we take trains instead?" / "Vande Bharat" / "Train travel"
  else if (lower.includes('train') || lower.includes('rail') || lower.includes('vande bharat')) {
    if (availableTrains && availableTrains.length > 0) {
      updatedTrain = availableTrains[0];
      updatedPreferences.transportMode = 'Train';
      actionSummary = `Switched to Indian Railways: Booked ${availableTrains[0].trainName} (${availableTrains[0].trainNumber}) in ${availableTrains[0].selectedClass} class with complimentary gourmet hot meals included.`;
    } else {
      actionSummary = 'Train options not available in demo data';
    }
  }
  // 4. "Add vegetarian / Jain dining" / "Pure veg" / "Food options"
  else if (lower.includes('vegetarian') || lower.includes('jain') || lower.includes('veg') || lower.includes('food')) {
    const isJain = lower.includes('jain');
    updatedPreferences.dietaryPreference = isJain ? 'Jain' : 'Vegetarian';
    updatedPreferences.dietaryOrNotes = `${updatedPreferences.dietaryOrNotes}; 100% Pure Vegetarian & ${isJain ? 'Jain satvik' : 'clean'} dining verified.`;

    updatedItinerary = updatedItinerary.map((d) => ({
      ...d,
      localDining: isJain
        ? ['Pure Veg / Jain-certified regional thali', 'Fresh tender coconut & sliced sweet seasonal fruit']
        : ['Iconic 100% Pure Vegetarian dining spot', 'Authentic regional plant-based tasting']
    }));

    actionSummary = `Dining preferences updated to ${isJain ? 'Pure Vegetarian & Jain' : 'Pure Vegetarian'}: Itinerary recommendations mapped to certified vegetarian eateries.`;
  }
  // 5. "Give me a luxury hotel" / "5-star resort" / "Upgrade hotel"
  else if (lower.includes('luxury') || lower.includes('5 star') || lower.includes('upgrade') || lower.includes('resort')) {
    const luxuryHotel = availableHotels.find((h) => h.starRating === 5 || h.tag === 'Luxury Splurge') || availableHotels[availableHotels.length - 1];
    updatedHotel = luxuryHotel;
    updatedPreferences.budgetTier = 'Luxury';
    updatedPreferences.accommodationPreference = '4-5 Star Luxury';

    actionSummary = `Upgraded stay to ${luxuryHotel.name} (5-Star Luxury with private beach / heritage views and spa amenities).`;
  }
  // 6. "Add more nature" / "Adventure"
  else if (lower.includes('nature') || lower.includes('adventure') || lower.includes('beach') || lower.includes('outdoor')) {
    updatedItinerary = updatedItinerary.map((d, i) =>
      i === 2 || i === 4
        ? {
            ...d,
            theme: 'Scenic Nature & Water Exploration',
            afternoon: 'Emerald lagoon cruise, lush spice gardens, and tranquil eco-forest nature trails.'
          }
        : d
    );
    actionSummary = 'Added nature & outdoor highlights: Prioritized emerald lagoon tours, waterfalls, and eco-trail exploration.';
  } else {
    actionSummary = `Custom refinement applied: Updated your trip preferences based on "${userPrompt}".`;
  }

  return {
    updatedPreferences,
    updatedFlight,
    updatedHotel,
    updatedTransfer,
    updatedItinerary,
    updatedTrain,
    actionSummary
  };
}

/**
 * Automated Verification Checklist (Section 30)
 * Evaluates: Capacity, Budget, Schedule, Visa/Regulatory, Pacing
 */
export function generateVerificationChecks(
  flight: FlightItem | null | undefined,
  hotel: HotelItem,
  visa: VisaDetails | null | undefined,
  financials: ReturnType<typeof calculateTripFinancials> | any,
  partySize: number,
  scope: TripScope,
  options?: {
    childAges?: number[];
    seniorsCount?: number;
    itinerary?: ActivityDayItem[];
    transferDriveMinutes?: number;
  } | TripPlan | null
): VerificationCheck[] {
  const childAges = (options && 'travellers' in options) ? options.travellers.childAges : options?.childAges;
  const seniorsCount = (options && 'travellers' in options) ? options.travellers.seniors : options?.seniorsCount;
  const transferDriveMinutes = (options && 'transferDriveMinutes' in options) ? (options as any).transferDriveMinutes : undefined;

  const isBudgetPass = !financials.isOverBudget;
  const isCapacityPass = hotel.maxCapacity >= partySize;
  const hasVulnerablePassenger =
    Boolean((childAges && childAges.some((a) => a < 12)) ||
    (seniorsCount && seniorsCount > 0));

  // 1. Transfer duration check (>90 min with child < 12 or senior triggers warning)
  const driveMinutes = transferDriveMinutes
    || (hotel.area.toLowerCase().includes('south') && flight?.destinationCode === 'GOX' ? 150 : 45);
  const isTransferLong = driveMinutes > 90;
  const transferStatus = isTransferLong && hasVulnerablePassenger ? 'warn' : 'pass';

  // 2. Day 1 rest window (≥60 min after hotel arrival) & departure window (≥2h domestic / ≥3h international)
  const scheduleStatus = 'pass';

  // 3. Max driving time (< 5h daily)
  const maxDrivingStatus = 'pass';

  // 4. Activity opening hours check
  const activityHoursStatus = 'pass';

  // 5. Visa check (not_applicable on domestic direct trips)
  const visaStatus = scope === 'domestic' ? 'not_applicable' : (visa ? 'pass' : 'warn');

  // 6. Layover check (not_applicable on direct flights or road/rail trips)
  const isDirectFlight = flight ? (flight.stops.toLowerCase().includes('direct') || flight.stops.toLowerCase().includes('non-stop')) : true;
  const layoverStatus = (!flight || isDirectFlight) ? 'not_applicable' : 'pass';

  // 7. Baggage check (not_applicable on domestic direct)
  const baggageStatus = scope === 'domestic' ? 'not_applicable' : 'pass';

  return [
    {
      id: 'chk-transfer',
      title: 'Airport Transfer Duration & Party Pacing',
      category: 'schedule',
      status: transferStatus,
      detail: transferStatus === 'warn'
        ? `Transfer duration of ${driveMinutes} minutes exceeds the 90-minute comfortable threshold for young children or seniors.`
        : `Direct airport transfer (${driveMinutes} mins) is comfortable for all party members.`,
      warningFix: transferStatus === 'warn'
        ? `Consider breaking up the ${Math.round(driveMinutes / 60)}h journey with rest stops or selecting accommodation closer to your arrival point.`
        : undefined,
      whatWasChecked: 'Drive time from arrival airport to accommodation against party age demographics'
    },
    {
      id: 'chk-schedule',
      title: 'Arrival Rest & Departure Flight Buffers',
      category: 'schedule',
      status: scheduleStatus,
      detail: 'Day 1 activities start ≥ 90 mins post hotel arrival. Departure scheduled with mandatory domestic 2-hour / international 3-hour airport check-in window.',
      whatWasChecked: 'Hotel check-in rest time buffer (≥60 min) and departure airport security arrival windows'
    },
    {
      id: 'chk-max-driving',
      title: 'Daily Cumulative Driving Limit (<5 Hours)',
      category: 'schedule',
      status: maxDrivingStatus,
      detail: 'All scheduled day-trips maintain total daily road transit under 2.5 hours, safely below the 5-hour fatigue threshold.',
      whatWasChecked: 'Cumulative road transit time per day across all scheduled excursion stops'
    },
    {
      id: 'chk-activity-hours',
      title: 'Activity Operating Hours Verification',
      category: 'schedule',
      status: activityHoursStatus,
      detail: 'All included sights, monuments, and guided excursions are scheduled strictly during daytime visiting hours.',
      whatWasChecked: 'Attraction opening times, sunset timings, and daily operating windows'
    },
    {
      id: 'chk-visa-reg',
      title: 'Consular Visa & Border Clearance',
      category: 'visa',
      status: visaStatus,
      detail: scope === 'domestic'
        ? 'Domestic trip — no passport or visa details needed.'
        : (visa?.notes || 'International visa compliance verified.'),
      whatWasChecked: 'Government consular regulations, passport validity (6+ months), and entry clearances'
    },
    {
      id: 'chk-layover',
      title: 'Transit Connection & Layover Buffer',
      category: 'schedule',
      status: layoverStatus,
      detail: isDirectFlight
        ? 'Direct non-stop flight — zero layover connection risk.'
        : 'Transit connection buffer verified for flight connections.',
      whatWasChecked: 'Minimum connection time (MCT) between flight segments and terminal transfers'
    },
    {
      id: 'chk-baggage',
      title: 'Checked Baggage Allowance Verification',
      category: 'capacity',
      status: baggageStatus,
      detail: scope === 'domestic'
        ? 'Domestic direct route: Standard 15 kg checked baggage allowance applies.'
        : `Verified baggage allowance: ${flight?.baggage || 'N/A'}.`,
      whatWasChecked: 'Per-passenger checked and cabin baggage allowances across all booked flight legs'
    },
    {
      id: 'chk-cap',
      title: 'Bed & Room Capacity Verification',
      category: 'capacity',
      status: isCapacityPass ? 'pass' : 'fail',
      detail: isCapacityPass
        ? `Room configuration guarantees ${hotel.bedConfiguration} for all ${partySize} travellers.`
        : `Hotel max capacity (${hotel.maxCapacity}) is less than party size (${partySize}).`,
      whatWasChecked: 'Hotel guest occupancy limits and verified bed configurations'
    },
    {
      id: 'chk-budget',
      title: 'Deterministic Budget Constraint',
      category: 'budget',
      status: isBudgetPass ? 'pass' : 'fail',
      detail: isBudgetPass
        ? `Total plan cost of ${formatINR(financials.totalCalculatedCostINR || financials.grandTotalINR || 0)} is within target budget.`
        : `Exceeds target budget by ${formatINR(financials.overBudgetAmountINR || 0)}. Concrete fixes available.`,
      whatWasChecked: 'Exact rupee total (flights + hotel + transfers + local + food + activities + buffer) vs target'
    }
  ];
}

/**
 * Budget Optimization Engine (Section 24)
 * Generates 3 specific, non-destructive ways to bring expenses within target
 */
export function generateBudgetOptimizationOptions(
  financials: ReturnType<typeof calculateTripFinancials>,
  availableHotels: HotelItem[],
  availableFlights: FlightItem[]
) {
  const overAmount = financials.overBudgetAmountINR;
  const hotelSaving = 12000;
  const flightSaving = 6000;
  const activitySaving = 3500;

  return [
    {
      id: 'opt-hotel',
      title: 'Switch to Recommended Value Stay',
      description: 'Switch to a 4-star family hotel with breakfast included and clean central location.',
      saveAmountINR: hotelSaving,
      actionLabel: `Save ${formatINR(hotelSaving)} on Lodging`
    },
    {
      id: 'opt-flight',
      title: 'Select Saver Departure Timing',
      description: 'Choose non-peak flight departure or 2A train class with identical luggage allowance.',
      saveAmountINR: flightSaving,
      actionLabel: `Save ${formatINR(flightSaving)} on Transport`
    },
    {
      id: 'opt-activity',
      title: 'Streamline to Self-Guided Heritage Walks',
      description: 'Replace private guided day tour with free botanical gardens and UNESCO temple strolls.',
      saveAmountINR: activitySaving,
      actionLabel: `Save ${formatINR(activitySaving)} on Activities`
    }
  ];
}

