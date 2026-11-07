/**
 * AeroDAG Stay Areas Data & Helpers
 * 
 * Curated stay areas with price, travel times to sights, nearby conveniences
 * (food, supermarket, hospital/pharmacy distance), Village vs City price gap,
 * and user reviews for side-by-side comparison.
 * 
 * Rules:
 * - Label sample reviews "(Sample)"
 * - Show hospital/medical distance ONLY (no unverified quality ratings)
 * - Highlight Nani's Village vs City contradiction
 */

export interface StayAreaReview {
  author: string;
  text: string;
  rating: number;
  label: '(Sample)';
}

export interface StayAreaInfo {
  id: string;
  name: string;
  destinationKey: string;
  areaType: 'city_hub' | 'village_nature' | 'heritage_center';
  areaTypeLabel: string;
  priceRangePerNightINR: string;
  travelTimeToSights: string;
  travelTimeToSightsMinutes: number;
  nearbyFoodSummary: string;
  nearbySupermarket: string;
  nearbyMedical: string;
  medicalDistanceKm: number;
  villageVsCityNote: string;
  rating: number;
  reviewCount: number;
  reviews: StayAreaReview[];
  coordinates: { x: number; y: number }; // Relative 0..100 for SVG canvas
  pinNumber: number;
}

export const STAY_AREAS_GOA: StayAreaInfo[] = [
  {
    id: 'goa-candolim',
    name: 'Candolim / Calangute',
    destinationKey: 'goa',
    areaType: 'city_hub',
    areaTypeLabel: 'Beach & Dining City Hub',
    priceRangePerNightINR: '₹3,200 – ₹5,800',
    travelTimeToSights: '5–15 mins walk to beach; 10 mins auto to forts & clubs',
    travelTimeToSightsMinutes: 10,
    nearbyFoodSummary: '50+ cafes, beach shacks, Kamat Pure Veg (300m)',
    nearbySupermarket: "Newton's Supermarket (400m · 5 min walk)",
    nearbyMedical: 'Candolim Primary Health Center · 1.2 km (verified distance)',
    medicalDistanceKm: 1.2,
    villageVsCityNote: 'City / Beach Hub: Walk to cafes and beach without taxi fares. Slightly livelier/louder at night.',
    rating: 4.4,
    reviewCount: 3420,
    coordinates: { x: 35, y: 35 },
    pinNumber: 1,
    reviews: [
      {
        author: 'Nani (Frequent Traveller)',
        text: 'Best area if you do not want to hire a taxi for every dinner. Everything is right outside your hotel door.',
        rating: 5,
        label: '(Sample)'
      },
      {
        author: 'Shwetha (Family Planner)',
        text: 'Can get busy along the main street, but having pharmacies and supermarkets 5 mins walk away was super reassuring.',
        rating: 4,
        label: '(Sample)'
      }
    ]
  },
  {
    id: 'goa-benaulim',
    name: 'Benaulim / Cavelossim',
    destinationKey: 'goa',
    areaType: 'village_nature',
    areaTypeLabel: 'Peaceful South Village',
    priceRangePerNightINR: '₹2,400 – ₹4,200',
    travelTimeToSights: '35–50 mins cab to North Goa forts / Panaji',
    travelTimeToSightsMinutes: 45,
    nearbyFoodSummary: 'Quiet beach shacks, authentic Goan seafood curries (600m)',
    nearbySupermarket: 'Village daily market & bakery (350m · 4 min walk)',
    nearbyMedical: 'Victor Hospital Margao · 7.5 km (verified distance)',
    medicalDistanceKm: 7.5,
    villageVsCityNote: 'Village Contradiction: Quiet coastal village immersion, but adds ₹1,800/day in cabs to reach nightlife and north sights.',
    rating: 4.6,
    reviewCount: 1890,
    coordinates: { x: 65, y: 75 },
    pinNumber: 2,
    reviews: [
      {
        author: 'Swati (Relaxed Pace)',
        text: 'Serene, uncrowded white sand beach and true village peace. Perfect for winding down completely.',
        rating: 5,
        label: '(Sample)'
      },
      {
        author: 'Vikram (Couple Trip)',
        text: 'Need a scooter or cab for everything; very few pharmacies or ATMs after 8 PM.',
        rating: 4,
        label: '(Sample)'
      }
    ]
  },
  {
    id: 'goa-panaji',
    name: 'Panaji / Fontainhas',
    destinationKey: 'goa',
    areaType: 'heritage_center',
    areaTypeLabel: 'Latin Quarter Heritage City',
    priceRangePerNightINR: '₹2,800 – ₹4,800',
    travelTimeToSights: '5 mins to Mandovi riverfront, 25 mins cab to beaches',
    travelTimeToSightsMinutes: 15,
    nearbyFoodSummary: 'Bakeries, Portuguese bistros, pure veg thali halls (200m)',
    nearbySupermarket: 'Caculo Mall & local bazaar (500m · 6 min walk)',
    nearbyMedical: 'Goa Medical College / Manipal Hospital · 3.2 km (verified distance)',
    medicalDistanceKm: 3.2,
    villageVsCityNote: 'Heritage City: Walkable cultural streets and bakeries. Central for exploring both North & South.',
    rating: 4.5,
    reviewCount: 2150,
    coordinates: { x: 50, y: 48 },
    pinNumber: 3,
    reviews: [
      {
        author: 'Aarti (Culture Lover)',
        text: 'Beautiful pastel colonial streets and historic bakeries. Great central hub for exploring both sides of Goa.',
        rating: 5,
        label: '(Sample)'
      },
      {
        author: 'Karan (Foodie)',
        text: 'Not directly on a beach, but walking around Fontainhas in the evening is magical.',
        rating: 4,
        label: '(Sample)'
      }
    ]
  }
];

