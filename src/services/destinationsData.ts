import {
  FlightItem,
  HotelItem,
  TransferItem,
  TrainItem,
  DiningItem,
  ActivityDayItem,
  VisaDetails
} from '../types/travelBooking';

/**
 * Checks if a destination name maps to one of the 4 hand-built detailed destinations:
 * Goa, Coorg, Kerala, Mysuru.
 */
export function isDetailedDestination(destination: string): boolean {
  const lower = (destination || '').toLowerCase();
  return (
    /\b(goa|panaji|panjim|calangute|baga|colva|palolem)\b/.test(lower) ||
    /\b(coorg|kodagu|madikeri)\b/.test(lower) ||
    /\b(kerala|munnar|alleppey|alappuzha|kumarakom|thekkady|wayanad|varkala|kovalam|fort kochi)\b/.test(lower) ||
    /\b(mysuru|mysore)\b/.test(lower)
  );
}

// ==========================================
// 1. GOA (DOMESTIC INDIA BENCHMARK)
// ==========================================
export const MOCK_FLIGHTS_GOA: FlightItem[] = [
  {
    id: 'fl-goa-1',
    airline: 'IndiGo',
    airlineCode: '6E',
    flightNumber: '6E 5382',
    originCode: 'BLR',
    originCity: 'Bengaluru',
    destinationCode: 'GOX',
    destinationCity: 'Goa (Mopa)',
    departureTime: '08:30 AM',
    arrivalTime: '09:45 AM',
    duration: '1h 15m',
    stops: 'Non-stop Direct (Round trip: outbound + return)',
    isRoundTrip: true,
    returnFlightNumber: '6E 5383',
    returnDepartureTime: '11:00 AM',
    returnArrivalTime: '12:15 PM',
    outboundFarePerPersonINR: 3500,
    returnFarePerPersonINR: 3500,
    pricePerPersonINR: 7000,
    totalPriceINR: 28000, // 7,000 * 4
    outboundTotalPriceINR: 14000,
    returnTotalPriceINR: 14000,
    pricePerPersonUSD: 83,
    totalPriceUSD: 333,
    baggage: '15 kg Checked Baggage + 7 kg Cabin Bag included',
    cabinClass: 'Economy Saver',
    refundable: true,
    seatAvailability: 9,
    tag: 'Best for Families',
    adjacentFamilySeatsGuaranteed: true,
    source: 'sample',
    sourceLabel: 'Sample data'
  },
  {
    id: 'fl-goa-2',
    airline: 'Air India Express',
    airlineCode: 'IX',
    flightNumber: 'IX 924',
    originCode: 'BLR',
    originCity: 'Bengaluru',
    destinationCode: 'GOI',
    destinationCity: 'Goa (Dabolim)',
    departureTime: '02:15 PM',
    arrivalTime: '03:25 PM',
    duration: '1h 10m',
    stops: 'Non-stop Direct (Round trip: outbound + return)',
    isRoundTrip: true,
    returnFlightNumber: 'IX 925',
    returnDepartureTime: '04:10 PM',
    returnArrivalTime: '05:20 PM',
    outboundFarePerPersonINR: 3200,
    returnFarePerPersonINR: 3200,
    pricePerPersonINR: 6400,
    totalPriceINR: 25600, // 6,400 * 4
    outboundTotalPriceINR: 12800,
    returnTotalPriceINR: 12800,
    pricePerPersonUSD: 76,
    totalPriceUSD: 304,
    baggage: '15 kg Checked Baggage + 7 kg Cabin Bag',
    cabinClass: 'Economy Value',
    refundable: false,
    seatAvailability: 5,
    tag: 'Lowest Fare',
    adjacentFamilySeatsGuaranteed: true,
    source: 'sample',
    sourceLabel: 'Sample data'
  }
];

export const MOCK_TRAINS_GOA: TrainItem[] = [
  {
    id: 'tr-blr-vsg-17309',
    trainName: 'Yesvantpur – Vasco da Gama Express',
    trainNumber: '17309',
    fromStation: 'Yesvantpur Jn (YPR)',
    toStation: 'Vasco Da Gama (VSG)',
    departureTime: '03:00 PM',
    arrivalTime: '05:00 AM (+1 Day)',
    duration: '14h 00m',
    classes: [
      { code: '2A', name: '2-Tier AC Sleeper', fareINR: 1680, availability: 'Available (18)', isAvailable: true },
      { code: '3A', name: '3-Tier AC Sleeper', fareINR: 1190, availability: 'Available (36)', isAvailable: true },
      { code: 'SL', name: 'Sleeper Class', fareINR: 445, availability: 'Available (52)', isAvailable: true }
    ],
    selectedClass: '2A',
    pricePerPersonINR: 1680,
    totalPriceINR: 6720,
    foodIncluded: false,
    isVandeBharatOrRajdhani: false,
    source: 'sample',
    sourceLabel: 'Sample data'
  }
];

export const MOCK_HOTELS_GOA: HotelItem[] = [
  {
    id: 'ht-goa-south-resort',
    name: 'Baywatch Resort & Spa, South Goa',
    area: 'Sernabatim Beach, South Goa',
    city: 'Goa',
    starRating: 3,
    reviewScore: 4.4,
    reviewsCount: 890,
    roomType: 'Deluxe Family Suite with Pool View',
    bedConfiguration: '1 King Bed + 1 Rollaway Bed (Capacity: 3-4 guests)',
    maxCapacity: 4,
    capacityVerifiedForFamily: true,
    pricePerNightINR: 2400,
    totalPriceINR: 14400, // 2,400 * 6 nights
    pricePerNightUSD: 29,
    totalPriceUSD: 174,
    amenities: [
      'Swimming Pool with Kids Section',
      'Daily Buffet Breakfast Included',
      'Spa & Fitness Center',
      'Free High-Speed Wi-Fi',
      '5-min walk to pristine Sernabatim beach'
    ],
    breakfastIncluded: true,
    freeCancellation: true,
    distanceFromCenter: 'Short stroll to Sernabatim & Colva white sands',
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
    tag: 'Family-Friendly',
    source: 'sample',
    sourceLabel: 'Sample data'
  },
  {
    id: 'ht-goa-south-comfortable',
    name: 'Heritage Village Resort & Spa, South Goa',
    area: 'Arossim Beach, South Goa',
    city: 'Goa',
    starRating: 4,
    reviewScore: 4.6,
    reviewsCount: 1120,
    roomType: 'Club Family Room with Garden View',
    bedConfiguration: '1 King Bed + 1 Rollaway Bed (Capacity: 3-4 guests)',
    maxCapacity: 4,
    capacityVerifiedForFamily: true,
    pricePerNightINR: 3800,
    totalPriceINR: 22800, // 3,800 * 6 nights
    pricePerNightUSD: 45,
    totalPriceUSD: 270,
    amenities: [
      'Swimming Pool with Kids Wading Area',
      'Daily Buffet Breakfast Included',
      'Ayurveda Spa & Wellness Center',
      'Free High-Speed Wi-Fi',
      '5-min walk to tranquil Arossim white sands'
    ],
    breakfastIncluded: true,
    freeCancellation: true,
    distanceFromCenter: 'Arossim Beach, South Goa (Close to Dabolim Airport)',
    imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    tag: 'Best Match'
  },
  {
    id: 'ht-goa-1',
    name: 'Caravela Beach Resort',
    area: 'Varca Beach, South Goa',
    city: 'Goa',
    starRating: 5,
    reviewScore: 4.8,
    reviewsCount: 1840,
    roomType: 'Oceanfront Interconnected Family Suite (4 Beds)',
    bedConfiguration: '2 King Beds or 1 King + 2 Twin Beds (Capacity: 4 guests)',
    maxCapacity: 4,
    capacityVerifiedForFamily: true,
    pricePerNightINR: 7200,
    totalPriceINR: 43200, // 7,200 * 6 nights
    pricePerNightUSD: 85,
    totalPriceUSD: 510,
    amenities: [
      'Direct Private Beach Access',
      'Kids Pool & Activity Center',
      'Complimentary Lavish Buffet Breakfast',
      'Ayurvedic Wellness Spa',
      'Lush 23-acre Golf Course Gardens'
    ],
    breakfastIncluded: true,
    freeCancellation: true,
    distanceFromCenter: 'Beachfront (Private beach access)',
    imageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
    tag: 'Luxury Splurge'
  },
  {
    id: 'ht-goa-2',
    name: 'Casa Heritage Portuguese Villa',
    area: 'Fontainhas, Panaji / Candolim',
    city: 'Goa',
    starRating: 4,
    reviewScore: 4.7,
    reviewsCount: 650,
    roomType: 'Portuguese 2-Bedroom Suite with Verandah',
    bedConfiguration: '1 King Bed + 2 Twin Beds (Capacity: 4 guests)',
    maxCapacity: 4,
    capacityVerifiedForFamily: true,
    pricePerNightINR: 3900,
    totalPriceINR: 27300,
    pricePerNightUSD: 46,
    totalPriceUSD: 322,
    amenities: [
      'Swimming Pool',
      'Daily Goan & Continental Breakfast',
      'Free High-Speed Wi-Fi',
      'Heritage Courtyard with mango trees'
    ],
    breakfastIncluded: true,
    freeCancellation: true,
    distanceFromCenter: 'Walking distance to Latin Quarter & promenade',
    imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    tag: 'Family-Friendly'
  },
  {
    id: 'ht-goa-3',
    name: 'Taj Holiday Village Resort & Spa',
    area: 'Sinquerim, Candolim, North Goa',
    city: 'Goa',
    starRating: 5,
    reviewScore: 4.9,
    reviewsCount: 3120,
    roomType: 'Luxury Sea-Facing Family Cottage with Lawn',
    bedConfiguration: '1 King Bed + 2 Single Rollaways (Capacity: 4 guests)',
    maxCapacity: 4,
    capacityVerifiedForFamily: true,
    pricePerNightINR: 15500,
    totalPriceINR: 108500,
    pricePerNightUSD: 184,
    totalPriceUSD: 1288,
    amenities: [
      'Beachfront cottages with manicured private lawns',
      'Jiva Spa & Roman court pools',
      'Complimentary Taj High Tea & sunset rituals',
      'Kids play zone & supervised lawn games'
    ],
    breakfastIncluded: true,
    freeCancellation: false,
    distanceFromCenter: 'Beachfront beside historic Aguada Fort',
    imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
    tag: 'Luxury Splurge'
  }
];

