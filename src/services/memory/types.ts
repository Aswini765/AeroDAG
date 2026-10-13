/**
 * AeroDAG Privacy-Conscious Long-Term & Persistent Memory Types
 * 
 * Supports:
 * - Conversation & scratchpad context
 * - User-approved explicit travel preferences
 * - Past trip summaries & destination history
 * - Strict tenant isolation & consent tracking
 * - Expiration policies & GDPR erasure
 */

export type MemoryCategory =
  | 'CONVERSATION_CONTEXT'
  | 'USER_PREFERENCE'
  | 'PAST_TRIP_SUMMARY'
  | 'SAVED_SEARCH'
  | 'TRAVEL_CONSTRAINT';

export type MemoryConsentLevel = 'EXPLICIT_USER_APPROVED' | 'SESSION_EPHEMERAL' | 'DECLINED';

export interface MemoryProvenance {
  source: 'USER_EXPLICIT_INPUT' | 'CONFIRMED_PREFERENCE' | 'SAVED_TRIP_OUTCOME';
  confidence: number;
  timestamp: string;
  sourceRequestId?: string;
}

export interface StoredUserPreference {
  key: string;
  label: string;
  value: any;
  category: 'dietary' | 'lodging' | 'transit' | 'accessibility' | 'loyalty' | 'general';
  isUserVerified: boolean;
  updatedAt: string;
}

export interface PastTripRecord {
  tripId: string;
  destination: string;
  dates: string;
  travellerCount: number;
  hotelBooked?: string;
  rating?: number;
  notableAttractions: string[];
  totalSpendINR?: number;
  completedAt: string;
}

export interface MemoryEntry<T = any> {
  id: string;
  userId: string;
  tenantId: string;
  category: MemoryCategory;
  key: string;
  data: T;
  provenance: MemoryProvenance;
  consentLevel: MemoryConsentLevel;
  createdAt: string;
  updatedAt: string;
  expiresAtMs?: number;
  tags: string[];
}

export interface MemorySearchFilter {
  category?: MemoryCategory;
  tags?: string[];
  limit?: number;
}