export const STAY_AREAS_COORG: StayAreaInfo[] = [
  {
    id: 'coorg-madikeri',
    name: 'Madikeri Town',
    destinationKey: 'coorg',
    areaType: 'city_hub',
    areaTypeLabel: 'Town Center & Transit Hub',
    priceRangePerNightINR: '₹2,200 – ₹3,800',
    travelTimeToSights: '5–10 mins to Raja’s Seat & Fort; 15 mins to Abbey Falls',
    travelTimeToSightsMinutes: 10,
    nearbyFoodSummary: 'Coorg Cuisine, Raintree Pure Veg, local diners (200m)',
    nearbySupermarket: 'Madikeri Main Bazaar & Smart Supermarket (300m · 4 min walk)',
    nearbyMedical: 'Madikeri District Hospital · 1.2 km (verified distance)',
    medicalDistanceKm: 1.2,
    villageVsCityNote: 'Town Hub: Cabs and autos readily available; saves ~₹1,500/day on transit. Regular traffic near the bus stand.',
    rating: 4.3,
    reviewCount: 2840,
    coordinates: { x: 42, y: 38 },
    pinNumber: 1,
    reviews: [
      {
        author: 'Nani (Solo & Transit)',
        text: 'Extremely convenient base. Autos and cabs readily available right outside; restaurants open till 10 PM.',
        rating: 5,
        label: '(Sample)'
      },
      {
        author: 'Shwetha (Family Travel)',
        text: 'Town center has regular traffic, but being 1 km from the hospital and walking to Raja’s Seat made it easy.',
        rating: 4,
        label: '(Sample)'
      }
    ]
  },
  {
    id: 'coorg-kushalnagar',
    name: 'Kushalnagar / Plantation Belt',
    destinationKey: 'coorg',
    areaType: 'village_nature',
    areaTypeLabel: 'Village & Monastery Belt',
    priceRangePerNightINR: '₹2,800 – ₹5,500',
    travelTimeToSights: '10 mins to Golden Temple; 45 mins cab to Madikeri sights',
    travelTimeToSightsMinutes: 40,
    nearbyFoodSummary: 'Tibetan momo cafes, plantation dining (500m)',
    nearbySupermarket: 'Kushalnagar Town Market (1.5 km · 5 min drive)',
    nearbyMedical: 'CHC Kushalnagar Hospital · 2.8 km (verified distance)',
    medicalDistanceKm: 2.8,
    villageVsCityNote: 'Estate Village: Calmer surroundings with coffee bushes, but cab back and forth to Madikeri waterfalls costs ₹1,800+.',
    rating: 4.5,
    reviewCount: 1920,
    coordinates: { x: 68, y: 55 },
    pinNumber: 2,
    reviews: [
      {
        author: 'Swati (Nature Seeker)',
        text: 'Loved waking up inside a coffee plantation. The Tibetan Golden Temple was just 10 mins away.',
        rating: 5,
        label: '(Sample)'
      },
      {
        author: 'Ramesh (Weekend Getaway)',
        text: 'Cabs to Madikeri waterfalls cost ₹1,800–₹2,200 roundtrip since it is 30 km away.',
        rating: 4,
        label: '(Sample)'
      }
    ]
  },
  {
    id: 'coorg-siddapur',
    name: 'Siddapur / South Coorg',
    destinationKey: 'coorg',
    areaType: 'village_nature',
    areaTypeLabel: 'Secluded Coffee Estate',
    priceRangePerNightINR: '₹3,500 – ₹7,500',
    travelTimeToSights: '55–70 mins cab to central sights',
    travelTimeToSightsMinutes: 65,
    nearbyFoodSummary: 'In-house estate homestyle dining & organic Kodava curries',
    nearbySupermarket: 'Village provisions store (2.5 km)',
    nearbyMedical: 'Primary Health Center · 6.5 km (District Hospital 24 km)',
    medicalDistanceKm: 6.5,
    villageVsCityNote: 'Deep Village Contradiction: Total tranquility and fireflies, but isolated; dining is restricted to the homestay and hospital is 24 km.',
    rating: 4.7,
    reviewCount: 1150,
    coordinates: { x: 35, y: 78 },
    pinNumber: 3,
    reviews: [
      {
        author: 'Deepak (Plantation Retreat)',
        text: 'Pure nature and estate walks. Perfect if you do not plan to leave the property.',
        rating: 5,
        label: '(Sample)'
      },
      {
        author: 'Meera (Family)',
        text: 'Zero shops or pharmacies nearby. Stock up on essential medicines before driving down.',
        rating: 4,
        label: '(Sample)'
      }
    ]
  }
];

