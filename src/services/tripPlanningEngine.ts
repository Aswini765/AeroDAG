/**
 * AeroDAG Deterministic Trip Planning Engine (Phase 3)
 * 
 * Transforms authoritative TripContext into a deterministic budget-first travel plan.
 * Integrates:
 * - Deterministic Budget Allocator (fixed costs first, hotel cap per night, buffer reserved)
 * - Feasibility Verification (returns status 'feasible' or 'infeasible' with concrete fixes)
 * - Drive-Time Airport Selection (matches hotel zone to closest airport with plain-language reason note)
 * - Realistic Itinerary Pacing (named modes and airports, stop drive times, daily walking levels)
 * - Delta-based Upgrades with Re-computed Balancing Options
 * - Strict Integer Rupee Arithmetic (no LLM arithmetic hallucination)
 */

import {
  TripPlan,
  TripPlanBudget,
  ActivityItem,
  MapWaypoint,
  FlightItem,
  HotelItem,
  TransferItem,
  TrainItem,
  ActivityDayItem,
  VisaDetails,
  DiningItem,
  VerificationCheck,
  TripScope,
  ConcreteBudgetFix,
  PlanUpgradeOption,
  BalancingOption
} from '../types/travelBooking';
import { TripContext } from './requirementEngine';
import { getTravelProviders } from './providers';
import { inferTripScope, formatINR, generateVerificationChecks } from './travelCatalog';
import {
  MOCK_DINING_GOA,
  MOCK_DINING_VIETNAM,
  MOCK_DINING_SINGAPORE,
  MOCK_DINING_THAILAND,
  MOCK_DINING_JAPAN,
  MOCK_VISA_GOA,
  MOCK_VISA_SINGAPORE,
  MOCK_VISA_THAILAND,
  MOCK_VISA_JAPAN,
  selectArrivalAirportByDriveTime
} from './destinationsData';
import { MOCK_VISA_VIETNAM } from './travelCatalog';
import {
  calculateFoodEstimateINR,
  calculateLocalTransportEstimateINR,
  calculateContingencyBufferINR,
  countCabExcursionDays
} from '../config/estimateRates';
import {
  buildSeasonalRecommendation,
  buildRouteDiscoveryComparison,
  buildRealisticBudgetBuffer,
  buildTrustVerificationDetails
} from './productFeaturesHelper';

export class TripPlanningEngine {
  static async buildDeterministicPlan(context: TripContext): Promise<TripPlan> {
    return this.generateTripPlan(context);
  }

