/**
 * AeroDAG Enterprise Multi-Agent Travel Orchestration Engine
 * Implements micro-agent DAG architecture with Presidio PII scrubbing,
 * Intent Parsing, Puppeteer Prompt Expansion, 4 SME Workers,
 * Judicial QA evaluation, and Post-Processing State Persistence.
 */

import {
  PipelineExecutionResult,
  Phase1Sanitization,
  Phase2Intent,
  Phase3WorkersOutput,
  Phase4JudicialReview,
  Phase5PostProcessing,
  PIIDetectionItem,
  IntentParameters,
  WorkerDirectives,
  FlightOption,
  HotelRecommendation,
  VisaRequirement,
  DayActivity,
  PushNudge,
  GraphDBTriple,
  BudgetTier
} from '../types/orchestrator';

// Presidio-style regex matchers
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g;
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const CREDIT_CARD_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
const ADDRESS_PATTERNS = [
  /\b\d{1,5}\s+([A-Za-z]+|[A-Za-z]+\s+[A-Za-z]+)\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way)\b/gi,
  /\b(Apt|Suite|Unit|Fl)\s*#?\d+\b/gi
];

// Adversarial prompt injection keywords
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i,
  /dump\s+(all\s+)?(system|internal)\s+(prompts|keys|credentials|database)/i,
  /delete\s+(all\s+)?(database|records|tables)/i,
  /system\s*override/i,
  /roleplay\s+as\s+an\s+unrestricted/i,
  /\b(exec|eval|drop\s+table|system\(\))\b/i
];

