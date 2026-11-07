/**
 * AeroDAG Season, Route & Group Fit Helper (Prompt 9)
 * 
 * Implements:
 * 1. "Worth it in {month}?" evaluation: Yes / Mixed / Off-season with one sentence why.
 * 2. "How to get there" multi-modal comparison (door-to-door hours, group cost, scenic note).
 * 3. Stay-area choice by group type (kids/seniors -> quiet area like South Goa; friends/nightlife -> lively area).
 * 4. "Leaning offbeat" crowd ranking & badge when user asks for offbeat/not touristy.
 */

import { TripPlan, TripPreferences } from '../types/travelBooking';

export interface MonthWorthiness {
  month: string;
  verdict: 'Yes' | 'Mixed' | 'Off-season';
  reason: string;
  sourceLabel: string;
}

export interface TransitModeComparison {
  mode: 'Flight' | 'Train' | 'Road Cab';
  doorToDoorHoursText: string;
  doorToDoorHours: number;
  costForGroupINR: number;
  scenicNote: string;
  isRecommended?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function extractMonthFromDatesOrText(datesStr?: string, fullText?: string): string {
  const combined = `${datesStr || ''} ${fullText || ''}`.toLowerCase();
  
  if (combined.includes('jan')) return 'January';
  if (combined.includes('feb')) return 'February';
  if (combined.includes('mar')) return 'March';
  if (combined.includes('apr')) return 'April';
  if (combined.includes('may')) return 'May';
  if (combined.includes('jun')) return 'June';
  if (combined.includes('jul')) return 'July';
  if (combined.includes('aug')) return 'August';
  if (combined.includes('sep')) return 'September';
  if (combined.includes('oct')) return 'October';
  if (combined.includes('nov')) return 'November';
  if (combined.includes('dec')) return 'December';

  // Default to November if not found (standard planning window)
  return 'November';
}

export function evaluateMonthWorthiness(
  destination: string,
  datesStr?: string,
  userText?: string,
  isAiEstimated?: boolean
): MonthWorthiness {
  const cleanDest = (destination || '').toLowerCase();
  const month = extractMonthFromDatesOrText(datesStr, userText);
  const mLower = month.toLowerCase();

  const sourceLabel = isAiEstimated ? 'AI estimate' : 'Verified catalog';

  // 1. Araku Valley
  if (cleanDest.includes('araku')) {
    if (mLower === 'december' || mLower === 'january' || mLower === 'november') {
      return {
        month,
        verdict: 'Yes',
        reason: 'Morning mist and scenic winter cloud cover blanket the coffee valleys and tribal hamlets.',
        sourceLabel
      };
    }
    if (mLower === 'october' || mLower === 'february') {
      return {
        month,
        verdict: 'Yes',
        reason: 'Crisp pleasant mountain air ideal for visiting Borra Caves and Katiki Waterfalls.',
        sourceLabel
      };
    }
    if (mLower === 'march' || mLower === 'april' || mLower === 'may') {
      return {
        month,
        verdict: 'Mixed',
        reason: 'Warmer daytime afternoons, but evenings remain breezy and comfortable in the hills.',
        sourceLabel
      };
    }
    return {
      month,
      verdict: 'Mixed',
      reason: 'Monsoon showers bring emerald green landscapes, though road travel can be slower.',
      sourceLabel
    };
  }

  // 2. Goa
  if (cleanDest.includes('goa')) {
    if (['november', 'december', 'january', 'february'].includes(mLower)) {
      return {
        month,
        verdict: 'Yes',
        reason: 'Sunny dry beach weather, gentle sea breezes, and all beach shacks and night markets fully open.',
        sourceLabel
      };
    }
    if (['october', 'march'].includes(mLower)) {
      return {
        month,
        verdict: 'Yes',
        reason: 'Great shoulder-season balance of clear skies and significantly smaller beach crowds.',
        sourceLabel
      };
    }
    if (['june', 'july', 'august', 'september'].includes(mLower)) {
      return {
        month,
        verdict: 'Mixed',
        reason: 'Heavy monsoon rains and rough seas; swimming is restricted, but the hinterland turns intensely green.',
        sourceLabel
      };
    }
    return {
      month,
      verdict: 'Mixed',
      reason: 'Warm summer humidity with high afternoon temperatures before monsoon arrival.',
      sourceLabel
    };
  }

  // 3. Coorg
  if (cleanDest.includes('coorg')) {
    if (['october', 'november', 'december', 'january', 'february', 'march'].includes(mLower)) {
      return {
        month,
        verdict: 'Yes',
        reason: 'Crisp mountain mornings, coffee blossoms, and clear valley panoramic views.',
        sourceLabel
      };
    }
    if (['june', 'july', 'august'].includes(mLower)) {
      return {
        month,
        verdict: 'Mixed',
        reason: 'Heavy rainfall brings roaring waterfalls like Abbey Falls, though mist limits long-range views.',
        sourceLabel
      };
    }
    return {
      month,
      verdict: 'Yes',
      reason: 'Pleasant spring hill climate ideal for estate walks and spice plantation tours.',
      sourceLabel
    };
  }

  // 4. Rajasthan / Jaipur / Udaipur
  if (cleanDest.includes('rajasthan') || cleanDest.includes('jaipur') || cleanDest.includes('udaipur')) {
    if (['october', 'november', 'december', 'january', 'february', 'march'].includes(mLower)) {
      return {
        month,
        verdict: 'Yes',
        reason: 'Cool desert winter breeze, pleasant daytime warmth, and comfortable palace walking weather.',
        sourceLabel
      };
    }
    if (['april', 'may', 'june'].includes(mLower)) {
      return {
        month,
        verdict: 'Off-season',
        reason: 'Scorching desert summer temperatures exceeding 40°C make daytime fort exploration strenuous.',
        sourceLabel
      };
    }
    return {
      month,
      verdict: 'Mixed',
      reason: 'Monsoon showers bring temporary relief and dramatic skies over lake palaces.',
      sourceLabel
    };
  }

  // 5. Kerala
  if (cleanDest.includes('kerala') || cleanDest.includes('munnar')) {
    if (['september', 'october', 'november', 'december', 'january', 'february', 'march'].includes(mLower)) {
      return {
        month,
        verdict: 'Yes',
        reason: 'Post-monsoon freshness, tranquil backwater houseboats, and cool hillside tea gardens.',
        sourceLabel
      };
    }
    if (['june', 'july', 'august'].includes(mLower)) {
      return {
        month,
        verdict: 'Mixed',
        reason: 'Southwest monsoon season brings traditional Ayurvedic rejuvenation and swollen rivers.',
        sourceLabel
      };
    }
    return {
      month,
      verdict: 'Mixed',
      reason: 'Warmer tropical summer weather along the coastal backwaters, cooler in Munnar hills.',
      sourceLabel
    };
  }

  // Default generic
  return {
    month,
    verdict: 'Yes',
    reason: `Great season for sightseeing, comfortable local travel, and outdoor activities in ${destination}.`,
    sourceLabel
  };
}

export function isOffbeatRequested(text?: string, notes?: string[]): boolean {
  const combined = `${text || ''} ${(notes || []).join(' ')}`.toLowerCase();
  return /\b(offbeat|not touristy|hidden|less crowded|avoid crowd|quiet places|peaceful)\b/i.test(combined);
}

export function evaluateStayAreaChoice(
  destination: string,
  travellers: { adults?: number; children?: number; seniors?: number; childAges?: number[] },
  notesText?: string
): {
  recommendedArea: string;
  reason: string;
} {
  const clean = destination.toLowerCase();
  const hasKids = (travellers.children || 0) > 0;
  const hasSeniors = (travellers.seniors || 0) > 0;
  const childAge = travellers.childAges && travellers.childAges.length > 0 ? travellers.childAges[0] : null;
  const notes = (notesText || '').toLowerCase();
  const isNightlife = /nightlife|party|club|friends|pub/i.test(notes);

  if (clean.includes('goa')) {
    if (hasKids) {
      const ageLabel = childAge ? `${childAge}-year-old` : 'young kids';
      return {
        recommendedArea: 'South Goa (Benaulim / Varca)',
        reason: `Chosen because you're travelling with a ${ageLabel} (wide peaceful beaches, shallow gentle waves, family resorts).`
      };
    }
    if (hasSeniors) {
      return {
        recommendedArea: 'South Goa (Cavelossim)',
        reason: "Chosen because you're travelling with senior family (calm seaside promenade, step-free access, serene pace)."
      };
    }
    if (isNightlife) {
      return {
        recommendedArea: 'North Goa (Anjuna / Vagator)',
        reason: 'Chosen for lively cafe culture, beach shacks, live music, and evening social spots.'
      };
    }
    return {
      recommendedArea: 'Central Goa (Candolim)',
      reason: 'Chosen for balanced access to beach dining, clean shorelines, and water sports.'
    };
  }

  if (clean.includes('coorg')) {
    if (hasKids || hasSeniors) {
      return {
        recommendedArea: 'Madikeri Central Estates',
        reason: "Chosen for easy doctor/medical access, gentle ground-floor estate homestays, and short drives."
      };
    }
    return {
      recommendedArea: 'Siddapur / Kushalnagar',
      reason: 'Chosen for scenic coffee immersion and proximity to Dubare Elephant Camp.'
    };
  }

  if (clean.includes('rajasthan') || clean.includes('jaipur')) {
    if (hasKids || hasSeniors) {
      return {
        recommendedArea: 'Bani Park, Jaipur',
        reason: "Chosen for wide tree-lined residential avenues, peaceful heritage stays, and low traffic noise."
      };
    }
    return {
      recommendedArea: 'C-Scheme, Jaipur',
      reason: 'Chosen for top Rajasthani dining, contemporary cafes, and central palace proximity.'
    };
  }

  return {
    recommendedArea: 'Central Heritage & Scenic Area',
    reason: hasKids
      ? "Chosen for family-friendly location with minimal transit fatigue."
      : "Chosen for central access to key sights and verified dining."
  };
}

export function getHowToGetThereModes(
  destination: string,
  origin: string = 'Bengaluru',
  totalTravellers: number = 2,
  selectedTransport: string = 'Flight'
): TransitModeComparison[] {
  const destClean = destination.toLowerCase();
  const pax = Math.max(1, totalTravellers);

  const modes: TransitModeComparison[] = [];

  // Flight option
  const flightPerPerson = destClean.includes('goa') ? 3500 : destClean.includes('jaipur') ? 4800 : 4200;
  modes.push({
    mode: 'Flight',
    doorToDoorHoursText: 'approx. 2h 45m door-to-door',
    doorToDoorHours: 2.75,
    costForGroupINR: flightPerPerson * pax,
    scenicNote: 'Fastest door-to-door transit; aerial coastal landing approach on descent.',
    isRecommended: selectedTransport === 'Flight'
  });

  // Train option
  const trainPerPerson = destClean.includes('goa') ? 1200 : destClean.includes('mysuru') ? 550 : 1600;
  const trainHours = destClean.includes('mysuru') ? 2 : destClean.includes('goa') ? 9 : 14;
  modes.push({
    mode: 'Train',
    doorToDoorHoursText: `approx. ${trainHours}h 30m scenic rail`,
    doorToDoorHours: trainHours + 0.5,
    costForGroupINR: trainPerPerson * pax,
    scenicNote: destClean.includes('goa')
      ? 'Dudhsagar waterfall bridge view, mountain gorges, and Western Ghats railway tunnels.'
      : 'Relaxed countryside farmland views and peaceful carriage travel.',
    isRecommended: selectedTransport === 'Train'
  });

  // Road Cab option
  const cabBase = destClean.includes('mysuru') ? 3500 : destClean.includes('coorg') ? 5500 : 9500;
  const driveHours = destClean.includes('mysuru') ? 3.5 : destClean.includes('coorg') ? 5.5 : 9;
  modes.push({
    mode: 'Road Cab',
    doorToDoorHoursText: `approx. ${driveHours}h road journey`,
    doorToDoorHours: driveHours,
    costForGroupINR: cabBase,
    scenicNote: 'Chorla Ghat winding highway forest canopy and scenic roadside filter coffee stops.',
    isRecommended: selectedTransport === 'Cab' || selectedTransport === 'Road'
  });

  return modes;
}