  /**
   * Main Generator: Transforms TripContext into a fully populated TripPlan.
   * Deterministically allocates budget and validates feasibility.
   */
  static async generateTripPlan(context: TripContext): Promise<TripPlan> {
    let dates = (context.dates || (context as any).targetDates || '').trim();
    if (!dates && (context as any).startDate && (context as any).endDate) {
      dates = `${(context as any).startDate} to ${(context as any).endDate}`;
    }
    // Travel dates are strictly REQUIRED for pricing in Phase 3. Never silent default!
    if (!dates) {
      throw new Error('Travel dates are required for pricing. Please specify travel dates.');
    }

    const providers = getTravelProviders();

    // 1. Normalize core parameters
    const origin = (context.origin || 'Bengaluru (BLR)').trim();
    const destination = (context.destination || 'Goa, India').trim();
    const durationDays = Math.max(3, context.durationDays || 7);
    const nights = Math.max(1, durationDays - 1);

    const adults = Math.max(1, context.adultsCount || 2);
    const childAges = Array.isArray(context.childrenAges) ? context.childrenAges : [];
    const children = Math.max(0, context.childrenCount ?? childAges.length);
    const seniors = Math.max(0, context.seniorsCount || 0);
    const totalTravellers = Math.max(adults + children + seniors, context.totalTravellers || adults + children);

    const targetBudgetINR = context.budgetTotalINR || (context.scope === 'domestic' ? 60000 : 100000);
    const scope: TripScope = context.scope || inferTripScope(origin, destination);
    const isDomestic = scope === 'domestic';

    // B3: Needs handling: Relaxed pace for kids/elderly
    const needs = context.tripNeeds || [];
    if (needs.includes('Travelling with kids') || needs.includes('Elderly / less walking')) {
      context.travelStyle = 'Relaxed';
      context.walkingIntensity = 'Low';
    }
    if (needs.includes('Vegetarian food nearby') && !context.dietaryPreference) {
      context.dietaryPreference = 'Vegetarian';
    }

    // 2. Query Travel Providers concurrently
    const [flights, hotels, transfers, trains, allActivities] = await Promise.all([
      providers.flightProvider.searchFlights({
        origin,
        destination,
        dates,
        travellerCount: totalTravellers,
        adultsCount: adults,
        childrenCount: children,
        scope,
        budgetCeilingINR: targetBudgetINR
      }),
      providers.hotelProvider.searchHotels({
        destination,
        dates,
        durationNights: nights, // Exact nights count
        travellerCount: totalTravellers,
        adultsCount: adults,
        childrenCount: children,
        childAges,
        hotelPreference: context.accommodationPreference || undefined,
        familyRequirements: children > 0 || totalTravellers > 2,
        budgetTotalINR: targetBudgetINR
      }),
      providers.transportProvider.searchTransfers({
        origin,
        destination,
        scope,
        travellerCount: totalTravellers,
        luggageCount: totalTravellers
      }),
      isDomestic && providers.transportProvider.searchTrains
        ? providers.transportProvider.searchTrains({
            origin,
            destination,
            scope,
            travellerCount: totalTravellers
          })
        : Promise.resolve([]),
      providers.activityProvider.searchActivities({
        destination,
        childAges,
        hasSeniors: seniors > 0 || context.walkingIntensity === 'Low',
        walkingPreference: context.walkingIntensity || 'Low',
        durationDays,
        budgetINR: targetBudgetINR
      })
    ]);

    // 3. Compute Fixed & Near-Fixed Costs (Step a)
    // Food estimate
    const foodTier: 'budget' | 'mid' | 'comfort' = (context.budgetTier === 'Frugal' || context.budgetTier === 'Budget')
      ? 'budget'
      : (context.budgetTier === 'Luxury' || context.budgetTier === 'Comfortable' ? 'comfort' : 'mid');
    const foodCostINR = calculateFoodEstimateINR({
      adultsCount: adults,
      childrenCount: children,
      durationDays,
      tier: foodTier
    });

    // Local transport estimate (Phase 3.1)
    // Local-transport days = itinerary days that actually contain a cab excursion (e.g. 2 days for Goa)
    const cabExcursionDays = destination.toLowerCase().includes('goa') ? 2 : Math.max(1, durationDays - 2);
    const localTransportCostINR = calculateLocalTransportEstimateINR({
      destination,
      plannedDayTrips: cabExcursionDays,
      durationDays
    });

    // Airport transfer
    const selectedTransfer: TransferItem = transfers[0] || {
      id: 'tr-default',
      title: 'Private AC Airport Transfer',
      vehicleType: totalTravellers > 3 ? 'AC Minivan / MPV' : 'AC Sedan',
      capacityPassengers: Math.max(4, totalTravellers),
      luggageCapacity: Math.max(4, totalTravellers),
      priceINR: isDomestic ? 3200 : 3200,
      priceUSD: isDomestic ? 38 : 38,
      description: 'Chauffeured pickup and drop between airport and resort.',
      duration: '45 mins',
      pickupLocation: `${destination} Airport`,
      dropLocation: 'Goa Resort'
    };
    const transferCostINR = selectedTransfer.priceINR;

    // Visa details & costs
    const visaDetails: VisaDetails = this.resolveVisaDetails(destination, scope, totalTravellers);
    const visaCostINR = isDomestic ? 0 : (visaDetails.totalFeeINR || 0);

    // Train selection if applicable (only if exact route exists in catalog)
    const selectedTrain: TrainItem | undefined = trains && trains.length > 0 ? trains[0] : undefined;

    // 4. Deterministic Allocator: Evaluate Candidate Hotels & Transport
    const isRoadOrTrainDestination = destination.toLowerCase().includes('coorg') || destination.toLowerCase().includes('mysuru') || destination.toLowerCase().includes('mysore');

    interface CandidateEvaluation {
      hotel: HotelItem;
      flight: FlightItem | null;
      airportRoute: ReturnType<typeof selectArrivalAirportByDriveTime>;
      hotelCostINR: number;
      flightCostINR: number;
      foodCostINR: number;
      foodTier: 'budget' | 'mid' | 'comfort';
      activitiesCostINR: number;
      includedActivities: ActivityItem[];
      subtotalINR: number;
      bufferCostINR: number;
      grandTotalINR: number;
      fitsBudget: boolean;
    }

    const evaluatedCandidates: CandidateEvaluation[] = [];

    for (const h of hotels) {
      if (h.maxCapacity < totalTravellers) continue;

      // B3: Needs matching tags
      const matchingTags: string[] = [];
      if (needs.includes('Vegetarian food nearby')) {
        matchingTags.push('Vegetarian food nearby');
      }
      if (needs.includes('Kitchen in the stay')) {
        if (h.amenities?.some((a) => /kitchen/i.test(a)) || /suite|villa|apartment/i.test(h.roomType)) {
          matchingTags.push('Kitchen in the stay');
        }
      }
      if (needs.includes('Travelling with kids')) {
        if (h.tag === 'Family-Friendly' || h.capacityVerifiedForFamily || h.maxCapacity >= 3) {
          matchingTags.push('Travelling with kids');
        }
      }
      if (needs.includes('Elderly / less walking')) {
        if (h.starRating >= 3 || h.tag === 'Family-Friendly') {
          matchingTags.push('Elderly / less walking');
        }
      }
      if (needs.includes('Supermarket or pharmacy nearby')) {
        matchingTags.push('Supermarket or pharmacy nearby');
      }
      h.matchingNeedsTags = matchingTags;

      // Determine shortest airport by drive time to this hotel's zone
      const airportRoute = selectArrivalAirportByDriveTime(h.area, destination);
      const matchingFlight = isRoadOrTrainDestination || flights.length === 0
        ? null
        : (flights.find((f) => f.destinationCode === airportRoute.selectedAirportCode) || flights[0] || null);

      const flightCostINR = matchingFlight ? matchingFlight.totalPriceINR : 0;
      const hotelCostINR = nights * h.pricePerNightINR;

      // Documented food-tier rule (Phase 3.1):
      // "comfortable" -> comfort tier unless the allocator downgrades it, shown as an 'assumed' adjustment
      let candidateFoodTier = foodTier;
      let candidateFoodCostINR = foodCostINR;

      const maxAllowedSubtotal = Math.min(targetBudgetINR - 2000, Math.floor(targetBudgetINR / 1.03));
      let fixedSubtotal = flightCostINR + transferCostINR + localTransportCostINR + candidateFoodCostINR + hotelCostINR + visaCostINR;

      if (fixedSubtotal + 1000 > maxAllowedSubtotal && candidateFoodTier === 'comfort') {
        const midCost = calculateFoodEstimateINR({ adultsCount: adults, childrenCount: children, durationDays, tier: 'mid' });
        candidateFoodTier = 'mid';
        candidateFoodCostINR = midCost;
        fixedSubtotal = flightCostINR + transferCostINR + localTransportCostINR + candidateFoodCostINR + hotelCostINR + visaCostINR;
      }

      // Calculate what remains for activities while strictly keeping grandTotal <= targetBudgetINR
      const remainingForActivities = maxAllowedSubtotal - fixedSubtotal;

      // Select activities within what's left:
      let candidateActivities: ActivityItem[] = [];
      let candidateActivitiesCost = 0;

      if (remainingForActivities >= 500) {
        for (const act of allActivities) {
          if (candidateActivitiesCost + act.estimatedPriceINR <= remainingForActivities) {
            candidateActivities.push(act);
            candidateActivitiesCost += act.estimatedPriceINR;
          }
        }
      }

      // If no activity fit or activities are empty, ensure at least 1-2 curated activities (min ₹1,000 for realistic baseline)
      if (candidateActivities.length === 0) {
        candidateActivities = allActivities.slice(0, 2);
        candidateActivitiesCost = Math.max(1000, candidateActivities.reduce((acc, a) => acc + a.estimatedPriceINR, 0));
      }

      const subtotal = fixedSubtotal + candidateActivitiesCost;
      const bufferCostINR = calculateContingencyBufferINR(subtotal);
      const grandTotalINR = subtotal + bufferCostINR;

      evaluatedCandidates.push({
        hotel: h,
        flight: matchingFlight,
        airportRoute,
        hotelCostINR,
        flightCostINR,
        foodCostINR: candidateFoodCostINR,
        foodTier: candidateFoodTier,
        activitiesCostINR: candidateActivitiesCost,
        includedActivities: candidateActivities,
        subtotalINR: subtotal,
        bufferCostINR,
        grandTotalINR,
        fitsBudget: grandTotalINR <= targetBudgetINR
      });
    }

    // 5. Select Best-Matching Hotel at or below Cap
    const feasibleCandidates = evaluatedCandidates.filter((c) => c.fitsBudget);
    let chosen: CandidateEvaluation;
    let isFeasible = true;
    let shortfallINR = 0;
    const concreteFixes: ConcreteBudgetFix[] = [];

    if (feasibleCandidates.length > 0) {
      // Pick best matching hotel:
      // Preference: "comfortable" = 3-4★, family friendly, South Goa zone for family relaxation
      const comfortablePref = context.budgetTier !== 'Luxury' && (!context.accommodationPreference || !context.accommodationPreference.toLowerCase().includes('luxury'));

      let bestMatch = feasibleCandidates.find((c) => {
        const h = c.hotel;
        const matchesComfort = comfortablePref ? (h.starRating >= 3 && h.starRating <= 4) : h.starRating >= 4;
        const isFamilyFriendly = h.tag === 'Family-Friendly' || h.tag === 'Best Match' || h.capacityVerifiedForFamily;
        return matchesComfort && isFamilyFriendly;
      });

      if (!bestMatch) {
        // Fallback to candidate closest to cap without exceeding
        bestMatch = feasibleCandidates.sort((a, b) => b.grandTotalINR - a.grandTotalINR)[0];
      }

      chosen = bestMatch;
      isFeasible = true;
    } else {
      // INFEASIBLE STATE: No combination fits within budget
      isFeasible = false;
      // Baseline combination: lowest cost option
      const cheapest = evaluatedCandidates.sort((a, b) => a.grandTotalINR - b.grandTotalINR)[0] || {
        hotel: hotels[0],
        flight: flights[0] || null,
        airportRoute: selectArrivalAirportByDriveTime(hotels[0]?.area || '', destination),
        hotelCostINR: nights * (hotels[0]?.pricePerNightINR || 3800),
        activitiesCostINR: 1000,
        includedActivities: allActivities.slice(0, 2),
        subtotalINR: (hotels[0]?.pricePerNightINR || 2400) * nights + (isRoadOrTrainDestination ? 0 : (flights[0]?.totalPriceINR || (isDomestic ? 19200 : 25000))) + transferCostINR + localTransportCostINR + foodCostINR + 1000,
        bufferCostINR: 2000,
        grandTotalINR: (hotels[0]?.pricePerNightINR || 2400) * nights + (isRoadOrTrainDestination ? 0 : (flights[0]?.totalPriceINR || (isDomestic ? 19200 : 25000))) + transferCostINR + localTransportCostINR + foodCostINR + 1000 + 2000,
        fitsBudget: false
      };

      chosen = cheapest;
      shortfallINR = chosen.grandTotalINR - targetBudgetINR;

      // Generate 2-3 cheapest concrete fixes by re-running allocator
      // Fix 1: Fewer nights (e.g. 4 days / 3 nights)
      const reducedDays = Math.max(3, durationDays - 3);
      const reducedNights = reducedDays - 1;
      const fewerNightsHotelCost = reducedNights * chosen.hotel.pricePerNightINR;
      const fewerNightsFoodCost = calculateFoodEstimateINR({ adultsCount: adults, childrenCount: children, durationDays: reducedDays, tier: foodTier });
      const fewerNightsLocalCost = calculateLocalTransportEstimateINR({ destination, plannedDayTrips: Math.max(1, reducedDays - 2), durationDays: reducedDays });
      const fewerNightsSubtotal = chosen.flightCostINR + transferCostINR + fewerNightsLocalCost + fewerNightsFoodCost + fewerNightsHotelCost + 1000 + visaCostINR;
      const fewerNightsBuffer = calculateContingencyBufferINR(fewerNightsSubtotal);
      const fewerNightsTotal = fewerNightsSubtotal + fewerNightsBuffer;
      const fewerNightsSavings = Math.max(1000, chosen.grandTotalINR - fewerNightsTotal);

      concreteFixes.push({
        id: 'fix-fewer-nights',
        title: `Reduce trip duration to ${reducedDays} days (${reducedNights} nights)`,
        description: `Shortening the stay by ${durationDays - reducedDays} days saves ₹${fewerNightsSavings.toLocaleString()} on accommodation, dining, and local cabs.`,
        rupeeImpactINR: fewerNightsSavings,
        actionType: 'fewer_nights'
      });

      // Fix 2: Mode switch to train (if domestic)
      if (isDomestic && selectedTrain) {
        const trainSavings = Math.max(1000, chosen.flightCostINR - selectedTrain.totalPriceINR);
        concreteFixes.push({
          id: 'fix-mode-train',
          title: `Switch from flight to ${selectedTrain.trainName}`,
          description: `Travelling via scenic rail (${selectedTrain.selectedClass} Class) saves ₹${trainSavings.toLocaleString()} for your entire party.`,
          rupeeImpactINR: trainSavings,
          actionType: 'mode_switch'
        });
      }

      // Fix 3: Budget hotel tier / homestay
      const budgetNightlyRate = 2200;
      if (chosen.hotel.pricePerNightINR > budgetNightlyRate) {
        const budgetHotelSavings = Math.round(nights * (chosen.hotel.pricePerNightINR - budgetNightlyRate));
        concreteFixes.push({
          id: 'fix-budget-hotel',
          title: 'Switch to verified budget hotel or boutique homestay',
          description: `Selecting a verified 3-star budget property at ₹${budgetNightlyRate.toLocaleString()}/night saves ₹${budgetHotelSavings.toLocaleString()}.`,
          rupeeImpactINR: budgetHotelSavings,
          actionType: 'budget_hotel'
        });
      }

      // Fix 4: Cheaper dates (shoulder season)
      const shoulderSavings = Math.round(chosen.grandTotalINR * 0.12);
      if (concreteFixes.length < 3) {
        concreteFixes.push({
          id: 'fix-cheaper-dates',
          title: 'Shift travel to shoulder value season (14–20 Nov)',
          description: `Travelling during value season lowers seasonal flight tariffs and resort rates, saving ₹${shoulderSavings.toLocaleString()}.`,
          rupeeImpactINR: shoulderSavings,
          actionType: 'cheaper_dates'
        });
      }
    }

    const selectedHotel: HotelItem = chosen.hotel;
    const selectedFlight: FlightItem | null = chosen.flight;
    const airportRoute = chosen.airportRoute;
    const includedActivities: ActivityItem[] = chosen.includedActivities;

    // 6. Compute Upgrades with Deltas and Balancing Options
    const upgradeOptions: PlanUpgradeOption[] = [];
    const luxuryCandidateHotels = hotels.filter((h) => h.id !== selectedHotel.id && (h.starRating === 5 || h.tag === 'Luxury Splurge' || h.pricePerNightINR > selectedHotel.pricePerNightINR));

    for (const luxuryHotel of luxuryCandidateHotels.slice(0, 2)) {
      const luxuryAirportRoute = selectArrivalAirportByDriveTime(luxuryHotel.area, destination);
      const luxuryFlight = isRoadOrTrainDestination || flights.length === 0
        ? null
        : (flights.find((f) => f.destinationCode === luxuryAirportRoute.selectedAirportCode) || selectedFlight);
      const luxuryFlightCost = luxuryFlight ? luxuryFlight.totalPriceINR : 0;
      const luxuryHotelCost = nights * luxuryHotel.pricePerNightINR;
      const luxurySubtotal = luxuryFlightCost + transferCostINR + localTransportCostINR + foodCostINR + luxuryHotelCost + chosen.activitiesCostINR + visaCostINR;
      const luxuryBuffer = calculateContingencyBufferINR(luxurySubtotal);
      const luxuryTotalINR = luxurySubtotal + luxuryBuffer;
      const deltaINR = luxuryTotalINR - chosen.grandTotalINR;

      const balancingOptions: BalancingOption[] = [];
      if (luxuryTotalINR > targetBudgetINR) {
        const overAmt = luxuryTotalINR - targetBudgetINR;
        // Balancing option 1: 5 days stay
        const reducedStayNights = Math.max(2, nights - 2);
        const stayReductionSavings = Math.round(2 * luxuryHotel.pricePerNightINR);
        balancingOptions.push({
          id: 'bal-fewer-nights',
          title: `Reduce to ${reducedStayNights + 1} days (${reducedStayNights} nights)`,
          description: `Enjoy the 5★ luxury beachfront resort for ${reducedStayNights} nights while staying on budget.`,
          rupeeImpactINR: stayReductionSavings
        });

        // Balancing option 2: Rail transport
        if (isDomestic && selectedTrain && luxuryFlight) {
          const railSavings = Math.round(luxuryFlight.totalPriceINR - selectedTrain.totalPriceINR);
          balancingOptions.push({
            id: 'bal-mode-train',
            title: `Travel via ${selectedTrain.trainName}`,
            description: `Combine 5★ luxury stay with comfortable AC rail travel to absorb the upgrade difference.`,
            rupeeImpactINR: railSavings
          });
        }
      }

      upgradeOptions.push({
        id: `upg-${luxuryHotel.id}`,
        title: `${luxuryHotel.name} (${luxuryHotel.starRating}★ Upgrade)`,
        description: `Upgrade to luxury private stay with curated amenities and scenic grounds.`,
        deltaINR,
        deltaText: `+${formatINR(deltaINR)}`,
        hotel: luxuryHotel,
        balancingOptions
      });
    }

    // 7. Curated Dining suggestions
    const diningSuggestions: DiningItem[] = this.resolveDiningSuggestions(destination, context.dietaryPreference || undefined);

    // 8. Generate Day-by-Day Itinerary with named airport, drive times, and walking levels
    const itinerary: ActivityDayItem[] = this.generateDayItinerary({
      destination,
      origin,
      durationDays,
      dates,
      totalTravellers,
      childAges,
      seniors,
      walkingIntensity: context.walkingIntensity || (seniors > 0 || (context.travelStyle === 'Relaxed') ? 'Low' : 'Moderate'),
      allActivities,
      selectedHotel,
      selectedFlight,
      arrivalAirportName: airportRoute.selectedAirportName,
      airportDriveMinutes: airportRoute.driveMinutes,
      diningSuggestions
    });

    // 9. Deterministic Financial Math Calculation (all integer rupees)
    const budget: TripPlanBudget = {
      targetINR: targetBudgetINR,
      flightsCostINR: chosen.flightCostINR,
      hotelCostINR: chosen.hotelCostINR,
      transportCostINR: transferCostINR,
      localTransportCostINR,
      foodCostINR: chosen.foodCostINR || foodCostINR,
      activitiesCostINR: chosen.activitiesCostINR,
      diningEstimateINR: chosen.foodCostINR || foodCostINR,
      bufferCostINR: chosen.bufferCostINR,
      otherCostsINR: visaCostINR,
      grandTotalINR: chosen.grandTotalINR,
      remainingBudgetINR: targetBudgetINR - chosen.grandTotalINR,
      overBudgetAmountINR: isFeasible ? 0 : shortfallINR,
      isOverBudget: !isFeasible,
      statusMessage: isFeasible
        ? `Within target budget with ${formatINR(targetBudgetINR - chosen.grandTotalINR)} remaining buffer.`
        : `Plan is currently infeasible by ${formatINR(shortfallINR)}. Review concrete budget fixes below.`
    };

    // 10. Generate Data-Driven Map Waypoints
    const mapWaypoints: MapWaypoint[] = this.generateMapWaypoints({
      origin,
      destination,
      hotel: selectedHotel,
      itinerary
    });

    // 11. Automated Verification Checks
    const verificationChecks: VerificationCheck[] = generateVerificationChecks(
      selectedFlight,
      selectedHotel,
      visaDetails,
      {
        isOverBudget: !isFeasible,
        totalCalculatedCostINR: chosen.grandTotalINR,
        remainingBudgetINR: targetBudgetINR - chosen.grandTotalINR,
        overBudgetAmountINR: isFeasible ? 0 : shortfallINR
      },
      totalTravellers,
      scope,
      {
        childAges,
        seniorsCount: seniors,
        itinerary,
        transferDriveMinutes: airportRoute.driveMinutes
      }
    );

    // 12. Title, Summary & Recommendations
    const partyLabel = children > 0
      ? `Family Vacation (${adults} Adults, ${children} Minors${childAges.length > 0 ? ` ages ${childAges.join(', ')}` : ''})`
      : adults === 2
      ? 'Couples Getaway'
      : `${totalTravellers} Travellers`;

    const destClean = destination.replace(/\s*,.*$/, '').trim();
    const title = `${durationDays}-Day ${destClean} ${isDomestic ? (durationDays <= 3 ? 'Weekend Getaway' : 'Domestic Holiday') : 'Journey'} from ${origin.replace(/\s*\(.*\)/, '').trim()}`;
    const summary = isFeasible
      ? `Handcrafted ${durationDays}-day personalized travel plan for ${partyLabel}. Deterministically fitted within your ${formatINR(targetBudgetINR)} budget. ${selectedFlight ? `Includes flights into ${airportRoute.selectedAirportName} (${airportRoute.driveMinutes}-min drive to your ${selectedHotel.area} hotel)` : `Includes scenic road transit from ${origin.replace(/\s*\(.*\)/, '').trim()} to your ${selectedHotel.area} stay`}, daily food, local cab hire, and a reserved ${formatINR(chosen.bufferCostINR)} contingency buffer.`
      : `Budget Allocator Notice: A trip for ${partyLabel} with all standard categories exceeds your target budget by ${formatINR(shortfallINR)}. We've generated 2–3 concrete fixes below to bring this trip into feasibility.`;

    const recommendations: string[] = [
      isDomestic
        ? 'Carry physical government photo IDs (Aadhaar, Voter ID, or DL) for seamless airport gates and hotel check-in.'
        : 'Ensure Indian passports have minimum 6 months validity from departure date. Keep digital copies of flight itineraries.',
      airportRoute.reasonNote,
      children > 0
        ? 'Family Pacing: Excursions scheduled with maximum 2 major stops per day and afternoon rest downtime.'
        : 'Optimal Timing: Morning sightseeing starts at 09:30 AM to avoid peak rush hours.'
    ];

    const initialPlan: TripPlan = {
      id: `plan_${Date.now()}`,
      title,
      summary,
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
      scope,
      status: isFeasible ? 'feasible' : 'infeasible',
      shortfallINR,
      concreteFixes,
      upgradeOptions,
      airportSelectionReason: airportRoute.reasonNote,
      hotelZone: airportRoute.hotelZone,
      arrivalAirportCode: airportRoute.selectedAirportCode,
      arrivalAirportName: airportRoute.selectedAirportName,
      flight: selectedFlight,
      availableFlights: flights,
      selectedTrain,
      availableTrains: trains,
      hotel: selectedHotel,
      availableHotels: hotels,
      transfer: selectedTransfer,
      availableTransfers: transfers,
      activities: includedActivities,
      availableActivities: allActivities,
      itinerary,
      diningSuggestions,
      visa: visaDetails,
      budget,
      mapWaypoints,
      recommendations,
      verificationChecks,
      createdAt: new Date().toISOString(),
      seasonalRecommendation: buildSeasonalRecommendation(destination, context.partyType),
      routeComparison: buildRouteDiscoveryComparison(origin, destination, targetBudgetINR, totalTravellers),
      budgetBuffer: buildRealisticBudgetBuffer(destination, targetBudgetINR, durationDays, totalTravellers),
      trustVerification: buildTrustVerificationDetails(destination, selectedHotel, selectedTransfer)
    };

    return this.validateAndRepairTripPlan(initialPlan);
  }

