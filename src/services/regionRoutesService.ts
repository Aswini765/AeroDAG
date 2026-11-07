// src/services/regionRoutesService.ts
import { TripPlan, HotelItem, TransferItem, ActivityDayItem, FlightItem } from '../types/travelBooking';
import { evaluateMonthWorthiness, isOffbeatRequested, getHowToGetThereModes } from './seasonAndFitHelper';

export interface RegionRouteBase {
  name: string;
  area: string;
  nights: number;
  highlight: string;
  starRating?: number;
  pricePerNightINR?: number;
}

export interface RegionRouteOption {
  id: string;
  title: string;
  tagline: string;
  basesCount: number;
  bases: RegionRouteBase[];
  nightsPerBaseText: string;
  totalTravelHours: number;
  totalTravelHoursText: string;
  estimatedCostINR: number;
  isRecommended?: boolean;
  matchReason?: string;
  highlights: string[];
}

export function getRegionRoutes(
  region: string,
  totalNights: number,
  preferences?: string | null,
  targetBudgetINR?: number | null,
  travellersCount: number = 2
): RegionRouteOption[] {
  const regLower = (region || '').toLowerCase();
  const prefLower = (preferences || '').toLowerCase();
  const isOffbeat = /offbeat|not touristy|less crowded|quiet|nature/i.test(prefLower);
  const nights = Math.max(2, totalNights > 0 ? totalNights : 6);
  const budget = targetBudgetINR && targetBudgetINR > 0 ? targetBudgetINR : 90000;

  if (regLower.includes('rajasthan')) {
    // Distribute nights across bases
    const n1 = Math.max(2, Math.floor(nights * 0.4));
    const n2 = Math.max(2, Math.floor(nights * 0.3));
    const n3 = Math.max(1, nights - n1 - n2);

    const half1 = Math.floor(nights / 2);
    const half2 = nights - half1;

    // AI estimate total costs around target budget
    const opt1Cost = Math.round(budget * (isOffbeat ? 0.96 : 0.98) / 100) * 100;
    const opt2Cost = Math.round(budget * 0.99 / 100) * 100;
    const opt3Cost = Math.round(budget * 1.02 / 100) * 100;

    return [
      {
        id: 'raj-offbeat',
        title: 'Udaipur + Kumbhalgarh + Bundi',
        tagline: 'Offbeat hill forts, quiet lake havelis & artisan stepwell towns',
        basesCount: 3,
        bases: [
          { name: 'Udaipur', area: 'Lake Pichola Ghats', nights: n1, highlight: 'Peaceful lakefront havelis, sunset boat ride & City Palace', starRating: 4, pricePerNightINR: 4200 },
          { name: 'Kumbhalgarh', area: 'Fort Foothills', nights: n2, highlight: 'Massive UNESCO hill fort & quiet jungle stay', starRating: 4, pricePerNightINR: 3800 },
          { name: 'Bundi', area: 'Taragarh Old Town', nights: n3, highlight: 'Ancient stepwells, blue alleys & authentic palace murals', starRating: 3, pricePerNightINR: 3200 }
        ],
        nightsPerBaseText: `Udaipur (${n1}N) · Kumbhalgarh (${n2}N) · Bundi (${n3}N)`,
        totalTravelHours: 7,
        totalTravelHoursText: 'approx. 7 hours total travel between bases by cab',
        estimatedCostINR: opt1Cost,
        isRecommended: isOffbeat,
        matchReason: isOffbeat ? 'Matches your preference: offbeat, not touristy' : undefined,
        highlights: ['Offbeat & non-touristy', 'UNESCO Hill Fort', 'Lakeside Havelis']
      },
      {
        id: 'raj-desert',
        title: 'Jaisalmer + Jodhpur',
        tagline: 'Golden dunes, desert camps & the historic Blue City',
        basesCount: 2,
        bases: [
          { name: 'Jaisalmer', area: 'Sam Dunes & Fort', nights: half1, highlight: 'Desert tent camps, camel sunset & living sandstone fort', starRating: 4, pricePerNightINR: 4000 },
          { name: 'Jodhpur', area: 'Old Blue City', nights: half2, highlight: 'Mehrangarh fortress, spice markets & blue rooftop dining', starRating: 4, pricePerNightINR: 3900 }
        ],
        nightsPerBaseText: `Jaisalmer (${half1}N) · Jodhpur (${half2}N)`,
        totalTravelHours: 5,
        totalTravelHoursText: 'approx. 5 hours total travel between bases',
        estimatedCostINR: opt2Cost,
        isRecommended: !isOffbeat,
        matchReason: !isOffbeat ? 'Scenic desert sands & royal palaces' : undefined,
        highlights: ['Desert Safari', 'Living Fort', 'Blue City Rooftops']
      },
      {
        id: 'raj-classic',
        title: 'Jaipur + Ranthambore',
        tagline: 'Grand royal palaces, vibrant craft bazaars & tiger safari trails',
        basesCount: 2,
        bases: [
          { name: 'Jaipur', area: 'Bani Park', nights: half1, highlight: 'Amber Fort, Hawa Mahal & traditional bazaar walks', starRating: 4, pricePerNightINR: 4400 },
          { name: 'Ranthambore', area: 'Jungle Reserve Zone', nights: half2, highlight: 'Morning & afternoon open gypsy tiger safaris', starRating: 4, pricePerNightINR: 4600 }
        ],
        nightsPerBaseText: `Jaipur (${half1}N) · Ranthambore (${half2}N)`,
        totalTravelHours: 4,
        totalTravelHoursText: 'approx. 4 hours total travel between bases',
        estimatedCostINR: opt3Cost,
        highlights: ['Royal Palaces', 'Tiger Safari', 'Historic Bazaars']
      }
    ];
  }

  if (regLower.includes('kerala')) {
    const half1 = Math.floor(nights / 2);
    const half2 = nights - half1;
    return [
      {
        id: 'ker-nature-route',
        title: 'Munnar + Alleppey',
        tagline: 'Misty tea hills and peaceful backwaters houseboat cruise',
        basesCount: 2,
        bases: [
          { name: 'Munnar', area: 'Old Munnar / Pallivasal', nights: half1, highlight: 'Tea plantations, waterfalls & mist valleys', starRating: 4, pricePerNightINR: 3800 },
          { name: 'Alleppey', area: 'Punnamada Backwaters', nights: half2, highlight: 'Backwater boat cruise & village canals', starRating: 4, pricePerNightINR: 4500 }
        ],
        nightsPerBaseText: `Munnar (${half1}N) · Alleppey (${half2}N)`,
        totalTravelHours: 4.5,
        totalTravelHoursText: 'approx. 4.5 hours scenic drive between Munnar & Alleppey',
        estimatedCostINR: Math.round(budget * 0.95 / 100) * 100,
        isRecommended: true,
        highlights: ['Tea Valleys', 'Backwaters', 'Ayurvedic Food']
      },
      {
        id: 'ker-offbeat-route',
        title: 'Wayanad + Bekal',
        tagline: 'Quiet rainforest peaks, coffee estates and secluded coastal fort',
        basesCount: 2,
        bases: [
          { name: 'Wayanad', area: 'Vythiri', nights: half1, highlight: 'Rainforest trails, coffee estates & Edakkal caves', starRating: 4, pricePerNightINR: 3600 },
          { name: 'Bekal', area: 'Kappil Beach', nights: half2, highlight: 'Secluded seaside fort and quiet beaches', starRating: 4, pricePerNightINR: 4100 }
        ],
        nightsPerBaseText: `Wayanad (${half1}N) · Bekal (${half2}N)`,
        totalTravelHours: 4,
        totalTravelHoursText: 'approx. 4 hours drive between Wayanad & Bekal',
        estimatedCostINR: Math.round(budget * 0.97 / 100) * 100,
        isRecommended: isOffbeat,
        highlights: ['Offbeat North Kerala', 'Coffee Estates', 'Secluded Fort']
      }
    ];
  }

  // Generic fallback for any other region (e.g. Himachal, Uttarakhand, North-East)
  const half1 = Math.floor(nights / 2);
  const half2 = nights - half1;
  return [
    {
      id: `${region.toLowerCase()}-route-1`,
      title: `${region} Highlights Route`,
      tagline: `Balanced multi-base itinerary exploring the best of ${region}`,
      basesCount: 2,
      bases: [
        { name: `${region} Base 1`, area: 'Scenic Valley', nights: half1, highlight: 'Mountain viewpoints and cultural center', starRating: 4, pricePerNightINR: 3800 },
        { name: `${region} Base 2`, area: 'Highland Retreat', nights: half2, highlight: 'Quiet nature trails and scenic viewpoints', starRating: 4, pricePerNightINR: 3800 }
      ],
      nightsPerBaseText: `Base 1 (${half1}N) · Base 2 (${half2}N)`,
      totalTravelHours: 4,
      totalTravelHoursText: 'approx. 4 hours total travel between bases',
      estimatedCostINR: Math.round(budget * 0.95 / 100) * 100,
      isRecommended: true,
      highlights: ['Scenic Nature', 'Multi-base experience', 'Authentic Food']
    }
  ];
}

