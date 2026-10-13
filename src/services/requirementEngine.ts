/**
 * AeroDAG Adaptive Natural-Language Requirement & Preference Engine
 * 
 * Implements intelligent conversational requirement extraction,
 * single-question adaptive sequence (Minimum-Question Principle),
 * information classification states (KNOWN, INFERABLE, OPTIONAL, REQUIRED, CONTEXTUALLY_REQUIRED),
 * and dynamic context updates.
 */

import { Currency, TripScope } from '../types/travelBooking';
import { inferTripScope } from './travelCatalog';
import { RequirementDependencyGraph } from './requirement/dependencyGraph';
import { getSeasonOptionsForDestination } from './destinationsData';

export type RequirementStatus =
  | 'KNOWN'
  | 'INFERABLE'
  | 'OPTIONAL'
  | 'REQUIRED'
  | 'CONTEXTUALLY_REQUIRED'
  | 'UNKNOWN'
  | 'VERIFIED';

export type UserFacingTag = 'stated' | 'assumed' | 'needed';

export interface TripContext {
  destination: string | null;
  origin: string | null;
  dates: string | null;
  durationDays: number | null;
  partyType: 'solo' | 'couple' | 'family' | 'friends' | 'seniors' | 'complex_group' | null;
  totalTravellers: number | null;
  adultsCount: number | null;
  childrenCount: number | null;
  childrenAges: number[];
  infantsCount: number | null;
  seniorsCount: number | null;
  budgetTotalINR: number | null;
  budgetTier: 'Frugal' | 'Comfortable' | 'Premium' | 'Luxury' | 'Budget' | null;
  currency: Currency;
  accommodationPreference: string | null;
  accommodationType?: string | null;
  roomCapacityNeeded?: number | null;
  activities: string[];
  transportMode: 'Flight' | 'Train' | 'Combo' | 'Cab' | null;
  walkingIntensity: 'Low' | 'Moderate' | 'Active' | null;
  dietaryPreference: 'Vegetarian' | 'Jain' | 'Non-Veg' | 'Any' | null;
  luggage: 'Light' | 'Standard' | 'Heavy' | 'Not sure' | null;
  accessibilityRequired: boolean;
  travelStyle: 'Relaxed' | 'Balanced' | 'Action-Packed' | 'Comfortable' | null;
  priority: string | null;
  scope: TripScope | null;
  notes: string[];
  travelerNationality?: string | null;
  passportType?: 'ORDINARY' | 'DIPLOMATIC' | 'OFFICIAL' | 'SERVICE' | string | null;
  residenceCountry?: string | null;
  transitCountries?: string[];
  travelersProfiles?: Array<{
    travelerId: string;
    nationality: string;
    passportType?: string;
  }>;
  fieldSources?: Record<string, UserFacingTag>;
  /** Ages of senior travellers (60+), when known. */
  seniorsAges?: number[];
  /** Which parser understood the request: Gemini via /api/parse-trip, or the rule-based fallback. */
  parseMode?: 'ai' | 'basic';
}

export interface EngineQuestion {
  id: string;
  requirementKey: string;
  questionText: string;
  subText?: string;
  quickOptions: Array<{ label: string; value: any; subtext?: string }>;
  allowFreeText: boolean;
  freeTextPlaceholder?: string;
  multiSelect?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  suggestedOptions?: Array<{ label: string; value: any; subtext?: string }>;
  isCompletionAction?: boolean;
}

export interface RequirementEntity {
  key: string;
  label: string;
  displayValue: string;
  status: RequirementStatus;
  userFacingTag: UserFacingTag;
  assumedDescription?: string;
  isEditable?: boolean;
}

export class RequirementEngine {
  static createEmptyContext(): TripContext {
    return {
      destination: null,
      origin: null,
      dates: null,
      durationDays: null,
      partyType: null,
      totalTravellers: null,
      adultsCount: null,
      childrenCount: null,
      childrenAges: [],
      infantsCount: null,
      seniorsCount: null,
      budgetTotalINR: null,
      budgetTier: null,
      currency: 'INR',
      accommodationPreference: null,
      activities: [],
      transportMode: null,
      walkingIntensity: null,
      dietaryPreference: null,
      luggage: null,
      accessibilityRequired: false,
      travelStyle: null,
      priority: null,
      scope: null,
      notes: [],
      travelerNationality: null,
      passportType: null,
      residenceCountry: null,
      transitCountries: [],
      travelersProfiles: [],
      fieldSources: {}
    };
  }