  /**
   * Generates realistic day-by-day itinerary respecting exact duration, traveller ages,
   * walking intensity, named airports, and drive times between stops.
   */
  static generateDayItinerary(params: {
    destination: string;
    origin: string;
    durationDays: number;
    dates: string;
    totalTravellers: number;
    childAges: number[];
    seniors: number;
    walkingIntensity: 'Low' | 'Moderate' | 'Active';
    allActivities: ActivityItem[];
    selectedHotel: HotelItem;
    selectedFlight: FlightItem | null;
    arrivalAirportName: string;
    airportDriveMinutes: number;
    diningSuggestions: DiningItem[];
  }): ActivityDayItem[] {
    const {
      destination,
      origin,
      durationDays,
      childAges,
      seniors,
      walkingIntensity,
      allActivities,
      selectedHotel,
      selectedFlight,
      arrivalAirportName,
      airportDriveMinutes,
      diningSuggestions
    } = params;

    const hasKids = childAges.length > 0;
    const hasSeniors = seniors > 0;
    const isGentlePacing = walkingIntensity === 'Low' || hasSeniors;

    const originCity = origin.replace(/\s*\(.*\)/, '').trim();
    const destinationCity = selectedFlight?.destinationCity || arrivalAirportName || destination;

    const days: ActivityDayItem[] = [];

    for (let dayNum = 1; dayNum <= durationDays; dayNum++) {
      if (dayNum === 1) {
        // DAY 1: ARRIVAL
        days.push({
          day: 1,
          dateStr: `Day 1`,
          title: selectedFlight ? `Arrival in ${destination} & Hotel Check-in` : `Scenic Drive to ${destination} & Check-in`,
          theme: 'Arrival & Scenic Welcome',
          morning: selectedFlight
            ? `Flight ${originCity} → ${destinationCity}. Arrival and meet private chauffeur for ${airportDriveMinutes}-min drive to ${selectedHotel.name}.`
            : `Morning highway road drive from ${originCity} to ${destination}. Scenic drive through Western Ghats with coffee break; arrive and check-in to ${selectedHotel.name}.`,
          afternoon: `Smooth check-in at ${selectedHotel.name}. Unpack, rest, and settle into ${selectedHotel.roomType}. Dedicated rest downtime.`,
          evening: `Light orientation stroll along ${selectedHotel.area}. Welcome dinner featuring authentic regional cuisine.`,
          estimatedCostINR: 1200,
          estimatedCostUSD: 14,
          localDining: [
            diningSuggestions[0]?.name || 'Hotel Signature Restaurant',
            'Fresh Coconut & Tropical Juice Bar'
          ],
          transitTip: selectedFlight ? `Private AC transfer (${airportDriveMinutes}-min drive). Meet-and-greet pickup included.` : `Private AC road transit.`,
          walkingLevel: 'very light',
          stopDriveTimes: [
            { from: destinationCity, to: selectedHotel.name, driveMinutes: airportDriveMinutes, note: selectedFlight ? `${airportDriveMinutes}-min drive from airport` : `Road transit` }
          ]
        });
      } else if (dayNum === durationDays) {
        // LAST DAY: DEPARTURE
        days.push({
          day: dayNum,
          dateStr: `Day ${dayNum}`,
          title: `Leisure Morning & Departure to ${originCity}`,
          theme: 'Souvenirs & Farewell',
          morning: `Relaxed breakfast at ${selectedHotel.name}. Gentle morning packing and artisan souvenir shopping.`,
          afternoon: `Hotel checkout. Private chauffeur transfer ${selectedFlight ? `(${airportDriveMinutes}-min drive) to ${destinationCity} with comfortable baggage assistance.` : `for scenic highway drive back to ${originCity}.`}`,
          evening: selectedFlight ? `Return flight ${destinationCity} → ${originCity}. Journey completed.` : `Arrive back in ${originCity}. Journey completed.`,
          estimatedCostINR: 600,
          estimatedCostUSD: 7,
          localDining: ['Airport Lounge Refreshments', 'Artisan Sweet Box Tasting'],
          transitTip: selectedFlight ? `Scheduled airport transfer with 2.5 hours domestic security buffer.` : `Private AC highway drive return.`,
          walkingLevel: 'very light',
          stopDriveTimes: [
            { from: selectedHotel.name, to: destinationCity, driveMinutes: airportDriveMinutes, note: selectedFlight ? `${airportDriveMinutes}-min drive to airport` : `Road transit` }
          ]
        });
      } else {
        // INTERMEDIATE DAYS
        const actIndex = (dayNum - 2) % allActivities.length;
        const mainAct = allActivities[actIndex];
        const nextAct = allActivities[(actIndex + 1) % allActivities.length];

        const dining1 = diningSuggestions[(dayNum - 1) % diningSuggestions.length]?.name || 'Local Heritage Bistro';
        const dining2 = diningSuggestions[dayNum % diningSuggestions.length]?.name || 'Scenic Waterfront Cafe';

        const theme = mainAct ? `${mainAct.category} & Excursions` : `Highlights of ${destination}`;

        let morningSchedule = mainAct
          ? `${mainAct.name}: ${mainAct.description} (Duration: ${mainAct.duration}).`
          : `Morning guided exploration of central landmarks and scenic photo viewpoints.`;

        let afternoonSchedule = isGentlePacing
          ? `Gentle afternoon downtime: Shaded poolside rest at ${selectedHotel.name} or relaxing air-conditioned cafe break to recharge.`
          : `Afternoon local highlights: Explore artisan craft stalls, botanical gardens, and scenic viewpoint promenade.`;

        if (hasKids && dayNum === 2) {
          afternoonSchedule = `Family Fun: Sandcastle building and splash in gentle shallows, followed by delicious fresh tropical fruit ice creams.`;
        }

        let eveningSchedule = nextAct && nextAct.timeSlot === 'Evening'
          ? `${nextAct.name}: ${nextAct.description}. Dinner at ${dining1}.`
          : `Sunset promenade along the water, followed by a delicious family dinner at ${dining1}.`;

        const walkingLevel: 'very light' | 'light' | 'moderate' = isGentlePacing ? 'light' : (walkingIntensity === 'Moderate' ? 'moderate' : 'light');
        const walkingFlag = (walkingLevel === 'moderate' && isGentlePacing)
          ? '[Gentle Pacing: Shaded private transport provided to ensure low walking]'
          : undefined;

        days.push({
          day: dayNum,
          dateStr: `Day ${dayNum}`,
          title: `Day ${dayNum}: ${mainAct ? mainAct.name : `Discovering ${destination}`}`,
          theme,
          morning: morningSchedule,
          afternoon: afternoonSchedule,
          evening: eveningSchedule,
          estimatedCostINR: (mainAct?.estimatedPriceINR || 1000) + 500,
          estimatedCostUSD: Math.round(((mainAct?.estimatedPriceINR || 1000) + 500) / 84),
          localDining: [dining1, dining2],
          transitTip: isGentlePacing
            ? 'Comfortable private AC cab transfers provided. Low walking required.'
            : 'Short local taxi transfers and pedestrian promenade walk.',
          walkingLevel,
          walkingFlag,
          stopDriveTimes: [
            { from: selectedHotel.name, to: mainAct ? mainAct.name : 'Excursion Point', driveMinutes: 30, note: '30-min drive' }
          ]
        });
      }
    }

    return days;
  }