export const MOCK_TRANSFERS_GOA: TransferItem[] = [
  {
    id: 'tr-goa-trans-1',
    title: 'Private AC Cab (Airport Round Trip Transfer)',
    vehicleType: 'Private AC Sedan / MPV',
    capacityPassengers: 4,
    luggageCapacity: 3,
    priceINR: 3200,
    priceUSD: 38,
    description: 'Chauffeur-driven private AC cab for airport pickup and return transfer.',
    duration: 'Round-trip coverage',
    pickupLocation: 'Dabolim (GOI) / Mopa (GOX) Airport',
    dropLocation: 'South Goa Resort',
    source: 'sample',
    sourceLabel: 'Sample data'
  }
];

export const MOCK_VISA_GOA: VisaDetails = {
  country: 'India (Domestic Travel)',
  visaType: 'No Visa Required (Domestic Indian Resident)',
  feePerPersonINR: 0,
  feePerPersonUSD: 0,
  totalFeeINR: 0,
  totalFeeUSD: 0,
  processingTime: 'Instant (Zero formal application)',
  passportValidityRequired: 'Valid Government Photo ID (Aadhaar, Voter ID, Driving License)',
  officialSourceUrl: 'https://mha.gov.in',
  requiredDocuments: [
    'Aadhaar Card, Voter ID, or Driving License for all adult travellers',
    'School ID or Birth Certificate copy for accompanying minors'
  ],
  notes: 'Domestic journey within India. No passport, visa, or currency exchange required. Simple photo ID verification at airline counters and hotels.'
};

export const MOCK_ITINERARY_GOA: ActivityDayItem[] = [
  {
    day: 1,
    dateStr: 'Day 1',
    title: 'Arrival in Sunny Goa & Sunset Beach Walk',
    theme: 'Arrival & Relaxation',
    morning: 'Landing at Goa Airport; smooth private Innova Crysta chauffeur transfer to your family resort; check-in and beach welcome drinks.',
    afternoon: 'Relaxing family poolside downtime under swaying coconut palms; kids splash in the dedicated shallow pool.',
    evening: 'Sunset stroll along soft Varca white sands; beach shack dinner with fresh mocktails and grilled fish.',
    familyFriendlyScore: 10,
    estimatedCostINR: 1500,
    estimatedCostUSD: 18,
    localDining: ['Fisherman\'s Wharf (Riverside Goan Curries)', 'Kamat Pure Veg (South Indian & Thali)'],
    transitTip: 'Private AC Innova Crysta'
  },
  {
    day: 2,
    dateStr: 'Day 2',
    title: 'Historic Aguada Fort & Calangute Coastal Breeze',
    theme: 'Coastal Heritage & Panoramas',
    morning: 'Visit the 17th-century Portuguese Aguada Fort and historic lighthouse overlooking the Arabian Sea.',
    afternoon: 'Calm dolphin-spotting boat cruise departing from Sinquerim jetty (life jackets provided for kids).',
    evening: 'Dinner at Martin\'s Corner with lively live acoustic Goan music and kids ice cream sundaes.',
    familyFriendlyScore: 9,
    estimatedCostINR: 2200,
    estimatedCostUSD: 26,
    localDining: ['Martin\'s Corner (Legendary Goan specialties)', 'Navtara Pure Veg (Jain & Veg options)'],
    transitTip: 'Comfortable chauffeur-driven AC cab.'
  },
  {
    day: 3,
    dateStr: 'Day 3',
    title: 'Fontainhas Latin Quarter & Mandovi River Sunset Cruise',
    theme: 'Portuguese Culture & River Music',
    morning: 'Guided walking tour through picturesque Fontainhas: bright yellow, cobalt blue Portuguese villas and artistic azulejo tiles.',
    afternoon: 'Sample fresh warm Goan poi bread and pastel de nata custard tarts at the 120-year-old 31st January Bakery.',
    evening: '1-hour Mandovi River sunset cruise with Goan folk dances, music, and panoramic river vistas.',
    familyFriendlyScore: 10,
    estimatedCostINR: 1800,
    estimatedCostUSD: 21,
    localDining: ['Viva Panjim (Heritage Indo-Portuguese dishes)', 'Ritz Classic (Famous seafood thali)'],
    transitTip: 'Walking in pedestrian alleys + AC minivan.'
  },
  {
    day: 4,
    dateStr: 'Day 4',
    title: 'Dudhsagar Waterfalls & Organic Spice Plantation Safari',
    theme: 'Nature & Jungle Safari',
    morning: 'Scenic morning jeep safari through Bhagwan Mahavir Wildlife Sanctuary to view the roaring Dudhsagar Waterfalls.',
    afternoon: 'Guided spice plantation walk at Sahakari Spice Farm: touch fresh cardamom, vanilla, and pepper; organic buffet lunch served on banana leaves.',
    evening: 'Elephant interaction and wash session for the kids; relaxing evening drive back to the resort.',
    familyFriendlyScore: 10,
    estimatedCostINR: 2800,
    estimatedCostUSD: 33,
    localDining: ['Organic Spice Farm Banana Leaf Buffet', 'Fresh sugarcane ginger juice'],
    transitTip: 'Forest 4x4 Jeep + AC Innova transfer.'
  },
  {
    day: 5,
    dateStr: 'Day 5',
    title: 'Old Goa UNESCO Cathedrals & Mangueshi Temple',
    theme: 'Spiritual & Architectural Wonders',
    morning: 'Marvel at the Basilica of Bom Jesus (UNESCO World Heritage) and the majestic Se Cathedral.',
    afternoon: 'Visit the peaceful Shri Mangueshi Temple set amidst rolling green areca palm hills.',
    evening: 'Leisurely sunset at Miramar beach; enjoy sweet roasted corn and tender coconut water.',
    familyFriendlyScore: 9,
    estimatedCostINR: 1100,
    estimatedCostUSD: 13,
    localDining: ['Bhojan Pure Veg (Traditional Gujarati & Marwari Thalis)', 'Kamat Hotel'],
    transitTip: 'AC cab transfers between sights.'
  },
  {
    day: 6,
    dateStr: 'Day 6',
    title: 'Water Sports & Beach Shack Farewell Celebration',
    theme: 'Fun, Sand & Watersports',
    morning: 'Gentle family banana boat rides, bumper rides, and parasailing at Benaulim / Candolim with certified safety crew.',
    afternoon: 'Free family downtime: building sandcastles, souvenir shell gathering, and poolside coconut smoothies.',
    evening: 'Candlelight beachside farewell banquet with fresh catch of the day, butter garlic crab, and warm bebinca dessert.',
    familyFriendlyScore: 10,
    estimatedCostINR: 2400,
    estimatedCostUSD: 28,
    localDining: ['Pousada by the Beach (Serene beachside dining)', 'Infantaria Bakery'],
    transitTip: 'Short resort walk.'
  },
  {
    day: 7,
    dateStr: 'Day 7',
    title: 'Souvenir Cashew Shopping & Homeward Flight',
    theme: 'Departure & Sweet Memories',
    morning: 'Shop for famous Goan spiced cashews, feni, bebinca, and handwoven beach hats at Panaji market.',
    afternoon: 'Smooth hotel checkout; chauffeur drop-off at Goa Airport for your direct flight to Bengaluru.',
    evening: 'Arrive home in Bengaluru with refreshed minds and cherished family photos.',
    familyFriendlyScore: 10,
    estimatedCostINR: 900,
    estimatedCostUSD: 11,
    localDining: ['Airport Cafe & bakery', 'Goan cashew sweets'],
    transitTip: 'Private AC airport transfer.'
  }
];

export const MOCK_DINING_GOA: DiningItem[] = [
  {
    id: 'din-goa-1',
    name: 'Martin\'s Corner',
    cuisine: 'Authentic Goan, Seafood & Continental',
    area: 'Betalbatim, South Goa',
    priceForTwoINR: 1400,
    rating: 4.8,
    isPureVeg: false,
    isJainFriendly: false,
    isFamilyFriendly: true,
    recommendedDishes: ['Goan Fish Curry Rice', 'Butter Garlic Prawns', 'Chicken Xacuti', 'Bebinca'],
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'din-goa-2',
    name: 'Kamat Pure Veg Panaji',
    cuisine: 'Pure Vegetarian South Indian & Goan Thali',
    area: 'Church Square, Panaji',
    priceForTwoINR: 600,
    rating: 4.6,
    isPureVeg: true,
    isJainFriendly: true,
    isFamilyFriendly: true,
    recommendedDishes: ['Special Goan Veg Thali', 'Crispy Mysore Masala Dosa', 'Filter Coffee'],
    imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'din-goa-3',
    name: 'Pousada By The Beach',
    cuisine: 'Coastal Goan & Beachside Dining',
    area: 'Holiday Street, Calangute',
    priceForTwoINR: 1800,
    rating: 4.7,
    isPureVeg: false,
    isJainFriendly: false,
    isFamilyFriendly: true,
    recommendedDishes: ['Pan-seared Kingfish with lemon butter', 'Fresh coconut tender water', 'Prawn Balchao'],
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'din-goa-4',
    name: 'Navtara Pure Veg',
    cuisine: 'Multi-cuisine Pure Veg with Jain options',
    area: 'Porvorim / Mapusa',
    priceForTwoINR: 750,
    rating: 4.5,
    isPureVeg: true,
    isJainFriendly: true,
    isFamilyFriendly: true,
    recommendedDishes: ['Jain Paneer Butter Masala', 'Cheese Pav Bhaji', 'Fresh Fruit Falooda'],
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80'
  }
];