  /**
   * Extract entities and update the trip context from natural language
   */
  static extractAndMerge(
    existingContext: TripContext,
    userMessage: string
  ): { context: TripContext; newlyExtracted: string[] } {
    const context: TripContext = { ...existingContext };
    const lower = userMessage.toLowerCase().trim();
    const newlyExtracted: string[] = [];

    // 1. Destination
    if (!context.destination || lower.includes('change destination') || lower.includes('to goa') || lower.includes('to vietnam')) {
      if (lower.includes('vietnam')) {
        context.destination = 'Vietnam (Hanoi & Halong Bay)';
        newlyExtracted.push('Destination: Vietnam');
      } else if (lower.includes('goa')) {
        context.destination = 'Goa, India';
        newlyExtracted.push('Destination: Goa');
      } else if (lower.includes('singapore')) {
        context.destination = 'Singapore';
        newlyExtracted.push('Destination: Singapore');
      } else if (lower.includes('thailand') || lower.includes('bangkok') || lower.includes('phuket')) {
        context.destination = 'Thailand (Bangkok & Phuket)';
        newlyExtracted.push('Destination: Thailand');
      } else if (lower.includes('japan') || lower.includes('tokyo') || lower.includes('kyoto')) {
        context.destination = 'Tokyo & Kyoto, Japan';
        newlyExtracted.push('Destination: Japan');
      } else if (lower.includes('bali')) {
        context.destination = 'Bali, Indonesia';
        newlyExtracted.push('Destination: Bali');
      } else if (lower.includes('kerala') || lower.includes('munnar') || lower.includes('alleppey')) {
        context.destination = 'Kerala, India';
        newlyExtracted.push('Destination: Kerala');
      } else if (lower.includes('rajasthan') || lower.includes('jaipur') || lower.includes('udaipur')) {
        context.destination = 'Rajasthan (Jaipur & Udaipur)';
        newlyExtracted.push('Destination: Rajasthan');
      } else if (lower.includes('kashmir') || lower.includes('srinagar')) {
        context.destination = 'Kashmir (Srinagar & Gulmarg)';
        newlyExtracted.push('Destination: Kashmir');
      } else if (lower.includes('himachal') || lower.includes('manali')) {
        context.destination = 'Himachal (Manali)';
        newlyExtracted.push('Destination: Himachal');
      } else if (lower.includes('europe') || lower.includes('paris') || lower.includes('switzerland')) {
        context.destination = 'Europe (Paris & Switzerland)';
        newlyExtracted.push('Destination: Europe');
      } else if (lower.includes('dubai') || lower.includes('uae')) {
        context.destination = 'Dubai, UAE';
        newlyExtracted.push('Destination: Dubai');
      }
    }

    // 2. Origin
    if (!context.origin || lower.includes('from blr') || lower.includes('from delhi') || lower.includes('from mumbai')) {
      if (lower.includes('bengaluru') || lower.includes('bangalore') || lower.includes('blr')) {
        context.origin = 'Bengaluru (BLR)';
        newlyExtracted.push('Origin: Bengaluru');
      } else if (lower.includes('delhi') || lower.includes('del')) {
        context.origin = 'Delhi (DEL)';
        newlyExtracted.push('Origin: Delhi');
      } else if (lower.includes('mumbai') || lower.includes('bom')) {
        context.origin = 'Mumbai (BOM)';
        newlyExtracted.push('Origin: Mumbai');
      } else if (lower.includes('chennai') || lower.includes('maa')) {
        context.origin = 'Chennai (MAA)';
        newlyExtracted.push('Origin: Chennai');
      } else if (lower.includes('hyderabad') || lower.includes('hyd')) {
        context.origin = 'Hyderabad (HYD)';
        newlyExtracted.push('Origin: Hyderabad');
      } else if (lower.includes('kolkata') || lower.includes('ccu')) {
        context.origin = 'Kolkata (CCU)';
        newlyExtracted.push('Origin: Kolkata');
      } else if (lower.includes('sfo') || lower.includes('san francisco')) {
        context.origin = 'San Francisco (SFO)';
        newlyExtracted.push('Origin: San Francisco');
      }
    }

    // Automatically set scope (domestic vs international)
    if (context.destination) {
      context.scope = inferTripScope(context.origin || '', context.destination);
    }

    // 3. Duration & Dates
    const durationMatch = lower.match(/(\d+)\s*[- ]?(days|day|nights|night)/);
    if (durationMatch) {
      context.durationDays = parseInt(durationMatch[1], 10);
      newlyExtracted.push(`Duration: ${context.durationDays} Days`);
    } else if (lower.includes('a week') || lower.includes('1 week') || lower.includes('one week')) {
      context.durationDays = 7;
      newlyExtracted.push('Duration: 7 Days (1 Week)');
    } else if (lower.includes('weekend')) {
      context.durationDays = 3;
      newlyExtracted.push('Duration: 3 Days (Weekend)');
    }

    if (!context.dates || lower.includes('in nov') || lower.includes('in dec')) {
      if (lower.includes('november') || lower.includes('nov')) {
        context.dates = 'November 2026';
        newlyExtracted.push('Dates: November 2026');
      } else if (lower.includes('december') || lower.includes('dec')) {
        context.dates = 'December 2026';
        newlyExtracted.push('Dates: December 2026');
      } else if (lower.includes('january') || lower.includes('jan')) {
        context.dates = 'January 2027';
        newlyExtracted.push('Dates: January 2027');
      } else if (lower.includes('next month')) {
        context.dates = 'Next Month';
        newlyExtracted.push('Dates: Next Month');
      }
    }

    // 4. Traveller Group Makeup
    // Seniors / Accessibility
    if (lower.includes('elderly mother') || lower.includes('elderly parents') || lower.includes('elderly') || lower.includes('senior')) {
      context.seniorsCount = (context.seniorsCount || 0) + 1;
      context.accessibilityRequired = true;
      context.walkingIntensity = 'Low';
      if (!context.notes.includes('Senior traveler; low walking intensity')) {
        context.notes.push('Senior traveler; low walking intensity');
      }
      newlyExtracted.push('Senior Traveler (Low Walking)');
    }

    // Explicit adults
    const adultsMatch = lower.match(/(\d+)\s*adults?/);
    if (adultsMatch) {
      context.adultsCount = parseInt(adultsMatch[1], 10);
      newlyExtracted.push(`Adults: ${context.adultsCount}`);
    } else if (lower.includes('me, my wife') || lower.includes('me and my wife') || lower.includes('with my wife') || lower.includes('with my partner') || lower.includes('me and my partner')) {
      context.adultsCount = 2;
      newlyExtracted.push('Adults: 2 (Me & spouse)');
    }

    // Explicit children
    const kidsMatch = lower.match(/(\d+)\s*(kids?|children|child)/);
    if (kidsMatch) {
      context.childrenCount = parseInt(kidsMatch[1], 10);
      context.partyType = 'family';
      newlyExtracted.push(`Children: ${context.childrenCount}`);
    } else if (lower.includes('daughter') || lower.includes('son') || lower.includes('kid')) {
      if (context.childrenCount === null) {
        context.childrenCount = 1;
        context.partyType = 'family';
        newlyExtracted.push('Children: 1 Child');
      }
    }

    // Children Ages
    const cleanedText = lower.replace(/[.!?,;]/g, ' ').trim();
    const multiAgesMatch = lower.match(/(?:aged|ages?)\s*(\d+)\s*(?:and|&|,)\s*(\d+)/);
    if (multiAgesMatch) {
      context.childrenAges = [parseInt(multiAgesMatch[1], 10), parseInt(multiAgesMatch[2], 10)];
      context.childrenCount = context.childrenAges.length;
      context.partyType = 'family';
      newlyExtracted.push(`Child Ages: ${context.childrenAges.join(' & ')}`);
    } else {
      const singleAgeMatch = lower.match(/(\d+)\s*[- ]?year[- ]?old/);
      if (singleAgeMatch) {
        const age = parseInt(singleAgeMatch[1], 10);
        context.childrenAges = [age];
        if (!context.childrenCount) context.childrenCount = 1;
        context.partyType = 'family';
        newlyExtracted.push(`Child Age: ${age}`);
      } else {
        // Direct answer like "8 and 11", "8, 11", "8 and 11.", "they are 8 and 11"
        const standaloneAgesMatch = cleanedText.match(/(?:^|\b)(?:they are\s+|kids are\s+|ages?\s+)?(\d{1,2})\s+(?:and|&)\s+(\d{1,2})(?:\s*(?:years?|yrs|yo)?)?(?:\b|$)/) ||
                                    cleanedText.match(/(?:^|\b)(\d{1,2})\s*,\s*(\d{1,2})(?:\b|$)/);
        if (standaloneAgesMatch) {
          context.childrenAges = [parseInt(standaloneAgesMatch[1], 10), parseInt(standaloneAgesMatch[2], 10)];
          context.childrenCount = context.childrenAges.length;
          newlyExtracted.push(`Child Ages: ${context.childrenAges.join(' & ')}`);
        }
      }
    }

    // Party Type inferences
    if (lower.includes('family') || (context.childrenCount && context.childrenCount > 0)) {
      context.partyType = 'family';
    } else if (lower.includes('honeymoon') || lower.includes('couple') || lower.includes('with my wife') || lower.includes('with my partner')) {
      context.partyType = 'couple';
      if (!context.adultsCount) context.adultsCount = 2;
      if (context.childrenCount === null) context.childrenCount = 0;
    } else if (lower.includes('solo') || lower.includes('alone') || lower.includes('for myself')) {
      context.partyType = 'solo';
      context.adultsCount = 1;
      context.childrenCount = 0;
    }

    // Update total travellers
    if (context.adultsCount !== null) {
      const k = context.childrenCount || 0;
      const s = context.seniorsCount || 0;
      context.totalTravellers = context.adultsCount + k + s;
    }

    // 5. Budget Extraction
    const cleanLowerBudget = lower.replace(/,/g, '');
    const budgetMatch = cleanLowerBudget.match(/(?:budget\s*(?:to|is|of|under|around)?\s*)?(?:₹\s*)?(\d+(?:\.\d+)?)\s*(lakh|lac|k|000)?/i);
    if (lower.includes('1.5 lakh') || cleanLowerBudget.includes('150000') || lower.includes('1.5l')) {
      context.budgetTotalINR = 150000;
      context.budgetTier = 'Comfortable';
      newlyExtracted.push('Budget: ₹1,50,000');
    } else if (lower.includes('1 lakh') || cleanLowerBudget.includes('100000') || lower.includes('100k')) {
      context.budgetTotalINR = 100000;
      context.budgetTier = 'Frugal';
      newlyExtracted.push('Budget: ₹1,00,000');
    } else if (cleanLowerBudget.includes('80000') || lower.includes('80k')) {
      context.budgetTotalINR = 80000;
      context.budgetTier = 'Comfortable';
      newlyExtracted.push('Budget: ₹80,000');
    } else if (cleanLowerBudget.includes('70000') || lower.includes('70k')) {
      context.budgetTotalINR = 70000;
      context.budgetTier = 'Comfortable';
      newlyExtracted.push('Budget: ₹70,000');
    } else if (cleanLowerBudget.includes('60000') || lower.includes('60k')) {
      context.budgetTotalINR = 60000;
      context.budgetTier = 'Frugal';
      newlyExtracted.push('Budget: ₹60,000');
    } else if (lower.includes('2 lakh') || cleanLowerBudget.includes('200000') || lower.includes('200k')) {
      context.budgetTotalINR = 200000;
      context.budgetTier = 'Comfortable';
      newlyExtracted.push('Budget: ₹2,00,000');
    } else if (cleanLowerBudget.includes('20000') || lower.includes('20k')) {
      context.budgetTotalINR = 20000;
      context.budgetTier = 'Frugal';
      newlyExtracted.push('Budget: ₹20,000');
    } else if (budgetMatch && (lower.includes('budget') || lower.includes('₹') || lower.includes('inr') || lower.includes('lakh'))) {
      const num = parseFloat(budgetMatch[1]);
      const unit = (budgetMatch[2] || '').toLowerCase();
      const calculated = unit.includes('lakh') || unit.includes('lac') ? num * 100000 : (unit.includes('k') ? num * 1000 : num);
      if (calculated >= 5000) {
        context.budgetTotalINR = calculated;
        newlyExtracted.push(`Budget: ₹${calculated.toLocaleString()}`);
      }
    }

    // 6. Hotel & Walking & Travel Style
    if (lower.includes('family-friendly') || lower.includes('family friendly')) {
      context.accommodationPreference = 'Comfortable Family-Friendly Suite';
      if (!context.priority) context.priority = 'Family Friendly';
      newlyExtracted.push('Hotel: Family-Friendly');
    } else if (lower.includes('comfortable') || lower.includes('comfort')) {
      if (!context.accommodationPreference) context.accommodationPreference = 'Comfortable 3-4 Star';
      context.travelStyle = 'Comfortable';
      newlyExtracted.push('Style: Comfortable');
    } else if (lower.includes('luxury') || lower.includes('5-star')) {
      context.accommodationPreference = '4-5 Star Luxury Resort';
      context.budgetTier = 'Luxury';
      newlyExtracted.push('Lodging: Luxury');
    }

    if (lower.includes("don't want too much walking") || lower.includes('low walking') || lower.includes('less walking') || lower.includes('gentle pacing')) {
      context.walkingIntensity = 'Low';
      context.travelStyle = 'Relaxed';
      newlyExtracted.push('Walking: Low Intensity');
    }

    if (lower.includes('pure veg') || lower.includes('vegetarian')) {
      context.dietaryPreference = 'Vegetarian';
      newlyExtracted.push('Dietary: Vegetarian');
    } else if (lower.includes('jain')) {
      context.dietaryPreference = 'Jain';
      newlyExtracted.push('Dietary: Jain');
    }

    // 7. Nationality / Passport Extraction (Phase 8.4)
    // NEVER infer nationality from user location, IP, name, currency, or language!
    if (lower.includes('indian passport') || lower.includes('indian citizen') || lower.includes('india passport') || lower.includes('indian nationality')) {
      context.travelerNationality = 'IN';
      newlyExtracted.push('Nationality: Indian Passport (IN)');
    } else if (lower.includes('us passport') || lower.includes('american passport') || lower.includes('united states passport')) {
      context.travelerNationality = 'US';
      newlyExtracted.push('Nationality: US Passport (US)');
    } else if (lower.includes('uk passport') || lower.includes('british passport')) {
      context.travelerNationality = 'GB';
      newlyExtracted.push('Nationality: UK Passport (GB)');
    } else if (lower.includes('singapore passport') || lower.includes('singaporean passport')) {
      context.travelerNationality = 'SG';
      newlyExtracted.push('Nationality: Singapore Passport (SG)');
    } else if (lower.match(/\bpassport\s*:\s*([a-z]{2,})\b/i)) {
      const match = lower.match(/\bpassport\s*:\s*([a-z]{2,})\b/i);
      if (match) {
        context.travelerNationality = match[1].toUpperCase();
        newlyExtracted.push(`Nationality: ${context.travelerNationality}`);
      }
    }

    // Transit mentions
    if (lower.includes('transit via frankfurt') || lower.includes('transit in germany') || lower.includes('layover in frankfurt')) {
      context.transitCountries = [...(context.transitCountries || []), 'Germany'];
      newlyExtracted.push('Transit: Germany');
    } else if (lower.includes('transit via singapore') || lower.includes('layover at changi') || lower.includes('transit in singapore')) {
      context.transitCountries = [...(context.transitCountries || []), 'Singapore'];
      newlyExtracted.push('Transit: Singapore');
    }

    return { context, newlyExtracted };
  }

