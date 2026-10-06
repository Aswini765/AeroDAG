/**
 * Enterprise Multi-Agent Travel Orchestration System Types
 * Micro-Agent DAG Architecture based on Orchestrator Blueprint
 */

export type BudgetTier = 'Frugal' | 'Moderate' | 'Luxury';

export type NodeStatus = 'idle' | 'running' | 'completed' | 'failed' | 'looped';

export interface PIIDetectionItem {
  type: 'EMAIL' | 'PHONE' | 'ADDRESS' | 'CREDIT_CARD' | 'NAME';
  originalText: string;
  maskedText: string;
  startIndex: number;
  endIndex: number;
}

export interface Phase1Sanitization {
  passed: boolean;
  safetyScore: number; // 0.00 to 1.00
  sanitizedPrompt: string;
  rawPrompt: string;
  piiDetected: PIIDetectionItem[];
  promptInjectionDetected: boolean;
  spamDetected: boolean;
  normalizedDestination?: string;
  normalizedOrigin?: string;
  normalizedDates?: string;
  logs: string[];
}

export interface IntentParameters {
  destination: string;
  origin: string;
  targetDates: string;
  durationDays: number;
  travelPurpose: 'Leisure' | 'Business' | 'Family Vacation' | 'Adventure' | 'Cultural Exploration';
  partySize: number;
  adultsCount: number;
  childrenCount: number;
  budgetTier: BudgetTier;
  exactBudgetCeilingUSD: number;
  behavioralPersona: string;
  specialPreferences: string[];
}

export interface Phase2Intent {
  parameters: IntentParameters;
  confidenceScore: number; // 0.00 to 1.00
  decisionGateVerdict: 'ROUTE_FORWARD' | 'ASK_CLARIFYING';
  clarifyingQuestions?: string[];
  missingFields?: string[];
  jsonBlock: string;
  logs: string[];
}

export interface WorkerDirectives {
  flightAgentDirective: string;
  hotelTransitDirective: string;
  visaDocsDirective: string;
  activityItineraryDirective: string;
}

export interface FlightOption {
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  layovers: string;
  pricePerPersonUSD: number;
  totalFlightCostUSD: number;
  baggageAllowance: string;
  cabinClass: string;
  ticketCount: number;
}

export interface HotelRecommendation {
  name: string;
  location: string;
  roomType: string;
  bedsConfiguration: string;
  capacityGuaranteed: number;
  nightlyRateUSD: number;
  totalNights: number;
  totalHotelCostUSD: number;
  amenities: string[];
  transitProximity: string;
  airportTransitTip: string;
}

export interface VisaRequirement {
  destinationCountry: string;
  visaType: string; // e.g. "e-Visa (30-day single entry)"
  feePerTravelerUSD: number;
  totalVisaFeesUSD: number;
  processingTimeDays: string;
  passportValidityRequired: string;
  mandatoryDocuments: string[];
  consularNotes: string;
  status: 'REQUIRED' | 'VISA_FREE' | 'VISA_ON_ARRIVAL';
}

export interface DayActivity {
  day: number;
  dateStr?: string;
  theme: string;
  morning: string;
  afternoon: string;
  evening: string;
  familyFriendlyScore: number; // 1 to 10
  estimatedDailyCostUSD: number;
  localMealRecommendations: string[];
  transitAdvice: string;
}

export interface Phase3WorkersOutput {
  dagGraph: {
    nodes: Array<{ id: string; name: string; type: string; status: NodeStatus }>;
    parallelGroups: string[][];
  };
  expandedDirectives: WorkerDirectives;
  flightWorker: {
    status: NodeStatus;
    executionTimeMs: number;
    recommendedFlight: FlightOption;
    alternativeFlight?: FlightOption;
    gdsSource: string;
    rawResponse: string;
  };
  hotelWorker: {
    status: NodeStatus;
    executionTimeMs: number;
    recommendedHotel: HotelRecommendation;
    alternativeHotel?: HotelRecommendation;
    rawResponse: string;
  };
  visaWorker: {
    status: NodeStatus;
    executionTimeMs: number;
    requirements: VisaRequirement;
    ragKnowledgeSource: string;
    rawResponse: string;
  };
  activityWorker: {
    status: NodeStatus;
    executionTimeMs: number;
    dailySchedule: DayActivity[];
    totalActivityEstimatedUSD: number;
    rawResponse: string;
  };
  aggregatedCostUSD: number;
}

export interface JudicialAuditItem {
  category: 'Party Capacity' | 'Budget Verification' | 'Regulatory Accuracy';
  passed: boolean;
  details: string;
  metricExpected: string;
  metricObserved: string;
}

export interface Phase4JudicialReview {
  audits: JudicialAuditItem[];
  partyCapacityPass: boolean;
  budgetVerificationPass: boolean;
  regulatoryAccuracyPass: boolean;
  semanticConfidenceScore: number; // 0 to 100%
  decision: 'PASS' | 'FAIL';
  evaluatorCritique?: string;
  loopbackCount: number;
  summary: string;
}

export interface GraphDBTriple {
  subject: string;
  predicate: string;
  object: string;
}

export interface PushNudge {
  id: string;
  title: string;
  triggerTime: string;
  urgency: 'HIGH' | 'MEDIUM' | 'INFO';
  description: string;
  actionText: string;
  category: 'VISA_DEADLINE' | 'PRICE_LOCK' | 'PACKING_DOCS' | 'LOCAL_APP';
}

export interface Phase5PostProcessing {
  safetyScrubCertified: boolean;
  internalPromptsFiltered: boolean;
  statePersistence: {
    shortTermMemory: {
      redisKey: string;
      sessionId: string;
      itineraryId: string;
      cachedTtlSeconds: number;
      tokenMetrics: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
      };
    };
    longTermMemory: {
      vectorStoreRecordId: string;
      vectorEmbeddingDims: number;
      graphDbTriples: GraphDBTriple[];
      persistedPreferences: string[];
    };
  };
  proactiveNudges: PushNudge[];
}

export interface PipelineExecutionResult {
  executionId: string;
  timestamp: string;
  durationMs: number;
  rawInput: string;
  phase1: Phase1Sanitization;
  phase2: Phase2Intent;
  phase3?: Phase3WorkersOutput;
  phase4?: Phase4JudicialReview;
  phase5?: Phase5PostProcessing;
  finalStatus: 'SUCCESS' | 'BLOCKED_SAFETY' | 'CLARIFICATION_REQUIRED' | 'JUDGE_FAILED';
}