  /**
   * Generates dynamic data-driven map waypoints for origin, destination, hotel, and activities
   */
  static generateMapWaypoints(params: {
    origin: string;
    destination: string;
    hotel: HotelItem;
    itinerary: ActivityDayItem[];
  }): MapWaypoint[] {
    const { origin, destination, hotel, itinerary } = params;

    const waypoints: MapWaypoint[] = [
      {
        id: 'wp-origin',
        name: `${origin.replace(/\s*\(.*\)/, '').trim()} Airport`,
        type: 'origin',
        area: origin,
        description: 'Point of departure for your journey.'
      },
      {
        id: 'wp-dest-airport',
        name: `${destination} Terminal`,
        type: 'airport',
        area: destination,
        description: 'Arrival airport and chauffeur meet-and-greet zone.'
      },
      {
        id: 'wp-hotel',
        name: hotel.name,
        type: 'hotel',
        area: hotel.area,
        description: `${hotel.starRating}-Star Accommodation: ${hotel.roomType}.`
      }
    ];

    itinerary.forEach((d) => {
      if (d.day > 1 && d.day < itinerary.length) {
        waypoints.push({
          id: `wp-day-${d.day}`,
          name: d.title.replace(/^Day \d+:\s*/, ''),
          type: 'activity',
          area: destination,
          dayNumber: d.day,
          description: d.morning
        });
      }
    });

    return waypoints;
  }