// ==========================================
// 1B. COORG (KARNATAKA HILL STATION ROAD TRIP)
// ==========================================
export const MOCK_HOTELS_COORG: HotelItem[] = [
  {
    id: 'ht-coorg-budget',
    name: 'Coorg Coffee Country Homestay',
    area: 'Madikeri, Coorg',
    city: 'Coorg',
    starRating: 3,
    reviewScore: 4.5,
    reviewsCount: 310,
    roomType: 'Standard Plantation Suite',
    bedConfiguration: '1 King Bed + 1 Rollaway Bed (Capacity: 3-4 guests)',
    maxCapacity: 4,
    capacityVerifiedForFamily: true,
    pricePerNightINR: 1800,
    totalPriceINR: 3600,
    pricePerNightUSD: 22,
    totalPriceUSD: 44,
    amenities: [
      'Estate Coffee Walk',
      'Complimentary Kodava Breakfast Included',
      'Campfire on Request',
      'Free High-Speed Wi-Fi'
    ],
    breakfastIncluded: true,
    freeCancellation: true,
    distanceFromCenter: '3 km from Madikeri town',
    imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    tag: 'Within Budget',
    source: 'sample',
    sourceLabel: 'Sample data'
  },
  {
    id: 'ht-coorg-1',
    name: 'Misty Woods Plantation Resort, Coorg',
    area: 'Madikeri, Coorg',
    city: 'Coorg',
    starRating: 4,
    reviewScore: 4.7,
    reviewsCount: 520,
    roomType: 'Coffee Plantation Cottage Suite',
    bedConfiguration: '1 King Bed + 1 Rollaway Bed (Capacity: 3-4 guests)',
    maxCapacity: 4,
    capacityVerifiedForFamily: true,
    pricePerNightINR: 3200,
    totalPriceINR: 6400,
    pricePerNightUSD: 38,
    totalPriceUSD: 76,
    amenities: [
      'Guided Coffee Plantation Walk',
      'Daily Homestyle Breakfast Included',
      'Evening Campfire & Barbecue',
      'Free High-Speed Wi-Fi',
      'Stream-side Hammocks & Nature Trails'
    ],
    breakfastIncluded: true,
    freeCancellation: true,
    distanceFromCenter: '4 km from Madikeri town',
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
    tag: 'Best Match',
    source: 'sample',
    sourceLabel: 'Sample data'
  },
  {
    id: 'ht-coorg-2',
    name: 'The Tamara Coorg (Luxury Eco Stay)',
    area: 'Kabbinakad Estate, Coorg',
    city: 'Coorg',
    starRating: 5,
    reviewScore: 4.9,
    reviewsCount: 890,
    roomType: 'Luxury Cottage with Forest View',
    bedConfiguration: '1 King Bed + 2 Twin Beds (Capacity: 4 guests)',
    maxCapacity: 4,
    capacityVerifiedForFamily: true,
    pricePerNightINR: 8500,
    totalPriceINR: 17000,
    pricePerNightUSD: 101,
    totalPriceUSD: 202,
    amenities: [
      'Private Forest Balcony',
      'Ayurvedic Spa & Wellness Center',
      'Complimentary Estate Breakfast & High Tea',
      'Guided Bird Watching Walks'
    ],
    breakfastIncluded: true,
    freeCancellation: true,
    distanceFromCenter: 'Scenic hills',
    imageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
    tag: 'Luxury Splurge',
    source: 'sample',
    sourceLabel: 'Sample data'
  }
];

export const MOCK_TRANSFERS_COORG: TransferItem[] = [
  {
    id: 'tr-coorg-road-1',
    title: 'Private AC Outstation Cab (Bengaluru ↔ Coorg Round-Trip)',
    vehicleType: 'Private AC Sedan (Chauffeured)',
    capacityPassengers: 4,
    luggageCapacity: 3,
    priceINR: 5500,
    priceUSD: 65,
    description: 'Chauffeured private round-trip cab between Bengaluru and Coorg (~250 km each way via NH75/SH88). Dedicated for highway transit and local exploration.',
    duration: '5h 30m each way',
    pickupLocation: 'Bengaluru Residence / Pickup',
    dropLocation: 'Coorg Estate Stay',
    source: 'sample',
    sourceLabel: 'Sample data'
  }
];

export const MOCK_ACTIVITIES_COORG: ActivityDayItem[] = [
  {
    day: 1,
    dateStr: 'Day 1',
    title: 'Scenic Highway Drive & Plantation Check-in',
    theme: 'Coffee Country Arrival',
    morning: 'Morning road drive from Bengaluru through rolling green Western Ghats; stop at Channapatna for coffee.',
    afternoon: 'Arrive in Coorg; check in to scenic coffee estate cottage; enjoy warm filter coffee overlooking mist.',
    evening: 'Leisurely sunset walk along the estate coffee trails; authentic Kodava dinner by the fireplace.',
    familyFriendlyScore: 10,
    estimatedCostINR: 800,
    estimatedCostUSD: 10,
    localDining: ['Coorg Cuisine Madikeri (Authentic Pandi Curry & Akki Rotti)', 'Estate Fresh Filter Coffee'],
    transitTip: 'Private AC sedan drive.'
  },
  {
    day: 2,
    dateStr: 'Day 2',
    title: 'Abbey Falls, Dubare Elephants & Raja\'s Seat',
    theme: 'Nature, Waterfalls & Heritage',
    morning: 'Visit roaring Abbey Falls surrounded by pepper vines; river crossing at Dubare Elephant Camp.',
    afternoon: 'Lunch at Raintree Restaurant; visit Omkareshwara Temple featuring Gothic and Islamic architecture.',
    evening: 'Panoramic sunset views across Western Ghat valleys from Raja\'s Seat; musical fountain show.',
    familyFriendlyScore: 10,
    estimatedCostINR: 1200,
    estimatedCostUSD: 14,
    localDining: ['Raintree Restaurant (Kodava specialties & mild stews)', 'Local Spiced Honey Cakes'],
    transitTip: 'Private AC cab for local sightseeing.'
  },
  {
    day: 3,
    dateStr: 'Day 3',
    title: 'Golden Temple Bylakuppe & Return Drive to Bengaluru',
    theme: 'Tibetan Heritage & Homeward Drive',
    morning: 'Visit Namdroling Monastery (Golden Temple) in Bylakuppe; view majestic 40-foot gilded Buddha statues.',
    afternoon: 'Tibetan thukpa and momo lunch; shop for organic Coorg spices, dark chocolate, and roasted coffee beans.',
    evening: 'Scenic afternoon drive back along Mysore-Bengaluru expressway, reaching Bengaluru by 7:30 PM.',
    familyFriendlyScore: 10,
    estimatedCostINR: 600,
    estimatedCostUSD: 7,
    localDining: ['Bylakuppe Tibetan Kitchen (Fresh Steamed Momos & Thukpa)', 'Highway filter coffee stop'],
    transitTip: 'Private AC cab return.'
  }
];

export const MOCK_DINING_COORG: DiningItem[] = [
  {
    id: 'din-coorg-1',
    name: 'Coorg Cuisine',
    cuisine: 'Traditional Kodava Cuisine',
    area: 'Main Post Office Road, Madikeri',
    priceForTwoINR: 750,
    rating: 4.7,
    isPureVeg: false,
    isJainFriendly: false,
    isFamilyFriendly: true,
    recommendedDishes: ['Pandi Curry with Kadambuttu', 'Akki Rotti with Bamboo Shoot Curry', 'Coorg Filter Coffee'],
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'din-coorg-2',
    name: 'Raintree Restaurant',
    cuisine: 'Kodava, South Indian & Multi-Cuisine',
    area: 'Pension Lane, Madikeri',
    priceForTwoINR: 900,
    rating: 4.6,
    isPureVeg: false,
    isJainFriendly: true,
    isFamilyFriendly: true,
    recommendedDishes: ['Koli Curry with Nooputtu', 'Ghee Roast Dosa', 'Cardamom Tea'],
    imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'din-coorg-3',
    name: 'Taste of Coorg',
    cuisine: 'Authentic Kodava Specialties',
    area: 'Stuart Hill, Madikeri',
    priceForTwoINR: 700,
    rating: 4.5,
    isPureVeg: false,
    isJainFriendly: false,
    isFamilyFriendly: true,
    recommendedDishes: ['Kadambuttu & Coorg Spiced Curry', 'Akki Rotti', 'Fresh Passion Fruit Juice'],
    imageUrl: ''
  },
  {
    id: 'din-coorg-4',
    name: 'Udupi The Veg Restaurant',
    cuisine: 'Pure Vegetarian South Indian & Thalis',
    area: 'College Road, Madikeri',
    priceForTwoINR: 500,
    rating: 4.5,
    isPureVeg: true,
    isJainFriendly: true,
    isFamilyFriendly: true,
    recommendedDishes: ['South Indian Special Thali', 'Bisi Bele Bath', 'Filter Coffee'],
    imageUrl: ''
  }
];

// ==========================================
// 1C. KERALA (MUNNAR & ALLEPPEY SLOW PACE)
// ==========================================
export const MOCK_HOTELS_KERALA: HotelItem[] = [
  {
    id: 'ht-kerala-budget',
    name: 'Munnar Misty Garden Homestay',
    area: 'Old Munnar, Munnar',
    city: 'Munnar',
    starRating: 3,
    reviewScore: 4.4,
    reviewsCount: 420,
    roomType: 'Ground Floor Valley View Family Suite',
    bedConfiguration: '1 King Bed + 1 Rollaway Bed (Capacity: 3-4 guests)',
    maxCapacity: 4,
    capacityVerifiedForFamily: true,
    pricePerNightINR: 1600,
    totalPriceINR: 6400,
    pricePerNightUSD: 19,
    totalPriceUSD: 76,
    amenities: [
      'Valley View Balcony',
      'Complimentary Kerala Breakfast Included',
      '24/7 Hot Water & Room Service',
      'Doctor on Call & Taxi Assistance'
    ],
    breakfastIncluded: true,
    freeCancellation: true,
    distanceFromCenter: '1.5 km from Munnar town',
    imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    tag: 'Within Budget',
    source: 'sample',
    sourceLabel: 'Sample data'
  },
  {
    id: 'ht-kerala-1',
    name: 'Tea Valley Homestay & Resort, Munnar',
    area: 'Tea Valley, Munnar',
    city: 'Munnar',
    starRating: 3,
    reviewScore: 4.6,
    reviewsCount: 680,
    roomType: 'Ground Floor Garden View Family Suite',
    bedConfiguration: '1 King Bed + 1 Rollaway Bed (Capacity: 3-4 guests)',
    maxCapacity: 4,
    capacityVerifiedForFamily: true,
    pricePerNightINR: 2800,
    totalPriceINR: 11200,
    pricePerNightUSD: 33,
    totalPriceUSD: 133,
    amenities: [
      'Ground Floor Rooms (Zero Stairs - Senior Accessible)',
      'Complimentary Kerala Breakfast Included',
      'Panoramic Tea Garden Views',
      'Doctor on Call & 24/7 Hot Water'
    ],
    breakfastIncluded: true,
    freeCancellation: true,
    distanceFromCenter: 'Quiet tea hills',
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
    tag: 'Family-Friendly',
    source: 'sample',
    sourceLabel: 'Sample data'
  },
  {
    id: 'ht-kerala-luxury',
    name: 'Fragrant Nature Munnar Resort',
    area: 'Pothamedu, Munnar',
    city: 'Munnar',
    starRating: 5,
    reviewScore: 4.9,
    reviewsCount: 950,
    roomType: 'Premium Valley View Suite with Fireplace',
    bedConfiguration: '1 King Bed + 2 Twin Beds (Capacity: 4 guests)',
    maxCapacity: 4,
    capacityVerifiedForFamily: true,
    pricePerNightINR: 6500,
    totalPriceINR: 26000,
    pricePerNightUSD: 77,
    totalPriceUSD: 308,
    amenities: [
      'In-room Fireplace & Panoramic Valley Balcony',
      'Complimentary Lavish Buffet Breakfast & High Tea',
      'Ayurvedic Wellness Spa',
      'Indoor Kids Play Zone & Game Room'
    ],
    breakfastIncluded: true,
    freeCancellation: true,
    distanceFromCenter: 'Pothamedu Viewpoint road',
    imageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
    tag: 'Luxury Splurge',
    source: 'sample',
    sourceLabel: 'Sample data'
  }
];