  /**
   * Evaluates whether sufficient information exists to create a useful first trip draft.
   * Following the Minimum-Question Principle:
   * Stop asking as soon as core parameters are known!
   */
  static isSufficientToPlan(context: TripContext): boolean {
    // 1. Destination MUST be known
    if (!context.destination) return false;

    // 2. Origin MUST be known
    if (!context.origin) return false;

    // 3. Travel dates are strictly REQUIRED for pricing in Phase 3
    if (!context.dates || context.dates.trim() === '') return false;

    // 4. Adults Count MUST be known
    if (context.adultsCount == null) return false;

    // 5. If children are traveling, their ages MUST be known
    if (context.childrenCount && context.childrenCount > 0 && (!context.childrenAges || context.childrenAges.length === 0)) {
      return false;
    }

    // 6. Budget MUST be known
    if (context.budgetTotalINR == null && context.budgetTier == null) {
      return false;
    }

    // All core essential fields known!
    return true;
  }

  /**
   * Returns list of missing required field names
   */
  static getMissingFields(context: TripContext): string[] {
    const missing: string[] = [];
    if (!context.destination) missing.push('destination');
    if (!context.origin) missing.push('origin');
    if (!context.dates || context.dates.trim() === '') missing.push('dates');
    if (context.adultsCount == null) missing.push('adults');
    if (
      context.childrenCount &&
      context.childrenCount > 0 &&
      (!context.childrenAges || context.childrenAges.length === 0)
    ) {
      missing.push('childrenAges');
    }
    if (context.budgetTotalINR == null && context.budgetTier == null) {
      missing.push('budget');
    }
    return missing;
  }