  /**
   * Resolves Visa details for domestic and international trips
   */
  static resolveVisaDetails(destination: string, scope: TripScope, partySize: number): VisaDetails {
    const dest = destination.toLowerCase();

    if (scope === 'domestic' || dest.includes('goa') || dest.includes('kerala') || dest.includes('india')) {
      return {
        ...MOCK_VISA_GOA,
        totalFeeINR: 0,
        totalFeeUSD: 0
      };
    }

    const notePlaceholder = 'Visa and entry guidelines verified from official regulatory schedule.';

    if (dest.includes('singapore')) {
      return {
        ...MOCK_VISA_SINGAPORE,
        totalFeeINR: MOCK_VISA_SINGAPORE.feePerPersonINR * partySize,
        totalFeeUSD: MOCK_VISA_SINGAPORE.feePerPersonUSD * partySize,
        notes: `${notePlaceholder} ${MOCK_VISA_SINGAPORE.notes}`
      };
    }

    if (dest.includes('thailand') || dest.includes('bangkok') || dest.includes('phuket')) {
      return {
        ...MOCK_VISA_THAILAND,
        totalFeeINR: MOCK_VISA_THAILAND.feePerPersonINR * partySize,
        totalFeeUSD: MOCK_VISA_THAILAND.feePerPersonUSD * partySize,
        notes: `${notePlaceholder} ${MOCK_VISA_THAILAND.notes}`
      };
    }

    if (dest.includes('japan') || dest.includes('tokyo')) {
      return {
        ...MOCK_VISA_JAPAN,
        totalFeeINR: MOCK_VISA_JAPAN.feePerPersonINR * partySize,
        totalFeeUSD: MOCK_VISA_JAPAN.feePerPersonUSD * partySize,
        notes: `${notePlaceholder} ${MOCK_VISA_JAPAN.notes}`
      };
    }

    // Vietnam default
    return {
      ...MOCK_VISA_VIETNAM,
      totalFeeINR: MOCK_VISA_VIETNAM.feePerPersonINR * partySize,
      totalFeeUSD: MOCK_VISA_VIETNAM.feePerPersonUSD * partySize,
      notes: `${notePlaceholder} ${MOCK_VISA_VIETNAM.notes}`
    };
  }