export const MOCK_TRANSFERS_KERALA: TransferItem[] = [
  {
    id: 'tr-kerala-cab-1',
    title: 'Private AC Chauffeur Cab (Kochi ↔ Munnar & Alleppey)',
    vehicleType: 'Private AC Sedan / MPV',
    capacityPassengers: 4,
    luggageCapacity: 3,
    priceINR: 5200,
    priceUSD: 62,
    description: 'Chauffeured private AC cab for comfortable intercity transfers between Kochi, Munnar, and Alleppey.',
    duration: '5 days dedicated transit',
    pickupLocation: 'Kochi Airport (COK) / Railway Station',
    dropLocation: 'Munnar & Alleppey Resorts',
    source: 'sample',
    sourceLabel: 'Sample data'
  }
];

export const MOCK_DINING_KERALA: DiningItem[] = [
  {
    id: 'din-ker-1',
    name: 'Saravana Bhavan Munnar',
    cuisine: 'Pure Vegetarian South Indian & Kerala Sadya',
    area: 'Post Office Junction, Munnar',
    priceForTwoINR: 500,
    rating: 4.6,
    isPureVeg: true,
    isJainFriendly: true,
    isFamilyFriendly: true,
    recommendedDishes: ['Kerala Veg Sadya on Banana Leaf', 'Crispy Ghee Roast Dosa', 'Appam with Coconut Vegetable Stew'],
    imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'din-ker-2',
    name: 'Rapsy Restaurant Munnar',
    cuisine: 'Authentic Kerala Local & Continental Comforts',
    area: 'Main Bazaar, Munnar',
    priceForTwoINR: 650,
    rating: 4.5,
    isPureVeg: false,
    isJainFriendly: false,
    isFamilyFriendly: true,
    recommendedDishes: ['Malabar Parotta with Veg Kurma', 'Spanish Omelette', 'Fresh Cardamom Spiced Tea'],
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'din-ker-3',
    name: 'Hotel Gurubhavan Munnar',
    cuisine: 'Traditional Kerala Spiced Kitchen & Homestyle Curries',
    area: 'Tea County Road, Munnar',
    priceForTwoINR: 750,
    rating: 4.6,
    isPureVeg: false,
    isJainFriendly: false,
    isFamilyFriendly: true,
    recommendedDishes: ['Homestyle Kerala Thali', 'Fish Pollichathu wrapped in banana leaf', 'Appam & Vegetable Stew'],
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'din-ker-4',
    name: 'Copper Castle Panorama Bistro',
    cuisine: 'Scenic Mountain View Dining & Kerala Grills',
    area: 'Kannan Devan Hills, Munnar',
    priceForTwoINR: 1200,
    rating: 4.7,
    isPureVeg: false,
    isJainFriendly: false,
    isFamilyFriendly: true,
    recommendedDishes: ['Claypot Kerala Biryani', 'Grilled Mountain Fish with Herbs', 'Fresh Hill Berry Crumble'],
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80'
  }
];

// ==========================================
// 1D. MYSURU (HERITAGE TRAIN DAY TRIP)
// ==========================================
export const MOCK_HOTELS_MYSURU: HotelItem[] = [
  {
    id: 'ht-mysuru-budget',
    name: 'Hotel Roopa Heritage, Mysuru',
    area: 'Central Mysuru',
    city: 'Mysuru',
    starRating: 3,
    reviewScore: 4.3,
    reviewsCount: 510,
    roomType: 'Heritage Deluxe Family Room',
    bedConfiguration: '1 King Bed + 1 Single Bed (Capacity: 3-4 guests)',
    maxCapacity: 4,
    capacityVerifiedForFamily: true,
    pricePerNightINR: 1500,
    totalPriceINR: 1500,
    pricePerNightUSD: 18,
    totalPriceUSD: 18,
    amenities: [
      'Near Mysore Palace',
      'Complimentary South Indian Breakfast',
      'Free High-Speed Wi-Fi',
      'Lift Access & Parking'
    ],
    breakfastIncluded: true,
    freeCancellation: true,
    distanceFromCenter: '800m from Mysore Palace',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    tag: 'Within Budget',
    source: 'sample',
    sourceLabel: 'Sample data'
  },
  {
    id: 'ht-mysuru-1',
    name: 'Radisson Blu Plaza Hotel Mysuru',
    area: 'MG Road, Mysuru',
    city: 'Mysuru',
    starRating: 4,
    reviewScore: 4.7,
    reviewsCount: 1200,
    roomType: 'Superior King Room with Chamundi View',
    bedConfiguration: '1 King Bed + 1 Rollaway (Capacity: 3-4 guests)',
    maxCapacity: 4,
    capacityVerifiedForFamily: true,
    pricePerNightINR: 3500,
    totalPriceINR: 3500,
    pricePerNightUSD: 42,
    totalPriceUSD: 42,
    amenities: ['Buffet Breakfast', 'Outdoor Swimming Pool', 'Free Wi-Fi', 'Near Palace'],
    breakfastIncluded: true,
    freeCancellation: true,
    distanceFromCenter: '1 km from Mysore Palace',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    tag: 'Best Match',
    source: 'sample',
    sourceLabel: 'Sample data'
  },
  {
    id: 'ht-mysuru-luxury',
    name: 'Grand Mercure Mysuru',
    area: 'Nelson Mandela Road, Mysuru',
    city: 'Mysuru',
    starRating: 5,
    reviewScore: 4.8,
    reviewsCount: 880,
    roomType: 'Executive Suite with Chamundi Hills View',
    bedConfiguration: '1 King Bed + 2 Rollaways (Capacity: 4 guests)',
    maxCapacity: 4,
    capacityVerifiedForFamily: true,
    pricePerNightINR: 5800,
    totalPriceINR: 5800,
    pricePerNightUSD: 69,
    totalPriceUSD: 69,
    amenities: [
      'Rooftop Swimming Pool',
      'Lavish Buffet Breakfast Included',
      'Ayurvedic Spa & Fitness Centre',
      'Chamundi Hills Panoramic View'
    ],
    breakfastIncluded: true,
    freeCancellation: true,
    distanceFromCenter: '2.5 km from Railway Station',
    imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    tag: 'Luxury Splurge',
    source: 'sample',
    sourceLabel: 'Sample data'
  }
];

export const MOCK_TRANSFERS_MYSURU: TransferItem[] = [
  {
    id: 'tr-mysuru-local-1',
    title: 'Private AC Sightseeing Cab (Mysuru City)',
    vehicleType: 'Private AC Sedan',
    capacityPassengers: 4,
    luggageCapacity: 2,
    priceINR: 1800,
    priceUSD: 21,
    description: 'Dedicated AC cab for Railway Station pickup, Mysore Palace, Chamundi Hills, and return drop.',
    duration: 'Full Day Sightseeing',
    pickupLocation: 'Mysuru Railway Station (MYS)',
    dropLocation: 'Palace & Local Attractions',
    source: 'sample',
    sourceLabel: 'Sample data'
  }
];

export const MOCK_TRAINS_MYSURU: TrainItem[] = [
  {
    id: 'tr-blr-mys-20607',
    trainName: 'Vande Bharat Express',
    trainNumber: '20607',
    fromStation: 'KSR Bengaluru (SBC)',
    toStation: 'Mysuru Jn (MYS)',
    departureTime: '06:00 AM',
    arrivalTime: '07:45 AM',
    duration: '1h 45m',
    classes: [
      { code: 'CC', name: 'AC Chair Car', fareINR: 540, availability: 'Available (42)', isAvailable: true },
      { code: 'EC', name: 'Executive Chair Car', fareINR: 1040, availability: 'Available (14)', isAvailable: true }
    ],
    selectedClass: 'CC',
    pricePerPersonINR: 540,
    totalPriceINR: 1080,
    foodIncluded: true,
    isVandeBharatOrRajdhani: true,
    source: 'sample',
    sourceLabel: 'Sample data'
  }
];

export const MOCK_DINING_MYSURU: DiningItem[] = [
  {
    id: 'din-mys-1',
    name: 'Original Hotel Vinayaka Mylari',
    cuisine: 'Legendary Mysuru Heritage Dosa & Filter Coffee',
    area: 'Nazarbad, Mysuru',
    priceForTwoINR: 350,
    rating: 4.8,
    isPureVeg: true,
    isJainFriendly: true,
    isFamilyFriendly: true,
    recommendedDishes: ['Original Mylari Butter Masala Dosa', 'Steamed Idli with Fresh Coconut Chutney', 'Traditional Mysuru Filter Coffee'],
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'din-mys-2',
    name: 'Hotel RRR Mysuru',
    cuisine: 'Authentic Karnataka & Andhra Banana Leaf Dining',
    area: 'Gandhi Square, Mysuru',
    priceForTwoINR: 650,
    rating: 4.6,
    isPureVeg: false,
    isJainFriendly: false,
    isFamilyFriendly: true,
    recommendedDishes: ['RRR Special Spiced Biryani', 'Guntur Paneer', 'Traditional Meals on Plantain Leaf'],
    imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'din-mys-3',
    name: 'Om Shanti Pure Veg Restaurant',
    cuisine: 'Pure Vegetarian South Indian & Heritage Karnataka Thali',
    area: 'Central Mysuru',
    priceForTwoINR: 550,
    rating: 4.5,
    isPureVeg: true,
    isJainFriendly: true,
    isFamilyFriendly: true,
    recommendedDishes: ['Mysore Special Maharaja Veg Thali', 'Bisi Bele Bath with Boondi', 'Melt-in-mouth Mysore Pak'],
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'din-mys-4',
    name: 'Gufha Restaurant Mysuru',
    cuisine: 'Themed Cave Dining & Regional Royal Mughlai',
    area: 'Nazarbad, Mysuru',
    priceForTwoINR: 1100,
    rating: 4.5,
    isPureVeg: false,
    isJainFriendly: false,
    isFamilyFriendly: true,
    recommendedDishes: ['Mysore Royal Paneer Tikka', 'Tandoori Roti with Dal Tadka', 'Saffron Kulfi Falooda'],
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80'
  }
];

