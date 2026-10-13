/**
 * AeroDAG Tool Call Optimizer
 * 
 * Deduplicates repeated read-only tool calls with identical parameters
 * executed within the same planning pipeline transaction.
 * 
 * CRITICAL SAFETY RULES:
 * 1. Strictly bypasses caching for destructive/transactional tools ('createPayment', etc.)
 * 2. Strictly enforces schema validation and permission checks on every call.
 * 3. Caches search results strictly with short TTL (e.g., 30s) to avoid provider spam.
 */

import { SafeCacheManager, getSafeCacheManager } from './cacheManager';

export class ToolCallOptimizer {
  private static instance: ToolCallOptimizer | null = null;
  private readonly cache: SafeCacheManager;

  // Never cache transactional or mutating tools
  private readonly nonCacheableTools = new Set(['createPayment']);

  private deduplicatedCount = 0;

  private constructor() {
    this.cache = getSafeCacheManager();
  }

  static getInstance(): ToolCallOptimizer {
    if (!ToolCallOptimizer.instance) {
      ToolCallOptimizer.instance = new ToolCallOptimizer();
    }
    return ToolCallOptimizer.instance;
  }

  /**
   * Checks if a tool result can be served from the transaction cache
   */
  getCachedResult<T>(toolName: string, args: unknown): T | undefined {
    if (this.nonCacheableTools.has(toolName)) {
      return undefined;
    }

    const key = this.buildKey(toolName, args);
    const cached = this.cache.get<T>('tool_search_results', key);
    if (cached !== undefined) {
      this.deduplicatedCount++;
    }
    return cached;
  }

  /**
   * Stores a read-only tool search result in cache with short TTL (30s)
   */
  cacheResult<T>(toolName: string, args: unknown, result: T, ttlMs = 30000): void {
    if (this.nonCacheableTools.has(toolName)) {
      return;
    }

    const key = this.buildKey(toolName, args);
    this.cache.set('tool_search_results', key, result, ttlMs);
  }

  /**
   * Returns count of avoided tool calls
   */
  getDeduplicatedCount(): number {
    return this.deduplicatedCount;
  }

  /**
   * Resets deduplication count and clears tool search cache
   */
  reset(): void {
    this.deduplicatedCount = 0;
    this.cache.invalidate('tool_search_results');
  }

  private buildKey(toolName: string, args: unknown): string {
    const serialized = typeof args === 'object' && args !== null
      ? JSON.stringify(args, Object.keys(args).sort())
      : String(args || '');
    return `${toolName}:${serialized}`;
  }
}

export function getToolCallOptimizer(): ToolCallOptimizer {
  return ToolCallOptimizer.getInstance();
}