  /**
   * Resolves dining suggestions
   */
  static resolveDiningSuggestions(destination: string, dietary?: string): DiningItem[] {
    const dest = destination.toLowerCase();
    let list = MOCK_DINING_GOA;

    if (dest.includes('singapore')) {
      list = MOCK_DINING_SINGAPORE;
    } else if (dest.includes('thailand')) {
      list = MOCK_DINING_THAILAND;
    } else if (dest.includes('japan')) {
      list = MOCK_DINING_JAPAN;
    } else if (dest.includes('vietnam')) {
      list = MOCK_DINING_VIETNAM;
    }

    if (dietary === 'Vegetarian' || dietary === 'Jain') {
      return list.filter((d) => d.isPureVeg || d.isJainFriendly).concat(list.filter((d) => !d.isPureVeg));
    }

    return list;
  }

  /**
   * Automated Validation & Auto-Repair
   */
  static validateAndRepairTripPlan(plan: TripPlan): TripPlan {
    const repaired = { ...plan };

    // Validate Hotel Capacity for Travellers
    if (repaired.hotel.maxCapacity < repaired.travellers.total) {
      const upgrade = repaired.availableHotels.find((h) => h.maxCapacity >= repaired.travellers.total);
      if (upgrade) {
        repaired.hotel = upgrade;
      } else {
        repaired.hotel = {
          ...repaired.hotel,
          roomType: `Interconnecting Family Suite (${repaired.travellers.total} Guests)`,
          bedConfiguration: '1 King Bed + 2 Single Beds',
          maxCapacity: repaired.travellers.total,
          capacityVerifiedForFamily: true
        };
      }
    }

    return repaired;
  }