// ==========================================
// 2. JAPAN (INTERNATIONAL OUTBOUND BENCHMARK)
// ==========================================
export const MOCK_FLIGHTS_JAPAN: FlightItem[] = [
  {
    id: 'fl-jp-1',
    airline: 'All Nippon Airways (ANA)',
    airlineCode: 'NH',
    flightNumber: 'NH 868 / NH 849',
    originCode: 'BLR',
    originCity: 'Bengaluru',
    destinationCode: 'NRT',
    destinationCity: 'Tokyo (Narita)',
    departureTime: '08:20 AM',
    arrivalTime: '08:45 PM',
    duration: '9h 55m',
    stops: 'Non-stop Direct',
    pricePerPersonINR: 36000,
    totalPriceINR: 72000, // 2 travellers
    pricePerPersonUSD: 428,
    totalPriceUSD: 856,
    isRoundTrip: true,
    outboundFarePerPersonINR: 18000,
    returnFarePerPersonINR: 18000,
    outboundTotalPriceINR: 36000,
    returnTotalPriceINR: 36000,
    baggage: '2 x 23 kg Checked Baggage + 10 kg Cabin Bag per person',
    cabinClass: 'Economy Care',
    refundable: true,
    seatAvailability: 8,
    tag: 'Recommended',
    adjacentFamilySeatsGuaranteed: true,
    source: 'sample',
    sourceLabel: 'Sample data'
  },
  {
    id: 'fl-jp-2',
    airline: 'Singapore Airlines',
    airlineCode: 'SQ',
    flightNumber: 'SQ 503 / SQ 638',
    originCode: 'BLR',
    originCity: 'Bengaluru',
    destinationCode: 'HND',
    destinationCity: 'Tokyo (Haneda)',
    departureTime: '11:10 PM',
    arrivalTime: '02:30 PM (+1 Day)',
    duration: '11h 50m',
    stops: '1 Stop at SIN (1h 55m)',
    isRoundTrip: true,
    outboundFarePerPersonINR: 21250,
    returnFarePerPersonINR: 21250,
    outboundTotalPriceINR: 42500,
    returnTotalPriceINR: 42500,
    pricePerPersonINR: 42500,
    totalPriceINR: 85000,
    pricePerPersonUSD: 505,
    totalPriceUSD: 1010,
    baggage: '25 kg Checked Baggage + Gourmet Meals & Wi-Fi',
    cabinClass: 'Economy Premium Care',
    refundable: true,
    seatAvailability: 6,
    tag: 'Recommended',
    adjacentFamilySeatsGuaranteed: true,
    source: 'sample',
    sourceLabel: 'Sample data'
  }
];

export const MOCK_HOTELS_JAPAN: HotelItem[] = [
  {
    id: 'ht-jp-1',
    name: 'Mimaru Tokyo Station East',
    area: 'Hatchobori, Chuo City, Tokyo',
    city: 'Tokyo',
    starRating: 4,
    reviewScore: 4.9,
    reviewsCount: 1650,
    roomType: 'Japanese Modern Apartment Suite (Kitchenette + 4 Beds)',
    bedConfiguration: '2 Single Beds + 2 Bunk Beds (Capacity: 4 guests)',
    maxCapacity: 4,
    capacityVerifiedForFamily: true,
    pricePerNightINR: 9800,
    totalPriceINR: 98000, // 10 nights
    pricePerNightUSD: 116,
    totalPriceUSD: 1160,
    amenities: [
      'Fully equipped kitchen with induction & microwave',
      'Dining table and spacious living area',
      'Washer-dryer in room',
      'Walking distance to Tokyo Station & Hatchobori Subway'
    ],
    breakfastIncluded: false,
    freeCancellation: true,
    distanceFromCenter: '10 min walk to Tokyo Central Station',
    imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
    tag: 'Best Match'
  },
  {
    id: 'ht-jp-2',
    name: 'Kyoto Tokyu Hotel',
    area: 'Horikawa-dori, Shimogyo Ward, Kyoto',
    city: 'Kyoto',
    starRating: 4,
    reviewScore: 4.7,
    reviewsCount: 920,
    roomType: 'Deluxe Courtyard Family Room',
    bedConfiguration: '2 Double Beds (Capacity: 4 guests)',
    maxCapacity: 4,
    capacityVerifiedForFamily: true,
    pricePerNightINR: 8400,
    totalPriceINR: 84000,
    pricePerNightUSD: 100,
    totalPriceUSD: 1000,
    amenities: [
      'Serene traditional bamboo courtyard & flowing water stream',
      'Complimentary shuttle bus to JR Kyoto Station',
      'Authentic Japanese teahouse on-site',
      'Luggage forward dispatch to airport'
    ],
    breakfastIncluded: true,
    freeCancellation: true,
    distanceFromCenter: '5 mins by shuttle to Kyoto Station',
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
    tag: 'Family-Friendly'
  }
];

export const MOCK_TRANSFERS_JAPAN: TransferItem[] = [
  {
    id: 'tr-jp-1',
    title: '7-Day Japan Rail (JR) Nationwide Bullet Train Pass + Tokyo Pasmo Card',
    vehicleType: 'Shinkansen Bullet Train & Tokyo Subway Pass',
    capacityPassengers: 4,
    luggageCapacity: 4,
    priceINR: 18500,
    priceUSD: 220,
    description: 'Unlimited rides on Shinkansen bullet trains between Tokyo and Kyoto + pre-loaded IC transit cards for intra-city Tokyo subways.',
    duration: '7 Days continuous travel',
    pickupLocation: 'Tokyo Narita / Haneda JR Service Center',
    dropLocation: 'Nationwide Japan'
  }
];

export const MOCK_VISA_JAPAN: VisaDetails = {
  country: 'Japan',
  visaType: 'Japan Official eVisa (Single-Entry Tourist for Indian Citizens)',
  feePerPersonINR: 1680,
  feePerPersonUSD: 20,
  totalFeeINR: 6720,
  totalFeeUSD: 80,
  processingTime: '5 to 7 working days via MOFA portal',
  passportValidityRequired: 'Minimum 6 months validity from entry date + 2 blank pages',
  officialSourceUrl: 'https://www.mofa.go.jp/j_info/visit/visa/index.html',
  requiredDocuments: [
    'Digital passport biodata page color scan',
    'Confirmed round-trip flight booking voucher',
    'Hotel reservations across travel dates',
    'Recent 6-month bank statement verifying travel funds'
  ],
  notes: 'Official government consular fee is ¥3,000 (~₹1,680) per applicant. Apply online through the Japan eVisa website without visiting VFS in person.'
};

export const MOCK_DINING_JAPAN: DiningItem[] = [
  {
    id: 'din-jp-1',
    name: 'T\'s Tantan (Tokyo Station)',
    cuisine: '100% Vegan & Vegetarian Japanese Ramen',
    area: 'Keiyo Street inside Tokyo Station',
    priceForTwoINR: 1200,
    rating: 4.8,
    isPureVeg: true,
    isJainFriendly: true,
    isFamilyFriendly: true,
    recommendedDishes: ['Golden Sesame Tantanmen', 'Vegan Gyoza Dumplings', 'Soy Milk Broth Noodles'],
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'din-jp-2',
    name: 'Ichiran Ramen (Shibuya)',
    cuisine: 'Iconic Custom Pork Broth Ramen',
    area: 'Shibuya Jinnan, Tokyo',
    priceForTwoINR: 1400,
    rating: 4.9,
    isPureVeg: false,
    isJainFriendly: false,
    isFamilyFriendly: true,
    recommendedDishes: ['Classic Tonkotsu Ramen with soft-boiled seasoned egg', 'Matcha almond pudding'],
    imageUrl: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'din-jp-3',
    name: 'Shigetsu at Tenryu-ji Temple',
    cuisine: 'UNESCO World Heritage Shojin Ryori (Buddhist Pure Vegetarian)',
    area: 'Arashiyama, Kyoto',
    priceForTwoINR: 3200,
    rating: 4.9,
    isPureVeg: true,
    isJainFriendly: true,
    isFamilyFriendly: true,
    recommendedDishes: ['Yuzu simmered tofu', 'Mountain root tempura', 'Sesame miso eggplant', 'Wild herb rice'],
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'
  }
];

export const MOCK_DINING_VIETNAM: DiningItem[] = [
  {
    id: 'din-vn-1',
    name: 'Pho Gia Truyen Bat Dan',
    cuisine: 'Traditional Northern Vietnamese Pho',
    area: 'Old Quarter, Hanoi',
    priceForTwoINR: 450,
    rating: 4.8,
    isPureVeg: false,
    isJainFriendly: false,
    isFamilyFriendly: true,
    recommendedDishes: ['Pho Bo Tai Nam (Fresh beef noodle soup)', 'Quay (Crispy dough crullers)'],
    imageUrl: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'din-vn-2',
    name: 'Uu Dam Chay Buddhist Fine Dining',
    cuisine: '100% Pure Vegetarian / Vegan Vietnamese Heritage',
    area: 'French Quarter, Hoan Kiem, Hanoi',
    priceForTwoINR: 1400,
    rating: 4.9,
    isPureVeg: true,
    isJainFriendly: true,
    isFamilyFriendly: true,
    recommendedDishes: ['Lotus root salad with pomelo', 'Crispy vegetarian spring rolls', 'Pineapple hotpot'],
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'din-vn-3',
    name: 'Bun Cha Huong Lien (Obama Restaurant)',
    cuisine: 'Authentic Hanoi Bun Cha',
    area: 'Le Van Huu, Hanoi',
    priceForTwoINR: 550,
    rating: 4.7,
    isPureVeg: false,
    isJainFriendly: false,
    isFamilyFriendly: true,
    recommendedDishes: ['Combo Obama (Bun Cha grilled pork patties + fried seafood roll + cold beer/juice)'],
    imageUrl: 'https://images.unsplash.com/photo-1503764654157-727109b6a151?auto=format&fit=crop&w=600&q=80'
  }
];

