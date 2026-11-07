/**
 * AeroDAG Destination Comparison Service
 * 
 * Supports comparing 2–3 destinations side by side:
 * - Triggered by card checkboxes ("Compare N places")
 * - Or triggered by natural language: "Coorg or Ooty or Wayanad, 4 days, 2 of us, budget 40000, by train"
 * 
 * Computes authoritative comparison columns using the EXACT same cost engine
 * so column totals match individual plans to the single rupee.
 */

import { TripPlan, TripPreferences } from '../types/travelBooking';
import { TripPlanningEngine } from './tripPlanningEngine';
import { computeFullTripCost } from './fullTripCostHelper';
import { getSeasonOptionsForDestination } from './destinationsData';
import { resolveTravelDates } from './dateResolver';

export interface ComparisonPlaceItem {
  destination: string;
  cleanName: string;
  plan: TripPlan;
  totalWithBufferINR: number;
  perPersonINR: number;
  fitsBudget: boolean;
  budgetDifferenceINR: number;
  fitsBudgetLabel: string;
  travelTime: string;
  travelMode: string;
  scenicTransitNote?: string;
  bestMonths: string;
  priceLabel: 'Sample' | 'Estimate' | 'AI estimate';
  imageUrl: string;
  vibe: string;
}

export interface DestinationComparisonResult {
  places: ComparisonPlaceItem[];
  durationDays: number;
  totalTravellers: number;
  targetBudgetINR: number;
  transportMode?: string;
  travelDates: string;
}

const KNOWN_COMPARISON_PLACES: Record<string, { vibe: string; image: string }> = {
  Goa: {
    vibe: 'Beach',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80'
  },
  Coorg: {
    vibe: 'Hills',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80'
  },
  Mysuru: {
    vibe: 'Heritage',
    image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80'
  },
  Kerala: {
    vibe: 'Nature',
    image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80'
  },
  Ooty: {
    vibe: 'Hills',
    image: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=600&q=80'
  },
  Pondicherry: {
    vibe: 'Beach',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80'
  },
  Udaipur: {
    vibe: 'Heritage',
    image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80'
  },
  Wayanad: {
    vibe: 'Nature',
    image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80'
  },
  Araku: {
    vibe: 'Hills',
    image: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=600&q=80'
  }
};

/**
 * Detects if a text prompt asks to compare 2–3 destinations.
 * e.g. "Coorg or Ooty, 4 days, 2 people, budget 40000"
 * e.g. "Coorg or Ooty or Wayanad, 4 days, 2 of us, budget 40000, by train"
 */
export function detectComparisonIntent(text: string): {
  isComparison: boolean;
  places: string[];
  durationDays?: number;
  travellers?: number;
  budgetTotalINR?: number;
  transportMode?: string;
  travelDates?: string;
} | null {
  const lower = text.toLowerCase();
  
  // Must contain " or " separating locations or "compare X and Y"
  if (!lower.includes(' or ') && !lower.includes('compare ') && !lower.includes(' vs ')) {
    return null;
  }

  // Find known places mentioned in text
  const matchedPlaces: string[] = [];
  const knownKeys = ['goa', 'coorg', 'mysuru', 'mysore', 'kerala', 'ooty', 'pondicherry', 'pondi', 'udaipur', 'wayanad', 'araku', 'jaipur', 'manali'];
  
  for (const key of knownKeys) {
    const reg = new RegExp(`\\b${key}\\b`, 'i');
    if (reg.test(lower)) {
      const canonical = key === 'mysore' ? 'Mysuru' : key === 'pondi' ? 'Pondicherry' : key.charAt(0).toUpperCase() + key.slice(1);
      if (!matchedPlaces.includes(canonical)) {
        matchedPlaces.push(canonical);
      }
    }
  }

  if (matchedPlaces.length < 2) {
    return null;
  }

  // Limit to at most 3 places
  const places = matchedPlaces.slice(0, 3);

  // Extract duration
  let durationDays = 4;
  const daysMatch = lower.match(/(\d+)\s*[- ]?(days|day|nights|night)/);
  if (daysMatch) {
    durationDays = parseInt(daysMatch[1], 10);
  } else if (lower.includes('weekend')) {
    durationDays = 2;
  } else if (lower.includes('week')) {
    durationDays = 7;
  }

  // Extract travellers
  let travellers = 2;
  const paxMatch = lower.match(/(\d+)\s*(people|adults|adult|of us|pax|travellers|travelers)/);
  if (paxMatch) {
    travellers = parseInt(paxMatch[1], 10);
  } else if (lower.includes('solo')) {
    travellers = 1;
  } else if (lower.includes('family') || lower.includes('4 friends')) {
    travellers = 4;
  }

  // Extract budget
  let budgetTotalINR = 40000;
  const budgetMatch = lower.match(/(?:budget|under|for|total)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i);
  if (budgetMatch) {
    const rawNum = parseInt(budgetMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(rawNum) && rawNum >= 3000) {
      budgetTotalINR = rawNum;
    }
  }

  // Extract transport mode
  let transportMode = 'Flight';
  if (lower.includes('train') || lower.includes('rail')) {
    transportMode = 'Train';
  } else if (lower.includes('cab') || lower.includes('drive') || lower.includes('car')) {
    transportMode = 'Cab';
  }

  // Extract dates
  let travelDates = '14–20 Nov 2026';
  const resolved = resolveTravelDates(text);
  if (resolved && resolved.ok) {
    travelDates = resolved.label;
  }

  return {
    isComparison: true,
    places,
    durationDays,
    travellers,
    budgetTotalINR,
    transportMode,
    travelDates
  };
}

