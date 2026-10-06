/**
 * AeroDAG Dynamic Natural-Language Requirement & Preference Engine
 * Implements conversational requirement extraction, live context updates,
 * adaptive questioning, and zero redundant questions.
 */

export interface TripContext {
  destination: string | null;
  origin: string | null;
  dates: string | null;
  durationDays: number | null;
  partyType: 'solo' | 'couple' | 'family' | 'friends' | 'seniors' | 'complex_group' | null;
  adultsCount: number | null;
  childrenCount: number | null;
  childrenAges: number[];
  seniorsCount: number | null;
  totalTravellers: number | null;
  budgetTotalINR: number | null;
  budgetTier: 'Budget' | 'Comfortable' | 'Premium' | 'Luxury' | null;
  walkingIntensity: 'Low' | 'Moderate' | 'Active' | null;
  travelStyle: 'Relaxed' | 'Balanced' | 'Action-Packed' | null;
  priority: 'Family Friendly' | 'Lowest Price' | 'Best Hotel' | 'Fastest Travel' | 'Romantic' | 'Relaxed' | null;
  accommodationType: string | null;
  activities: string[];
  luggage: 'Light' | 'Standard' | 'Heavy' | 'Not sure' | null;
  roomCapacityNeeded: number | null;
  roomsCountNeeded: number | null;
  accessibilityRequired: boolean;
  notes: string[];
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
  status: 'KNOWN' | 'INFERABLE' | 'CONTEXTUALLY_REQUIRED' | 'DEFERRABLE';
}