// ==========================================
// 3. SINGAPORE (INTERNATIONAL BENCHMARK)
// ==========================================
export const MOCK_FLIGHTS_SINGAPORE: FlightItem[] = [
  {
    id: 'fl-sg-1',
    airline: 'Singapore Airlines',
    airlineCode: 'SQ',
    flightNumber: 'SQ 503',
    originCode: 'BLR',
    originCity: 'Bengaluru',
    destinationCode: 'SIN',
    destinationCity: 'Singapore (Changi)',
    departureTime: '11:10 PM',
    arrivalTime: '06:10 AM (+1 Day)',
    duration: '4h 30m',
    stops: 'Non-stop Direct',
    isRoundTrip: true,
    outboundFarePerPersonINR: 9250,
    returnFarePerPersonINR: 9250,
    outboundTotalPriceINR: 18500,
    returnTotalPriceINR: 18500,
    pricePerPersonINR: 18500,
    totalPriceINR: 37000, // 2 travellers
    pricePerPersonUSD: 220,
    totalPriceUSD: 440,
    baggage: '25 kg Checked Baggage + 7 kg Cabin Bag included',
    cabinClass: 'Economy Saver',
    refundable: true,
    seatAvailability: 8,
    tag: 'Best for Families',
    adjacentFamilySeatsGuaranteed: true,
    source: 'sample',
    sourceLabel: 'Sample data'
  },
  {
    id: 'fl-sg-2',
    airline: 'IndiGo',
    airlineCode: '6E',
    flightNumber: '6E 1007',
    originCode: 'BLR',
    originCity: 'Bengaluru',
    destinationCode: 'SIN',
    destinationCity: 'Singapore (Changi)',
    departureTime: '06:05 AM',
    arrivalTime: '01:10 PM',
    duration: '4h 35m',
    stops: 'Non-stop Direct',
    isRoundTrip: true,
    outboundFarePerPersonINR: 6750,
    returnFarePerPersonINR: 6750,
    outboundTotalPriceINR: 13500,
    returnTotalPriceINR: 13500,
    pricePerPersonINR: 13500,
    totalPriceINR: 27000,
    pricePerPersonUSD: 160,
    totalPriceUSD: 320,
    baggage: '20 kg Checked Baggage + 7 kg Cabin Bag',
    cabinClass: 'Economy Saver',
    refundable: false,
    seatAvailability: 6,
    tag: 'Lowest Fare',
    adjacentFamilySeatsGuaranteed: true,
    source: 'sample',
    sourceLabel: 'Sample data'
  }
];

export const MOCK_HOTELS_SINGAPORE: HotelItem[] = [
  {
    id: 'ht-sg-1',
    name: 'Village Hotel Bugis by Far East Hospitality',
    area: 'Arab Street & Bugis, Singapore',
    city: 'Singapore',
    starRating: 4,
    reviewScore: 4.7,
    reviewsCount: 1420,
    roomType: 'Deluxe Family Room (2 Queen Beds)',
    bedConfiguration: '2 Queen Beds (Capacity: 4 guests)',
    maxCapacity: 4,
    capacityVerifiedForFamily: true,
    pricePerNightINR: 7800,
    totalPriceINR: 39000, // 5 nights
    pricePerNightUSD: 93,
    totalPriceUSD: 465,
    amenities: [
      'Swimming Pool',
      'Halal & Vegetarian Certified Breakfast',
      'Steps to Bugis MRT station',
      'Child-safe bathroom layouts'
    ],
    breakfastIncluded: true,
    freeCancellation: true,
    distanceFromCenter: '5 min walk to Bugis Junction & MRT',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    tag: 'Best Match'
  }
];

export const MOCK_TRANSFERS_SINGAPORE: TransferItem[] = [
  {
    id: 'tr-sg-1',
    title: 'Private AC Changi Airport Round Trip + 5-Day Singapore Tourist Pass',
    vehicleType: 'Executive Toyota Alphard AC MPV',
    capacityPassengers: 5,
    luggageCapacity: 4,
    priceINR: 5200,
    priceUSD: 62,
    description: 'Chauffeur airport transfer with meet & greet at Changi Terminal + unlimited MRT/bus transit passes.',
    duration: 'Full trip coverage',
    pickupLocation: 'Changi Airport (SIN)',
    dropLocation: 'Hotel & Citywide'
  }
];

export const MOCK_VISA_SINGAPORE: VisaDetails = {
  country: 'Singapore',
  visaType: 'Singapore eVisa (30-day multiple entry for Indian Citizens)',
  feePerPersonINR: 2100,
  feePerPersonUSD: 25,
  totalFeeINR: 4200,
  totalFeeUSD: 50,
  processingTime: '3 to 5 working days',
  passportValidityRequired: 'Minimum 6 months validity from departure date',
  officialSourceUrl: 'https://www.ica.gov.sg',
  requiredDocuments: [
    'Valid Indian passport with at least 6 months validity',
    'Confirmed return flight itinerary',
    'Completed Form 14A and recent color photograph'
  ],
  notes: 'Processed through authorized Singapore visa partners or official ICA portal. Singapore SG Arrival Card submitted 3 days prior to arrival.'
};

export const MOCK_ITINERARY_SINGAPORE: ActivityDayItem[] = [
  {
    day: 1,
    dateStr: 'Day 1',
    title: 'Arrival in Jewel Changi & Marina Bay Skyline Walk',
    theme: 'Arrival & Iconic Skylines',
    morning: 'Arrival at Changi Airport; marvel at the HSBC Rain Vortex waterfall at Jewel; chauffeur transfer to Bugis hotel.',
    afternoon: 'Relaxed unpacking and rest; gentle stroll through colorful Haji Lane and Arab Street boutiques.',
    evening: 'Sunset walk around Marina Bay Sands boardwalk and Spectra light & water show.',
    familyFriendlyScore: 10,
    estimatedCostINR: 1200,
    estimatedCostUSD: 14,
    localDining: ['Lau Pa Sat Satay Street', 'Komala Vilas (Pure South Indian Veg)'],
    transitTip: 'Comfortable private airport transfer + MRT'
  },
  {
    day: 2,
    dateStr: 'Day 2',
    title: 'Gardens by the Bay & Cloud Forest Dome',
    theme: 'Botanical Wonders',
    morning: 'Explore the Flower Dome and the cool Cloud Forest with its 35-meter indoor waterfall (elder- and kid-friendly walkways).',
    afternoon: 'Walk the Supertree Observatory canopy bridge with panoramic views.',
    evening: 'Gardens Rhapsody musical light show under the glowing Supertrees.',
    familyFriendlyScore: 10,
    estimatedCostINR: 2400,
    estimatedCostUSD: 28,
    localDining: ['Satay by the Bay food hall', 'Shake Shack Jewel'],
    transitTip: 'Bayfront MRT station directly connected'
  },
  {
    day: 3,
    dateStr: 'Day 3',
    title: 'Sentosa Island & S.E.A. Aquarium',
    theme: 'Island Fun & Marine Life',
    morning: 'Scenic cable car ride to Sentosa Island; visit the world-class S.E.A. Aquarium with over 100,000 marine animals.',
    afternoon: 'Relax at Siloso Beach or take the gentle monorail ride; afternoon tea overlooking the South China Sea.',
    evening: 'Wings of Time multi-sensory night show at Sentosa beach.',
    familyFriendlyScore: 10,
    estimatedCostINR: 2800,
    estimatedCostUSD: 33,
    localDining: ['Malaysian Food Street Sentosa', 'Trapizza Beachside Dining'],
    transitTip: 'Sentosa Express monorail'
  },
  {
    day: 4,
    dateStr: 'Day 4',
    title: 'Mandai River Wonders & Singapore Zoo Tram',
    theme: 'Wildlife & Nature',
    morning: 'Visit the world-famous open-concept Singapore Zoo; ride the comfortable guided safari tram with shaded seating.',
    afternoon: 'River Wonders safari cruise and Amazon Flooded Forest giant otter exhibit; meet giant pandas Kai Kai & Jia Jia.',
    evening: 'Dinner at Chinatown Food Complex or Newton Food Centre.',
    familyFriendlyScore: 10,
    estimatedCostINR: 2600,
    estimatedCostUSD: 31,
    localDining: ['Newton Food Centre', 'Ananda Bhavan Pure Veg'],
    transitTip: 'Shaded Mandai express shuttle'
  },
  {
    day: 5,
    dateStr: 'Day 5',
    title: 'Orchard Road Shopping & Homeward Flight',
    theme: 'Souvenirs & Departure',
    morning: 'Leisurely morning souvenir shopping at Bugis Street and Orchard Road for Singapore teas and kaya jam.',
    afternoon: 'Smooth hotel checkout; chauffeur transfer to Changi Airport.',
    evening: 'Evening departure flight homeward to Bengaluru with wonderful memories.',
    familyFriendlyScore: 10,
    estimatedCostINR: 900,
    estimatedCostUSD: 11,
    localDining: ['Changi Airport food court', 'Bengawan Solo pandan cakes'],
    transitTip: 'Private chauffeur transfer'
  }
];

export const MOCK_DINING_SINGAPORE: DiningItem[] = [
  {
    id: 'din-sg-1',
    name: 'Komala Vilas Serangoon',
    cuisine: 'Authentic Pure Vegetarian South Indian',
    area: 'Little India, Singapore',
    priceForTwoINR: 900,
    rating: 4.7,
    isPureVeg: true,
    isJainFriendly: true,
    isFamilyFriendly: true,
    recommendedDishes: ['Ghee Roast Masala Dosa', 'South Indian Meals on Banana Leaf', 'Badam Milk'],
    imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'din-sg-2',
    name: 'Lau Pa Sat Historic Hawker Centre',
    cuisine: 'Singapore Street Food & Satay',
    area: 'Raffles Quay, Downtown',
    priceForTwoINR: 1100,
    rating: 4.8,
    isPureVeg: false,
    isJainFriendly: false,
    isFamilyFriendly: true,
    recommendedDishes: ['Chicken & Beef Satay with Peanut Dip', 'Hainanese Chicken Rice', 'Fresh Sugarcane Juice'],
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80'
  }
];

// ==========================================
// 4. THAILAND (INTERNATIONAL BENCHMARK)
// ==========================================
export const MOCK_FLIGHTS_THAILAND: FlightItem[] = [
  {
    id: 'fl-th-1',
    airline: 'Thai Airways',
    airlineCode: 'TG',
    flightNumber: 'TG 326',
    originCode: 'BLR',
    originCity: 'Bengaluru',
    destinationCode: 'BKK',
    destinationCity: 'Bangkok (Suvarnabhumi)',
    departureTime: '12:30 AM',
    arrivalTime: '05:45 AM',
    duration: '3h 45m',
    stops: 'Non-stop Direct',
    isRoundTrip: true,
    outboundFarePerPersonINR: 5750,
    returnFarePerPersonINR: 5750,
    outboundTotalPriceINR: 28750,
    returnTotalPriceINR: 28750,
    pricePerPersonINR: 11500,
    totalPriceINR: 57500, // 5 travellers
    pricePerPersonUSD: 136,
    totalPriceUSD: 680,
    baggage: '25 kg Checked Baggage + In-flight gourmet meal included',
    cabinClass: 'Economy Care',
    refundable: true,
    seatAvailability: 9,
    tag: 'Best for Families',
    adjacentFamilySeatsGuaranteed: true,
    source: 'sample',
    sourceLabel: 'Sample data'
  }
];