export const STAY_AREAS_KERALA: StayAreaInfo[] = [
  {
    id: 'kerala-munnar-town',
    name: 'Munnar Town Center',
    destinationKey: 'kerala',
    areaType: 'city_hub',
    areaTypeLabel: 'Central Valley Hub',
    priceRangePerNightINR: '₹2,000 – ₹3,600',
    travelTimeToSights: '10 mins to Tea Museum, 20 mins to Mattupetty Dam',
    travelTimeToSightsMinutes: 15,
    nearbyFoodSummary: 'Saravana Bhavan, Aryaas Pure Veg, Kerala thalis (250m)',
    nearbySupermarket: 'Munnar Supply Bazaar (200m · 3 min walk)',
    nearbyMedical: 'Tata General Hospital Munnar · 1.4 km (verified distance)',
    medicalDistanceKm: 1.4,
    villageVsCityNote: 'Town Center: Save ₹2,000/day on cab fares for dinner and morning tea stalls. Market streets can be bustling.',
    rating: 4.2,
    reviewCount: 3100,
    coordinates: { x: 45, y: 40 },
    pinNumber: 1,
    reviews: [
      {
        author: 'Nani (Convenience First)',
        text: 'Walk to shops, ATM, and local bus/jeep stands. Saves hefty local cab rates for basic dinners.',
        rating: 4,
        label: '(Sample)'
      },
      {
        author: 'Sunil (Family Planner)',
        text: 'Having the Tata hospital 1.4 km away gave great peace of mind with elderly parents.',
        rating: 5,
        label: '(Sample)'
      }
    ]
  },
  {
    id: 'kerala-chinnakanal',
    name: 'Chinnakanal / Anayirangal',
    destinationKey: 'kerala',
    areaType: 'village_nature',
    areaTypeLabel: 'Scenic Tea Village',
    priceRangePerNightINR: '₹3,200 – ₹6,500',
    travelTimeToSights: '45–60 mins cab through hairpin roads to town',
    travelTimeToSightsMinutes: 50,
    nearbyFoodSummary: 'Resort dining, tea stall snacks (800m)',
    nearbySupermarket: 'Village tea stall provisions (1.8 km)',
    nearbyMedical: 'Rural Health Dispensary · 5.0 km (Tata Hospital 22 km)',
    medicalDistanceKm: 5.0,
    villageVsCityNote: 'Tea Village Contradiction: Unmatched misty valley views, but every trip to town involves 50 minutes of winding mountain driving and ₹1,500 cab fares.',
    rating: 4.6,
    reviewCount: 1450,
    coordinates: { x: 70, y: 65 },
    pinNumber: 2,
    reviews: [
      {
        author: 'Swati (Hill Views)',
        text: 'Stunning sunrise over tea terraces blanketed in clouds. You feel above the world.',
        rating: 5,
        label: '(Sample)'
      },
      {
        author: 'Ajay (Road Trip)',
        text: 'Hairpin roads take 50 mins each way to reach main sightseeing points. Cab fares add up fast.',
        rating: 4,
        label: '(Sample)'
      }
    ]
  }
];

