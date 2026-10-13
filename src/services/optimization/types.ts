/**
 * AeroDAG AI Cost & Latency Optimization Types
 * 
 * Defines contracts for model routing, context minimization,
 * safe multi-tier caching, tool call deduplication, and cost accounting.
 */

export type ComplexityTier = 'LOW' | 'MEDIUM' | 'HIGH';

export type OperationType =
  | 'EXTRACTION'
  | 'CLASSIFICATION'
  | 'NORMALIZATION'
  | 'REQUIREMENT_INTERPRETATION'
  | 'CONVERSATIONAL_MODIFICATION'
  | 'ITINERARY_ADJUSTMENT'
  | 'COMPLEX_PLANNING'
  | 'CONFLICT_RESOLUTION';

export interface ModelRouteConfig {
  lowComplexityModel: string;
  mediumComplexityModel: string;
  highComplexityModel: string;
  defaultModel: string;
}

export type CacheNamespace =
  | 'destination_meta'
  | 'static_knowledge'
  | 'rag_retrieval'
  | 'embeddings'
  | 'currency_rates'
  | 'weather_estimates'
  | 'tool_search_results';

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  hits: number;
  namespace: CacheNamespace;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRatio: number;
}

export interface ToolCallDedupKey {
  agentId: string;
  toolName: string;
  argumentsHash: string;
}

export interface OptimizationMetricsSnapshot {
  llmCallsAvoided: number;
  toolCallsAvoided: number;
  cacheHits: number;
  cacheMisses: number;
  tokensSavedEstimate: number;
  averageLatencyReductionMs: number;
}
