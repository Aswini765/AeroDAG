/**
 * AeroDAG Cached Embedding Provider
 * 
 * Decorator that caches embedding computations in memory to prevent
 * redundant embedding calls for identical documents and queries.
 */

import { EmbeddingProvider } from './types';

export class CachedEmbeddingProvider implements EmbeddingProvider {
  private cache = new Map<string, number[]>();
  private hits = 0;
  private misses = 0;

  constructor(
    private readonly innerProvider: EmbeddingProvider,
    private readonly maxCacheSize: number = 1000
  ) {}

  get providerName(): string {
    return `${this.innerProvider.providerName} (Cached)`;
  }

  get dimension(): number {
    return this.innerProvider.dimension;
  }

  has(text: string): boolean {
    const key = text.trim().toLowerCase();
    return this.cache.has(key);
  }

  invalidate(text: string): boolean {
    const key = text.trim().toLowerCase();
    return this.cache.delete(key);
  }

  getHits(): number {
    return this.hits;
  }

  getMisses(): number {
    return this.misses;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const key = text.trim().toLowerCase();
    const cached = this.cache.get(key);
    if (cached) {
      this.hits++;
      return cached;
    }

    this.misses++;
    const vector = await this.innerProvider.generateEmbedding(text);
    if (this.cache.size >= this.maxCacheSize) {
      // Evict oldest entries
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, vector);
    return vector;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.generateEmbedding(t)));
  }

  clearCache(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  get cacheSize(): number {
    return this.cache.size;
  }
}
