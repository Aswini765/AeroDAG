/**
 * AeroDAG Embedding Provider Interfaces
 * 
 * Provider-agnostic abstraction for vector embedding generation.
 */

export interface EmbeddingProvider {
  readonly providerName: string;
  readonly dimension: number;

  /**
   * Generates a normalized vector embedding for a single text
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Generates normalized vector embeddings for a batch of texts
   */
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}
