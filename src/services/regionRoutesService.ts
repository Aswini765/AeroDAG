// src/services/regionRoutesService.ts
import { TripPlan, HotelItem, TransferItem, ActivityDayItem, FlightItem } from '../types/travelBooking';
import { evaluateMonthWorthiness, isOffbeatRequested, getHowToGetThereModes } from './seasonAndFitHelper';
import { computeFullTripCost } from './fullTripCostHelper';

export interface RegionRouteBase {
  name: string;
  area: string;
  nights: number;
  highlight: string;
  nearestAirportCode?: string | null;
  nearestAirportText?: string;
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

/**
 * Returns nearest airport code, display name, and road drive time for places.
 * If unknown, explicitly returns "Nearest airport: unknown — check before booking" (no hard-coded JAI fallback).
 */
export function getNearestAirportForPlace(placeName: string): {
  code: string | null;
  name: string;
  driveTimeText: string;
  driveHours: number;
} {
  const p = (placeName || '').toLowerCase().trim();
  if (p.includes('munnar')) {
    return { code: 'COK', name: 'Cochin (COK)', driveTimeText: 'COK + ~3.5h drive to Munnar', driveHours: 3.5 };
  }
  if (p.includes('alleppey') || p.includes('alappuzha') || p.includes('kumarakom')) {
    return { code: 'COK', name: 'Cochin (COK)', driveTimeText: 'COK + ~1.5h drive to Alleppey', driveHours: 1.5 };
  }
  if (p.includes('kochi') || p.includes('cochin')) {
    return { code: 'COK', name: 'Cochin (COK)', driveTimeText: 'COK (~45m drive)', driveHours: 0.75 };
  }
  if (p.includes('wayanad')) {
    return { code: 'CCJ', name: 'Calicut (CCJ)', driveTimeText: 'CCJ + ~2.5h drive to Wayanad', driveHours: 2.5 };
  }
  if (p.includes('bekal')) {
    return { code: 'CNN', name: 'Kannur (CNN)', driveTimeText: 'CNN + ~1.5h drive to Bekal', driveHours: 1.5 };
  }
  if (p.includes('udaipur')) {
    return { code: 'UDR', name: 'Udaipur (UDR)', driveTimeText: 'UDR (~45m drive)', driveHours: 0.75 };
  }
  if (p.includes('kumbhalgarh')) {
    return { code: 'UDR', name: 'Udaipur (UDR)', driveTimeText: 'UDR + ~2h drive to Kumbhalgarh', driveHours: 2 };
  }
  if (p.includes('bundi')) {
    return { code: 'JAI', name: 'Jaipur (JAI)', driveTimeText: 'JAI + ~3.5h drive to Bundi', driveHours: 3.5 };
  }
  if (p.includes('jaisalmer')) {
    return { code: 'JSA', name: 'Jaisalmer (JSA)', driveTimeText: 'JSA (~30m drive)', driveHours: 0.5 };
  }
  if (p.includes('jodhpur')) {
    return { code: 'JDH', name: 'Jodhpur (JDH)', driveTimeText: 'JDH (~30m drive)', driveHours: 0.5 };
  }
  if (p.includes('jaipur')) {
    return { code: 'JAI', name: 'Jaipur (JAI)', driveTimeText: 'JAI (~30m drive)', driveHours: 0.5 };
  }
  if (p.includes('ranthambore')) {
    return { code: 'JAI', name: 'Jaipur (JAI)', driveTimeText: 'JAI + ~3h drive to Ranthambore', driveHours: 3 };
  }
  if (p.includes('ooty') || p.includes('udhagamandalam')) {
    return { code: 'CJB', name: 'Coimbatore (CJB)', driveTimeText: 'CJB + ~3h drive', driveHours: 3 };
  }
  if (p.includes('coorg') || p.includes('madikeri')) {
    return { code: 'CNN', name: 'Kannur (CNN)', driveTimeText: 'CNN + ~2.5h drive', driveHours: 2.5 };
  }
  if (p.includes('goa')) {
    return { code: 'GOI', name: 'Goa (GOI)', driveTimeText: 'GOI (~45m drive)', driveHours: 0.75 };
  }
  if (p.includes('mysuru') || p.includes('mysore')) {
    return { code: 'MYQ', name: 'Mysuru (MYQ)', driveTimeText: 'MYQ (~20m drive)', driveHours: 0.3 };
  }
  return {
    code: null,
    name: 'Nearest airport: unknown — check before booking',
    driveTimeText: 'Nearest airport: unknown — check before booking',
    driveHours: 0
  };
}

export function getRegionRoutes(
  region: string,
  totalNights: number,
  preferences?: string | null,
  targetBudgetINR?: number | null,
  travellersCount: number = 2,
  origin: string = 'Bengaluru (BLR)',
  dates: string = '14–20 Nov 2026'
): RegionRouteOption[] {
  const regLower = (region || '').toLowerCase();
  const prefLower = (preferences || '').toLowerCase();
  const isOffbeat = /offbeat|not touristy|less crowded|quiet|nature/i.test(prefLower);
  const nights = Math.max(2, totalNights > 0 ? totalNights : 6);
  const budget = targetBudgetINR && targetBudgetINR > 0 ? targetBudgetINR : 90000;

  let rawRoutes: Omit<RegionRouteOption, 'estimatedCostINR'>[] = [];

  if (regLower.includes('rajasthan')) {
    const n1 = Math.max(2, Math.floor(nights * 0.4));
    const n2 = Math.max(2, Math.floor(nights * 0.3));
    const n3 = Math.max(1, nights - n1 - n2);

    const half1 = Math.floor(nights / 2);
    const half2 = nights - half1;

    rawRoutes = [
      {
        id: 'raj-offbeat',
        title: 'Udaipur + Kumbhalgarh + Bundi',
        tagline: 'Offbeat hill forts, quiet lake havelis & artisan stepwell towns',
        basesCount: 3,
        bases: [
          {
            name: 'Udaipur',
            area: 'Lake Pichola Ghats',
            nights: n1,
            highlight: 'Peaceful lakefront havelis, sunset boat ride & City Palace',
            starRating: 4,
            pricePerNightINR: 4200,
            nearestAirportCode: 'UDR',
            nearestAirportText: 'UDR (~45m drive)'
          },
          {
            name: 'Kumbhalgarh',
            area: 'Fort Foothills',
            nights: n2,
            highlight: 'Massive UNESCO hill fort & quiet jungle stay',
            starRating: 4,
            pricePerNightINR: 3800,
            nearestAirportCode: 'UDR',
            nearestAirportText: 'UDR + ~2h drive'
          },
          {
            name: 'Bundi',
            area: 'Taragarh Old Town',
            nights: n3,
            highlight: 'Ancient stepwells, blue alleys & authentic palace murals',
            starRating: 3,
            pricePerNightINR: 3200,
            nearestAirportCode: 'JAI',
            nearestAirportText: 'JAI + ~3.5h drive'
          }
        ],
        nightsPerBaseText: `Udaipur (${n1}N) · Kumbhalgarh (${n2}N) · Bundi (${n3}N)`,
        totalTravelHours: 7,
        totalTravelHoursText: 'approx. 7 hours total travel between bases by cab',
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
          {
            name: 'Jaisalmer',
            area: 'Sam Dunes & Fort',
            nights: half1,
            highlight: 'Desert tent camps, camel sunset & living sandstone fort',
            starRating: 4,
            pricePerNightINR: 4000,
            nearestAirportCode: 'JSA',
            nearestAirportText: 'JSA (~30m drive)'
          },
          {
            name: 'Jodhpur',
            area: 'Old Blue City',
            nights: half2,
            highlight: 'Mehrangarh fortress, spice markets & blue rooftop dining',
            starRating: 4,
            pricePerNightINR: 3900,
            nearestAirportCode: 'JDH',
            nearestAirportText: 'JDH (~30m drive)'
          }
        ],
        nightsPerBaseText: `Jaisalmer (${half1}N) · Jodhpur (${half2}N)`,
        totalTravelHours: 5,
        totalTravelHoursText: 'approx. 5 hours total travel between bases',
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
          {
            name: 'Jaipur',
            area: 'Bani Park',
            nights: half1,
            highlight: 'Amber Fort, Hawa Mahal & traditional bazaar walks',
            starRating: 4,
            pricePerNightINR: 4400,
            nearestAirportCode: 'JAI',
            nearestAirportText: 'JAI (~30m drive)'
          },
          {
            name: 'Ranthambore',
            area: 'Jungle Reserve Zone',
            nights: half2,
            highlight: 'Morning & afternoon open gypsy tiger safaris',
            starRating: 4,
            pricePerNightINR: 4600,
            nearestAirportCode: 'JAI',
            nearestAirportText: 'JAI + ~3h drive'
          }
        ],
        nightsPerBaseText: `Jaipur (${half1}N) · Ranthambore (${half2}N)`,
        totalTravelHours: 4,
        totalTravelHoursText: 'approx. 4 hours total travel between bases',
        highlights: ['Royal Palaces', 'Tiger Safari', 'Historic Bazaars']
      }
    ];
  } else if (regLower.includes('kerala')) {
    const half1 = Math.floor(nights / 2);
    const half2 = nights - half1;
    rawRoutes = [
      {
        id: 'ker-nature-route',
        title: 'Munnar + Alleppey',
        tagline: 'Misty tea hills and peaceful backwaters houseboat cruise',
        basesCount: 2,
        bases: [
          {
            name: 'Munnar',
            area: 'Old Munnar / Pallivasal',
            nights: half1,
            highlight: 'Tea plantations, waterfalls & mist valleys',
            starRating: 4,
            pricePerNightINR: 3800,
            nearestAirportCode: 'COK',
            nearestAirportText: 'COK + ~3.5h drive'
          },
          {
            name: 'Alleppey',
            area: 'Punnamada Backwaters',
            nights: half2,
            highlight: 'Backwater boat cruise & village canals',
            starRating: 4,
            pricePerNightINR: 4500,
            nearestAirportCode: 'COK',
            nearestAirportText: 'COK + ~1.5h drive'
          }
        ],
        nightsPerBaseText: `Munnar (${half1}N) · Alleppey (${half2}N)`,
        totalTravelHours: 4.5,
        totalTravelHoursText: 'approx. 4.5 hours scenic drive between Munnar & Alleppey',
        isRecommended: true,
        highlights: ['Tea Valleys', 'Backwaters', 'Ayurvedic Food']
      },
      {
        id: 'ker-offbeat-route',
        title: 'Wayanad + Bekal',
        tagline: 'Quiet rainforest peaks, coffee estates and secluded coastal fort',
        basesCount: 2,
        bases: [
          {
            name: 'Wayanad',
            area: 'Vythiri',
            nights: half1,
            highlight: 'Rainforest trails, coffee estates & Edakkal caves',
            starRating: 4,
            pricePerNightINR: 3600,
            nearestAirportCode: 'CCJ',
            nearestAirportText: 'CCJ + ~2.5h drive'
          },
          {
            name: 'Bekal',
            area: 'Kappil Beach',
            nights: half2,
            highlight: 'Secluded seaside fort and quiet beaches',
            starRating: 4,
            pricePerNightINR: 4100,
            nearestAirportCode: 'CNN',
            nearestAirportText: 'CNN + ~1.5h drive'
          }
        ],
        nightsPerBaseText: `Wayanad (${half1}N) · Bekal (${half2}N)`,
        totalTravelHours: 4,
        totalTravelHoursText: 'approx. 4 hours drive between Wayanad & Bekal',
        isRecommended: isOffbeat,
        highlights: ['Offbeat North Kerala', 'Coffee Estates', 'Secluded Fort']
      }
    ];
  } else {
    // Generic fallback for other regions (Himachal, Uttarakhand, North-East)
    const half1 = Math.floor(nights / 2);
    const half2 = nights - half1;
    rawRoutes = [
      {
        id: `${region.toLowerCase()}-route-1`,
        title: `${region} Highlights Route`,
        tagline: `Balanced multi-base itinerary exploring the best of ${region}`,
        basesCount: 2,
        bases: [
          {
            name: `${region} Base 1`,
            area: 'Scenic Valley',
            nights: half1,
            highlight: 'Mountain viewpoints and cultural center',
            starRating: 4,
            pricePerNightINR: 3800,
            nearestAirportCode: null,
            nearestAirportText: 'Nearest airport: unknown — check before booking'
          },
          {
            name: `${region} Base 2`,
            area: 'Highland Retreat',
            nights: half2,
            highlight: 'Quiet nature trails and scenic viewpoints',
            starRating: 4,
            pricePerNightINR: 3800,
            nearestAirportCode: null,
            nearestAirportText: 'Nearest airport: unknown — check before booking'
          }
        ],
        nightsPerBaseText: `Base 1 (${half1}N) · Base 2 (${half2}N)`,
        totalTravelHours: 4,
        totalTravelHoursText: 'approx. 4 hours total travel between bases',
        isRecommended: true,
        highlights: ['Scenic Nature', 'Multi-base experience', 'Authentic Food']
      }
    ];
  }

  // Authoritative Cost Calculation (Prompt 1 requirement):
  // Build each route's plan and run it through computeFullTripCost to get the card total.
  // Never compute budget * 0.9x or invent costs.
  return rawRoutes.map((raw) => {
    const routeObj: RegionRouteOption = {
      ...raw,
      estimatedCostINR: 0
    };
    const tempPlan = buildMultiBasePlanFromRoute(
      {
        destination: region,
        origin,
        dates,
        durationDays: nights + 1,
        totalTravellers: travellersCount,
        adultsCount: travellersCount,
        childrenCount: 0,
        childrenAges: [],
        seniorsCount: 0,
        budgetTotalINR: budget,
        freeTextPreferences: preferences
      },
      routeObj
    );
    const costCalc = computeFullTripCost(tempPlan, {
    accommodationPreference: 'Connecting Family Suite',
    dietaryOrNotes: '',
      destination: region,
      origin,
      targetDates: dates,
      durationDays: nights + 1,
      partySize: travellersCount,
      adultsCount: travellersCount,
      childrenCount: 0,
      childrenAges: [],
      budgetTotalINR: budget,
      budgetTotalUSD: Math.round(budget / 84),
      budgetTier: 'Comfortable',
      travelStyle: 'Balanced',
      priority: 'Family Friendly',
      scope: 'domestic'
    });

    routeObj.estimatedCostINR = costCalc.totalWithBufferINR;
    return routeObj;
  });
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
  const isKerala = destClean.toLowerCase().includes('kerala') || route.id.startsWith('ker-');

  // Label source: Prompt 3 rule: Kerala uses hand-built guide (labels "Sample" / "Estimate", NOT "AI estimate")
  const staySource: 'sample' | 'estimate' = isKerala ? 'sample' : 'estimate';
  const staySourceLabel = isKerala ? 'Sample' : 'AI estimate';

  // Create stays with generic descriptions (Prompt 2 rule: no invented hotel brands like "Heritage Haveli")
  const stays = route.bases.map((base, idx) => {
    const pricePerNight = base.pricePerNightINR || 4000;
    const hotelItem: HotelItem = {
      id: `stay-${base.name.toLowerCase()}-${idx}`,
      name: `${base.starRating || 4}★ hotel in ${base.area || base.name} · ~₹${pricePerNight.toLocaleString('en-IN')}/night`,
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
      source: staySource,
      sourceLabel: staySourceLabel
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
    source: isKerala ? 'estimate' : 'estimate',
    sourceLabel: isKerala ? 'Estimate' : 'AI estimate'
  };

  // Nearest arrival airport
  const firstBaseAirport = getNearestAirportForPlace(route.bases[0].name);
  const destAirportCode = firstBaseAirport.code || 'COK';

  // Prompt 2 & 3: Generic flight description without invented flight numbers (no "6E-452")
  // Shows drive time if place has no direct airport
  const flightPricePerPerson = 4200;
  const flightDriveNote = firstBaseAirport.driveHours > 1 ? ` + ~${firstBaseAirport.driveHours}h road drive` : '';
  const totalTravelDuration = firstBaseAirport.driveHours > 0
    ? `approx. ${Math.round(2 + firstBaseAirport.driveHours)}h total (flight + drive)`
    : 'approx. 2h 00m non-stop';

  const flight: FlightItem = {
    id: `fl-reg-${route.id}`,
    airline: `Morning non-stop flight ${originCode}→${destAirportCode}${flightDriveNote} · ~₹${flightPricePerPerson.toLocaleString('en-IN')}`,
    airlineCode: 'AI-EST',
    flightNumber: '',
    originCode,
    originCity: originClean,
    destinationCode: destAirportCode,
    destinationCity: route.bases[0].name,
    departureTime: 'Morning',
    arrivalTime: 'Morning',
    duration: totalTravelDuration,
    stops: 'Non-stop',
    pricePerPersonINR: flightPricePerPerson,
    totalPriceINR: flightPricePerPerson * totalTravellers,
    pricePerPersonUSD: Math.round(flightPricePerPerson / 84),
    totalPriceUSD: Math.round((flightPricePerPerson * totalTravellers) / 84),
    baggage: '15kg check-in + 7kg cabin',
    cabinClass: 'Economy',
    refundable: true,
    seatAvailability: Math.max(4, totalTravellers),
    source: isKerala ? 'sample' : 'estimate',
    sourceLabel: isKerala ? 'Sample' : 'AI estimate'
  };

  const transfer: TransferItem = {
    id: `tr-reg-arrival`,
    title: `Airport Pickup (${destAirportCode} → ${stays[0].baseName} Hotel)`,
    vehicleType: totalTravellers > 3 ? 'AC MPV' : 'AC Sedan',
    capacityPassengers: Math.max(4, totalTravellers),
    luggageCapacity: Math.max(3, totalTravellers),
    priceINR: 1500,
    priceUSD: 18,
    description: `Airport pickup from ${destAirportCode} to your first base in ${stays[0].baseName} (${firstBaseAirport.driveTimeText})`,
    duration: `${firstBaseAirport.driveHours || 1} hours`,
    pickupLocation: `${destAirportCode} Airport`,
    dropLocation: `${stays[0].baseName} Hotel`,
    source: isKerala ? 'sample' : 'estimate',
    sourceLabel: isKerala ? 'Sample' : 'AI estimate'
  };

  // Hand-built distinct sights for Kerala itineraries (Prompt 3 rule: real day-by-day sights, NO repeated identical days)
  const KERALA_BASE_SIGHTS: Record<string, { morning: string; afternoon: string; evening: string; theme: string }[]> = {
    munnar: [
      {
        theme: 'Tea Plantations & Waterfalls',
        morning: 'Morning arrival transfer via Cheeyappara & Valara waterfalls into the misty hills of Munnar.',
        afternoon: 'Check-in to tea valley homestay and fresh cardamom tea tasting amidst private plantation garden.',
        evening: 'Leisurely sunset walk along Pallivasal tea terrace viewpoints and local Kerala dinner.'
      },
      {
        theme: 'Eravikulam & High Peaks',
        morning: 'Guided morning wildlife excursion inside Eravikulam National Park to sight the endangered Nilgiri Tahr.',
        afternoon: 'Tour of Tata KDHP Tea Museum with tea-processing demonstration and Mattupetty Dam speedboating.',
        evening: 'Echo Point & Kundala Lake pedal boat ride followed by warm Malabar parotta and vegetable stew.'
      },
      {
        theme: 'Top Station Panoramas',
        morning: 'Sunrise drive to Top Station for panoramic mountain pass views over the Western Ghats clouds.',
        afternoon: 'Visit to Chinnakanal waterfalls and traditional spice garden walk with medicinal herb guide.',
        evening: 'Quiet bonfire evening at the resort with stargazing and authentic Appam and coconut milk.'
      }
    ],
    alleppey: [
      {
        theme: 'Backwaters & Houseboat Check-in',
        morning: 'Scenic downhill drive from Munnar hills to Alleppey jetty via rubber estates and canal towns.',
        afternoon: 'Board traditional kettuvallam backwater boat with private crew, cruising through Punnamada Lake.',
        evening: 'Sunset over Vembanad Lake canals, village paddy field views, and traditional Karimeen feast.'
      },
      {
        theme: 'Village Shikhara & Coir Crafts',
        morning: 'Narrow canoe / shikhara boat ride through Meenappally village backwaters unreachable by big boats.',
        afternoon: 'Hands-on coir making workshop with local artisans and fresh tender coconut water refreshment.',
        evening: 'Stroll along historic Alleppey Beach and pier with sunset lighthouse photography.'
      },
      {
        theme: 'Canal Hammocks & Ayurvedic Relaxation',
        morning: 'Serene morning birdwatching along Kuttanad backwater paddy fields below sea level.',
        afternoon: 'Leisurely backwater paddleboat tour and visit to historic Marari village weavers.',
        evening: 'Ayurvedic herbal massage and authentic Sadya feast with red rice and avial.'
      }
    ]
  };

  // Itinerary distributed across bases
  const itinerary: ActivityDayItem[] = [];
  let dayCounter = 1;

  for (let bIdx = 0; bIdx < route.bases.length; bIdx++) {
    const base = route.bases[bIdx];
    const baseKey = base.name.toLowerCase();
    const curatedSights = isKerala && KERALA_BASE_SIGHTS[baseKey] ? KERALA_BASE_SIGHTS[baseKey] : null;

    for (let n = 0; n < base.nights; n++) {
      const isTransferDay = n === 0 && bIdx > 0;
      let dayTitle = isTransferDay ? `Travel to ${base.name} · Check-in & Evening Walk` : `Explore ${base.name} · ${base.highlight}`;
      let dayTheme = base.highlight || 'Cultural Exploration';
      let morning = isTransferDay ? `Scenic highway drive to ${base.name} with roadside cafe stop.` : `Morning guided heritage walk around ${base.area || base.name}.`;
      let afternoon = `Local sightseeing and leisurely cultural lunch in ${base.name}.`;
      let evening = `Sunset viewpoint and authentic local dinner in ${base.name}.`;

      if (curatedSights) {
        const sightObj = curatedSights[n % curatedSights.length];
        dayTitle = isTransferDay
          ? `Scenic Drive to ${base.name} · ${sightObj.theme}`
          : `Day in ${base.name} · ${sightObj.theme}`;
        dayTheme = sightObj.theme;
        morning = isTransferDay ? `Inter-city transfer from previous base to ${base.name}.` : sightObj.morning;
        afternoon = sightObj.afternoon;
        evening = sightObj.evening;
      }

      itinerary.push({
        day: dayCounter,
        dateStr: `Day ${dayCounter}`,
        title: dayTitle,
        theme: dayTheme,
        morning,
        afternoon,
        evening,
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
      afternoon: `Transfer to ${destAirportCode} airport for return journey to ${originClean}.`,
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

  const preliminaryPlan: TripPlan = {
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
    isAiEstimatedDestination: !isKerala,
    monthWorthiness: evaluateMonthWorthiness(destClean, ctx.dates || '14–20 Nov 2026', `${ctx.notes?.join(' ')} ${ctx.freeTextPreferences || ''}`, !isKerala),
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
      grandTotalINR: 0,
      remainingBudgetINR: 0,
      overBudgetAmountINR: 0,
      isOverBudget: false
    }
  };

  // Authoritative Cost Calculation (Prompt 1 rule: computeFullTripCost is the ONLY cost function)
  const fullCost = computeFullTripCost(preliminaryPlan, {
    accommodationPreference: 'Connecting Family Suite',
    dietaryOrNotes: '',
    destination: destClean,
    origin: ctx.origin || 'Bengaluru (BLR)',
    targetDates: ctx.dates || '14–20 Nov 2026',
    durationDays,
    partySize: totalTravellers,
    adultsCount: adults,
    childrenCount: children,
    childrenAges: childAges,
    budgetTotalINR: targetBudget,
    budgetTotalUSD: Math.round(targetBudget / 84),
    budgetTier: 'Comfortable',
    travelStyle: 'Balanced',
    priority: 'Family Friendly',
    scope: 'domestic'
  });

  preliminaryPlan.budget.grandTotalINR = fullCost.totalWithBufferINR;
  preliminaryPlan.budget.remainingBudgetINR = Math.max(0, targetBudget - fullCost.totalWithBufferINR);
  preliminaryPlan.budget.overBudgetAmountINR = Math.max(0, fullCost.totalWithBufferINR - targetBudget);
  preliminaryPlan.budget.isOverBudget = fullCost.totalWithBufferINR > targetBudget;

  return preliminaryPlan;
}