export function buildMultiBasePlanFromRoute(
  ctx: {
    destination: string | null;
    destinationType?: 'city' | 'region' | null;
    origin: string | null;
    dates: string | null;
    durationDays: number | null;
    totalTravellers: number | null;
    adultsCount: number | null;
    childrenCount: number | null;
    childrenAges: number[];
    seniorsCount: number | null;
    infantsCount?: number | null;
    budgetTotalINR: number | null;
    freeTextPreferences?: string | null;
    notes?: string[];
    [key: string]: any;
  },
  route: RegionRouteOption
): TripPlan {
  const durationDays = ctx.durationDays || 7;
  const totalTravellers = ctx.totalTravellers || 2;
  const adults = ctx.adultsCount || 2;
  const children = ctx.childrenCount || 0;
  const childAges = ctx.childrenAges || [];
  const seniors = ctx.seniorsCount || 0;
  const originClean = (ctx.origin || 'Bengaluru (BLR)').replace(/\s*\(.*\)/, '').trim();
  const originCode = (ctx.origin || 'BLR').match(/\((.*?)\)/)?.[1] || 'BLR';
  const destClean = (ctx.destination || 'Rajasthan').replace(/,\s*India$/i, '').trim();

  // Create stays
  const stays = route.bases.map((base, idx) => {
    const pricePerNight = base.pricePerNightINR || 4000;
    const hotelItem: HotelItem = {
      id: `stay-${base.name.toLowerCase()}-${idx}`,
      name: `${base.starRating || 4}★ hotel in ${base.area || base.name}, ~₹${pricePerNight.toLocaleString('en-IN')}/night`,
      area: base.area || base.name,
      city: base.name,
      starRating: base.starRating || 4,
      reviewScore: 4.6,
      reviewsCount: 140,
      roomType: 'Deluxe Room with Breakfast',
      bedConfiguration: totalTravellers > 2 ? '1 King Bed + 1 Extra Bed' : '1 King Bed',
      maxCapacity: Math.max(4, totalTravellers),
      pricePerNightINR: pricePerNight,
      totalPriceINR: pricePerNight * base.nights,
      pricePerNightUSD: Math.round(pricePerNight / 84),
      totalPriceUSD: Math.round((pricePerNight * base.nights) / 84),
      amenities: ['Free High-Speed Wi-Fi', 'Complimentary Breakfast', 'Air Conditioning', 'Scenic View'],
      breakfastIncluded: true,
      freeCancellation: true,
      distanceFromCenter: 'Central',
      imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
      source: 'estimate',
      sourceLabel: 'AI estimate'
    };
    return {
      baseName: base.name,
      nights: base.nights,
      hotel: hotelItem
    };
  });

  const primaryHotel = stays[0].hotel;

  // Inter-city travel item
  const interCityTravel: TransferItem = {
    id: `ic-transfer-${route.id}`,
    title: `Private AC Cab (${route.bases.map((b) => b.name).join(' ↔ ')})`,
    vehicleType: totalTravellers > 3 ? 'AC Innova Crysta MPV' : 'AC Sedan',
    capacityPassengers: Math.max(4, totalTravellers),
    luggageCapacity: Math.max(3, totalTravellers),
    priceINR: 6500,
    priceUSD: Math.round(6500 / 84),
    description: `Chauffeured private inter-base transport: ${route.totalTravelHoursText}. Includes fuel, tolls, and driver allowance.`,
    duration: `${route.totalTravelHours} hours`,
    pickupLocation: `${stays[0].baseName} Hotel`,
    dropLocation: `${stays[stays.length - 1].baseName} Hotel`,
    source: 'estimate',
    sourceLabel: 'AI estimate'
  };

  // Flight / Arrival transfer
  const destAirportCode = route.bases[0].name.toLowerCase().includes('udaipur') ? 'UDR'
    : route.bases[0].name.toLowerCase().includes('jaipur') ? 'JAI'
    : route.bases[0].name.toLowerCase().includes('jodhpur') ? 'JDH'
    : 'JAI';

  const flightPricePerPerson = 4200;
  const flight: FlightItem = {
    id: `fl-reg-${route.id}`,
    airline: `Morning non-stop flight ${originCode}→${destAirportCode}`,
    airlineCode: 'AI-EST',
    flightNumber: '',
    originCode,
    originCity: originClean,
    destinationCode: destAirportCode,
    destinationCity: route.bases[0].name,
    departureTime: 'Morning',
    arrivalTime: 'Morning',
    duration: 'approx. 2h 00m',
    stops: 'Non-stop',
    pricePerPersonINR: flightPricePerPerson,
    totalPriceINR: flightPricePerPerson * totalTravellers,
    pricePerPersonUSD: Math.round(flightPricePerPerson / 84),
    totalPriceUSD: Math.round((flightPricePerPerson * totalTravellers) / 84),
    baggage: '15kg check-in + 7kg cabin',
    cabinClass: 'Economy',
    refundable: true,
    seatAvailability: Math.max(4, totalTravellers),
    source: 'estimate',
    sourceLabel: 'AI estimate'
  };

  const transfer: TransferItem = {
    id: `tr-reg-arrival`,
    title: `Airport Pickup (${destAirportCode} → ${stays[0].baseName} Hotel)`,
    vehicleType: totalTravellers > 3 ? 'AC MPV' : 'AC Sedan',
    capacityPassengers: Math.max(4, totalTravellers),
    luggageCapacity: Math.max(3, totalTravellers),
    priceINR: 1500,
    priceUSD: 18,
    description: `Airport pickup to your first base in ${stays[0].baseName}`,
    duration: 'approx. 45 mins',
    pickupLocation: `${destAirportCode} Airport`,
    dropLocation: `${stays[0].baseName} Hotel`,
    source: 'estimate',
    sourceLabel: 'AI estimate'
  };

  // Itinerary distributed across bases
  const itinerary: ActivityDayItem[] = [];
  let dayCounter = 1;
  for (let bIdx = 0; bIdx < route.bases.length; bIdx++) {
    const base = route.bases[bIdx];
    for (let n = 0; n < base.nights; n++) {
      const isTransferDay = n === 0 && bIdx > 0;
      itinerary.push({
        day: dayCounter,
        dateStr: `Day ${dayCounter}`,
        title: isTransferDay ? `Travel to ${base.name} · Check-in & Evening Walk` : `Explore ${base.name} · ${base.highlight}`,
        theme: base.highlight || 'Cultural Exploration',
        morning: isTransferDay ? `Scenic highway drive to ${base.name} with roadside cafe stop.` : `Morning guided heritage walk around ${base.area || base.name}.`,
        afternoon: `Local sightseeing and leisurely cultural lunch in ${base.name}.`,
        evening: `Sunset viewpoint and authentic local dinner in ${base.name}.`,
        stayArea: base.area || base.name,
        estimatedCostINR: 1200,
        estimatedCostUSD: Math.round(1200 / 84),
        localDining: [`Popular local dining in ${base.name}`],
        transitTip: `Local transfers in ${base.name}`
      });
      dayCounter++;
    }
  }
  if (dayCounter <= durationDays) {
    itinerary.push({
      day: dayCounter,
      dateStr: `Day ${dayCounter}`,
      title: `Farewell ${destClean} · Departure`,
      theme: 'Departure',
      morning: 'Breakfast at hotel and souvenir shopping in local markets.',
      afternoon: `Transfer to airport for return journey to ${originClean}.`,
      evening: 'Flight home.',
      stayArea: stays[stays.length - 1].baseName,
      estimatedCostINR: 600,
      estimatedCostUSD: Math.round(600 / 84),
      localDining: ['Airport / transit dining'],
      transitTip: 'Return airport transfer'
    });
  }

  const targetBudget = ctx.budgetTotalINR || 90000;
  const hotelTotal = stays.reduce((sum, s) => sum + s.hotel.totalPriceINR, 0);
  const flightsCost = flight.totalPriceINR;
  const transportCost = transfer.priceINR + interCityTravel.priceINR;
  const foodCost = Math.round(1500 * durationDays);
  const activitiesCost = Math.round(1000 * durationDays);
  const subtotal = hotelTotal + flightsCost + transportCost + foodCost + activitiesCost;
  const bufferCost = Math.round(subtotal * 0.25);
  const grandTotal = subtotal + bufferCost;

  return {
    id: `plan-reg-${Date.now()}`,
    title: `${durationDays} days in ${destClean} · ${route.title}`,
    summary: `${durationDays}-day multi-base regional route across ${route.bases.map((b) => b.name).join(', ')}.`,
    destination: destClean,
    destinationType: 'region',
    origin: ctx.origin || 'Bengaluru (BLR)',
    dates: ctx.dates || '14–20 Nov 2026',
    durationDays,
    travellers: {
      total: totalTravellers,
      adults,
      children,
      childAges,
      seniors
    },
    scope: 'domestic',
    hotelZone: stays[0].baseName,
    flight,
    availableFlights: [flight],
    hotel: primaryHotel,
    availableHotels: stays.map((s) => s.hotel),
    stays,
    interCityTravel,
    transfer,
    availableTransfers: [transfer],
    activities: [],
    availableActivities: [],
    itinerary,
    diningSuggestions: [],
    mapWaypoints: [],
    recommendations: [`Enjoy your ${route.title} route across ${destClean}.`],
    verificationChecks: [],
    createdAt: new Date().toISOString(),
    isAiEstimatedDestination: true,
    monthWorthiness: evaluateMonthWorthiness(destClean, ctx.dates || '14–20 Nov 2026', `${ctx.notes?.join(' ')} ${ctx.freeTextPreferences || ''}`, true),
    isOffbeatLeaning: isOffbeatRequested(ctx.freeTextPreferences || '', ctx.notes),
    transitModeComparison: getHowToGetThereModes(destClean, ctx.origin || 'Bengaluru (BLR)', totalTravellers, 'Flight'),
    budget: {
      targetINR: targetBudget,
      flightsCostINR: flightsCost,
      hotelCostINR: hotelTotal,
      transportCostINR: transportCost,
      foodCostINR: foodCost,
      activitiesCostINR: activitiesCost,
      diningEstimateINR: foodCost,
      otherCostsINR: 0,
      grandTotalINR: grandTotal,
      remainingBudgetINR: Math.max(0, targetBudget - grandTotal),
      overBudgetAmountINR: Math.max(0, grandTotal - targetBudget),
      isOverBudget: grandTotal > targetBudget
    }
  };
}