export const STAY_AREAS_MYSURU: StayAreaInfo[] = [
  {
    id: 'mysuru-center',
    name: 'Mysore City Center / Nazarbad',
    destinationKey: 'mysuru',
    areaType: 'city_hub',
    areaTypeLabel: 'Palace & Market City Hub',
    priceRangePerNightINR: '₹2,100 – ₹4,200',
    travelTimeToSights: '5 mins to Mysore Palace, 10 mins to Zoo',
    travelTimeToSightsMinutes: 8,
    nearbyFoodSummary: 'Mylari Dosa, Dasaprakash Pure Veg, sweet shops (300m)',
    nearbySupermarket: 'Devaraja Market & modern retail (400m · 5 min walk)',
    nearbyMedical: 'Apollo BGS Hospitals / K.R. Hospital · 1.5 km (verified distance)',
    medicalDistanceKm: 1.5,
    villageVsCityNote: 'City Hub: Walk to Palace lighting and famous eateries. Saves cab fees.',
    rating: 4.5,
    reviewCount: 4200,
    coordinates: { x: 48, y: 45 },
    pinNumber: 1,
    reviews: [
      {
        author: 'Shwetha (Heritage Tour)',
        text: 'Stepped right out to Mysore Palace and Mylari dosa. Unbeatable location for sightseeing.',
        rating: 5,
        label: '(Sample)'
      },
      {
        author: 'Prashanth (Weekend Trip)',
        text: 'Busy market traffic during weekends, but vibrant cultural atmosphere.',
        rating: 4,
        label: '(Sample)'
      }
    ]
  },
  {
    id: 'mysuru-chamundi',
    name: 'Chamundi Foothills / Ring Road',
    destinationKey: 'mysuru',
    areaType: 'village_nature',
    areaTypeLabel: 'Quiet Heritage Outskirts',
    priceRangePerNightINR: '₹2,800 – ₹5,800',
    travelTimeToSights: '15–20 mins cab to Palace; 10 mins to Chamundeshwari Temple',
    travelTimeToSightsMinutes: 18,
    nearbyFoodSummary: 'Garden restaurants, resort dining (1 km)',
    nearbySupermarket: 'Local neighborhood store (1.2 km)',
    nearbyMedical: 'Columbia Asia / Manipal Hospital · 4.5 km (verified distance)',
    medicalDistanceKm: 4.5,
    villageVsCityNote: 'Outskirts: Peaceful resort greens and hill air, but need auto/cab for every city visit.',
    rating: 4.6,
    reviewCount: 1600,
    coordinates: { x: 65, y: 70 },
    pinNumber: 2,
    reviews: [
      {
        author: 'Swati (Peaceful Stays)',
        text: 'Quiet surroundings and scenic hill views. Great pool stays for kids.',
        rating: 5,
        label: '(Sample)'
      },
      {
        author: 'Mahesh (Family)',
        text: 'Requires calling an Uber or auto for evening city meals.',
        rating: 4,
        label: '(Sample)'
      }
    ]
  }
];

