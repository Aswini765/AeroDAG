/**
 * AeroDAG Vector Store Interface
 * 
 * Provider-agnostic abstraction designed to support InMemoryVectorStore today,
 * and seamlessly swap to PostgreSQL + pgvector or cloud vector databases later.
 */

import { KnowledgeChunk, RetrievedChunk } from '../../../types/travelKnowledge';

export interface VectorStore {
  readonly storeName: string;

  /**
   * Adds or indexes a batch of chunks with their corresponding embedding vectors
   */
  add(chunks: KnowledgeChunk[], embeddings: number[][]): Promise<void>;

  /**
   * Performs semantic similarity search returning topK matching chunks
   */
  search(
    queryEmbedding: number[],
    topK: number,
    filter?: (chunk: KnowledgeChunk) => boolean
  ): Promise<RetrievedChunk[]>;

  /**
   * Retrieves the count of indexed chunks
   */
  count(): number;

  /**
   * Retrieves all chunks currently stored
   */
  getAllChunks(): KnowledgeChunk[];

  /**
   * Clears the store
   */
  clear(): Promise<void>;
}
