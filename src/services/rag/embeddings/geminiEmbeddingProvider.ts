/**
 * AeroDAG Gemini Embedding Provider
 * 
 * Generates embeddings via Google Gemini text-embedding-004 when a valid
 * GEMINI_API_KEY is available in the environment, with automatic graceful
 * fallback to the deterministic embedding provider.
 */

import { EmbeddingProvider } from './types';
import { DeterministicEmbeddingProvider } from './deterministicEmbeddingProvider';

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly providerName = 'Google-Gemini-text-embedding-004';
  private fallbackProvider = new DeterministicEmbeddingProvider();
  private isGeminiAvailable: boolean | null = null;

  get dimension(): number {
    return this.fallbackProvider.dimension;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined;

    if (this.isGeminiAvailable === false || !apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.length < 10) {
      return this.fallbackProvider.generateEmbedding(text);
    }

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      
      const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: text
      });

      const resAny = response as any;
      const values: number[] | undefined = resAny.embedding?.values || resAny.embeddings?.[0]?.values;
      if (values && values.length > 0) {
        this.isGeminiAvailable = true;
        // Normalize vector
        let norm = 0;
        for (const v of values) norm += v * v;
        norm = Math.sqrt(norm);
        return norm > 0 ? values.map((v: number) => v / norm) : values;
      }
    } catch (err) {
      // Graceful fallback to deterministic provider without failing or exposing errors
      this.isGeminiAvailable = false;
    }

    return this.fallbackProvider.generateEmbedding(text);
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.generateEmbedding(t)));
  }
}