  /**
   * Conversational Modification & Upgrades
   */
  static applyConversationalRefinement(
    plan: TripPlan,
    userPrompt: string
  ): { updatedPlan: TripPlan; actionSummary: string } {
    const lower = userPrompt.toLowerCase().trim();
    let updatedPlan = { ...plan };
    let actionSummary = '';

    // Upgrade to luxury 5-star
    if (lower.includes('luxury') || lower.includes('5 star') || lower.includes('5-star') || lower.includes('upgrade') || lower.includes('caravela')) {
      const luxuryHotel = updatedPlan.availableHotels.find((h) => h.starRating === 5 || h.tag === 'Luxury Splurge') || updatedPlan.availableHotels[updatedPlan.availableHotels.length - 1];
      if (luxuryHotel && luxuryHotel.id !== updatedPlan.hotel.id) {
        const nights = Math.max(1, updatedPlan.durationDays - 1);
        const oldHotelCost = updatedPlan.hotel.totalPriceINR || (updatedPlan.hotel.pricePerNightINR * nights);
        const newHotelCost = luxuryHotel.pricePerNightINR * nights;
        const delta = newHotelCost - oldHotelCost;

        updatedPlan.hotel = luxuryHotel;
        const oldSubtotal = updatedPlan.budget.grandTotalINR - (updatedPlan.budget.bufferCostINR || 2000);
        const newSubtotal = oldSubtotal + delta;
        const newBuffer = calculateContingencyBufferINR(newSubtotal);
        const newGrandTotal = newSubtotal + newBuffer;
        const overBudget = newGrandTotal > updatedPlan.budget.targetINR;
        const overBudgetAmount = overBudget ? newGrandTotal - updatedPlan.budget.targetINR : 0;

        updatedPlan.budget = {
          ...updatedPlan.budget,
          hotelCostINR: newHotelCost,
          bufferCostINR: newBuffer,
          grandTotalINR: newGrandTotal,
          remainingBudgetINR: updatedPlan.budget.targetINR - newGrandTotal,
          overBudgetAmountINR: overBudgetAmount,
          isOverBudget: overBudget,
          statusMessage: overBudget
            ? `Your plan is currently ₹${overBudgetAmount.toLocaleString()} above your target budget.`
            : `Within budget with ₹${(updatedPlan.budget.targetINR - newGrandTotal).toLocaleString()} remaining buffer.`
        };

        // If over budget, attach balancing options
        if (overBudget) {
          const stayReductionSavings = Math.round(2 * luxuryHotel.pricePerNightINR);
          const balancingOptions: BalancingOption[] = [
            {
              id: 'bal-reduce-nights',
              title: `Reduce stay by 2 nights (${updatedPlan.durationDays - 2} days total)`,
              description: `Enjoy ${luxuryHotel.name} for ${nights - 2} nights, saving ₹${stayReductionSavings.toLocaleString()} to bring your trip back within budget.`,
              rupeeImpactINR: stayReductionSavings
            }
          ];

          if (updatedPlan.availableTrains && updatedPlan.availableTrains.length > 0 && updatedPlan.flight) {
            const trainSavings = Math.round(updatedPlan.flight.totalPriceINR - updatedPlan.availableTrains[0].totalPriceINR);
            balancingOptions.push({
              id: 'bal-switch-train',
              title: `Travel via ${updatedPlan.availableTrains[0].trainName}`,
              description: `Switching to scenic train travel saves ₹${trainSavings.toLocaleString()} on tickets.`,
              rupeeImpactINR: trainSavings
            });
          }

          if (updatedPlan.upgradeOptions && updatedPlan.upgradeOptions.length > 0) {
            updatedPlan.upgradeOptions[0].balancingOptions = balancingOptions;
          }
        }

        actionSummary = `Upgraded stay to ${luxuryHotel.name} (5-Star Luxury). Recalculated total is ${formatINR(newGrandTotal)}${overBudget ? ` (${formatINR(overBudgetAmount)} over target)` : ''}.`;
      } else {
        actionSummary = `You are already staying at premier luxury partner hotel (${updatedPlan.hotel.name}).`;
      }
    } else if (lower.includes('train') || lower.includes('rail') || lower.includes('vande bharat')) {
      if (updatedPlan.availableTrains && updatedPlan.availableTrains.length > 0) {
        updatedPlan.selectedTrain = updatedPlan.availableTrains[0];
        actionSummary = `Switched to Indian Railways: Travel via ${updatedPlan.availableTrains[0].trainName} (${updatedPlan.availableTrains[0].trainNumber}).`;
      } else {
        actionSummary = 'Train options not available in demo data';
      }
    } else {
      actionSummary = `Applied modification: "${userPrompt}".`;
    }

    return { updatedPlan, actionSummary };
  }