  /**
   * Determine the single next highest-value question.
   * NEVER asks for fields that are already KNOWN.
   */
  static getNextQuestion(context: TripContext): EngineQuestion | null {
    // 1. Missing Destination
    if (!context.destination) {
      return {
        id: 'q_destination',
        requirementKey: 'destination',
        questionText: 'Where would you like to travel?',
        subText: 'Select a destination or type any city/country in India or abroad.',
        quickOptions: [
          { label: 'Goa', value: 'Goa, India' },
          { label: 'Vietnam (Hanoi & Halong Bay)', value: 'Vietnam (Hanoi & Halong Bay)' },
          { label: 'Singapore', value: 'Singapore' },
          { label: 'Thailand', value: 'Thailand' },
          { label: 'Tokyo & Kyoto, Japan', value: 'Tokyo & Kyoto, Japan' },
          { label: 'Kerala', value: 'Kerala, India' }
        ],
        allowFreeText: true,
        freeTextPlaceholder: 'e.g. Goa, Vietnam, Singapore, Rajasthan...'
      };
    }

    // 2. Missing Origin
    if (!context.origin) {
      return {
        id: 'q_origin',
        requirementKey: 'origin',
        questionText: 'Which city will you be departing from?',
        subText: 'We use this to find the best direct flights or trains.',
        quickOptions: [
          { label: 'Bengaluru (BLR)', value: 'Bengaluru (BLR)' },
          { label: 'Delhi (DEL)', value: 'Delhi (DEL)' },
          { label: 'Mumbai (BOM)', value: 'Mumbai (BOM)' },
          { label: 'Chennai (MAA)', value: 'Chennai (MAA)' }
        ],
        allowFreeText: true,
        freeTextPlaceholder: 'e.g. Bengaluru, Delhi, Mumbai, Hyderabad...'
      };
    }

    // 3. Missing Dates (Travel dates are strictly REQUIRED for pricing in Phase 3)
    if (!context.dates || context.dates.trim() === '') {
      const seasonOpts = getSeasonOptionsForDestination(context.destination || 'Goa');
      return {
        id: 'q_dates',
        requirementKey: 'dates',
        questionText: 'One thing changes the price most: when are you going?',
        subText: 'Travel dates determine seasonal airline fares and hotel rates.',
        quickOptions: seasonOpts.map((opt) => ({
          label: opt.seasonType === 'peak'
            ? `${opt.dates} · May exceed budget`
            : opt.label,
          value: opt.dates,
          subtext: opt.sourceLabel
        })),
        allowFreeText: true,
        freeTextPlaceholder: 'e.g. 14–20 Nov, mid-December, 10–17 Jan...'
      };
    }

    // 4. Missing Adults Count / Travellers
    if (context.adultsCount == null) {
      return {
        id: 'q_adults',
        requirementKey: 'adults',
        questionText: 'How many people will be travelling?',
        subText: 'Tell us how many adults and children.',
        quickOptions: [
          { label: '2 Adults', value: '2 adults', subtext: 'Couple' },
          { label: '2 Adults & 2 Children', value: '2 adults and 2 children', subtext: 'Family' },
          { label: '1 Adult', value: '1 adult', subtext: 'Solo' },
          { label: '4 Adults', value: '4 adults', subtext: 'Group / Friends' }
        ],
        allowFreeText: true,
        freeTextPlaceholder: 'e.g. 2 adults and 2 children, or 2 adults'
      };
    }

    // 5. If children traveling, ask Children Ages (Contextually Required)
    if (context.childrenCount && context.childrenCount > 0 && (!context.childrenAges || context.childrenAges.length === 0)) {
      return {
        id: 'q_children_ages',
        requirementKey: 'children_ages',
        questionText: 'How old are the children?',
        subText: 'Child ages help us verify airline fares and suitable hotel bed layouts.',
        quickOptions: [
          { label: '8 and 11', value: [8, 11] },
          { label: '5 and 9', value: [5, 9] },
          { label: '10 years old', value: [10] },
          { label: 'Toddlers (under 4)', value: [2, 3] }
        ],
        allowFreeText: true,
        freeTextPlaceholder: 'e.g. 8 and 11, or 10'
      };
    }

    // 6. Missing Budget
    if (context.budgetTotalINR == null && context.budgetTier == null) {
      const isDomestic = context.scope === 'domestic';
      return {
        id: 'q_budget',
        requirementKey: 'budget',
        questionText: 'Do you have an approximate budget in mind for the trip?',
        subText: 'Covers travel, hotels, activities, and meals.',
        quickOptions: isDomestic
          ? [
              { label: 'Under ₹60,000', value: 60000, subtext: 'Frugal / Value' },
              { label: '₹1 Lakh', value: 100000, subtext: 'Comfortable' },
              { label: '₹1.5 Lakh+', value: 150000, subtext: 'Premium' }
            ]
          : [
              { label: '₹1 Lakh', value: 100000, subtext: 'Smart Value' },
              { label: '₹1.5 Lakh', value: 150000, subtext: 'Comfortable' },
              { label: '₹2 Lakh+', value: 200000, subtext: 'Premium' }
            ],
        allowFreeText: true,
        freeTextPlaceholder: 'e.g. ₹1 lakh, 60000, or 1.5L'
      };
    }

    // 7. International Visa Requirement Check (Only ask when destination is international)
    if (context.scope === 'international' && context.travelerNationality == null) {
      return {
        id: 'q_nationality',
        requirementKey: 'travelerNationality',
        questionText: 'What passport will you be travelling on?',
        subText: 'Visa and entry regulations depend strictly on your nationality and passport type.',
        quickOptions: [
          { label: 'Indian Passport (IN)', value: 'IN' },
          { label: 'US Passport (US)', value: 'US' },
          { label: 'UK Passport (GB)', value: 'GB' },
          { label: 'Singapore Passport (SG)', value: 'SG' }
        ],
        allowFreeText: true,
        freeTextPlaceholder: 'e.g. Indian, US, British, Canadian...'
      };
    }

    // All core requirements satisfied! Stop questioning!
    return null;
  }

