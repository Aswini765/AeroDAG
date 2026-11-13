/**
 * Budget fixes that actually work.
 *
 * When even the cheapest way to do a trip is over budget, we don't show "rough guesses".
 * Every fix here is a real plan run through the same cost engine, so the "new total"
 * is exactly what the plan will show after one tap. And when no change to this trip can
 * fit the budget, we say so and suggest places nearby that do fit.
 */
import { TripPlan, TripPreferences } from '../types/travelBooking';
import { computeFullTripCost } from './fullTripCostHelper';
import { resolveTravelDates, formatDateRange } from './dateResolver';
import { INDIA_PLACES, buildFallbackProfile } from './indiaPlaces';
import { buildPlanFromDestinationProfile } from './aiDestinationPlanBuilder';
import { generatePlanOptions } from './planOptionsGenerator';
import { AIRPORT_COORDS, coordsFor, distanceKm } from './travelRealism';
import { originCodeFor } from './originCities';

export interface BudgetFix {
  id: string;
  title: string;
  detail: string;
  newTotalINR: number;
  savingsINR: number;
  plan: TripPlan;
}

/** The same trip, fewer days: drops the last full days, keeps arrival and the trip home. */
export function shortenPlan(plan: TripPlan, newDays: number): TripPlan {
  const days = Math.max(2, Math.min(plan.durationDays, newDays));
  if (days === plan.durationDays) return plan;
  const cut = plan.durationDays - days;
  const it = plan.itinerary || [];
  // Keep Day 1 and the last day; drop days from the middle-end
  const kept = it.length > 2
    ? [...it.slice(0, Math.max(1, it.length - 1 - cut)), it[it.length - 1]].map((d, i) => ({ ...d, day: i + 1, dateStr: `Day ${i + 1}` }))
    : it.slice(0, days);
  let dates = plan.dates;
  const r = resolveTravelDates(plan.dates);
  if (r && r.ok) {
    const end = new Date(r.start.getFullYear(), r.start.getMonth(), r.start.getDate() + days - 1);
    dates = formatDateRange(r.start, end);
  }
  // Multi-stop: take nights off the longest stop first
  let stays = plan.stays;
  if (stays && stays.length > 1) {
    stays = stays.map((s) => ({ ...s }));
    for (let i = 0; i < cut; i++) {
      const longest = stays.reduce((a, b) => (b.nights > a.nights ? b : a));
      if (longest.nights > 1) longest.nights -= 1;
    }
  }
  const scale = days / plan.durationDays;
  return {
    ...plan,
    durationDays: days,
    dates,
    itinerary: kept,
    stays,
    budget: plan.budget ? {
      ...plan.budget,
      foodCostINR: plan.budget.foodCostINR ? Math.round(plan.budget.foodCostINR * scale) : plan.budget.foodCostINR,
      diningEstimateINR: plan.budget.diningEstimateINR ? Math.round(plan.budget.diningEstimateINR * scale) : plan.budget.diningEstimateINR,
      localTransportCostINR: plan.budget.localTransportCostINR ? Math.round(plan.budget.localTransportCostINR * scale) : plan.budget.localTransportCostINR,
      activitiesCostINR: plan.budget.activitiesCostINR ? Math.round(plan.budget.activitiesCostINR * scale) : plan.budget.activitiesCostINR
    } : plan.budget
  };
}

/** Shorter versions of the cheapest option, each priced by the cost engine. */
export function shorterTripFixes(cheapest: TripPlan, prefs: TripPreferences | null | undefined, budgetINR: number): BudgetFix[] {
  const base = computeFullTripCost(cheapest, prefs).totalWithBufferINR;
  const fixes: BudgetFix[] = [];
  for (let cut = 1; cut <= 3; cut++) {
    const days = cheapest.durationDays - cut;
    if (days < 2) break;
    const shorter = shortenPlan(cheapest, days);
    const total = computeFullTripCost(shorter, prefs).totalWithBufferINR;
    fixes.push({
      id: `shorter-${days}`,
      title: `${days} days instead of ${cheapest.durationDays}`,
      detail: `Same cheapest way, ${cut} night${cut > 1 ? 's' : ''} fewer`,
      newTotalINR: total,
      savingsINR: base - total,
      plan: shorter
    });
    if (budgetINR > 0 && total <= budgetINR) break; // the first one that fits is enough
  }
  return fixes;
}

export interface PlaceThatFits {
  name: string;
  state: string;
  totalINR: number;
  roadKm: number;
}

/**
 * Places near where you start that fit the budget for the same group and days
 * (cheapest way, same cost engine). Best fits first: the most trip for the money.
 */
export function placesThatFit(params: {
  origin: string;
  days: number;
  adults: number;
  children: number;
  childAges?: number[];
  budgetINR: number;
  excludeName?: string;
  limit?: number;
}): PlaceThatFits[] {
  const originCode = originCodeFor(params.origin) || 'BLR';
  const from = AIRPORT_COORDS[originCode];
  if (!from || params.budgetINR <= 0) return [];
  const results: PlaceThatFits[] = [];
  for (const p of INDIA_PLACES) {
    if (params.excludeName && p.name.toLowerCase() === params.excludeName.toLowerCase()) continue;
    const to = coordsFor(p.name, p.airport?.code);
    if (!to) continue;
    const roadKm = Math.round(distanceKm(from, to) * 1.35);
    if (roadKm > 650) continue; // a short budget trip stays within a night's bus ride
    try {
      const plan = buildPlanFromDestinationProfile({
        destination: p.name,
        origin: params.origin,
        durationDays: params.days,
        adultsCount: params.adults,
        childrenCount: params.children,
        childrenAges: params.childAges || [],
        totalTravellers: params.adults + params.children,
        budgetTotalINR: params.budgetINR,
        notes: []
      } as any, buildFallbackProfile(p.name));
      const prefs = { budgetTotalINR: params.budgetINR, adultsCount: params.adults, childrenCount: params.children } as any;
      const cheapest = generatePlanOptions(plan, prefs).reduce((m, o) => (o.totalCostINR < m.totalCostINR ? o : m));
      if (cheapest.totalCostINR <= params.budgetINR) {
        results.push({ name: p.name, state: p.state, totalINR: cheapest.totalCostINR, roadKm });
      }
    } catch {
      // skip places we can't price
    }
  }
  return results.sort((a, b) => b.totalINR - a.totalINR).slice(0, params.limit || 3);
}