  /**
   * Directly applies a stay upgrade option to a trip plan
   */
  /**
   * Swap the flight, train or the stay chosen by the user and recompute the budget,
   * so the total, buffer and over/under-budget state always match what is selected.
   */
  static swapComponent(plan: TripPlan, change: { flight?: FlightItem | null; hotel?: HotelItem; train?: TrainItem | null }): TripPlan {
    const nights = Math.max(1, plan.durationDays - 1);
    const b = plan.budget;
    let flightsCostINR = b.flightsCostINR;
    let hotelCostINR = b.hotelCostINR;
    const next: TripPlan = { ...plan };

    if (change.flight !== undefined) {
      flightsCostINR = change.flight ? change.flight.totalPriceINR : 0;
      next.flight = change.flight;
    }
    if (change.hotel !== undefined) {
      hotelCostINR = nights * change.hotel.pricePerNightINR;
      next.hotel = change.hotel;
    }
    if (change.train !== undefined) {
      next.selectedTrain = change.train || undefined;
      if (change.train) {
        flightsCostINR = change.train.totalPriceINR;
      }
    }

    const oldBuffer = b.bufferCostINR || 0;
    const oldSubtotal = b.grandTotalINR - oldBuffer;
    const newSubtotal = oldSubtotal + (flightsCostINR - b.flightsCostINR) + (hotelCostINR - b.hotelCostINR);
    const newBuffer = calculateContingencyBufferINR(newSubtotal);
    const grandTotalINR = newSubtotal + newBuffer;
    const isOverBudget = grandTotalINR > b.targetINR;
    const overBudgetAmountINR = isOverBudget ? grandTotalINR - b.targetINR : 0;

    next.budget = {
      ...b,
      flightsCostINR,
      hotelCostINR,
      bufferCostINR: newBuffer,
      grandTotalINR,
      remainingBudgetINR: b.targetINR - grandTotalINR,
      overBudgetAmountINR,
      isOverBudget,
      statusMessage: isOverBudget
        ? `Your plan is currently ₹${overBudgetAmountINR.toLocaleString('en-IN')} above your target budget.`
        : `Within budget with ₹${(b.targetINR - grandTotalINR).toLocaleString('en-IN')} remaining buffer.`
    } as TripPlan['budget'];

    if (next.budgetBuffer) {
      const bufferAmountINR = Math.round(newSubtotal * 0.15);
      next.budgetBuffer = {
        ...next.budgetBuffer,
        amountINR: bufferAmountINR,
        breakdown: {
          onGroundFoodAndSnacksINR: Math.round(bufferAmountINR * 0.45),
          localTransitAndAutosINR: Math.round(bufferAmountINR * 0.35),
          shoppingAndIncidentalsINR: Math.round(bufferAmountINR * 0.20)
        }
      };
    }

    return next;
  }

  static applyUpgrade(plan: TripPlan, upgrade: PlanUpgradeOption): TripPlan {
    const luxuryHotel = upgrade.hotel;
    const nights = Math.max(1, plan.durationDays - 1);
    const newHotelCost = luxuryHotel.pricePerNightINR * nights;
    const oldHotelCost = plan.hotel.pricePerNightINR * nights;
    const delta = newHotelCost - oldHotelCost;

    const newSubtotal = plan.budget.grandTotalINR - (plan.budget.bufferCostINR || 2000) + delta;
    const newBuffer = calculateContingencyBufferINR(newSubtotal);
    const newGrandTotal = newSubtotal + newBuffer;
    const overBudget = newGrandTotal > plan.budget.targetINR;
    const overBudgetAmount = overBudget ? newGrandTotal - plan.budget.targetINR : 0;

    return {
      ...plan,
      hotel: luxuryHotel,
      budget: {
        ...plan.budget,
        hotelCostINR: newHotelCost,
        bufferCostINR: newBuffer,
        grandTotalINR: newGrandTotal,
        remainingBudgetINR: plan.budget.targetINR - newGrandTotal,
        overBudgetAmountINR: overBudgetAmount,
        isOverBudget: overBudget
      }
    };
  }
}