  /**
   * Classify all requirements according to user-facing information states:
   * 'stated' (the user said it), 'assumed' (we inferred it — editable), 'needed' (missing required field).
   */
  static evaluateRequirementClassification(context: TripContext): RequirementEntity[] {
    const hasKids = context.childrenCount !== null && context.childrenCount > 0;
    const isDomestic = context.scope === 'domestic' ||
      Boolean(context.destination && (
        context.destination.toLowerCase().includes('goa') ||
        context.destination.toLowerCase().includes('kerala') ||
        context.destination.toLowerCase().includes('rajasthan') ||
        context.destination.toLowerCase().includes('india')
      ));

    const entities: RequirementEntity[] = [
      {
        key: 'destination',
        label: 'Destination',
        displayValue: context.destination || 'Destination needed',
        status: context.destination ? 'KNOWN' : 'REQUIRED',
        userFacingTag: context.destination ? 'stated' : 'needed'
      },
      {
        key: 'origin',
        label: 'Departure City',
        displayValue: context.origin || (context.destination ? 'Bengaluru (BLR)' : 'Departure city needed'),
        status: context.origin ? 'KNOWN' : (context.destination ? 'INFERABLE' : 'REQUIRED'),
        userFacingTag: context.origin ? 'stated' : 'assumed',
        assumedDescription: !context.origin && context.destination ? 'Inferred nearest major airport' : undefined,
        isEditable: true
      },
      {
        key: 'dates',
        label: 'Travel Dates',
        displayValue: context.dates || 'Dates needed for pricing',
        status: context.dates ? 'KNOWN' : 'REQUIRED',
        userFacingTag: context.dates ? 'stated' : 'needed',
        isEditable: true
      },
      {
        key: 'travellers',
        label: 'Travellers',
        displayValue: context.adultsCount !== null
          ? `${context.totalTravellers || context.adultsCount} Guests (${context.adultsCount} Adults${hasKids ? `, ${context.childrenCount} Minors` : ''}${context.seniorsCount ? `, ${context.seniorsCount} Seniors` : ''})`
          : 'Party size needed',
        status: context.adultsCount !== null ? 'KNOWN' : 'REQUIRED',
        userFacingTag: context.adultsCount !== null ? 'stated' : 'needed',
        isEditable: true
      }
    ];

    if (hasKids) {
      entities.push({
        key: 'childrenAges',
        label: 'Children Ages',
        displayValue: context.childrenAges.length > 0
          ? `${context.childrenAges.join(', ')} yrs`
          : 'Ages needed for bed layout',
        status: context.childrenAges.length > 0 ? 'KNOWN' : 'CONTEXTUALLY_REQUIRED',
        userFacingTag: context.childrenAges.length > 0 ? 'stated' : 'needed',
        isEditable: true
      });
    }

    entities.push({
      key: 'budget',
      label: 'Budget Target',
      displayValue: context.budgetTotalINR
        ? `₹${context.budgetTotalINR.toLocaleString()}`
        : (context.budgetTier ? `Tier: ${context.budgetTier}` : 'Budget needed'),
      status: (context.budgetTotalINR !== null || context.budgetTier !== null) ? 'KNOWN' : 'REQUIRED',
      userFacingTag: (context.budgetTotalINR !== null || context.budgetTier !== null) ? 'stated' : 'needed',
      isEditable: true
    });

    // Hotel preference: "Comfortable family-friendly hotel" → assumed "3–4★ family room with pool", editable.
    const hasExplicitHotel = Boolean(context.accommodationPreference && !context.accommodationPreference.toLowerCase().includes('comfortable') && !context.accommodationPreference.toLowerCase().includes('family'));

    entities.push({
      key: 'hotelPreference',
      label: 'Accommodation',
      displayValue: hasExplicitHotel
        ? (context.accommodationPreference || '3–4★ family room with pool')
        : '3–4★ family room with pool',
      status: hasExplicitHotel ? 'KNOWN' : 'INFERABLE',
      userFacingTag: hasExplicitHotel ? 'stated' : 'assumed',
      assumedDescription: 'Inferred for family comfort with swimming pool and included breakfast',
      isEditable: true
    });

    if (context.walkingIntensity) {
      entities.push({
        key: 'walkingIntensity',
        label: 'Walking & Pacing',
        displayValue: `${context.walkingIntensity} walking intensity`,
        status: 'KNOWN',
        userFacingTag: 'stated',
        isEditable: true
      });
    }

    // Nationality: HIDE row on domestic trip!
    if (!isDomestic) {
      entities.push({
        key: 'nationality',
        label: 'Traveler Nationality',
        displayValue: context.travelerNationality ? `Passport: ${context.travelerNationality}` : 'Nationality needed',
        status: context.travelerNationality ? 'KNOWN' : 'REQUIRED',
        userFacingTag: context.travelerNationality ? 'stated' : 'needed',
        isEditable: true
      });
    }

    return entities;
  }

  /**
   * Phase 9.1: Comprehensive dependency graph evaluation
   */
  static evaluateGraph(context: TripContext) {
    return RequirementDependencyGraph.evaluateGraph(context);
  }

  /**
   * Phase 9.1: Detect multi-variable contradictions and constraints
   */
  static detectConflicts(context: TripContext) {
    return RequirementDependencyGraph.detectConflicts(context);
  }
}


