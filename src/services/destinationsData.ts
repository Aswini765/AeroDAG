import {
  FlightItem,
  HotelItem,
  TransferItem,
  TrainItem,
  DiningItem,
  ActivityDayItem,
  VisaDetails
} from '../types/travelBooking';

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
    stops: 'Non-stop Direct',
    pricePerPersonINR: 3200,
    totalPriceINR: 12800, // 3,200 * 4
    pricePerPersonUSD: 38,
    totalPriceUSD: 152,
    baggage: '15 kg Checked Baggage + 7 kg Cabin Bag included',
    cabinClass: 'Economy Saver',
    refundable: true,
    seatAvailability: 9,
    tag: 'Best for Families',
    adjacentFamilySeatsGuaranteed: true
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
    stops: 'Non-stop Direct',
    pricePerPersonINR: 2800,
    totalPriceINR: 11200,
    pricePerPersonUSD: 33,
    totalPriceUSD: 133,
    baggage: '15 kg Checked Baggage + 7 kg Cabin Bag',
    cabinClass: 'Economy Value',
    refundable: false,
    seatAvailability: 5,
    tag: 'Lowest Fare',
    adjacentFamilySeatsGuaranteed: true
  }
];

export const MOCK_TRAINS_GOA: TrainItem[] = [
  {
    id: 'tr-goa-1',
    trainName: 'Vande Bharat Express',
    trainNumber: '20646',
    fromStation: 'KSR Bengaluru (SBC)',
    toStation: 'Madgaon Junction (MAO)',
    departureTime: '05:45 AM',
    arrivalTime: '01:30 PM',
    duration: '7h 45m',
    classes: [
      { code: 'EC', name: 'Executive Chair Car', fareINR: 2390, availability: 'Available (18 seats)', isAvailable: true },
      { code: 'CC', name: 'AC Chair Car', fareINR: 1240, availability: 'Available (42 seats)', isAvailable: true }
    ],
    selectedClass: 'EC',
    pricePerPersonINR: 2390,
    totalPriceINR: 9560,
    foodIncluded: true,
    isVandeBharatOrRajdhani: true
  },
  {
    id: 'tr-goa-2',
    trainName: 'Goa Express (Superfast AC)',
    trainNumber: '12780',
    fromStation: 'Yesvantpur Jn (YPR)',
    toStation: 'Vasco Da Gama (VSG)',
    departureTime: '09:00 PM',
    arrivalTime: '07:30 AM (+1 Day)',
    duration: '10h 30m',
    classes: [
      { code: '1A', name: 'First AC (Coupe/Cabin)', fareINR: 2850, availability: 'Available (4)', isAvailable: true },
      { code: '2A', name: '2-Tier AC Sleeper', fareINR: 1680, availability: 'Available (14)', isAvailable: true },
      { code: '3A', name: '3-Tier AC Sleeper', fareINR: 1190, availability: 'Available (28)', isAvailable: true }
    ],
    selectedClass: '2A',
    pricePerPersonINR: 1680,
    totalPriceINR: 6720,
    foodIncluded: false,
    isVandeBharatOrRajdhani: false
  }
];

export const MOCK_HOTELS_GOA: HotelItem[] = [
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
    totalPriceINR: 50400, // 7,200 * 7 nights
    pricePerNightUSD: 85,
    totalPriceUSD: 595,
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
    tag: 'Best Match'
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
    title: 'Private AC Toyota Innova Crysta (Airport Round Trip + 3-Day Sightseeing)',
    vehicleType: 'Toyota Innova Crysta 7-Seater AC',
    capacityPassengers: 6,
    luggageCapacity: 4,
    priceINR: 4800,
    priceUSD: 57,
    description: 'Chauffeur-driven AC Innova Crysta for comfortable family airport transfers and seamless North & South Goa touring.',
    duration: 'Full trip coverage',
    pickupLocation: 'Mopa (GOX) / Dabolim (GOI) Airport',
    dropLocation: 'Goa Resort'
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
    baggage: '2 x 23 kg Checked Baggage + 10 kg Cabin Bag per person',
    cabinClass: 'Economy Care',
    refundable: true,
    seatAvailability: 8,
    tag: 'Best Value',
    adjacentFamilySeatsGuaranteed: true
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
    pricePerPersonINR: 42500,
    totalPriceINR: 85000,
    pricePerPersonUSD: 505,
    totalPriceUSD: 1010,
    baggage: '25 kg Checked Baggage + Gourmet Meals & Wi-Fi',
    cabinClass: 'Economy Premium Care',
    refundable: true,
    seatAvailability: 6,
    tag: 'Recommended',
    adjacentFamilySeatsGuaranteed: true
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