export const MOCK_HOTELS_THAILAND: HotelItem[] = [
  {
    id: 'ht-th-1',
    name: 'Chatrium Residence Sathon Bangkok',
    area: 'Sathon / Riverside, Bangkok',
    city: 'Bangkok',
    starRating: 4,
    reviewScore: 4.8,
    reviewsCount: 2200,
    roomType: '2-Bedroom Grand Family Suite with Balcony & Kitchenette',
    bedConfiguration: '1 King Bed + 2 Single Beds + Rollaway (Capacity: 5 guests)',
    maxCapacity: 5,
    capacityVerifiedForFamily: true,
    pricePerNightINR: 6200,
    totalPriceINR: 49600, // 8 nights
    pricePerNightUSD: 74,
    totalPriceUSD: 592,
    amenities: [
      'Lagoon Swimming Pool with shallow kids zone',
      'Complimentary Riverside Shuttle Boat',
      'Lavish International & Indian Breakfast Buffet',
      'Elevator and gentle wheelchair ramp access'
    ],
    breakfastIncluded: true,
    freeCancellation: true,
    distanceFromCenter: 'Direct shuttle to BTS Skytrain & Chao Phraya Pier',
    imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
    tag: 'Best Match'
  }
];

export const MOCK_TRANSFERS_THAILAND: TransferItem[] = [
  {
    id: 'tr-th-1',
    title: 'Private AC Toyota Commuter VIP Van (Airport Round Trip + Sightseeing)',
    vehicleType: 'Toyota Commuter 9-Seater VIP AC Van',
    capacityPassengers: 7,
    luggageCapacity: 6,
    priceINR: 5600,
    priceUSD: 66,
    description: 'Chauffeur-driven VIP AC van with wide recliner seats and cold drinking water for family and senior travelers.',
    duration: 'Full trip coverage',
    pickupLocation: 'Suvarnabhumi Airport (BKK)',
    dropLocation: 'Bangkok Hotel & Sightseeing'
  }
];

export const MOCK_VISA_THAILAND: VisaDetails = {
  country: 'Thailand',
  visaType: 'Visa-Free Exemption (60-day tourist entry for Indian Citizens)',
  feePerPersonINR: 0,
  feePerPersonUSD: 0,
  totalFeeINR: 0,
  totalFeeUSD: 0,
  processingTime: 'Instant upon arrival (Zero visa paperwork)',
  passportValidityRequired: 'Minimum 6 months validity from entry date',
  officialSourceUrl: 'https://www.mfa.go.th',
  requiredDocuments: [
    'Valid Indian passport with at least 6 months validity',
    'Confirmed round-trip flight booking voucher',
    'Hotel booking confirmation for stay duration'
  ],
  notes: 'Indian passport holders enjoy official visa exemption for tourism stays up to 60 days. Zero consular fees required.'
};

export const MOCK_DINING_THAILAND: DiningItem[] = [
  {
    id: 'din-th-1',
    name: 'Saravanaa Bhavan Silom Bangkok',
    cuisine: 'Pure Vegetarian South Indian & Jain Options',
    area: 'Silom Road, Bang Rak, Bangkok',
    priceForTwoINR: 850,
    rating: 4.7,
    isPureVeg: true,
    isJainFriendly: true,
    isFamilyFriendly: true,
    recommendedDishes: ['Crispy Paper Masala Dosa', 'Pure Veg Thali', 'Filter Kaapi'],
    imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'din-th-2',
    name: 'Somtam Nua Siam Square',
    cuisine: 'Authentic Thai & Mild Isan Dishes',
    area: 'Siam Square Soi 5, Bangkok',
    priceForTwoINR: 750,
    rating: 4.8,
    isPureVeg: false,
    isJainFriendly: false,
    isFamilyFriendly: true,
    recommendedDishes: ['Mild Green Papaya Salad', 'Crispy Golden Fried Chicken', 'Sweet Mango Sticky Rice'],
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80'
  }
];

// Set provenance at creation time for all static catalog mock options
const allExportedArrays = [
  MOCK_FLIGHTS_GOA, MOCK_HOTELS_GOA, MOCK_TRANSFERS_GOA, MOCK_TRAINS_GOA,
  MOCK_FLIGHTS_JAPAN, MOCK_HOTELS_JAPAN, MOCK_TRANSFERS_JAPAN,
  MOCK_FLIGHTS_SINGAPORE, MOCK_HOTELS_SINGAPORE, MOCK_TRANSFERS_SINGAPORE,
  MOCK_FLIGHTS_THAILAND, MOCK_HOTELS_THAILAND, MOCK_TRANSFERS_THAILAND,
  MOCK_DINING_GOA, MOCK_DINING_JAPAN, MOCK_DINING_SINGAPORE, MOCK_DINING_THAILAND
];

for (const arr of allExportedArrays) {
  for (const item of arr) {
    if (item && !(item as any).source) {
      (item as any).source = 'sample';
      (item as any).sourceLabel = 'Sample data';
    }
  }
}

if (MOCK_VISA_GOA) {
  MOCK_VISA_GOA.source = 'stated';
  MOCK_VISA_GOA.sourceLabel = 'Domestic Photo ID';
}
if (MOCK_VISA_JAPAN) {
  MOCK_VISA_JAPAN.source = 'estimate';
  MOCK_VISA_JAPAN.sourceLabel = 'Govt regulatory schedule';
}
if (MOCK_VISA_SINGAPORE) {
  MOCK_VISA_SINGAPORE.source = 'estimate';
  MOCK_VISA_SINGAPORE.sourceLabel = 'Govt regulatory schedule';
}
if (MOCK_VISA_THAILAND) {
  MOCK_VISA_THAILAND.source = 'estimate';
  MOCK_VISA_THAILAND.sourceLabel = 'Govt regulatory schedule';
}

// ==========================================
// HOTEL ZONES & ARRIVAL AIRPORT DRIVE TIMES (Phase 3)
// ==========================================
export interface ArrivalDriveOption {
  code: string; // e.g. 'GOI' | 'GOX'
  name: string; // 'Dabolim (GOI)' | 'Mopa (GOX)'
  airportFullName: string;
  driveMinutes: number;
  source: 'estimate';
}

export interface HotelZoneDriveTimeMapping {
  zone: 'South Goa' | 'North Goa' | 'Panjim';
  aliases: string[];
  candidateArrivals: ArrivalDriveOption[];
}

export const HOTEL_ZONE_AIRPORT_DRIVE_TIMES: HotelZoneDriveTimeMapping[] = [
  {
    zone: 'South Goa',
    aliases: ['south goa', 'colva', 'benaulim', 'varca', 'palolem', 'arossim', 'cavelossim', 'mobor', 'majorda'],
    candidateArrivals: [
      { code: 'GOI', name: 'Dabolim', airportFullName: 'Goa Dabolim Airport (GOI)', driveMinutes: 45, source: 'estimate' },
      { code: 'GOX', name: 'Mopa', airportFullName: 'Manohar International Airport, Mopa (GOX)', driveMinutes: 150, source: 'estimate' }
    ]
  },
  {
    zone: 'North Goa',
    aliases: ['north goa', 'calangute', 'baga', 'anjuna', 'vagator', 'candolim', 'sinquerim', 'morjim', 'arambol'],
    candidateArrivals: [
      { code: 'GOX', name: 'Mopa', airportFullName: 'Manohar International Airport, Mopa (GOX)', driveMinutes: 45, source: 'estimate' },
      { code: 'GOI', name: 'Dabolim', airportFullName: 'Goa Dabolim Airport (GOI)', driveMinutes: 75, source: 'estimate' }
    ]
  },
  {
    zone: 'Panjim',
    aliases: ['panjim', 'panaji', 'fontainhas', 'miramar', 'dona paula'],
    candidateArrivals: [
      { code: 'GOI', name: 'Dabolim', airportFullName: 'Goa Dabolim Airport (GOI)', driveMinutes: 40, source: 'estimate' },
      { code: 'GOX', name: 'Mopa', airportFullName: 'Manohar International Airport, Mopa (GOX)', driveMinutes: 60, source: 'estimate' }
    ]
  }
];

export interface AirportSelectionResult {
  selectedAirportCode: string;
  selectedAirportName: string;
  driveMinutes: number;
  alternativeAirportCode: string;
  alternativeAirportName: string;
  alternativeDriveMinutes: number;
  hotelZone: string;
  reasonNote: string;
}

/**
 * Deterministically picks the arrival airport with shortest drive time to the hotel zone.
 */