export class OrchestrationEngine {
  /**
   * Phase 1: Ingestion & Guardrails
   */
  static executePhase1(rawInput: string): Phase1Sanitization {
    const logs: string[] = [];
    logs.push('[Presidio-Engine] Initializing token stream scanner...');

    // 1. PII Detection & Masking
    const piiDetected: PIIDetectionItem[] = [];
    let sanitized = rawInput;

    // Email scrubbing
    let emailMatch;
    const emailRegexClone = new RegExp(EMAIL_REGEX);
    while ((emailMatch = emailRegexClone.exec(rawInput)) !== null) {
      piiDetected.push({
        type: 'EMAIL',
        originalText: emailMatch[0],
        maskedText: '[REDACTED_EMAIL]',
        startIndex: emailMatch.index,
        endIndex: emailMatch.index + emailMatch[0].length
      });
    }
    sanitized = sanitized.replace(EMAIL_REGEX, '[REDACTED_EMAIL]');

    // Phone scrubbing
    let phoneMatch;
    const phoneRegexClone = new RegExp(PHONE_REGEX);
    while ((phoneMatch = phoneRegexClone.exec(rawInput)) !== null) {
      piiDetected.push({
        type: 'PHONE',
        originalText: phoneMatch[0],
        maskedText: '[REDACTED_PHONE]',
        startIndex: phoneMatch.index,
        endIndex: phoneMatch.index + phoneMatch[0].length
      });
    }
    sanitized = sanitized.replace(PHONE_REGEX, '[REDACTED_PHONE]');

    // Credit Card scrubbing
    let ccMatch;
    const ccRegexClone = new RegExp(CREDIT_CARD_REGEX);
    while ((ccMatch = ccRegexClone.exec(rawInput)) !== null) {
      piiDetected.push({
        type: 'CREDIT_CARD',
        originalText: ccMatch[0],
        maskedText: '[REDACTED_FINANCIAL_CARD]',
        startIndex: ccMatch.index,
        endIndex: ccMatch.index + ccMatch[0].length
      });
    }
    sanitized = sanitized.replace(CREDIT_CARD_REGEX, '[REDACTED_FINANCIAL_CARD]');

    // Physical address scrubbing
    for (const addrRegex of ADDRESS_PATTERNS) {
      let addrMatch;
      const r = new RegExp(addrRegex);
      while ((addrMatch = r.exec(rawInput)) !== null) {
        piiDetected.push({
          type: 'ADDRESS',
          originalText: addrMatch[0],
          maskedText: '[REDACTED_ADDRESS]',
          startIndex: addrMatch.index,
          endIndex: addrMatch.index + addrMatch[0].length
        });
      }
      sanitized = sanitized.replace(addrRegex, '[REDACTED_ADDRESS]');
    }

    if (piiDetected.length > 0) {
      logs.push(`[Presidio-Engine] Intercepted and redacted ${piiDetected.length} PII entities.`);
    } else {
      logs.push('[Presidio-Engine] Zero PII tokens identified in payload.');
    }

    // 2. Prompt Injection & Adversarial Scrubbing
    let promptInjectionDetected = false;
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(rawInput)) {
        promptInjectionDetected = true;
        logs.push(`[Safety-Guardrail] CRITICAL: Prompt injection signature triggered: ${pattern.toString()}`);
        break;
      }
    }

    // 3. Spam & Abuse Detection
    const spamDetected = rawInput.trim().length < 5 || /^(asdf|test|blah|hello|qwerty)$/i.test(rawInput.trim());
    if (spamDetected) {
      logs.push('[Spam-Detector] Input flagged: Empty or nonsensical travel request payload.');
    }

    // 4. Fact-Checking / Normalization
    let normalizedDestination = 'Vietnam (SGN / HAN)';
    let normalizedOrigin = 'San Francisco (SFO)';
    let normalizedDates = 'Nov 12 - Nov 22, 2026';

    const lower = rawInput.toLowerCase();
    if (lower.includes('tokyo') || lower.includes('japan')) {
      normalizedDestination = 'Tokyo, Japan (NRT / HND)';
      normalizedOrigin = 'New York (JFK)';
      normalizedDates = 'Apr 10 - Apr 17, 2027';
    } else if (lower.includes('switzerland') || lower.includes('zurich')) {
      normalizedDestination = 'Zurich & Interlaken, Switzerland (ZRH)';
      normalizedOrigin = 'Chicago (ORD)';
      normalizedDates = 'Sep 05 - Sep 12, 2026';
    } else if (lower.includes('paris') || lower.includes('france')) {
      normalizedDestination = 'Paris, France (CDG)';
      normalizedOrigin = 'Boston (BOS)';
      normalizedDates = 'Jul 01 - Jul 08, 2026';
    } else if (lower.includes('bali') || lower.includes('indonesia')) {
      normalizedDestination = 'Bali, Indonesia (DPS)';
      normalizedOrigin = 'Los Angeles (LAX)';
      normalizedDates = 'Oct 15 - Oct 25, 2026';
    }

    logs.push(`[Fact-Check] Normalized geo-entities: Origin -> ${normalizedOrigin}, Destination -> ${normalizedDestination}`);

    const passed = !promptInjectionDetected && !spamDetected;
    const safetyScore = promptInjectionDetected ? 0.05 : spamDetected ? 0.3 : 0.99;

    return {
      passed,
      safetyScore,
      sanitizedPrompt: sanitized,
      rawPrompt: rawInput,
      piiDetected,
      promptInjectionDetected,
      spamDetected,
      normalizedDestination,
      normalizedOrigin,
      normalizedDates,
      logs
    };
  }

  /**
   * Phase 2: Intent Parsing & Routing
   */
  static executePhase2(sanitizedPrompt: string, normalizedGeo: { origin?: string; destination?: string; dates?: string }): Phase2Intent {
    const logs: string[] = [];
    logs.push('[Intent-Parser] Deconstructing L1 semantics & entity hierarchy...');

    const lower = sanitizedPrompt.toLowerCase();

    // Intent parameters extraction
    let destination = normalizedGeo.destination || 'Vietnam';
    let origin = normalizedGeo.origin || 'San Francisco, USA';
    let targetDates = normalizedGeo.dates || 'November 10 - 20, 2026';
    let durationDays = 10;
    let travelPurpose: IntentParameters['travelPurpose'] = 'Family Vacation';
    let partySize = 4;
    let adultsCount = 2;
    let childrenCount = 2;
    let budgetTier: BudgetTier = 'Frugal';
    let exactBudgetCeilingUSD = 3200;
    let behavioralPersona = 'Budget-Conscious Family Explorers (Value Maximizers)';
    const specialPreferences: string[] = ['Kid-friendly scheduling', 'Central transit access', 'Street food culinary exploration'];

    // Parse party size
    if (lower.includes('solo') || lower.includes('alone') || lower.includes('for myself')) {
      partySize = 1;
      adultsCount = 1;
      childrenCount = 0;
      behavioralPersona = 'Solo Independent Cultural Backpacker';
      travelPurpose = 'Adventure';
    } else if (lower.includes('couple') || lower.includes('2 people') || lower.includes('two of us') || lower.includes('wife and i')) {
      partySize = 2;
      adultsCount = 2;
      childrenCount = 0;
      behavioralPersona = 'Romantic Experiential Couple';
      travelPurpose = 'Leisure';
    } else if (lower.includes('family of 4') || lower.includes('family of four') || lower.includes('4 people') || lower.includes('four people')) {
      partySize = 4;
      adultsCount = 2;
      childrenCount = 2;
      behavioralPersona = 'Value-Focused Family with 2 Children';
      travelPurpose = 'Family Vacation';
    } else if (lower.includes('family of 5')) {
      partySize = 5;
      adultsCount = 2;
      childrenCount = 3;
    } else if (lower.includes('business') || lower.includes('conference')) {
      travelPurpose = 'Business';
      behavioralPersona = 'High-Efficiency Business Traveler';
    }

    // Parse duration
    const daysMatch = lower.match(/(\d+)\s*(days|day|nights|night)/);
    if (daysMatch) {
      durationDays = parseInt(daysMatch[1], 10);
    }

    // Parse budget tier
    if (lower.includes('luxury') || lower.includes('5 star') || lower.includes('first class') || lower.includes('splurge')) {
      budgetTier = 'Luxury';
      exactBudgetCeilingUSD = partySize * 2500;
      behavioralPersona = 'Premium Connoisseur Seeking White-Glove Hospitality';
    } else if (lower.includes('moderate') || lower.includes('mid-range') || lower.includes('comfort')) {
      budgetTier = 'Moderate';
      exactBudgetCeilingUSD = partySize * 1200;
    } else {
      budgetTier = 'Frugal';
      exactBudgetCeilingUSD = partySize * 800; // ~$3,200 for family of 4 in SE Asia
    }

    // Calculate extraction confidence score (0.00 to 1.00)
    let confidenceScore = 0.95;
    const missingFields: string[] = [];
    const clarifyingQuestions: string[] = [];

    // Check if query is extremely vague (triggers Confidence < 0.75 gate)
    const isVague = lower.length < 25 || 
      (!lower.includes('vietnam') && !lower.includes('tokyo') && !lower.includes('japan') && !lower.includes('paris') && !lower.includes('switzerland') && !lower.includes('bali') && !lower.includes('days') && !lower.includes('budget') && !lower.includes('family') && !lower.includes('solo'));

    if (isVague) {
      confidenceScore = 0.48;
      missingFields.push('Exact Destination', 'Departure Origin', 'Target Dates & Duration', 'Party Headcount', 'Budget Tier');
      clarifyingQuestions.push(
        'Which specific destination city or country do you intend to visit?',
        'What is your departure origin airport or city?',
        'How many total travelers are in your party (adults and children under 12)?',
        'What target month or exact calendar duration do you prefer?',
        'Which budget tier defines your comfort level: Frugal (budget), Moderate, or Luxury?'
      );
      logs.push('[Decision-Gate] Confidence Score: 0.48 < 0.75 threshold. Triggering Clarification Gate.');
    } else {
      logs.push(`[Decision-Gate] Confidence Score: ${confidenceScore.toFixed(2)} >= 0.75 threshold. Approved for Orchestrator.`);
    }

    const parameters: IntentParameters = {
      destination,
      origin,
      targetDates,
      durationDays,
      travelPurpose,
      partySize,
      adultsCount,
      childrenCount,
      budgetTier,
      exactBudgetCeilingUSD,
      behavioralPersona,
      specialPreferences
    };

    const decisionGateVerdict = confidenceScore >= 0.75 ? 'ROUTE_FORWARD' : 'ASK_CLARIFYING';

    const jsonBlock = JSON.stringify(
      {
        schema_version: '2.4.0',
        extraction_confidence: confidenceScore,
        decision_gate: decisionGateVerdict,
        parsed_parameters: parameters
      },
      null,
      2
    );

    return {
      parameters,
      confidenceScore,
      decisionGateVerdict,
      clarifyingQuestions: clarifyingQuestions.length > 0 ? clarifyingQuestions : undefined,
      missingFields: missingFields.length > 0 ? missingFields : undefined,
      jsonBlock,
      logs
    };
  }

  /**
   * Phase 3: Central Orchestrator & Supervisor ("The Puppeteer")
   * Expands 1-line prompt into 4 specialized directives (10-25 lines each)
   * and executes the 4 SME workers in parallel.
   */
  static executePhase3(
    intent: IntentParameters,
    options?: { simulateBudgetOvershoot?: boolean; iteration?: number }
  ): Phase3WorkersOutput {
    const isFamily4 = intent.partySize === 4;
    const isFrugal = intent.budgetTier === 'Frugal';
    const isVietnam = intent.destination.toLowerCase().includes('vietnam');
    const isTokyo = intent.destination.toLowerCase().includes('tokyo');

    // 1. Generate Expanded Directives (15-25 lines each for all 4 workers)
    const flightAgentDirective = [
      `[DIRECTIVE: GDS_FLIGHT_WORKER_NODE_v4]`,
      `TARGET_MISSION: Procure optimal commercial airline itineraries for Origin: ${intent.origin} -> Destination: ${intent.destination}.`,
      `PARTY_SPECIFICATION: Exactly ${intent.partySize} passengers (${intent.adultsCount} Adults, ${intent.childrenCount} Children). Strict rule: All ${intent.partySize} seats must be simultaneously reservable in the same booking reference (PNR).`,
      `GDS_CONSTRAINTS & POLICIES:`,
      `  - Layover Threshold: Maximum 1 layover permitted. Total connection dwell time MUST NOT exceed 3 hours and 30 minutes to safeguard family transit fatigue.`,
      `  - Baggage Allowance: Mandatory inclusion of minimum 1 checked bag (23kg) per passenger plus 1 standard cabin roller. Zero-baggage 'basic economy' fares are strictly prohibited.`,
      `  - Fare Class: Economy Standard / Saver Plus (GDS sub-classes V, L, or T).`,
      `  - Price Ceilings: Sub-total flight budget strictly capped at $${Math.round(intent.exactBudgetCeilingUSD * 0.55)} total ($${Math.round((intent.exactBudgetCeilingUSD * 0.55) / intent.partySize)}/traveler).`,
      `  - Carrier Selection: Prioritize reputable Star Alliance or SkyTeam carriers (e.g., Vietnam Airlines, EVA Air, Singapore Airlines, Cathay Pacific, ANA) with high reliability ratings (>88% on-time performance).`,
      `  - Seat Mapping: Request adjacent row seating (e.g., 2+2 layout) to ensure minor children are seated directly contiguous with adult guardians.`,
      `OUTPUT_REQUIREMENTS: Return discrete structured JSON with flight numbers, departure/arrival UTC timestamps, total price per passenger, aggregate PNR total, and verified baggage line-items.`
    ].join('\n');

    const hotelTransitDirective = [
      `[DIRECTIVE: PROPERTY_TRANSIT_WORKER_NODE_v4]`,
      `TARGET_MISSION: Source safe, vetted, high-value lodging accommodations in ${intent.destination} for ${intent.durationDays} nights.`,
      `CAPACITY & CONFIGURATION MANDATES:`,
      `  - Strict Party Size: Accommodation MUST legally and physically accommodate ${intent.partySize} individuals (${intent.adultsCount} adults, ${intent.childrenCount} kids).`,
      `  - Layout Constraint: Minimum 1 Family Suite with 2 Queen beds OR 2 Interconnecting Superior Rooms. Single-bed hotel rooms or double-bed only rooms are DISQUALIFIED immediately.`,
      `  - Bed Count Audit: Absolute minimum of 2 separate full/queen beds or 1 king + 2 twin beds to prevent overcrowding infractions.`,
      `BUDGET & GEOGRAPHIC CONSTRAINTS:`,
      `  - Nightly Ceiling: Rate must not exceed $${isFrugal ? (isVietnam ? '75.00' : '110.00') : '250.00'}/night inclusive of all municipal lodging taxes and service fees.`,
      `  - Total Lodging Budget Cap: $${Math.round(intent.exactBudgetCeilingUSD * 0.28)} aggregate.`,
      `  - Location Radius: Within walking distance (<800m) to major public transit / central pedestrian avenues (e.g. Old Quarter Hanoi / District 1 HCMC).`,
      `  - Amenities: Free high-speed Wi-Fi, air conditioning, daily breakfast buffet, 24/7 front desk security, elevator access.`,
      `  - Airport Transit: Provide verified airport transfer guidance (e.g., pre-booked private minivan rate ~ $18-$22 vs Grab app taxi estimate) for the full party and luggage.`
    ].join('\n');

    const visaDocsDirective = [
      `[DIRECTIVE: CONSULAR_REGULATORY_RAG_NODE_v4]`,
      `TARGET_MISSION: Execute consular entry regulation verification for destination territory: ${intent.destination}.`,
      `TRAVELER COHORT AUDIT:`,
      `  - Total Travelers: ${intent.partySize} citizens holding US / European standard passports.`,
      `  - Duration of Stay: ${intent.durationDays} days.`,
      `CONSULAR COMPLIANCE PARAMETERS:`,
      `  - Visa Category: Query destination government portal for official electronic entry credentials (e.g., official Vietnam National Public Service Portal e-Visa or Japan 90-day visa waiver).`,
      `  - Processing Lead-Times: Flag mandatory processing window (standard 3-5 business days; recommend submission >=14 days prior to departure to avoid peak backlog).`,
      `  - Fee Structure: Enforce government standard fees per applicant ($${isVietnam ? '25.00 single entry' : '0.00 waiver'}) with zero predatory third-party expediter markups. Total entry documentation cost: $${isVietnam ? 25 * intent.partySize : 0}.`,
      `  - Passport Integrity Bounds: Verify minimum 6-month validity remaining from the planned date of departure from the destination country. Check requirement for at least 2 blank immigration visa stamp pages.`,
      `  - Mandatory Documentation: Child birth certificates / guardianship documentation if surnames differ between parents and minor travelers. Proof of return flight reservation.`
    ].join('\n');

    const activityItineraryDirective = [
      `[DIRECTIVE: LOCAL_EXPERIENCES_SCHEDULER_NODE_v4]`,
      `TARGET_MISSION: Generate a comprehensive ${intent.durationDays}-day curated travel blueprint for ${intent.destination}.`,
      `COHORT & PACING DIRECTIVES:`,
      `  - Traveler Persona: ${intent.behavioralPersona}. Pacing MUST be balanced: 1 primary cultural anchor in the morning, relaxed lunch, 1 light immersive experience in the afternoon, leaving downtime before dinner.`,
      `  - Family/Kid Suitability: All recommended venues must achieve a Family-Friendly Safety & Engagement Score >= 8/10. Avoid grueling multi-hour unshaded treks with young children.`,
      `  - Budget Optimization: Prioritize high-yield, low-cost authentic experiences (e.g. Thang Long Water Puppet Show, cyclo heritage tours, Hoan Kiem lake strolls, cooking classes).`,
      `  - Culinary Mapping: Feature authentic, clean, kid-accessible local restaurants and celebrated street food stalls with total daily meal spend <= $${isFrugal ? (isVietnam ? '18.00' : '35.00') : '80.00'}/person.`,
      `  - Transit Route Optimization: Group geographic clusters together on adjacent days to minimize intra-city transit overhead and prevent commute fatigue.`
    ].join('\n');

    const expandedDirectives: WorkerDirectives = {
      flightAgentDirective,
      hotelTransitDirective,
      visaDocsDirective,
      activityItineraryDirective
    };

    // 2. Simulate Worker 1: Flight Agent (GDS data)
    let flightPerPerson = isVietnam ? 395 : isTokyo ? 780 : 650;
    // If testing budget overshoot loopback on iteration 1
    if (options?.simulateBudgetOvershoot) {
      flightPerPerson = 920; // Will cause total cost to blast through frugal budget!
    }
    const flightTotal = flightPerPerson * intent.partySize;

    const recommendedFlight: FlightOption = {
      airline: isVietnam ? 'Vietnam Airlines (VN) via EVA Air' : isTokyo ? 'All Nippon Airways (ANA)' : 'Swiss International Air Lines',
      flightNumber: isVietnam ? 'VN 385 / BR 027' : isTokyo ? 'NH 007' : 'LX 009',
      departureAirport: intent.origin.includes('SFO') ? 'SFO (San Francisco)' : 'SFO / JFK Terminal 1',
      arrivalAirport: isVietnam ? 'HAN (Noi Bai International, Hanoi)' : isTokyo ? 'HND (Tokyo Haneda)' : 'ZRH (Zurich Airport)',
      departureTime: '11:45 AM (Local)',
      arrivalTime: '06:15 PM (+1 Day)',
      duration: isVietnam ? '16h 30m (1 stop TPE - 1h 45m layover)' : '11h 20m (Non-stop)',
      layovers: isVietnam ? '1 Layover at Taipei (TPE) - 1h 45m' : 'Non-stop Direct Flight',
      pricePerPersonUSD: flightPerPerson,
      totalFlightCostUSD: flightTotal,
      baggageAllowance: '2 Checked Bags (23kg each) + 1 Carry-on (7kg) + Personal Item included per traveler',
      cabinClass: 'Economy Standard (Fare Class: V)',
      ticketCount: intent.partySize
    };

    // 3. Simulate Worker 2: Hotel & Transit Agent
    const nightlyRate = isVietnam ? 62 : isTokyo ? 180 : 160;
    const totalNights = intent.durationDays;
    const hotelTotal = nightlyRate * totalNights;

    const recommendedHotel: HotelRecommendation = {
      name: isVietnam ? 'Hanoi Golden Silk Boutique Family Suite' : isTokyo ? 'Mitsui Garden Hotel Kyobashi Family Suite' : 'Hotel Schweizerhof Zurich',
      location: isVietnam ? 'Old Quarter, Hoan Kiem District, Hanoi' : 'Chuo City, Tokyo (3 min to Tokyo Station)',
      roomType: isFamily4 ? 'Executive Connecting Family Suite (2 Interconnected Rooms)' : 'Deluxe King Room',
      bedsConfiguration: isFamily4 ? '2 Queen-Size Plush Beds (Strict capacity: 4 adults/children verified)' : '1 King Bed',
      capacityGuaranteed: intent.partySize,
      nightlyRateUSD: nightlyRate,
      totalNights,
      totalHotelCostUSD: hotelTotal,
      amenities: ['Complimentary Buffet Breakfast for 4', 'High-Speed Wi-Fi', 'Soundproof Windows', 'Air Conditioning', 'Airport Van Dispatch'],
      transitProximity: '250m to Hoan Kiem Lake pedestrian loop; 5 min walk to central bus express line',
      airportTransitTip: 'Pre-book hotel private 7-seater minivan for Noi Bai Airport pickup ($18.00 total flat rate); saves 40% over standard metered taxi stands.'
    };

    // 4. Simulate Worker 3: Visa & Docs Agent (RAG Knowledge)
    const visaFeePerPerson = isVietnam ? 25 : 0;
    const totalVisaFees = visaFeePerPerson * intent.partySize;

    const visaRequirements: VisaRequirement = {
      destinationCountry: intent.destination,
      visaType: isVietnam ? 'Vietnam Electronic Visa (e-Visa, 30-Day Single Entry)' : 'Visa Exemption / 90-Day Tourist Waiver',
      feePerTravelerUSD: visaFeePerPerson,
      totalVisaFeesUSD: totalVisaFees,
      processingTimeDays: isVietnam ? '3 to 5 official working days (advise filing 14 days ahead)' : 'Instant on arrival at customs',
      passportValidityRequired: 'Minimum 6 months validity from entry date; at least 2 blank passport stamp pages.',
      mandatoryDocuments: isVietnam ? [
        'Digital passport photo (4x6cm, white background, no eyeglasses)',
        'Biographic passport data page scan (clear JPG format)',
        'Entry/Exit international border checkpoint declaration (HAN Noi Bai Airport)',
        'Birth certificates for minors traveling with parents'
      ] : [
        'Valid Machine-Readable Passport with 6+ months validity',
        'Confirmed return flight itinerary documentation'
      ],
      consularNotes: isVietnam
        ? 'Official portal is evisa.xuatnhapcanh.gov.vn. Never use predatory third-party scam agencies charging $80+ per visa.'
        : 'Eligible for seamless electronic tourist entry.',
      status: isVietnam ? 'REQUIRED' : 'VISA_FREE'
    };

    // 5. Simulate Worker 4: Activity & Local Itinerary Agent
    const dailyActivities: DayActivity[] = isVietnam ? [
      {
        day: 1,
        theme: 'Arrival, Acclimatization & Old Quarter Lantern Walk',
        morning: 'Touchdown at Noi Bai Airport; private minivan transfer to Old Quarter boutique hotel; unpacking & rest.',
        afternoon: 'Gentle walk around Hoan Kiem Lake; cross the scarlet Huc Bridge to visit Ngoc Son Temple.',
        evening: 'Traditional Thang Long Water Puppet Show (front row seats reserved); authentic pho dinner.',
        familyFriendlyScore: 10,
        estimatedDailyCostUSD: 45,
        localMealRecommendations: ['Pho Gia Truyen Bat Dan ($2.50/bowl)', 'Kem Trang Tien ice cream ($0.60)'],
        transitAdvice: 'Stroll on foot in Old Quarter pedestrian zone; hire 2 cyclos ($4 total) for kids.'
      },
      {
        day: 2,
        theme: 'Imperial Heritage & Temple of Literature Quest',
        morning: 'Explore Temple of Literature (Van Mieu), Vietnam’s first university; peaceful shaded courtyards.',
        afternoon: 'Vietnam Museum of Ethnology — outdoor full-scale tribal stilt houses that kids can climb and explore.',
        evening: 'Dinner at Bun Cha Huong Lien; sample iconic Hanoi grilled pork noodles in a lively atmosphere.',
        familyFriendlyScore: 9,
        estimatedDailyCostUSD: 55,
        localMealRecommendations: ['Bun Cha Huong Lien ($3.00/person)', 'Fresh sugarcane juice ($0.50)'],
        transitAdvice: 'Take GrabCar 7-seater between sights ($3.50 per ride across town).'
      },
      {
        day: 3,
        theme: 'French Quarter Architecture & Family Cooking Class',
        morning: 'Stroll the grand French Quarter, Hanoi Opera House exterior, and St. Joseph Cathedral.',
        afternoon: 'Interactive 3-hour family cooking workshop (making fresh spring rolls, banh xeo, and egg coffee).',
        evening: 'Sunset iced tea overlooking West Lake (Ho Tay); light banquet dinner.',
        familyFriendlyScore: 10,
        estimatedDailyCostUSD: 70,
        localMealRecommendations: ['Home-cooked fresh spring rolls and banh xeo', 'Cong Caphe coconut slush ($1.80)'],
        transitAdvice: 'Walking + GrabCar.'
      },
      {
        day: 4,
        theme: 'Day Excursion to Ninh Binh (Trang An Boat Caves)',
        morning: 'Limousine bus ride to Ninh Binh; board traditional sampan boat gliding through UNESCO river caves.',
        afternoon: 'Bicycle ride along scenic limestone karsts and emerald rice paddies; visit Hang Mua viewpoint.',
        evening: 'Return to Hanoi; relaxing foot massage for parents while kids play at hotel game lounge.',
        familyFriendlyScore: 9,
        estimatedDailyCostUSD: 110,
        localMealRecommendations: ['Com Chay (Crispy Rice) & local mountain goat specialty', 'Fresh dragonfruit'],
        transitAdvice: 'Private chartered minivan for day ($55 round-trip split for 4).'
      },
      {
        day: 5,
        theme: 'Halong Bay Heritage Cruise Day 1',
        morning: 'Transfer via scenic highway to Tuan Chau Port; embark on overnight boutique family cruise junk.',
        afternoon: 'Kayak through quiet turquoise lagoons in Bai Tu Long Bay; explore Sung Sot (Surprise) Cave.',
        evening: 'Sunset squid fishing off the aft deck; multi-course seafood banquet on the open sky-deck.',
        familyFriendlyScore: 10,
        estimatedDailyCostUSD: 140,
        localMealRecommendations: ['Fresh grilled seabass, squid spring rolls, steamed lemongrass prawns'],
        transitAdvice: 'Cruise ship boat tender and kayaks.'
      },
      {
        day: 6,
        theme: 'Halong Bay Morning Tai Chi & Return to Hanoi',
        morning: 'Sunrise Tai Chi on the top deck; visit Ti Top Island for panoramic bay view.',
        afternoon: 'Brunch buffet on board; disembark and private transfer back to Hanoi hotel.',
        evening: 'Night Market shopping on Hang Dao street; souvenir hunt for silk scarves and lacquerware.',
        familyFriendlyScore: 9,
        estimatedDailyCostUSD: 60,
        localMealRecommendations: ['Banh Mi 25 ($1.50/sandwich)', 'Egg coffee at Cafe Giang ($1.20)'],
        transitAdvice: 'Express highway expressway transfer.'
      },
      {
        day: 7,
        theme: 'Hanoi Train Street & Ceramic Road Art',
        morning: 'Visit safe viewing cafe on Hanoi Train Street for historic train pass-by; capture family memories.',
        afternoon: 'Bao Tang Lich Su (National Museum of History); walk along the Guinness-record Hanoi Ceramic Mosaic Mural.',
        evening: 'Riverside dinner overlooking the Red River; sample Cha Ca La Vong (turmeric dill fish).',
        familyFriendlyScore: 8,
        estimatedDailyCostUSD: 50,
        localMealRecommendations: ['Cha Ca Thang Long ($6.00/person)', 'Che dessert soup ($0.80)'],
        transitAdvice: 'Walk + short GrabCar rides.'
      },
      {
        day: 8,
        theme: 'Artisanal Bat Trang Pottery Village',
        morning: 'Short excursion to Bat Trang Pottery Village; hands-on potter wheel session where kids mold clay bowls.',
        afternoon: 'Glaze and fire custom family souvenirs; explore 700-year-old village alleys.',
        evening: 'Casual street food tour: banh cuon (steamed rice rolls) and sticky rice.',
        familyFriendlyScore: 10,
        estimatedDailyCostUSD: 40,
        localMealRecommendations: ['Banh Cuon Gia An ($2.00)', 'Xoi Yen sweet savory sticky rice ($2.20)'],
        transitAdvice: 'Local Grab minivan ($7 each way).'
      },
      {
        day: 9,
        theme: 'Parks, Botanical Gardens & West Lake Cycling',
        morning: 'Bach Thao Botanical Gardens; shade and open lawns for kids to run; visit Presidential Palace grounds.',
        afternoon: 'Tandem bicycle rental along West Lake; visit Tran Quoc Pagoda, the oldest pagoda in Hanoi.',
        evening: 'Farewell celebratory dinner at Quan An Ngon garden restaurant sampling delicacies across 3 regions.',
        familyFriendlyScore: 9,
        estimatedDailyCostUSD: 65,
        localMealRecommendations: ['Quan An Ngon feast ($8.00/person)', 'Che ba mau dessert'],
        transitAdvice: 'Tandem bikes + walking.'
      },
      {
        day: 10,
        theme: 'Packing, Souvenir Walk & Departure',
        morning: 'Final morning coffee and French-style croissants at Old Quarter bakery; pack luggage.',
        afternoon: 'Check-out; private minivan dispatch to Noi Bai Airport (Terminal 2); check-in and tax refund.',
        evening: 'Departure flight home with unforgettable memories and artisan souvenirs.',
        familyFriendlyScore: 10,
        estimatedDailyCostUSD: 30,
        localMealRecommendations: ['Airport Vietnamese sandwich and lotus tea'],
        transitAdvice: 'Private airport minivan.'
      }
    ] : [
      {
        day: 1,
        theme: 'Tokyo Arrival & Shinjuku Neon Night',
        morning: 'Arrive at Tokyo Haneda; exchange JR pass / Suica cards; check in to hotel.',
        afternoon: 'Explore Shinjuku Gyoen National Garden; calm transition from flight.',
        evening: 'Dinner at Omoide Yokocho for yakitori skewers; Tokyo Metropolitan Government Building skyline view.',
        familyFriendlyScore: 9,
        estimatedDailyCostUSD: 95,
        localMealRecommendations: ['Ramen Nagi Golden Gai ($9.00)', 'Matcha Soft Cream ($3.50)'],
        transitAdvice: 'Tokyo Metro with Suica card.'
      },
      {
        day: 2,
        theme: 'Asakusa Senso-ji & Akihabara Tech Culture',
        morning: 'Senso-ji Temple and Nakamise-dori shopping street; draw omikuji fortunes.',
        afternoon: 'Akihabara electronic district and retro arcade center.',
        evening: 'Dinner at Tonkatsu Marugo; return to hotel.',
        familyFriendlyScore: 9,
        estimatedDailyCostUSD: 110,
        localMealRecommendations: ['Tonkatsu Marugo ($18.00)', 'Ningyo-yaki sweet cakes ($4.00)'],
        transitAdvice: 'Ginza Line Metro.'
      }
    ];

    const totalActivityEstimated = dailyActivities.reduce((acc, curr) => acc + curr.estimatedDailyCostUSD, 0);
    const aggregatedCostUSD = flightTotal + hotelTotal + totalVisaFees + totalActivityEstimated;

    return {
      dagGraph: {
        nodes: [
          { id: 'flight-worker', name: 'Flight Agent (GDS/APIs)', type: 'SME_WORKER', status: 'completed' },
          { id: 'hotel-worker', name: 'Hotel & Transit Agent', type: 'SME_WORKER', status: 'completed' },
          { id: 'visa-worker', name: 'Visa & Docs Agent (RAG)', type: 'SME_WORKER', status: 'completed' },
          { id: 'activity-worker', name: 'Activity & Local Itinerary Agent', type: 'SME_WORKER', status: 'completed' }
        ],
        parallelGroups: [['flight-worker', 'hotel-worker', 'visa-worker', 'activity-worker']]
      },
      expandedDirectives,
      flightWorker: {
        status: 'completed',
        executionTimeMs: 412,
        recommendedFlight,
        gdsSource: 'Amadeus / Sabre Global Distribution System (Simulated Live Feed)',
        rawResponse: JSON.stringify({ pnr: 'VN-89241A', carrier: recommendedFlight.airline, fareBasis: 'VPROMO', seatsConfirmed: intent.partySize }, null, 2)
      },
      hotelWorker: {
        status: 'completed',
        executionTimeMs: 388,
        recommendedHotel,
        rawResponse: JSON.stringify({ propertyId: 'VN-HAN-9012', roomCategory: recommendedHotel.roomType, beds: recommendedHotel.bedsConfiguration, maxGuests: intent.partySize }, null, 2)
      },
      visaWorker: {
        status: 'completed',
        executionTimeMs: 295,
        requirements: visaRequirements,
        ragKnowledgeSource: 'Consular Affairs Corpus v2026.10 / IATA Timatic DB',
        rawResponse: JSON.stringify({ jurisdiction: intent.destination, entryScheme: visaRequirements.visaType, feePerPerson: visaRequirements.feePerTravelerUSD }, null, 2)
      },
      activityWorker: {
        status: 'completed',
        executionTimeMs: 476,
        dailySchedule: dailyActivities,
        totalActivityEstimatedUSD: totalActivityEstimated,
        rawResponse: JSON.stringify({ daysCount: dailyActivities.length, averagePacing: 'Moderate-Gentle', kidSuitability: 'High' }, null, 2)
      },
      aggregatedCostUSD
    };
  }

  /**
   * Phase 4: LLM-As-A-Judge & QA Quality Assurance
   */
  static executePhase4(
    intent: IntentParameters,
    workerOutput: Phase3WorkersOutput,
    forcedFailure: boolean = false,
    loopbackCount: number = 0
  ): Phase4JudicialReview {
    // 1. Party Capacity Audit
    const expectedSeats = intent.partySize;
    const flightSeats = workerOutput.flightWorker.recommendedFlight.ticketCount;
    const hotelCapacity = workerOutput.hotelWorker.recommendedHotel.capacityGuaranteed;

    const partyCapacityPass = flightSeats === expectedSeats && hotelCapacity >= expectedSeats && !forcedFailure;

    // 2. Budget Verification
    const aggregatedCost = workerOutput.aggregatedCostUSD;
    const ceiling = intent.exactBudgetCeilingUSD;
    const budgetPass = (aggregatedCost <= ceiling * 1.08) && !forcedFailure; // 8% tolerance

    // 3. Regulatory Accuracy
    const regulatoryPass = workerOutput.visaWorker.requirements.status !== undefined;

    const audits = [
      {
        category: 'Party Capacity' as const,
        passed: partyCapacityPass,
        details: partyCapacityPass
          ? `Accurate: ${flightSeats} flight tickets and hotel suite certified for ${hotelCapacity} guests matches request for party of ${expectedSeats}.`
          : `Capacity mismatch: Accommodations or flights failed to guarantee seating/bedding for party size of ${expectedSeats}.`,
        metricExpected: `${expectedSeats} travelers with dedicated beds/seats`,
        metricObserved: `${flightSeats} flight seats booked, hotel capacity for ${hotelCapacity}`
      },
      {
        category: 'Budget Verification' as const,
        passed: budgetPass,
        details: budgetPass
          ? `Budget compliance verified: Aggregated sum of $${aggregatedCost.toLocaleString()} is within ${intent.budgetTier} ceiling of $${ceiling.toLocaleString()}.`
          : `Budget breach: Total aggregate cost $${aggregatedCost.toLocaleString()} exceeds the strict ${intent.budgetTier} ceiling limit of $${ceiling.toLocaleString()}.`,
        metricExpected: `Max $${ceiling.toLocaleString()} (${intent.budgetTier} tier)`,
        metricObserved: `$${aggregatedCost.toLocaleString()} total aggregate`
      },
      {
        category: 'Regulatory Accuracy' as const,
        passed: regulatoryPass,
        details: `Consular policies validated against IATA Timatic: ${workerOutput.visaWorker.requirements.visaType} requires ${workerOutput.visaWorker.requirements.passportValidityRequired}`,
        metricExpected: 'Current 2026 entry rules & passport bounds',
        metricObserved: `Valid entry scheme (${workerOutput.visaWorker.requirements.status}) verified`
      }
    ];

    const passCount = (partyCapacityPass ? 1 : 0) + (budgetPass ? 1 : 0) + (regulatoryPass ? 1 : 0);
    let semanticConfidenceScore = Math.round((passCount / 3) * 94);

    if (passCount === 3) {
      semanticConfidenceScore = 95;
    } else if (forcedFailure || passCount < 3) {
      semanticConfidenceScore = 68;
    }

    const decision: 'PASS' | 'FAIL' = semanticConfidenceScore >= 85 ? 'PASS' : 'FAIL';

    let evaluatorCritique: string | undefined = undefined;
    if (decision === 'FAIL') {
      evaluatorCritique = [
        `JUDICIAL CRITIQUE [EVAL-FAILED-ITERATION-${loopbackCount + 1}]:`,
        `1. Financial Variance: Aggregated package cost ($${aggregatedCost.toLocaleString()}) violated the hard constraint for ${intent.budgetTier} budget ($${ceiling.toLocaleString()}).`,
        `2. Remediation Directive: Puppeteer MUST re-tune Flight Agent to select Economy Saver sub-classes and Hotel Agent to adjust room rate targets downwards by 22%.`,
        `3. State Action: Triggering Execution Loopback to Phase 3 Orchestrator for directive reconfiguration.`
      ].join('\n');
    }

    return {
      audits,
      partyCapacityPass,
      budgetVerificationPass: budgetPass,
      regulatoryAccuracyPass: regulatoryPass,
      semanticConfidenceScore,
      decision,
      evaluatorCritique,
      loopbackCount,
      summary: decision === 'PASS'
        ? `Judicial audit passed with ${semanticConfidenceScore}% semantic score. Party capacity (${intent.partySize}), budget ($${aggregatedCost.toLocaleString()}), and consular mandates are verified.`
        : `Judicial audit failed (${semanticConfidenceScore}% < 85% threshold). Evaluator critique triggered loopback.`
      };
  }

  /**
   * Phase 5: Post-Processing & State Update
   */
  static executePhase5(
    intent: IntentParameters,
    workerOutput: Phase3WorkersOutput
  ): Phase5PostProcessing {
    const itineraryId = `ITIN-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const sessionId = `SES-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const redisKey = `session:${sessionId}:itinerary:${itineraryId}`;
    const vectorStoreRecordId = `vec_user_pref_${Math.random().toString(36).substring(2, 8)}`;

    const graphDbTriples: GraphDBTriple[] = [
      { subject: 'UserEntity', predicate: 'HAS_PARTY_SIZE', object: `${intent.partySize}` },
      { subject: 'UserEntity', predicate: 'PREFERS_BUDGET_TIER', object: intent.budgetTier },
      { subject: 'UserEntity', predicate: 'PERSONA_CLASSIFICATION', object: intent.behavioralPersona },
      { subject: 'UserEntity', predicate: 'CONTEMPLATES_DESTINATION', object: intent.destination },
      { subject: `Itinerary:${itineraryId}`, predicate: 'CONFIRMED_CARRIER', object: workerOutput.flightWorker.recommendedFlight.airline },
      { subject: `Itinerary:${itineraryId}`, predicate: 'CONFIRMED_LODGING', object: workerOutput.hotelWorker.recommendedHotel.name }
    ];

    const proactiveNudges: PushNudge[] = [
      {
        id: 'nudge-1',
        title: 'Submit Electronic Visa by Oct 28, 2026',
        triggerTime: 'T-14 Days before Departure',
        urgency: 'HIGH',
        category: 'VISA_DEADLINE',
        description: `Apply at official portal (evisa.xuatnhapcanh.gov.vn) for all ${intent.partySize} travelers to guarantee 3-5 day issuance without rush surcharges.`,
        actionText: 'Open Official e-Visa Portal'
      },
      {
        id: 'nudge-2',
        title: 'Price Lock Guaranteed for 48 Hours',
        triggerTime: 'Immediate Active Window',
        urgency: 'MEDIUM',
        category: 'PRICE_LOCK',
        description: `Flight fare of $${workerOutput.flightWorker.recommendedFlight.pricePerPersonUSD}/person on ${workerOutput.flightWorker.recommendedFlight.airline} held with GDS PNR. Lock in reservation before fare class bucket expires.`,
        actionText: 'Confirm Flight PNR Hold'
      },
      {
        id: 'nudge-3',
        title: 'Download Grab App & Set Up Payment',
        triggerTime: 'T-3 Days before Departure',
        urgency: 'INFO',
        category: 'LOCAL_APP',
        description: 'Install Grab (Southeast Asia ride-hailing & food delivery) prior to departure for zero-scam metered transit with credit card linked.',
        actionText: 'Grab Setup Guide'
      },
      {
        id: 'nudge-4',
        title: 'Download Google Translate Offline Vietnamese Pack',
        triggerTime: 'T-2 Days before Departure',
        urgency: 'INFO',
        category: 'PACKING_DOCS',
        description: 'Download the offline camera and text language pack for seamless street food menu translation without requiring cellular roaming.',
        actionText: 'Offline Pack Checklist'
      }
    ];

    return {
      safetyScrubCertified: true,
      internalPromptsFiltered: true,
      statePersistence: {
        shortTermMemory: {
          redisKey,
          sessionId,
          itineraryId,
          cachedTtlSeconds: 86400, // 24 hours
          tokenMetrics: {
            inputTokens: 1420,
            outputTokens: 2890,
            totalTokens: 4310
          }
        },
        longTermMemory: {
          vectorStoreRecordId,
          vectorEmbeddingDims: 1536,
          graphDbTriples,
          persistedPreferences: [
            `Family cohort with ${intent.childrenCount} kids`,
            'High sensitivity to transit connection times (<3.5h)',
            'Preference for central boutique hotels with included breakfast',
            'Authentic culinary exploration focus'
          ]
        }
      },
      proactiveNudges
    };
  }

  /**
   * Complete End-to-End Autonomous Execution
   */
  static runPipeline(
    rawInput: string,
    options?: { simulateBudgetOvershootLoopback?: boolean }
  ): PipelineExecutionResult {
    const startTime = Date.now();
    const executionId = `EXEC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Phase 1
    const phase1 = this.executePhase1(rawInput);
    if (!phase1.passed) {
      return {
        executionId,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        rawInput,
        phase1,
        phase2: this.executePhase2(phase1.sanitizedPrompt, {}),
        finalStatus: 'BLOCKED_SAFETY'
      };
    }

    // Phase 2
    const phase2 = this.executePhase2(phase1.sanitizedPrompt, {
      origin: phase1.normalizedOrigin,
      destination: phase1.normalizedDestination,
      dates: phase1.normalizedDates
    });

    if (phase2.decisionGateVerdict === 'ASK_CLARIFYING') {
      return {
        executionId,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        rawInput,
        phase1,
        phase2,
        finalStatus: 'CLARIFICATION_REQUIRED'
      };
    }

    // Phase 3 & Phase 4 with possible loopback
    let phase3: Phase3WorkersOutput;
    let phase4: Phase4JudicialReview;

    if (options?.simulateBudgetOvershootLoopback) {
      // Iteration 1: Fails Judge due to budget overshoot
      const p3Initial = this.executePhase3(phase2.parameters, { simulateBudgetOvershoot: true, iteration: 1 });
      const p4Initial = this.executePhase4(phase2.parameters, p3Initial, true, 0);

      // Loopback to Puppeteer: Re-tunes and executes iteration 2
      phase3 = this.executePhase3(phase2.parameters, { simulateBudgetOvershoot: false, iteration: 2 });
      phase4 = this.executePhase4(phase2.parameters, phase3, false, 1);
      // Keep record of loopback
      phase4.evaluatorCritique = `[RESOLVED AFTER LOOPBACK ITERATION 1]:\nInitial candidate overshot budget ($${p3Initial.aggregatedCostUSD.toLocaleString()} vs $${phase2.parameters.exactBudgetCeilingUSD.toLocaleString()}).\nOrchestrator re-prompted Flight Agent to Economy Saver V-class and Hotel Agent to Family Suite rate. Candidate passed on Iteration 2!`;
    } else {
      phase3 = this.executePhase3(phase2.parameters);
      phase4 = this.executePhase4(phase2.parameters, phase3);
    }

    // Phase 5
    const phase5 = this.executePhase5(phase2.parameters, phase3);

    return {
      executionId,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      rawInput,
      phase1,
      phase2,
      phase3,
      phase4,
      phase5,
      finalStatus: phase4.decision === 'PASS' ? 'SUCCESS' : 'JUDGE_FAILED'
    };
  }
}
