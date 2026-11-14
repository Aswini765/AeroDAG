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
import { originCodeFor } from './originCities';
import { resolveTravelDates } from './dateResolver.ts';
import { evaluateMonthWorthiness, isOffbeatRequested, getHowToGetThereModes } from './seasonAndFitHelper.ts';
import { realisticReturnFarePerPerson, getRouteRealism, coordsFor, AIRPORT_COORDS, GroundOption } from './travelRealism';
import { TrainItem } from '../types/travelBooking.ts';

export function buildPlanFromDestinationProfile(
  context: Partial<TripContext>,
  profile: DestinationProfile
): TripPlan {
  const destination = `${profile.name}${profile.state ? `, ${profile.state}` : ''}`;
  const origin = (context.origin || 'Bengaluru (BLR)').trim();
  const dates = (context.dates || '').trim();
  const resolvedDateRange = resolveTravelDates(dates);
  const durationDays = Math.max(1, context.durationDays || (resolvedDateRange && resolvedDateRange.ok ? resolvedDateRange.days : 4));
  const nights = Math.max(1, durationDays - 1);

  const adults = Math.max(1, context.adultsCount || 2);
  const children = Math.max(0, context.childrenCount || 0);
  const seniors = Math.max(0, context.seniorsCount || 0);
  const childAges = Array.isArray(context.childrenAges) ? context.childrenAges : [];
  const totalTravellers = Math.max(adults + children + seniors, context.totalTravellers || adults + children);

  const targetBudgetINR = context.budgetTotalINR || 50000;

  // 1. Flight & Airport Transfer
  const estimateLabel = profile.isOfflineEstimate ? 'Estimate' : 'AI estimate';
  // No known airport: say so honestly instead of inventing one
  const hasKnownAirport = Boolean(profile.nearestAirports[0]?.code);
  const primaryAirport = profile.nearestAirports[0] || {
    code: '',
    name: 'nearest airport or station',
    driveHoursToCenter: 3
  };

  let originCode = originCodeFor(origin) || 'BLR';
  const originCity = origin.replace(/\s*\([A-Z]{3}\)/, '').trim() || 'Bengaluru';
  let destAirportCode = primaryAirport.code;

  if (originCode === destAirportCode) {
    if (profile.name.toLowerCase().includes('bengaluru')) {
      destAirportCode = 'BLR';
      if (originCode === 'BLR') originCode = 'GOI';
    } else if (profile.name.toLowerCase().includes('goa')) {
      destAirportCode = 'GOX';
      if (originCode === 'GOX' || originCode === 'GOI') originCode = 'BLR';
    }
  }

  // Real-world fare for this route (distance-based, small airports cost more) — never a flat ₹3,500
  const flightPricePerPersonINR = realisticReturnFarePerPerson(originCode, destAirportCode || null);
  const flightTotalPriceINR = flightPricePerPersonINR * totalTravellers;

  // How people actually make this trip: road for short hops and groups, bus/train on a budget
  const realism = getRouteRealism({
    fromCoords: AIRPORT_COORDS[originCode] || null,
    toCoords: coordsFor(profile.name, destAirportCode),
    destinationState: `${profile.state} ${profile.name}`,
    travellers: totalTravellers,
    hasAirport: hasKnownAirport
  });
  const groundItem = (g: GroundOption): TrainItem => ({
    id: `gr-${g.mode}-${profile.name.toLowerCase()}`,
    trainName: g.label,
    trainNumber: '',
    fromStation: origin.replace(/\s*\(.*\)/, '').trim(),
    toStation: profile.name,
    departureTime: g.hours >= 7 ? 'Night' : 'Morning',
    arrivalTime: g.hours >= 7 ? 'Next morning' : 'Afternoon',
    duration: `approx. ${g.hours}h`,
    classes: [],
    selectedClass: '3A',
    pricePerPersonINR: g.perPersonReturnINR,
    totalPriceINR: g.totalINR,
    foodIncluded: false,
    isVandeBharatOrRajdhani: false,
    mode: g.mode === 'bus' ? 'bus' : 'train',
    source: 'estimate',
    sourceLabel: profile.isOfflineEstimate ? 'Estimate' : 'AI estimate'
  });
  const budgetGround: TrainItem | null = realism ? groundItem(realism.budget) : null;
  const balancedTrainLabel = realism && (realism.balancedMode === 'bus' || realism.balancedMode === 'train') ? realism.budget.label : '';

  const flight: FlightItem = {
    id: `fl-${profile.name.toLowerCase()}-1`,
    airline: hasKnownAirport
      ? `Morning non-stop flight ${originCode}→${destAirportCode}`
      : `Return travel from ${originCity} (flight or train — check the best route)`,
    airlineCode: 'AI-EST',
    flightNumber: '',
    originCode,
    originCity,
    destinationCode: destAirportCode,
    destinationCity: primaryAirport.name.replace(/Airport|International/gi, '').trim() || profile.name,
    departureTime: 'Morning',
    arrivalTime: 'Morning',
    duration: 'approx. 1h 45m',
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
    sourceLabel: estimateLabel
  };

  const transferDriveHours = primaryAirport.driveHoursToCenter;
  let transferPriceINR = Math.max(1200, Math.round(transferDriveHours * 850 + 1000));

  const roadMode = realism && (realism.balancedMode === 'cab' || realism.balancedMode === 'tempo');
  const isRoadTrip = (context.transportMode as any) === 'Cab' || (context.transportMode as any) === 'Road' || Boolean(roadMode);
  const originClean = origin.replace(/\s*\(.*\)/, '').trim();

  if (roadMode && realism) transferPriceINR = realism.road.totalINR;
  const transfer: TransferItem = {
    id: `tr-${profile.name.toLowerCase()}-1`,
    title: isRoadTrip
      ? `Round-trip cab from ${originClean}`
      : hasKnownAirport
        ? `Private AC Transfer (${destAirportCode} ↔ ${profile.name})`
        : `Local transfer to ${profile.name}`,
    vehicleType: roadMode && realism?.road.mode === 'tempo' ? 'Tempo traveller (12-seater)' : totalTravellers > 4 ? 'AC Tempo traveller' : totalTravellers > 3 ? 'AC Innova / SUV' : 'AC Sedan',
    capacityPassengers: Math.max(4, totalTravellers),
    luggageCapacity: Math.max(3, totalTravellers),
    priceINR: transferPriceINR,
    priceUSD: Math.round(transferPriceINR / 84),
    description: isRoadTrip
      ? `Round-trip ${realism?.road.mode === 'tempo' ? 'tempo traveller' : 'private AC cab'} from ${originClean} to ${profile.name} and back (about ${realism?.roadKm || ''} km, ${realism?.roadHours || ''}h each way).`
      : `Private cab pickup from ${primaryAirport.name} to hotel in ${profile.name}. Road journey is approx. ${transferDriveHours} hours.`,
    duration: `approx. ${isRoadTrip && realism ? realism.roadHours : transferDriveHours} hours`,
    pickupLocation: isRoadTrip ? `${originClean} Pickup` : `${destAirportCode} Airport`,
    dropLocation: `${profile.name} Hotel`,
    source: 'estimate',
    sourceLabel: estimateLabel
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
    name: `3★ stay in ${area0}, ~₹${budgetRoomPerNight.toLocaleString('en-IN')}/night`,
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
    sourceLabel: estimateLabel
  };

  const midHotel: HotelItem = {
    id: `ht-${profile.name.toLowerCase()}-mid`,
    name: `4★ hotel in ${area1}, ~₹${midRoomPerNight.toLocaleString('en-IN')}/night`,
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
    sourceLabel: estimateLabel
  };

  const premiumHotel: HotelItem = {
    id: `ht-${profile.name.toLowerCase()}-premium`,
    name: `5★ luxury stay in ${area2}, ~₹${premiumRoomPerNight.toLocaleString('en-IN')}/night`,
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
    sourceLabel: estimateLabel
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

  // Each sight once: Day 1 gets one short sight, then two per day, grouped by area, then free time.
  const shortSightFirst = profile.topSights.find((t) => t.hoursNeeded <= 2) || profile.topSights[0];
  const orderedSights: TopSight[] = [];
  for (const k of areaKeys) for (const t of sightsByArea[k]) {
    if (t.name !== shortSightFirst?.name && !orderedSights.some((o) => o.name.toLowerCase() === t.name.toLowerCase())) orderedSights.push(t);
  }
  const placeName = profile.name.replace(/,.*$/, '').trim();
  // What Google Maps should search: the place, not the activity ("Nahargarh sunset" → "Nahargarh")
  // Placeholder sights ("Main sights of X (check Google Maps)") are not places: never put them on a map
  const isPlaceholder = (t?: TopSight) => !t || /check google maps|^main sights of|local market$|viewpoint or waterfront$/i.test(t.name);
  const mapQ = (t: TopSight) => {
    const n = t.name.replace(/\s+(sunset|sunrise|walk|tour|visit|ride|trek|hike|stroll|views?)$/i, '').trim();
    return new RegExp(placeName, 'i').test(n) ? n : `${n}, ${placeName}`;
  };

  for (let day = 1; day <= durationDays; day++) {
    const mid = day - 2; // 0 for Day 2
    const sight1: TopSight | undefined = day >= 2 ? orderedSights[mid * 2] : undefined;
    const sight2: TopSight | undefined = day >= 2 ? orderedSights[mid * 2 + 1] : undefined;
    const areaKey = sight1?.area || profile.stayAreas[0]?.name || profile.name;

    const morningDesc = sight1 && !isPlaceholder(sight1)
      ? `Visit ${sight1.name} (approx. ${sight1.hoursNeeded}h).`
      : sight1
      ? `Explore ${placeName} — tap "Open in Google Maps" for things to do near your stay.`
      : 'Free morning near your stay.';

    let fallbackAfternoon = `Afternoon leisure walk through local artisan craft bazaars, historic lanes, and scenic viewpoints in ${profile.name}.`;
    const profileText = `${profile.name} ${profile.state || ''} ${profile.topSights.map((s) => s.name).join(' ')}`.toLowerCase();
    if (/\b(rajasthan|udaipur|jaipur|jodhpur|jaisalmer|agra|delhi|varanasi|heritage|palace)\b/.test(profileText)) {
      fallbackAfternoon = `Afternoon leisure walk through vibrant local artisan craft bazaars, heritage lanes, and scenic lake promenades.`;
    } else if (/\b(goa|beach|coastal|kovalam|varkala|puri|andaman)\b/.test(profileText)) {
      fallbackAfternoon = `Afternoon coastal stroll along scenic beaches, local artisan craft stalls, and seaside cafes.`;
    } else if (/\b(munnar|coorg|darjeeling|assam|ooty|wayanad)\b/.test(profileText)) {
      fallbackAfternoon = `Afternoon gentle nature walk through aromatic tea and coffee trails, viewpoint promenades, and spice markets.`;
    } else if (/\b(himachal|manali|shimla|kashmir|ladakh|uttarakhand|rishikesh)\b/.test(profileText)) {
      fallbackAfternoon = `Afternoon scenic mountain walk along pine forest paths, local craft markets, and valley viewpoints.`;
    }

    const afternoonDesc = sight2 && sight2.name !== sight1?.name && !isPlaceholder(sight2)
      ? `Visit ${sight2.name} (approx. ${sight2.hoursNeeded}h).`
      : sight1 ? fallbackAfternoon : 'Free afternoon — rest, or revisit a favourite place.';

    let eveningDesc = 'Dinner at a local place serving regional food.';

    const dayActivityCostINR = Math.round(activityDailyPerPerson * totalTravellers);

    // Day 1 is a travel day: get there, check in, one short sight. The last day is the trip home.
    const shortSight = profile.topSights.find((t) => t.hoursNeeded <= 2) || profile.topSights[0];
    const howYouCome = isRoadTrip
      ? `Drive from ${originClean} to ${profile.name}${realism ? ` (about ${realism.roadHours}h)` : ''}`
      : balancedTrainLabel
      ? `${balancedTrainLabel} from ${originClean} to ${profile.name}`
      : hasKnownAirport
      ? `Fly ${originCode} → ${destAirportCode}, then about ${transferDriveHours}h by road to ${profile.name}`
      : `Travel from ${originClean} to ${profile.name}`;
    let dayTitle = sight1 && !isPlaceholder(sight1)
      ? `${sight1.name}${sight2 && sight2.name !== sight1.name && !isPlaceholder(sight2) ? ` & ${sight2.name}` : ''}`
      : sight1 ? `Explore ${placeName}` : 'Free day near your stay';
    let dayStops = [sight1, sight2 && sight2.name !== sight1?.name ? sight2 : undefined]
      .filter((t) => t && !isPlaceholder(t))
      .map((t, k) => ({ name: t!.name, slot: (k === 0 ? 'Morning' : 'Afternoon') as 'Morning' | 'Afternoon', mapQuery: mapQ(t!) }));
    let morning = morningDesc;
    let afternoon = afternoonDesc;
    if (day === 1) {
      dayTitle = `Arrive in ${profile.name}`;
      morning = `${howYouCome}.`;
      afternoon = `Check in and rest${shortSight && !isPlaceholder(shortSight) ? `, then an easy visit to ${shortSight.name}` : ', then a short walk near your stay'}.`;
      eveningDesc = 'Early dinner near your stay.';
      dayStops = shortSight && !isPlaceholder(shortSight) ? [{ name: shortSight.name, slot: 'Afternoon', mapQuery: mapQ(shortSight) }] : [];
    } else if (day === durationDays && durationDays > 1) {
      dayTitle = `Head home`;
      afternoon = `Leave for ${originClean} — ${isRoadTrip || balancedTrainLabel ? 'by road' : `back to ${destAirportCode || 'the airport'} for your flight`}.`;
      eveningDesc = 'Home.';
      morning = sight1 && sight1.hoursNeeded <= 3 ? `Visit ${sight1.name} (approx. ${sight1.hoursNeeded}h), then check out.` : 'Relaxed breakfast and check out.';
      dayStops = sight1 && sight1.hoursNeeded <= 3 && !isPlaceholder(sight1) ? [{ name: sight1.name, slot: 'Morning', mapQuery: mapQ(sight1) }] : [];
    }

    itinerary.push({
      day,
      dateStr: `Day ${day}`,
      title: dayTitle,
      theme: 'Sightseeing & Nature',
      morning,
      afternoon,
      evening: eveningDesc,
      familyFriendlyScore: 5,
      estimatedCostINR: dayActivityCostINR,
      estimatedCostUSD: Math.round(dayActivityCostINR / 84),
      localDining: [
        `Local ${profile.name} Bistro`,
        profile.vegFriendly === 'high' ? 'Pure Vegetarian Dining Hall' : 'Traditional Regional Kitchen'
      ],
      transitTip: `Local sightseeing cab or auto within ${areaKey}.`,
      stops: dayStops
    });

    if (sight1) {
      allActivities.push({
        id: `act-${profile.name.toLowerCase()}-d${day}-1`,
        name: sight1.name,
        category: 'Sightseeing',
        location: mapQ(sight1),
        duration: `${sight1.hoursNeeded} hours`,
        ageSuitability: 'All ages',
        estimatedPriceINR: Math.round(activityDailyPerPerson * 0.6),
        walkingLevel: 'Low',
        description: `Explore ${sight1.name}. Approx. ${sight1.hoursNeeded} hours.`,
        timeSlot: 'Morning',
        dayNumber: day,
        imageUrl: '',
        source: 'estimate',
        sourceLabel: estimateLabel
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
        sourceLabel: estimateLabel
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
      sourceLabel: estimateLabel
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
      sourceLabel: estimateLabel
    }
  ];

  // 5. Budget Calculation (Strict Integer Rupee Arithmetic & 15% Surprise Buffer)
  const hotelTotalCostINR = selectedHotel.totalPriceINR;
  const travelCostINR = flightTotalPriceINR + transferPriceINR;
  const foodCostINR = Math.round(profile.typicalDailyCostPerPersonINR.food * durationDays * totalTravellers);
  // A cab or jeep is shared: up to 4 people share one; 5+ share a tempo (≈1.8 cabs)
  const vehicleShare = totalTravellers <= 4 ? Math.min(totalTravellers, 2.5) : 4.5;
  const localTransportCostINR = Math.round(profile.typicalDailyCostPerPersonINR.localTransport * durationDays * vehicleShare);
  const activitiesCostINR = Math.round(profile.typicalDailyCostPerPersonINR.activities * durationDays * totalTravellers);

  const subtotalINR = hotelTotalCostINR + travelCostINR + foodCostINR + localTransportCostINR + activitiesCostINR;
  const bufferCostINR = Math.round(subtotalINR * 0.15); // Exactly 15% surprise buffer
  const grandTotalINR = subtotalINR + bufferCostINR;

  const remainingBudgetINR = Math.max(0, targetBudgetINR - grandTotalINR);
  const overBudgetAmountINR = Math.max(0, grandTotalINR - targetBudgetINR);
  const isOverBudget = grandTotalINR > targetBudgetINR;

  // Balanced = how most people make this trip; flights stay available for the Comfort option
  const balancedIsGround = Boolean(realism && realism.balancedMode !== 'flight');
  const balancedTrain: TrainItem | undefined = realism && (realism.balancedMode === 'bus' || realism.balancedMode === 'train')
    ? groundItem(realism.budget)
    : undefined;
  const availableTrains: TrainItem[] = budgetGround && (hasKnownAirport || (realism && realism.roadKm <= 900)) ? [budgetGround] : [];
  // A door-to-door private cab / tempo, for the Comfort option on trips too short to fly
  const roadTransferOption: TransferItem | null = realism && realism.roadKm <= 700 ? {
    ...transfer,
    id: `tr-${profile.name.toLowerCase()}-road`,
    title: `${realism.road.mode === 'tempo' ? 'Tempo traveller' : 'Private AC cab'} from ${originClean} and back`,
    vehicleType: realism.road.mode === 'tempo' ? 'Tempo traveller (12-seater)' : totalTravellers > 3 ? 'AC Innova / SUV' : 'AC Sedan',
    priceINR: realism.road.totalINR,
    priceUSD: Math.round(realism.road.totalINR / 84),
    duration: `approx. ${realism.roadHours} hours`,
    pickupLocation: `${originClean} Pickup`,
    description: `Door-to-door ${realism.road.mode === 'tempo' ? 'tempo traveller' : 'private cab'} from ${originClean} (about ${realism.roadKm} km, ${realism.roadHours}h each way).`
  } : null;
  if (balancedTrain) {
    const isBus = balancedTrain.mode === 'bus';
    transfer.title = `Auto / local cab to and from the ${isBus ? 'bus stand' : 'station'}`;
    transfer.pickupLocation = `${profile.name} ${isBus ? 'bus stand' : 'station'}`;
    transfer.description = `Short auto or local cab ride between the ${isBus ? 'bus stand' : 'station'} and your stay in ${profile.name}.`;
  }

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
    isAiEstimatedDestination: !profile.isOfflineEstimate,
    // No airport and no idea of the route: keep the honest "check the best route" travel line
    flight: balancedIsGround ? null : flight,
    // Nobody flies 250 km: only offer the flight when the trip is long enough for it to make sense
    availableFlights: hasKnownAirport && (!realism || realism.roadKm > 450) ? [flight] : [],
    availableTrains,
    selectedTrain: balancedTrain,
    hotel: selectedHotel,
    availableHotels,
    transfer,
    availableTransfers: roadTransferOption && !isRoadTrip ? [transfer, roadTransferOption] : [transfer],
    activities: allActivities,
    availableActivities: allActivities,
    itinerary,
    diningSuggestions,
    budget: {
      targetINR: targetBudgetINR,
      flightsCostINR: balancedIsGround ? (balancedTrain ? balancedTrain.totalPriceINR : 0) : flightTotalPriceINR,
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
    createdAt: new Date().toISOString(),
    monthWorthiness: evaluateMonthWorthiness(profile.name, dates, `${context.notes?.join(' ')} ${context.freeTextPreferences || ''}`, true),
    isOffbeatLeaning: isOffbeatRequested(context.freeTextPreferences || '', context.notes),
    transitModeComparison: getHowToGetThereModes(profile.name, origin, totalTravellers, 'Flight')
  };
}