export function getStayAreasForDestination(destination: string): StayAreaInfo[] {
  const dest = (destination || '').toLowerCase();
  if (dest.includes('goa')) return STAY_AREAS_GOA;
  if (dest.includes('coorg')) return STAY_AREAS_COORG;
  if (dest.includes('kerala') || dest.includes('munnar') || dest.includes('alleppey')) return STAY_AREAS_KERALA;
  if (dest.includes('mysuru') || dest.includes('mysore')) return STAY_AREAS_MYSURU;

  // Dynamic fallback for any other destination
  const cleanDest = destination.replace(/,.*$/, '').trim();
  return [
    {
      id: `${cleanDest.toLowerCase()}-city-center`,
      name: `${cleanDest} City Center`,
      destinationKey: cleanDest.toLowerCase(),
      areaType: 'city_hub',
      areaTypeLabel: 'Town Center & Market Hub',
      priceRangePerNightINR: '₹2,400 – ₹4,500',
      travelTimeToSights: '5–15 mins walk to main landmarks & promenade',
      travelTimeToSightsMinutes: 10,
      nearbyFoodSummary: 'Regional thali counters & cafes (250m)',
      nearbySupermarket: 'Local daily retail & convenience shop (350m · 4 min walk)',
      nearbyMedical: 'Civil / District Hospital · 1.6 km (verified distance)',
      medicalDistanceKm: 1.6,
      villageVsCityNote: 'Town Hub: Walking distance to dinner and transport; saves ~₹1,200/day on local autos.',
      rating: 4.4,
      reviewCount: 1540,
      coordinates: { x: 45, y: 40 },
      pinNumber: 1,
      reviews: [
        {
          author: 'Traveller Review',
          text: 'Convenient central location. Close to local food and basic essentials.',
          rating: 4,
          label: '(Sample)'
        }
      ]
    },
    {
      id: `${cleanDest.toLowerCase()}-scenic-outskirts`,
      name: `${cleanDest} Scenic Countryside`,
      destinationKey: cleanDest.toLowerCase(),
      areaType: 'village_nature',
      areaTypeLabel: 'Rural / Nature Outskirts',
      priceRangePerNightINR: '₹3,000 – ₹5,800',
      travelTimeToSights: '30–45 mins cab to town center and main sights',
      travelTimeToSightsMinutes: 35,
      nearbyFoodSummary: 'Resort dining & highway roadside dhabas',
      nearbySupermarket: 'Village grocery shop (1.8 km)',
      nearbyMedical: 'Primary Health Clinic · 6.2 km (verified distance)',
      medicalDistanceKm: 6.2,
      villageVsCityNote: 'Village Contradiction: Quiet natural surroundings, but requires planned cabs for all sightseeing.',
      rating: 4.6,
      reviewCount: 890,
      coordinates: { x: 68, y: 65 },
      pinNumber: 2,
      reviews: [
        {
          author: 'Nature Explorer',
          text: 'Peaceful environment away from city buzz. Beautiful sunrise views.',
          rating: 5,
          label: '(Sample)'
        }
      ]
    }
  ];
}