export function selectArrivalAirportByDriveTime(
  hotelArea: string,
  destination: string,
  userSpecifiedAirportCode?: string
): AirportSelectionResult {
  const areaLower = (hotelArea || '').toLowerCase();
  const destLower = (destination || '').toLowerCase();

  // Non-airport road destinations: Coorg
  if (destLower.includes('coorg')) {
    return {
      selectedAirportCode: 'ROAD',
      selectedAirportName: 'Scenic Road Drive',
      driveMinutes: 300,
      alternativeAirportCode: 'ROAD',
      alternativeAirportName: 'Scenic Road Drive',
      alternativeDriveMinutes: 300,
      hotelZone: 'Madikeri, Coorg',
      reasonNote: 'Coorg is accessed via a scenic 5.5-hour highway drive from Bengaluru via NH75/SH88 (no flight needed).'
    };
  }

  // Train / Road destination: Mysuru
  if (destLower.includes('mysuru') || destLower.includes('mysore')) {
    return {
      selectedAirportCode: 'RAIL',
      selectedAirportName: 'Vande Bharat / Shatabdi Express',
      driveMinutes: 105,
      alternativeAirportCode: 'ROAD',
      alternativeAirportName: 'Bengaluru-Mysuru Expressway',
      alternativeDriveMinutes: 150,
      hotelZone: 'Central Mysuru',
      reasonNote: 'Mysuru is reached in under 2 hours via high-speed Vande Bharat rail from Bengaluru.'
    };
  }

  // Kerala: fly into Kochi (COK); hill stations and backwaters are reached by road
  if (destLower.includes('kerala') || destLower.includes('munnar') || destLower.includes('alleppey') || /munnar|alleppey|alappuzha|kumarakom|thekkady|wayanad|varkala|kovalam/.test(areaLower) || /munnar|alleppey|alappuzha|kumarakom|thekkady|wayanad|varkala|kovalam/.test(destLower)) {
    const zone =
      (areaLower.includes('munnar') || destLower.includes('munnar')) ? 'Munnar, Kerala'
      : (/alleppey|alappuzha|kumarakom/.test(areaLower) || /alleppey|alappuzha|kumarakom/.test(destLower)) ? 'Alleppey, Kerala'
      : areaLower.includes('thekkady') ? 'Thekkady, Kerala'
      : areaLower.includes('wayanad') ? 'Wayanad, Kerala'
      : /varkala|kovalam/.test(areaLower) ? 'South Kerala coast'
      : 'Kerala';
    // Approximate road times from each airport (estimates)
    const fromKochi = (areaLower.includes('munnar') || destLower.includes('munnar')) ? 210 : /alleppey|alappuzha|kumarakom/.test(areaLower) ? 90 : areaLower.includes('thekkady') ? 240 : areaLower.includes('wayanad') ? 300 : 150;
    const fromTrivandrum = (areaLower.includes('munnar') || destLower.includes('munnar')) ? 330 : /alleppey|alappuzha|kumarakom/.test(areaLower) ? 180 : areaLower.includes('thekkady') ? 270 : /varkala|kovalam/.test(areaLower) ? 60 : 300;
    const useTrivandrum = fromTrivandrum < fromKochi;
    const sel = useTrivandrum ? { code: 'TRV', name: 'Thiruvananthapuram', minutes: fromTrivandrum } : { code: 'COK', name: 'Kochi', minutes: fromKochi };
    const alt = useTrivandrum ? { code: 'COK', name: 'Kochi', minutes: fromKochi } : { code: 'TRV', name: 'Thiruvananthapuram', minutes: fromTrivandrum };
    const hrs = (m: number) => (m >= 120 ? `approx. ${(m / 60).toFixed(1).replace('.0', '')} hours` : `${m} minutes`);
    return {
      selectedAirportCode: sel.code,
      selectedAirportName: sel.name,
      driveMinutes: sel.minutes,
      alternativeAirportCode: alt.code,
      alternativeAirportName: alt.name,
      alternativeDriveMinutes: alt.minutes,
      hotelZone: zone,
      reasonNote: `Why ${sel.name}, not ${alt.name}: your stay is in ${zone}. Flying into ${sel.name} means ${hrs(sel.minutes)} by road instead of ${hrs(alt.minutes)}.`
    };
  }

  // Goa (only when destination or area actually matches Goa)
  if (destLower.includes('goa') || areaLower.includes('goa')) {
    const mapping = HOTEL_ZONE_AIRPORT_DRIVE_TIMES.find((z) =>
      z.aliases.some((alias) => areaLower.includes(alias))
    ) || (areaLower.includes('north') ? HOTEL_ZONE_AIRPORT_DRIVE_TIMES[1] : HOTEL_ZONE_AIRPORT_DRIVE_TIMES[0]);

    const sortedArrivals = [...mapping.candidateArrivals].sort((a, b) => a.driveMinutes - b.driveMinutes);

    let selected = sortedArrivals[0];
    let alternative = sortedArrivals[1] || sortedArrivals[0];

    if (userSpecifiedAirportCode) {
      const userMatch = mapping.candidateArrivals.find(
        (a) => a.code.toUpperCase() === userSpecifiedAirportCode.toUpperCase()
      );
      if (userMatch) {
        selected = userMatch;
        alternative = sortedArrivals.find((a) => a.code !== selected.code) || selected;
      }
    }

    const altHours = (alternative.driveMinutes / 60).toFixed(1).replace('.0', '');
    const altText = alternative.driveMinutes >= 120 ? `approx. ${altHours} hours` : `${alternative.driveMinutes} minutes`;

    const reasonNote = `Why ${selected.name}, not ${alternative.name}: your hotel is in ${mapping.zone}. Flying into ${selected.name} means an approx. ${selected.driveMinutes}-minute drive instead of ${altText}.`;

    return {
      selectedAirportCode: selected.code,
      selectedAirportName: selected.name,
      driveMinutes: selected.driveMinutes,
      alternativeAirportCode: alternative.code,
      alternativeAirportName: alternative.name,
      alternativeDriveMinutes: alternative.driveMinutes,
      hotelZone: mapping.zone,
      reasonNote
    };
  }

  // General Domestic / Other Destination Fallback
  return {
    selectedAirportCode: 'DIRECT',
    selectedAirportName: 'Direct City Transit',
    driveMinutes: 45,
    alternativeAirportCode: 'DIRECT',
    alternativeAirportName: 'Direct City Transit',
    alternativeDriveMinutes: 45,
    hotelZone: hotelArea || destination || 'City Center',
    reasonNote: `Direct convenient transit to your stay in ${hotelArea || destination}.`
  };
}

// Catalog Season Data with multipliers tagged 'estimate'
export interface SeasonOption {
  id: string;
  label: string;
  dates: string;
  seasonType: 'value' | 'peak' | 'flexible';
  multiplier: number;
  source: 'estimate';
  sourceLabel: string;
  note?: string;
}

export const CATALOG_SEASON_DATA: Record<string, SeasonOption[]> = {
  goa: [
    {
      id: 'season-goa-value',
      label: '14–20 Nov · Best value',
      dates: '14–20 Nov',
      seasonType: 'value',
      multiplier: 1.0,
      source: 'estimate',
      sourceLabel: 'Value season multiplier (1.0x)',
      note: 'Ideal weather, shoulder rates'
    },
    {
      id: 'season-goa-peak',
      label: '19–25 Dec',
      dates: '19–25 Dec',
      seasonType: 'peak',
      multiplier: 1.45,
      source: 'estimate',
      sourceLabel: 'Peak holiday week multiplier (1.45x)',
      note: 'Peak holiday week, higher flights'
    },
    {
      id: 'season-goa-flex',
      label: "I'm flexible — find the cheapest week",
      dates: 'Flexible Dates',
      seasonType: 'flexible',
      multiplier: 0.95,
      source: 'estimate',
      sourceLabel: 'Cheapest shoulder week (0.95x)',
      note: 'Find the lowest pricing week in November'
    }
  ],
  coorg: [
    {
      id: 'season-coorg-value',
      label: '20–22 Nov (Fri–Sun) · Best value',
      dates: '20–22 Nov (Fri–Sun)',
      seasonType: 'value',
      multiplier: 1.0,
      source: 'estimate',
      sourceLabel: 'Pleasant plantation climate (1.0x)',
      note: 'Pleasant plantation climate, standard weekend tariffs'
    },
    {
      id: 'season-coorg-peak',
      label: '18–20 Dec (Fri–Sun)',
      dates: '18–20 Dec (Fri–Sun)',
      seasonType: 'peak',
      multiplier: 1.25,
      source: 'estimate',
      sourceLabel: 'Holiday weekend rates (1.25x)',
      note: 'Peak holiday weekend, higher stay rates'
    },
    {
      id: 'season-coorg-flex',
      label: "I'm flexible — next upcoming weekend",
      dates: 'Flexible Weekend',
      seasonType: 'flexible',
      multiplier: 0.95,
      source: 'estimate',
      sourceLabel: 'Off-peak weekend rate (0.95x)',
      note: 'Find the lowest pricing weekend in November'
    }
  ],
  kerala: [
    {
      id: 'season-kerala-value',
      label: '14–20 Nov · Best value',
      dates: '14–20 Nov',
      seasonType: 'value',
      multiplier: 1.0,
      source: 'estimate',
      sourceLabel: 'Shoulder value season (1.0x)',
      note: 'Pleasant post-monsoon weather'
    },
    {
      id: 'season-kerala-peak',
      label: '19–25 Dec',
      dates: '19–25 Dec',
      seasonType: 'peak',
      multiplier: 1.35,
      source: 'estimate',
      sourceLabel: 'Peak holiday week (1.35x)',
      note: 'Peak holiday week, higher stay rates'
    },
    {
      id: 'season-kerala-flex',
      label: "I'm flexible — find the cheapest week",
      dates: 'Flexible Dates',
      seasonType: 'flexible',
      multiplier: 0.95,
      source: 'estimate',
      sourceLabel: 'Cheapest shoulder week (0.95x)',
      note: 'Find the lowest pricing week in November'
    }
  ],
  mysuru: [
    {
      id: 'season-mysuru-value',
      label: 'Upcoming Saturday · Day trip',
      dates: '15 Nov 2026',
      seasonType: 'value',
      multiplier: 1.0,
      source: 'estimate',
      sourceLabel: 'Standard day rail rate (1.0x)',
      note: 'Convenient morning departure on Vande Bharat'
    },
    {
      id: 'season-mysuru-peak',
      label: 'Holiday weekend',
      dates: '20 Dec 2026',
      seasonType: 'peak',
      multiplier: 1.2,
      source: 'estimate',
      sourceLabel: 'Peak weekend rate (1.2x)',
      note: 'Peak festive weekend'
    },
    {
      id: 'season-mysuru-flex',
      label: "I'm flexible",
      dates: 'Flexible Dates',
      seasonType: 'flexible',
      multiplier: 1.0,
      source: 'estimate',
      sourceLabel: 'Standard rate',
      note: 'Choose any weekend day'
    }
  ]
};

export function getSeasonOptionsForDestination(destination: string): SeasonOption[] {
  const dest = (destination || '').toLowerCase();
  for (const [key, opts] of Object.entries(CATALOG_SEASON_DATA)) {
    if (dest.includes(key)) return opts;
  }
  return [
    {
      id: 'season-def-value',
      label: '14–20 Nov · Best value',
      dates: '14–20 Nov',
      seasonType: 'value',
      multiplier: 1.0,
      source: 'estimate',
      sourceLabel: 'Standard rate'
    },
    {
      id: 'season-def-peak',
      label: '19–25 Dec',
      dates: '19–25 Dec',
      seasonType: 'peak',
      multiplier: 1.4,
      source: 'estimate',
      sourceLabel: 'Peak holiday rate'
    },
    {
      id: 'season-def-flex',
      label: "I'm flexible — find the cheapest week",
      dates: 'Flexible Dates',
      seasonType: 'flexible',
      multiplier: 0.95,
      source: 'estimate',
      sourceLabel: 'Cheapest rate'
    }
  ];
}