/**
 * Builds side-by-side comparison for 2–3 destinations using the EXACT same cost engine.
 */
export async function buildDestinationComparison(
  places: string[],
  durationDays: number = 4,
  travellers: number = 2,
  budgetTotalINR: number = 40000,
  origin: string = 'Bengaluru (BLR)',
  transportMode: string = 'Flight',
  travelDates: string = '14–20 Nov 2026'
): Promise<DestinationComparisonResult> {
  const comparisonItems: ComparisonPlaceItem[] = [];

  for (const place of places.slice(0, 3)) {
    const cleanName = place.trim();
    
    // Build deterministic plan for destination
    const pref: TripPreferences = {
      destination: cleanName,
      origin,
      targetDates: travelDates,
      durationDays,
      partySize: travellers,
      adultsCount: travellers,
      childrenCount: 0,
      childrenAges: [],
      budgetTotalINR,
      budgetTotalUSD: Math.round(budgetTotalINR / 84),
      budgetTier: 'Comfortable',
      travelStyle: 'Balanced',
      priority: 'Lowest Price',
      accommodationPreference: 'Standard 3-Star',
      dietaryOrNotes: '',
      transportMode: transportMode as any
    };

    const plan = await TripPlanningEngine.buildDeterministicPlan({
      ...pref,
      dates: travelDates
    } as any);

    // Run exact cost calculation from cost engine
    const cost = computeFullTripCost(plan, pref);
    const totalWithBufferINR = cost.totalWithBufferINR;
    const perPersonINR = cost.perPersonINR;
    const fitsBudget = totalWithBufferINR <= budgetTotalINR;
    const diff = totalWithBufferINR - budgetTotalINR;
    const fitsBudgetLabel = fitsBudget
      ? 'Yes · Fits budget'
      : `No (+₹${diff.toLocaleString('en-IN')} over)`;

    // Travel time and transit mode
    let travelTime = plan.flight?.duration || (plan.selectedTrain ? plan.selectedTrain.duration : '3h 30m');
    let travelMode = plan.flight ? 'Flight' : plan.selectedTrain ? 'Train' : 'Road Cab';

    // Best months from destination catalog
    let bestMonths = 'Oct – Mar';
    if (cleanName === 'Goa') {
      bestMonths = 'Nov – Feb';
    } else if (cleanName === 'Coorg') {
      bestMonths = 'Oct – Mar';
    } else if (cleanName === 'Kerala') {
      bestMonths = 'Sep – Mar';
    } else if (cleanName === 'Mysuru') {
      bestMonths = 'Oct – Mar';
    } else if (cleanName === 'Ooty') {
      bestMonths = 'Oct – Jun';
    } else if (cleanName === 'Pondicherry') {
      bestMonths = 'Oct – Mar';
    } else if (cleanName === 'Udaipur') {
      bestMonths = 'Oct – Mar';
    } else if (cleanName === 'Araku') {
      bestMonths = 'Nov – Feb';
    }

    const meta = KNOWN_COMPARISON_PLACES[cleanName] || {
      vibe: 'Scenic',
      image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80'
    };

    const priceLabel: 'Sample' | 'Estimate' | 'AI estimate' = plan.isAiEstimatedDestination ? 'AI estimate' : 'Sample';

    comparisonItems.push({
      destination: plan.destination,
      cleanName,
      plan,
      totalWithBufferINR,
      perPersonINR,
      fitsBudget,
      budgetDifferenceINR: diff,
      fitsBudgetLabel,
      travelTime,
      travelMode,
      bestMonths,
      priceLabel,
      imageUrl: meta.image,
      vibe: meta.vibe
    });
  }

  return {
    places: comparisonItems,
    durationDays,
    totalTravellers: travellers,
    targetBudgetINR: budgetTotalINR,
    transportMode,
    travelDates
  };
}
