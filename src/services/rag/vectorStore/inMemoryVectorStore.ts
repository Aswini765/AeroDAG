/**
 * AeroDAG In-Memory Vector Store
 * 
 * Lightweight, high-performance in-memory vector store computing cosine
 * similarity across normalized embedding vectors with metadata filtering.
 */

import { VectorStore } from './types';
import { KnowledgeChunk, RetrievedChunk } from '../../../types/travelKnowledge';

interface VectorEntry {
  chunk: KnowledgeChunk;
  embedding: number[];
}

export class InMemoryVectorStore implements VectorStore {
  readonly storeName = 'AeroDAG-InMemory-VectorStore';
  private entries: VectorEntry[] = [];

  async add(chunks: KnowledgeChunk[], embeddings: number[][]): Promise<void> {
    if (chunks.length !== embeddings.length) {
      throw new Error(`Chunks count (${chunks.length}) does not match embeddings count (${embeddings.length})`);
    }

    for (let i = 0; i < chunks.length; i++) {
      // Avoid duplicate chunk insertion
      const existingIdx = this.entries.findIndex((e) => e.chunk.chunkId === chunks[i].chunkId);
      if (existingIdx >= 0) {
        this.entries[existingIdx] = { chunk: chunks[i], embedding: embeddings[i] };
      } else {
        this.entries.push({ chunk: chunks[i], embedding: embeddings[i] });
      }
    }
  }

  async search(
    queryEmbedding: number[],
    topK = 4,
    filter?: (chunk: KnowledgeChunk) => boolean
  ): Promise<RetrievedChunk[]> {
    if (this.entries.length === 0 || queryEmbedding.length === 0) {
      return [];
    }

    const scored: RetrievedChunk[] = [];

    for (const entry of this.entries) {
      if (filter && !filter(entry.chunk)) {
        continue;
      }

      // Compute cosine similarity (dot product of normalized vectors)
      let dotProduct = 0;
      const dim = Math.min(queryEmbedding.length, entry.embedding.length);
      for (let i = 0; i < dim; i++) {
        dotProduct += queryEmbedding[i] * entry.embedding[i];
      }

      // Bound score between 0.0 and 1.0
      const score = Math.max(0, Math.min(1, (dotProduct + 1) / 2));
      scored.push({
        chunk: entry.chunk,
        score: Number(score.toFixed(4))
      });
    }

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK);
  }

  count(): number {
    return this.entries.length;
  }

  getAllChunks(): KnowledgeChunk[] {
    return this.entries.map((e) => e.chunk);
  }

  async clear(): Promise<void> {
    this.entries = [];
  }
}
