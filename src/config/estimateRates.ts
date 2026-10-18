/**
 * AeroDAG Configurable Travel Estimate Rates
 * 
 * NOTE: These rates represent demo assumptions for daily food consumption,
 * local intra-city transport / day-trips, and contingency buffers.
 * They are documented and configurable per destination.
 * Missing prices are never counted as ₹0 in any trip plan or summary.
 */

export interface FoodRateTiers {
  budget: number;
  mid: number;
  comfort: number;
}

// Configurable daily food rates per adult person in INR (demo assumptions)
export const FOOD_PER_PERSON_PER_DAY_INR: FoodRateTiers = {
  budget: 400,
  mid: 700,
  comfort: 1100
};

// Child food multiplier (child = 0.6 × adult)
export const CHILD_FOOD_MULTIPLIER = 0.6;

// Local cab / day-trip rate per planned day-trip per destination in INR (demo assumptions)
export const LOCAL_TRANSPORT_CAB_RATES_INR: Record<string, number> = {
  goa: 1200,
  kerala: 1500,
  rajasthan: 1400,
  japan: 2400,
  vietnam: 1100,
  singapore: 1800,
  thailand: 1300,
  default: 1200
};

/**
 * Returns the cab rate for a destination in INR
 */
export function getLocalCabRateForDestination(destination: string): number {
  const dest = (destination || '').toLowerCase();
  for (const [key, rate] of Object.entries(LOCAL_TRANSPORT_CAB_RATES_INR)) {
    if (key !== 'default' && dest.includes(key)) {
      return rate;
    }
  }
  return LOCAL_TRANSPORT_CAB_RATES_INR.default;
}

/**
 * Food Tier Selection & Downgrade Rule (Phase 3.1):
 * - When a user selects "Comfortable" budget tier or relaxed pace, food starts at the 'comfort' tier (₹1,100 / adult / day; child = 0.6 × adult).
 * - If the deterministic budget allocator finds that the comfort tier would cause the total trip cost to exceed the target budget,
 *   the allocator deterministically downgrades food to 'mid' tier (₹700 / adult / day) or 'budget' tier (₹400 / adult / day).
 * - This downgrade is surfaced in the plan and "What we understood" panel as an 'assumed' adjustment note:
 *   e.g. "Food tier: Mid / Standard (adjusted from Comfort to fit within ₹60,000 budget)".
 */
export function calculateFoodEstimateINR(params: {
  adultsCount: number;
  childrenCount: number;
  durationDays: number;
  tier?: 'budget' | 'mid' | 'comfort';
}): number {
  const { adultsCount, childrenCount, durationDays, tier = 'mid' } = params;
  const ratePerAdultDay = FOOD_PER_PERSON_PER_DAY_INR[tier] || FOOD_PER_PERSON_PER_DAY_INR.mid;
  const effectiveAdults = adultsCount + (childrenCount * CHILD_FOOD_MULTIPLIER);
  return Math.round(effectiveAdults * ratePerAdultDay * Math.max(1, durationDays));
}

/**
 * Counts the number of days in an itinerary that actually contain a cab excursion.
 * Only days with scheduled cab / Innova / taxi / minivan / chauffeur excursions are billed for local transport.
 */
export function countCabExcursionDays(itinerary?: Array<{
  transitTip?: string;
  morning?: string;
  afternoon?: string;
  evening?: string;
  theme?: string;
  title?: string;
}>, durationDays: number = 3): number {
  if (!itinerary || itinerary.length === 0) {
    return Math.max(1, durationDays - 2);
  }

  const cabDays = itinerary.filter((day) => {
    const text = `${day.transitTip || ''} ${day.morning || ''} ${day.afternoon || ''} ${day.evening || ''} ${day.theme || ''} ${day.title || ''}`.toLowerCase();
    return text.includes('cab') || text.includes('taxi') || text.includes('innova') ||
           text.includes('minivan') || text.includes('chauffeur') || text.includes('jeep') ||
           text.includes('safari') || text.includes('excursion');
  }).length;

  return Math.max(1, cabDays);
}

/**
 * Computes local transport estimate in integer INR based on planned day-trips with actual cab excursions.
 * LOCAL_TRANSPORT = cab excursion days × cab rate per destination.
 */
export function calculateLocalTransportEstimateINR(params: {
  destination: string;
  plannedDayTrips?: number;
  itinerary?: Array<{
    transitTip?: string;
    morning?: string;
    afternoon?: string;
    evening?: string;
    theme?: string;
    title?: string;
  }>;
  durationDays?: number;
}): number {
  const cabRate = getLocalCabRateForDestination(params.destination);
  const dayTrips = params.plannedDayTrips !== undefined
    ? params.plannedDayTrips
    : (params.itinerary ? countCabExcursionDays(params.itinerary, params.durationDays) : Math.max(1, (params.durationDays || 3) - 2));
  return Math.round(dayTrips * cabRate);
}

/**
 * Contingency Buffer: max(₹2,000, 3% of subtotal)
 * Tagged with source 'reserved' and counted in the total.
 */
export function calculateContingencyBufferINR(subtotalINR: number): number {
  return Math.max(2000, Math.round(subtotalINR * 0.03));
}

// Configurable daily activities / sightseeing rate per person per day in INR (demo assumptions)
export const ACTIVITIES_PER_PERSON_PER_DAY_INR = 500;

// Configurable daily shopping and miscellaneous incidentals rate per person per day in INR (demo assumptions)
export const SHOPPING_MISC_PER_PERSON_PER_DAY_INR = 300;

// Configurable percentage for surprise buffer
export const SURPRISE_BUFFER_PERCENT = 15;

/**
 * Calculates estimated activities & sightseeing cost across travellers and duration.
 */
export function calculateActivitiesEstimateINR(params: {
  totalTravellers: number;
  durationDays: number;
}): number {
  return Math.round(ACTIVITIES_PER_PERSON_PER_DAY_INR * Math.max(1, params.totalTravellers) * Math.max(1, params.durationDays));
}

/**
 * Calculates estimated shopping & miscellaneous incidentals cost across travellers and duration.
 */
export function calculateShoppingMiscEstimateINR(params: {
  totalTravellers: number;
  durationDays: number;
}): number {
  return Math.round(SHOPPING_MISC_PER_PERSON_PER_DAY_INR * Math.max(1, params.totalTravellers) * Math.max(1, params.durationDays));
}

/**
 * Calculates the 15% "buffer for surprises" on a given subtotal.
 */
export function calculateSurpriseBufferINR(subtotalINR: number): number {
  return Math.round(subtotalINR * (SURPRISE_BUFFER_PERCENT / 100));
}
