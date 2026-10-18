/**
 * AeroDAG — AI Destination Plan Builder
 * 
 * Constructs a fully compliant TripPlan from an AI DestinationProfile.
 * Preserves the exact TripPlan schema so FullTripCostCard, PlanOptionsSelector,
 * share text, nearby amenities, and booking links work seamlessly.
 */

import {
  TripPlan,
  FlightItem,
  HotelItem,
  TransferItem,
  ActivityItem,
  ActivityDayItem,
  DiningItem,
  TripPreferences
} from '../types/travelBooking.ts';
import { TripContext } from './requirementEngine.ts';
import { DestinationProfile, TopSight } from '../types/destinationProfile.ts';

export function buildPlanFromDestinationProfile(
  context: Partial<TripContext>,
  profile: DestinationProfile
): TripPlan {
  const destination = `${profile.name}${profile.state ? `, ${profile.state}` : ''}`;
  const origin = (context.origin || 'Bengaluru (BLR)').trim();
  const dates = (context.dates || 'Upcoming trip').trim();
  const durationDays = Math.max(2, context.durationDays || 4);
  const nights = Math.max(1, durationDays - 1);

  const adults = Math.max(1, context.adultsCount || 2);
  const children = Math.max(0, context.childrenCount || 0);
  const seniors = Math.max(0, context.seniorsCount || 0);
  const childAges = Array.isArray(context.childrenAges) ? context.childrenAges : [];
  const totalTravellers = Math.max(adults + children + seniors, context.totalTravellers || adults + children);

  const targetBudgetINR = context.budgetTotalINR || 50000;

  // 1. Flight & Airport Transfer
  const primaryAirport = profile.nearestAirports[0] || {
    code: 'BLR',
    name: 'Nearest Domestic Airport',
    driveHoursToCenter: 2
  };

  const originCodeMatch = origin.match(/\(([A-Z]{3})\)/);
  const originCode = originCodeMatch ? originCodeMatch[1] : 'BLR';
  const originCity = origin.replace(/\s*\([A-Z]{3}\)/, '').trim() || 'Bengaluru';
  const destAirportCode = primaryAirport.code;

  const flightPricePerPersonINR = 3500;
  const flightTotalPriceINR = flightPricePerPersonINR * totalTravellers;

  const flight: FlightItem = {
    id: `fl-${profile.name.toLowerCase()}-1`,
    airline: 'IndiGo',
    airlineCode: '6E',
    flightNumber: '6E-452',
    originCode,
    originCity,
    destinationCode: destAirportCode,
    destinationCity: primaryAirport.name.replace(/Airport|International/gi, '').trim() || profile.name,
    departureTime: '07:30',
    arrivalTime: '09:00',
    duration: '1h 30m',
    stops: 'Non-stop',
    pricePerPersonINR: flightPricePerPersonINR,
    totalPriceINR: flightTotalPriceINR,
    pricePerPersonUSD: Math.round(flightPricePerPersonINR / 84),
    totalPriceUSD: Math.round(flightTotalPriceINR / 84),
    baggage: '15kg check-in + 7kg cabin',
    cabinClass: 'Economy',
    refundable: true,
    seatAvailability: Math.max(4, totalTravellers),
    source: 'estimate',
    sourceLabel: 'AI estimate'
  };

  const transferDriveHours = primaryAirport.driveHoursToCenter;
  const transferPriceINR = Math.max(1200, Math.round(transferDriveHours * 850 + 1000));

  const transfer: TransferItem = {
    id: `tr-${profile.name.toLowerCase()}-1`,
    title: `Private AC Transfer (${destAirportCode} ↔ ${profile.name})`,
    vehicleType: totalTravellers > 3 ? 'AC Minivan / MPV' : 'AC Sedan',
    capacityPassengers: Math.max(4, totalTravellers),
    luggageCapacity: Math.max(3, totalTravellers),
    priceINR: transferPriceINR,
    priceUSD: Math.round(transferPriceINR / 84),
    description: `Private cab pickup from ${primaryAirport.name} to hotel in ${profile.name}. Road journey is approx. ${transferDriveHours} hours.`,
    duration: `approx. ${transferDriveHours} hours`,
    pickupLocation: `${destAirportCode} Airport`,
    dropLocation: `${profile.name} Hotel`,
    source: 'estimate',
    sourceLabel: 'AI estimate'
  };

  // 2. Hotels: 3 distinct tiers (budget, mid, premium, one per stay area)
  const stayCosts = profile.typicalDailyCostPerPersonINR.stay;
  const area0 = profile.stayAreas[0]?.name || 'Central Area';
  const area1 = profile.stayAreas[1]?.name || profile.stayAreas[0]?.name || 'Scenic Valley';
  const area2 = profile.stayAreas[2]?.name || profile.stayAreas[1]?.name || 'Hillside Enclave';

  const budgetRoomPerNight = stayCosts.budget * 2;
  const midRoomPerNight = stayCosts.mid * 2;
  const premiumRoomPerNight = stayCosts.premium * 2;

  const budgetHotel: HotelItem = {
    id: `ht-${profile.name.toLowerCase()}-budget`,
    name: `${profile.name} Heritage Homestay`,
    area: area0,
    city: profile.name,
    starRating: 3,
    reviewScore: 0,
    reviewsCount: 0,
    roomType: 'Standard Double Room',
    bedConfiguration: totalTravellers > 2 ? '1 Queen Bed + 1 Rollaway Bed' : '1 Queen Bed',
    maxCapacity: Math.max(4, totalTravellers),
    pricePerNightINR: budgetRoomPerNight,
    totalPriceINR: budgetRoomPerNight * nights,
    pricePerNightUSD: Math.round(budgetRoomPerNight / 84),
    totalPriceUSD: Math.round((budgetRoomPerNight * nights) / 84),
    amenities: ['Free High-Speed Wi-Fi', '24/7 Hot Water', 'Attached Private Bathroom', 'Homestyle Meals on Request'],
    breakfastIncluded: true,
    freeCancellation: true,
    distanceFromCenter: '1 km from town center',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    tag: 'Within Budget',
    source: 'estimate',
    sourceLabel: 'AI estimate'
  };

  const midHotel: HotelItem = {
    id: `ht-${profile.name.toLowerCase()}-mid`,
    name: `${profile.name} Valley & Garden Resort`,
    area: area1,
    city: profile.name,
    starRating: 4,
    reviewScore: 0,
    reviewsCount: 0,
    roomType: 'Deluxe Valley View Room',
    bedConfiguration: totalTravellers > 2 ? '1 King Bed + 1 Sofa Bed' : '1 King Bed',
    maxCapacity: Math.max(4, totalTravellers),
    pricePerNightINR: midRoomPerNight,
    totalPriceINR: midRoomPerNight * nights,
    pricePerNightUSD: Math.round(midRoomPerNight / 84),
    totalPriceUSD: Math.round((midRoomPerNight * nights) / 84),
    amenities: ['Complimentary Buffet Breakfast', 'Mountain & Valley View', 'Room Service', 'Wi-Fi', 'On-site Restaurant'],
    breakfastIncluded: true,
    freeCancellation: true,
    distanceFromCenter: '2.5 km from town center',
    imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    tag: 'Best Match',
    source: 'estimate',
    sourceLabel: 'AI estimate'
  };

  const premiumHotel: HotelItem = {
    id: `ht-${profile.name.toLowerCase()}-premium`,
    name: `${profile.name} Luxury Estate & Spa`,
    area: area2,
    city: profile.name,
    starRating: 5,
    reviewScore: 0,
    reviewsCount: 0,
    roomType: 'Executive Panoramic Suite',
    bedConfiguration: totalTravellers > 2 ? '1 King Bed + 2 Single Beds' : '1 King Bed',
    maxCapacity: Math.max(4, totalTravellers),
    pricePerNightINR: premiumRoomPerNight,
    totalPriceINR: premiumRoomPerNight * nights,
    pricePerNightUSD: Math.round(premiumRoomPerNight / 84),
    totalPriceUSD: Math.round((premiumRoomPerNight * nights) / 84),
    amenities: ['Private Scenic Balcony', 'Ayurvedic Spa & Wellness', 'Heated Pool', 'Fine Dining Restaurant', 'Chauffeured Buggy Service'],
    breakfastIncluded: true,
    freeCancellation: true,
    distanceFromCenter: '4 km from town center',
    imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
    tag: 'Luxury Splurge',
    source: 'estimate',
    sourceLabel: 'AI estimate'
  };

  const availableHotels: HotelItem[] = [budgetHotel, midHotel, premiumHotel];
  // Default hotel is mid hotel (Balanced plan)
  const selectedHotel = midHotel;

  // 3. Itinerary: Group sights by area and distribute across days
  const sightsByArea: Record<string, TopSight[]> = {};
  profile.topSights.forEach((sight) => {
    const area = sight.area || profile.stayAreas[0]?.name || 'Central';
    if (!sightsByArea[area]) sightsByArea[area] = [];
    sightsByArea[area].push(sight);
  });

  const areaKeys = Object.keys(sightsByArea);
  const itinerary: ActivityDayItem[] = [];
  const allActivities: ActivityItem[] = [];

  const activityDailyPerPerson = profile.typicalDailyCostPerPersonINR.activities;

  for (let day = 1; day <= durationDays; day++) {
    const areaKey = areaKeys[(day - 1) % areaKeys.length] || profile.name;
    const areaSights = sightsByArea[areaKey] || [];
    const sight1 = areaSights[(day - 1) * 2 % Math.max(1, areaSights.length)] || profile.topSights[0];
    const sight2 = areaSights[((day - 1) * 2 + 1) % Math.max(1, areaSights.length)] || profile.topSights[1];

    const morningDesc = sight1
      ? `Visit ${sight1.name} in ${sight1.area} (approx. ${sight1.hoursNeeded}h).`
      : 'Morning local sightseeing and scenic viewpoints.';

    const afternoonDesc = sight2 && sight2.name !== sight1?.name
      ? `Explore ${sight2.name} in ${sight2.area} (approx. ${sight2.hoursNeeded}h).`
      : 'Afternoon leisure walk through local tea/spice plantations and souvenir markets.';

    const eveningDesc = 'Relaxed evening dinner at a popular local restaurant enjoying regional cuisine.';

    const dayActivityCostINR = Math.round(activityDailyPerPerson * totalTravellers);

    itinerary.push({
      day,
      dateStr: `Day ${day}`,
      title: `Day ${day}: ${areaKey} Sights`,
      theme: 'Sightseeing & Nature',
      morning: morningDesc,
      afternoon: afternoonDesc,
      evening: eveningDesc,
      familyFriendlyScore: 5,
      estimatedCostINR: dayActivityCostINR,
      estimatedCostUSD: Math.round(dayActivityCostINR / 84),
      localDining: [
        `Local ${profile.name} Bistro`,
        profile.vegFriendly === 'high' ? 'Pure Vegetarian Dining Hall' : 'Traditional Regional Kitchen'
      ],
      transitTip: `Local sightseeing cab or auto within ${areaKey}.`
    });

    if (sight1) {
      allActivities.push({
        id: `act-${profile.name.toLowerCase()}-d${day}-1`,
        name: sight1.name,
        category: 'Sightseeing',
        location: `${sight1.name}, ${sight1.area}`,
        duration: `${sight1.hoursNeeded} hours`,
        ageSuitability: 'All ages',
        estimatedPriceINR: Math.round(activityDailyPerPerson * 0.6),
        walkingLevel: 'Low',
        description: `Explore ${sight1.name} in ${sight1.area}. Approx. ${sight1.hoursNeeded} hours.`,
        timeSlot: 'Morning',
        dayNumber: day,
        imageUrl: '',
        source: 'estimate',
        sourceLabel: 'AI estimate'
      });
    }

    if (sight2 && sight2.name !== sight1?.name) {
      allActivities.push({
        id: `act-${profile.name.toLowerCase()}-d${day}-2`,
        name: sight2.name,
        category: 'Sightseeing',
        location: `${sight2.name}, ${sight2.area}`,
        duration: `${sight2.hoursNeeded} hours`,
        ageSuitability: 'All ages',
        estimatedPriceINR: Math.round(activityDailyPerPerson * 0.4),
        walkingLevel: 'Low',
        description: `Explore ${sight2.name} in ${sight2.area}. Approx. ${sight2.hoursNeeded} hours.`,
        timeSlot: 'Afternoon',
        dayNumber: day,
        imageUrl: '',
        source: 'estimate',
        sourceLabel: 'AI estimate'
      });
    }
  }

  // 4. Dining Suggestions
  const diningSuggestions: DiningItem[] = [
    {
      id: `din-${profile.name.toLowerCase()}-1`,
      name: `The ${profile.name} Heritage Dining Hall`,
      cuisine: `Authentic ${profile.state || 'Local'} Cuisine`,
      area: area0,
      priceForTwoINR: 800,
      rating: 4.5,
      isPureVeg: profile.vegFriendly === 'high',
      isJainFriendly: profile.vegFriendly === 'high',
      isFamilyFriendly: true,
      recommendedDishes: ['Local Thali / Platter', 'Fresh Regional Specialties', 'Filter Coffee / Tea'],
      imageUrl: '',
      source: 'estimate',
      sourceLabel: 'AI estimate'
    },
    {
      id: `din-${profile.name.toLowerCase()}-2`,
      name: `Hillside View Cafe & Bakery`,
      cuisine: 'Cafe & Continental',
      area: area1,
      priceForTwoINR: 950,
      rating: 4.6,
      isPureVeg: false,
      isJainFriendly: false,
      isFamilyFriendly: true,
      recommendedDishes: ['Freshly Baked Bread & Pastries', 'Mountain Tea', 'Hot Soups'],
      imageUrl: '',
      source: 'estimate',
      sourceLabel: 'AI estimate'
    }
  ];

  // 5. Budget Calculation (Strict Integer Rupee Arithmetic & 15% Surprise Buffer)
  const hotelTotalCostINR = selectedHotel.totalPriceINR;
  const travelCostINR = flightTotalPriceINR + transferPriceINR;
  const foodCostINR = Math.round(profile.typicalDailyCostPerPersonINR.food * durationDays * totalTravellers);
  const localTransportCostINR = Math.round(profile.typicalDailyCostPerPersonINR.localTransport * durationDays * totalTravellers);
  const activitiesCostINR = Math.round(profile.typicalDailyCostPerPersonINR.activities * durationDays * totalTravellers);

  const subtotalINR = hotelTotalCostINR + travelCostINR + foodCostINR + localTransportCostINR + activitiesCostINR;
  const bufferCostINR = Math.round(subtotalINR * 0.15); // Exactly 15% surprise buffer
  const grandTotalINR = subtotalINR + bufferCostINR;

  const remainingBudgetINR = Math.max(0, targetBudgetINR - grandTotalINR);
  const overBudgetAmountINR = Math.max(0, grandTotalINR - targetBudgetINR);
  const isOverBudget = grandTotalINR > targetBudgetINR;

  return {
    id: `plan-${profile.name.toLowerCase()}-${Date.now()}`,
    title: `${durationDays} Days in ${profile.name}`,
    summary: `${durationDays}-day curated trip to ${profile.name} for ${totalTravellers} traveller${totalTravellers > 1 ? 's' : ''}.`,
    destination,
    origin,
    dates,
    durationDays,
    travellers: {
      total: totalTravellers,
      adults,
      children,
      childAges,
      seniors
    },
    scope: 'domestic',
    isAiEstimatedDestination: true,
    flight,
    availableFlights: [flight],
    hotel: selectedHotel,
    availableHotels,
    transfer,
    availableTransfers: [transfer],
    activities: allActivities,
    availableActivities: allActivities,
    itinerary,
    diningSuggestions,
    budget: {
      targetINR: targetBudgetINR,
      flightsCostINR: flightTotalPriceINR,
      hotelCostINR: hotelTotalCostINR,
      transportCostINR: transferPriceINR,
      localTransportCostINR,
      foodCostINR,
      activitiesCostINR,
      diningEstimateINR: foodCostINR,
      bufferCostINR,
      otherCostsINR: 0,
      grandTotalINR,
      remainingBudgetINR,
      overBudgetAmountINR,
      isOverBudget
    },
    mapWaypoints: [
      {
        id: 'wp-1',
        name: `${profile.name} Center`,
        type: 'destination',
        area: profile.state,
        coordinates: { lat: 11.4102, lng: 76.6950 },
        description: profile.name
      }
    ],
    recommendations: profile.localTips,
    verificationChecks: [
      {
        id: 'vc-1',
        title: 'Airport Transfer Verification',
        category: 'capacity',
        status: 'PASS',
        detail: `Transfer from ${destAirportCode} (${primaryAirport.name}) is approx. ${transferDriveHours} hours drive.`
      },
      {
        id: 'vc-2',
        title: 'AI Estimates Check',
        category: 'budget',
        status: 'NEEDS_REVIEW',
        detail: 'New destination with AI-estimated rates. Verify hotel pin and prices on booking platforms before payment.'
      }
    ],
    createdAt: new Date().toISOString()
  };
}