export class RequirementEngine {
  static createEmptyContext(): TripContext {
    return {
      destination: null,
      origin: null,
      dates: null,
      durationDays: null,
      partyType: null,
      adultsCount: null,
      childrenCount: null,
      childrenAges: [],
      seniorsCount: null,
      totalTravellers: null,
      budgetTotalINR: null,
      budgetTier: null,
      walkingIntensity: null,
      travelStyle: null,
      priority: null,
      accommodationType: null,
      activities: [],
      luggage: null,
      roomCapacityNeeded: null,
      roomsCountNeeded: null,
      accessibilityRequired: false,
      notes: []
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
    if (!context.destination) {
      if (lower.includes('vietnam')) {
        context.destination = 'Vietnam (Hanoi & Halong Bay)';
        newlyExtracted.push('Destination: Vietnam');
      } else if (lower.includes('goa')) {
        context.destination = 'Goa, India';
        newlyExtracted.push('Destination: Goa');
      } else if (lower.includes('rajasthan') || lower.includes('jaipur') || lower.includes('udaipur')) {
        context.destination = 'Rajasthan (Jaipur & Udaipur)';
        newlyExtracted.push('Destination: Rajasthan');
      } else if (lower.includes('japan') || lower.includes('tokyo') || lower.includes('kyoto')) {
        context.destination = 'Tokyo & Kyoto, Japan';
        newlyExtracted.push('Destination: Japan');
      } else if (lower.includes('bali')) {
        context.destination = 'Bali, Indonesia';
        newlyExtracted.push('Destination: Bali');
      } else if (lower.includes('kerala') || lower.includes('munnar') || lower.includes('alleppey')) {
        context.destination = 'Kerala, India';
        newlyExtracted.push('Destination: Kerala');
      } else if (lower.includes('europe') || lower.includes('paris') || lower.includes('switzerland')) {
        context.destination = 'Europe (Paris & Switzerland)';
        newlyExtracted.push('Destination: Europe');
      } else if (lower.includes('thailand') || lower.includes('bangkok') || lower.includes('phuket')) {
        context.destination = 'Thailand';
        newlyExtracted.push('Destination: Thailand');
      } else if (lower.includes('singapore')) {
        context.destination = 'Singapore';
        newlyExtracted.push('Destination: Singapore');
      } else if (lower.includes('dubai') || lower.includes('uae')) {
        context.destination = 'Dubai, UAE';
        newlyExtracted.push('Destination: Dubai');
      } else if (lower.includes('kashmir') || lower.includes('srinagar')) {
        context.destination = 'Kashmir (Srinagar & Gulmarg)';
        newlyExtracted.push('Destination: Kashmir');
      } else if (lower.includes('himachal') || lower.includes('manali')) {
        context.destination = 'Himachal (Manali)';
        newlyExtracted.push('Destination: Himachal');
      } else if (lower.includes('weekend') && (lower.includes('bengaluru') || lower.includes('bangalore'))) {
        context.destination = 'Coorg & Kabini, Karnataka';
        newlyExtracted.push('Destination: Coorg & Kabini');
      }
    }

    // 2. Origin
    if (!context.origin) {
      if (lower.includes('bengaluru') || lower.includes('bangalore') || lower.includes('blr')) {
        context.origin = 'Bengaluru (BLR)';
        newlyExtracted.push('Origin: Bengaluru');
      } else if (lower.includes('delhi') || lower.includes('del')) {
        context.origin = 'Delhi (DEL)';
        newlyExtracted.push('Origin: Delhi');
      } else if (lower.includes('mumbai') || lower.includes('bom')) {
        context.origin = 'Mumbai (BOM)';
        newlyExtracted.push('Origin: Mumbai');
      } else if (lower.includes('sfo') || lower.includes('san francisco')) {
        context.origin = 'San Francisco (SFO)';
        newlyExtracted.push('Origin: San Francisco');
      }
    }

    // 3. Duration & Dates
    if (!context.durationDays) {
      const daysMatch = lower.match(/(\d+)\s*[- ]?(days|day|nights|night)/);
      if (daysMatch) {
        context.durationDays = parseInt(daysMatch[1], 10);
        newlyExtracted.push(`Duration: ${context.durationDays} Days`);
      } else if (lower.includes('a week') || lower.includes('1 week') || lower.includes('one week')) {
        context.durationDays = 7;
        newlyExtracted.push('Duration: 7 Days (1 Week)');
      } else if (lower.includes('weekend')) {
        context.durationDays = 3;
        newlyExtracted.push('Duration: 3 Days (Weekend)');
      }
    }

    if (!context.dates) {
      if (lower.includes('november') || lower.includes('nov')) {
        context.dates = 'November 2026';
        newlyExtracted.push('Travel Month: November');
      } else if (lower.includes('december') || lower.includes('dec')) {
        context.dates = 'December 2026';
        newlyExtracted.push('Travel Month: December');
      } else if (lower.includes('next month')) {
        context.dates = 'Next Month';
        newlyExtracted.push('Dates: Next Month');
      }
    }

    // 4. Traveller Group Makeup & Family Detection
    if (lower.includes('elderly mother') || lower.includes('elderly parents') || lower.includes('elderly')) {
      context.accessibilityRequired = true;
      context.walkingIntensity = 'Low';
      if (!context.notes.includes('Senior passenger with low walking intensity')) {
        context.notes.push('Senior passenger with low walking intensity');
      }
      newlyExtracted.push('Accessibility: Senior traveler considerations');
    }

    // Explicit adults count
    const multiAdultsMatch = lower.match(/(\d+)\s*adults?/);
    if (multiAdultsMatch) {
      context.adultsCount = parseInt(multiAdultsMatch[1], 10);
      newlyExtracted.push(`Adults: ${context.adultsCount}`);
    } else if (lower.includes('me, my wife') || lower.includes('me and my wife') || lower.includes('me and my husband')) {
      context.adultsCount = 2;
      newlyExtracted.push('Adults: 2 (Me & spouse)');
    }

    // Explicit kids / children count
    const kidsMatch = lower.match(/(\d+)\s*(kids?|children|child)/);
    if (kidsMatch) {
      context.childrenCount = parseInt(kidsMatch[1], 10);
      context.partyType = 'family';
      newlyExtracted.push(`Children: ${context.childrenCount}`);
    } else if (lower.includes('our daughter') || lower.includes('our son') || lower.includes('my daughter') || lower.includes('my son')) {
      context.childrenCount = 1;
      context.partyType = 'family';
      newlyExtracted.push('Children: 1 Child');
    }

    // Detect children ages
    const agesMatch = lower.match(/(aged|ages?)\s*(\d+)\s*(and|&|,)\s*(\d+)/);
    if (agesMatch) {
      context.childrenAges = [parseInt(agesMatch[2], 10), parseInt(agesMatch[4], 10)];
      context.childrenCount = context.childrenAges.length;
      context.partyType = 'family';
      newlyExtracted.push(`Children Ages: ${context.childrenAges.join(' & ')}`);
    } else {
      const singleAgeMatch = lower.match(/(\d+)\s*[- ]?year[- ]?old/);
      if (singleAgeMatch) {
        context.childrenAges = [parseInt(singleAgeMatch[1], 10)];
        context.childrenCount = 1;
        context.partyType = 'family';
        newlyExtracted.push(`Child Age: ${context.childrenAges[0]}`);
      }
    }

    // Group style
    if (lower.includes('for two') || lower.includes('for 2') || lower.includes('two of us') || lower.includes('honeymoon')) {
      context.partyType = 'couple';
      context.adultsCount = 2;
      context.childrenCount = 0;
      if (lower.includes('honeymoon')) context.priority = 'Romantic';
      newlyExtracted.push('Travellers: 2 Travellers (Couple)');
    } else if (lower.includes('family') || (context.childrenCount && context.childrenCount > 0)) {
      context.partyType = 'family';
      newlyExtracted.push('Trip Type: Family');
      // Note: Do not auto-populate adultsCount; allow conversational engine to ask if missing.
    } else if (lower.includes('couple') || lower.includes('romantic') || lower.includes('my partner')) {
      context.partyType = 'couple';
      context.adultsCount = 2;
      context.childrenCount = 0;
      context.priority = 'Romantic';
      newlyExtracted.push('Travellers: Couple (2 Adults)');
    } else if (lower.includes('solo') || lower.includes('alone') || lower.includes('cheap trip for me')) {
      context.partyType = 'solo';
      context.adultsCount = 1;
      context.childrenCount = 0;
      newlyExtracted.push('Travellers: Solo (1 Adult)');
    }

    // Transport preferences
    if (lower.includes('train') || lower.includes('vande bharat') || lower.includes('rail')) {
      context.notes.push('Prefers train travel (Indian Railways / High-speed rail)');
      newlyExtracted.push('Transport: Train / Rail preferred');
    }
    if (lower.includes('road trip') || lower.includes('self-drive') || lower.includes('cab')) {
      context.notes.push('Prefers road trip / private cab transfers');
      newlyExtracted.push('Transport: Road trip / Private Cab');
    }

    // Compute totals
    if (context.adultsCount !== null) {
      const k = context.childrenCount || 0;
      const s = context.seniorsCount || 0;
      context.totalTravellers = context.adultsCount + k + s;
      context.roomCapacityNeeded = context.totalTravellers;
      context.roomsCountNeeded = context.totalTravellers > 4 ? Math.ceil(context.totalTravellers / 3) : 1;
    }

    // 5. Budget
    if (!context.budgetTotalINR) {
      if (lower.includes('2 lakh') || lower.includes('2,00,000') || lower.includes('200000') || lower.includes('200k')) {
        context.budgetTotalINR = 200000;
        context.budgetTier = 'Comfortable';
        newlyExtracted.push('Budget: ₹2,00,000 (2 Lakh INR)');
      } else if (lower.includes('20,000') || lower.includes('20000') || lower.includes('20k')) {
        context.budgetTotalINR = 20000;
        context.budgetTier = 'Budget';
        newlyExtracted.push('Budget: ₹20,000');
      } else if (lower.includes('1 lakh') || lower.includes('1,00,000') || lower.includes('100000') || lower.includes('100k')) {
        context.budgetTotalINR = 100000;
        context.budgetTier = 'Budget';
        newlyExtracted.push('Budget: ₹1,00,000');
      } else if (lower.includes('60,000') || lower.includes('60000') || lower.includes('60k')) {
        context.budgetTotalINR = 60000;
        context.budgetTier = 'Budget';
        newlyExtracted.push('Budget: ₹60,000');
      } else if (lower.includes('50,000') || lower.includes('50000') || lower.includes('50k')) {
        context.budgetTotalINR = 50000;
        context.budgetTier = 'Budget';
        newlyExtracted.push('Budget: ₹50,000');
      } else if (lower.includes('1.2 lakh') || lower.includes('1,20,000') || lower.includes('120000')) {
        context.budgetTotalINR = 120000;
        context.budgetTier = 'Comfortable';
        newlyExtracted.push('Budget: ₹1,20,000');
      } else if (lower.includes('85,000') || lower.includes('85000')) {
        context.budgetTotalINR = 85000;
        context.budgetTier = 'Comfortable';
        newlyExtracted.push('Budget: ₹85,000');
      } else if (lower.includes('cheap') || lower.includes('frugal')) {
        context.budgetTier = 'Budget';
        newlyExtracted.push('Budget Tier: Budget / Value-Conscious');
      } else if (lower.includes('luxury') || lower.includes('5-star')) {
        context.budgetTier = 'Luxury';
        newlyExtracted.push('Budget Tier: Luxury');
      }
    }

    // 6. Walking / Hotel Comfort / Activities / Luggage
    if (lower.includes('too much walking') || lower.includes('low walking') || lower.includes('not much walking') || lower.includes('difficulty walking')) {
      context.walkingIntensity = 'Low';
      newlyExtracted.push('Walking: Low Intensity');
    }

    if (lower.includes('comfortable') || lower.includes('comfort')) {
      context.accommodationType = 'Comfortable';
      context.travelStyle = 'Balanced';
      if (!context.priority) context.priority = 'Family Friendly';
      newlyExtracted.push('Accommodation: Comfortable');
    }

    if (lower.includes('family-friendly hotels') || lower.includes('family friendly hotel')) {
      context.accommodationType = 'Family-friendly';
      newlyExtracted.push('Hotel: Family-Friendly');
    }

    if (lower.includes('culture') || lower.includes('sightseeing')) {
      if (!context.activities.includes('Culture & Sightseeing')) context.activities.push('Culture & Sightseeing');
      newlyExtracted.push('Activity: Culture & Sightseeing');
    }
    if (lower.includes('nature')) {
      if (!context.activities.includes('Nature')) context.activities.push('Nature');
      newlyExtracted.push('Activity: Nature');
    }
    if (lower.includes('food') || lower.includes('dining')) {
      if (!context.activities.includes('Food Experiences')) context.activities.push('Food Experiences');
    }

    if (lower.includes('standard luggage') || lower.includes('standard')) {
      context.luggage = 'Standard';
      newlyExtracted.push('Luggage: Standard (1 bag/person)');
    } else if (lower.includes('light')) {
      context.luggage = 'Light';
      newlyExtracted.push('Luggage: Light');
    } else if (lower.includes('heavy')) {
      context.luggage = 'Heavy';
      newlyExtracted.push('Luggage: Heavy');
    }

    return { context, newlyExtracted };
  }

  /**
   * Determine the single next necessary question based on the context.
   * Follows the Minimum-Question Principle & conversational sequence.
   */
  static getNextQuestion(context: TripContext): EngineQuestion | null {
    // 1. Missing Destination
    if (!context.destination) {
      return {
        id: 'q_destination',
        requirementKey: 'destination',
        questionText: 'Where would you like to go?',
        subText: 'Select a destination or type any city/country.',
        quickOptions: [
          { label: 'Vietnam (Hanoi & Halong Bay)', value: 'Vietnam (Hanoi & Halong Bay)' },
          { label: 'Goa', value: 'Goa, India' },
          { label: 'Bali', value: 'Bali, Indonesia' },
          { label: 'Kerala', value: 'Kerala, India' },
          { label: 'Singapore', value: 'Singapore' },
          { label: 'Thailand', value: 'Thailand' }
        ],
        allowFreeText: true,
        freeTextPlaceholder: 'e.g. Vietnam, Goa, Switzerland, Tokyo...'
      };
    }

    // 2. Missing Origin
    if (!context.origin) {
      return {
        id: 'q_origin',
        requirementKey: 'origin',
        questionText: 'Where will you be travelling from?',
        subText: 'Your departure airport for flights.',
        quickOptions: [
          { label: 'Bengaluru (BLR)', value: 'Bengaluru (BLR)' },
          { label: 'Delhi (DEL)', value: 'Delhi (DEL)' },
          { label: 'Mumbai (BOM)', value: 'Mumbai (BOM)' },
          { label: 'San Francisco (SFO)', value: 'San Francisco (SFO)' }
        ],
        allowFreeText: true,
        freeTextPlaceholder: 'e.g. Bengaluru, Delhi, Mumbai, SFO...'
      };
    }

    // 3. Adults Count
    if (context.adultsCount === null) {
      return {
        id: 'q_adults',
        requirementKey: 'adults',
        questionText: 'How many adults will be travelling?',
        subText: 'Guests 12 years and above.',
        quickOptions: [
          { label: '2 Adults', value: 2, subtext: 'Couple or parents' },
          { label: '1 Adult', value: 1, subtext: 'Solo' },
          { label: '3 Adults', value: 3, subtext: 'Family/friends' },
          { label: '4 Adults', value: 4, subtext: 'Group' }
        ],
        allowFreeText: true,
        freeTextPlaceholder: 'e.g. 2 adults, or 1'
      };
    }

    // 4. Children (If partyType is family or unknown childrenCount)
    if (context.childrenCount === null && context.partyType !== 'solo' && context.partyType !== 'couple') {
      return {
        id: 'q_has_children',
        requirementKey: 'has_children',
        questionText: 'Will there be any children travelling with you?',
        subText: 'Helps us verify child airfare and room bed capacities.',
        quickOptions: [
          { label: 'Yes, 2 children', value: 2 },
          { label: 'Yes, 1 child', value: 1 },
          { label: 'Yes, 3+ children', value: 3 },
          { label: 'No children (Adults only)', value: 0 }
        ],
        allowFreeText: true,
        freeTextPlaceholder: 'e.g. Yes, 2 kids or No'
      };
    }

    // 5. Children Ages (High-impact child logic!)
    if (context.childrenCount && context.childrenCount > 0 && context.childrenAges.length === 0) {
      return {
        id: 'q_children_ages',
        requirementKey: 'children_ages',
        questionText: 'Great. What are the children\'s ages?',
        subText: 'Ages determine airline seat rules, hotel bed requirements, and activity pacing.',
        quickOptions: [
          { label: '8 and 11 years old', value: [8, 11], subtext: 'School age' },
          { label: '5 and 9 years old', value: [5, 9], subtext: 'Young kids' },
          { label: '10 years old', value: [10], subtext: 'Single child' },
          { label: 'Toddlers (under 4)', value: [2, 3], subtext: 'Crib/stroller' }
        ],
        allowFreeText: true,
        freeTextPlaceholder: 'e.g. 8 and 11, or 10'
      };
    }

    // 6. Budget
    if (context.budgetTotalINR === null && context.budgetTier === null) {
      return {
        id: 'q_budget',
        requirementKey: 'budget',
        questionText: 'What kind of budget do you have in mind? (e.g. Budget-friendly/Frugal, Moderate/Comfort, or Luxury?)',
        subText: 'Covers international flights, hotels, local transit, visas, and activities.',
        quickOptions: [
          { label: 'Budget-friendly (under ₹1 lakh)', value: 100000, subtext: 'Frugal / smart value' },
          { label: 'Moderate / Comfort (₹1.5 lakh)', value: 150000, subtext: 'Comfortable family' },
          { label: 'Luxury (₹2.5 lakh+)', value: 250000, subtext: '5-star & private transit' },
          { label: '₹60,000', value: 60000, subtext: 'Domestic / short trip' }
        ],
        allowFreeText: true,
        freeTextPlaceholder: 'e.g. Budget-friendly, under 1 lakh, or ₹1.5L'
      };
    }

    // 7. Accommodation Type
    if (!context.accommodationType) {
      return {
        id: 'q_accommodation',
        requirementKey: 'accommodation',
        questionText: 'Any specific accommodation preferences, like family suites or connecting rooms?',
        subText: 'We verify certified bed capacity and family layouts across all hotels.',
        quickOptions: [
          { label: 'Connecting Family Suite', value: 'Connecting Family Suite', subtext: 'Separate beds with privacy' },
          { label: 'Comfortable 4-Bed Suite', value: 'Comfortable 4-Bed Suite', subtext: 'Guaranteed 4 beds' },
          { label: 'Standard Hotel Rooms', value: 'Standard Hotel Rooms', subtext: '2 Queen beds' },
          { label: 'Luxury 5-Star Resort', value: 'Luxury 5-Star Resort', subtext: 'Pool & kid amenities' }
        ],
        allowFreeText: true,
        freeTextPlaceholder: 'e.g. Connecting family suite please'
      };
    }

    // 8. If accommodation is specified, core requirements are fully satisfied!
    // Minimum-Question principle: do not overwhelm the traveler with activities/luggage questionnaires.
    if (context.accommodationType) {
      return null;
    }

    // All necessary questions answered!
    return null;
  }

  static isSufficientToPlan(context: TripContext): boolean {
    return this.getNextQuestion(context) === null;
  }

  static evaluateRequirementClassification(context: TripContext): RequirementEntity[] {
    return [
      {
        key: 'destination',
        label: 'Destination',
        displayValue: context.destination || 'Missing',
        status: context.destination ? 'KNOWN' : 'CONTEXTUALLY_REQUIRED'
      },
      {
        key: 'origin',
        label: 'Origin Airport',
        displayValue: context.origin || 'Bengaluru (BLR)',
        status: context.origin ? 'KNOWN' : 'INFERABLE'
      },
      {
        key: 'duration',
        label: 'Duration & Dates',
        displayValue: context.durationDays ? `${context.durationDays} Days (${context.dates || 'Nov'})` : 'Missing',
        status: context.durationDays ? 'KNOWN' : 'CONTEXTUALLY_REQUIRED'
      },
      {
        key: 'party',
        label: 'Travellers Group',
        displayValue: context.totalTravellers ? `${context.totalTravellers} Guests (${context.adultsCount}A, ${context.childrenCount || 0}C)` : 'Detecting...',
        status: context.adultsCount ? 'KNOWN' : 'CONTEXTUALLY_REQUIRED'
      },
      {
        key: 'budget',
        label: 'Budget Ceiling',
        displayValue: context.budgetTotalINR ? `₹${context.budgetTotalINR.toLocaleString()}` : (context.budgetTier || 'Pending'),
        status: context.budgetTotalINR || context.budgetTier ? 'KNOWN' : 'CONTEXTUALLY_REQUIRED'
      },
      {
        key: 'accommodation',
        label: 'Lodging Preference',
        displayValue: context.accommodationType || 'Family Suite (Inferable)',
        status: context.accommodationType ? 'KNOWN' : 'INFERABLE'
      },
      {
        key: 'activities',
        label: 'Activities',
        displayValue: context.activities.length > 0 ? context.activities.join(', ') : 'Flexible',
        status: context.activities.length > 0 ? 'KNOWN' : 'DEFERRABLE'
      },
      {
        key: 'luggage',
        label: 'Luggage Allowance',
        displayValue: context.luggage || 'Standard (23kg)',
        status: context.luggage ? 'KNOWN' : 'INFERABLE'
      }
    ];
  }
}
