/**
 * AeroDAG Deterministic Semantic Embedding Provider
 * 
 * Provides fast, offline-capable, deterministic vector embeddings for semantic
 * retrieval without exposing secrets or requiring external network calls.
 * Implements normalized projection vectors with domain term weighting.
 */

import { EmbeddingProvider } from './types';
import { BaseProvider, ProviderCapabilities, ProviderHealthStatus } from '../../providers/types';

export class DeterministicEmbeddingProvider implements EmbeddingProvider, BaseProvider {
  readonly providerName = 'AeroDAG-Deterministic-Semantic-128d';
  readonly category = 'embeddings' as const;
  readonly isLive = false;
  readonly supportsBooking = false;
  readonly capabilities: ProviderCapabilities = {
    embeddings: true,
    realTimeData: false
  };
  readonly dimension = 128;

  async healthCheck(): Promise<ProviderHealthStatus> {
    return {
      providerName: this.providerName,
      category: 'embeddings',
      state: 'available',
      latencyMs: 1,
      lastChecked: new Date().toISOString(),
      details: 'Deterministic semantic embedding engine online'
    };
  }

  // Semantic domain clusters that project into fixed dimensions
  private static readonly SEMANTIC_ANCHORS: Array<{ words: string[]; dim: number; weight: number }> = [
    // Destinations
    { words: ['vietnam', 'hanoi', 'danang', 'da nang', 'halong', 'saigon'], dim: 0, weight: 3.5 },
    { words: ['singapore', 'changi', 'sentosa', 'mrt', 'orchard', 'jewel'], dim: 8, weight: 3.5 },
    { words: ['thailand', 'bangkok', 'phuket', 'krabi', 'samui', 'thai', 'suvarnabhumi'], dim: 16, weight: 3.5 },
    { words: ['japan', 'tokyo', 'kyoto', 'osaka', 'shinkansen', 'haneda', 'narita'], dim: 24, weight: 3.5 },
    { words: ['india', 'goa', 'kerala', 'domestic', 'bengaluru', 'delhi', 'mumbai'], dim: 32, weight: 3.5 },

    // Regulatory & Visa
    { words: ['visa', 'evisa', 'e-visa', 'voa', 'consular', 'embassy', 'permit', 'entry'], dim: 40, weight: 4.0 },
    { words: ['passport', 'validity', 'six months', '6 months', 'blank pages', 'biodata'], dim: 48, weight: 3.8 },
    { words: ['documents', 'identification', 'id', 'aadhaar', 'voter', 'pan', 'bcas', 'checklist'], dim: 54, weight: 3.5 },

    // Family & Minors
    { words: ['family', 'child', 'children', 'kid', 'kids', 'infant', 'toddler', 'minor', 'stroller'], dim: 62, weight: 3.8 },
    { words: ['nursing', 'lifejacket', 'life vest', 'concession', 'pediatric'], dim: 68, weight: 3.0 },

    // Seniors & Accessibility
    { words: ['senior', 'elderly', 'mother', 'father', 'grandparent', 'accessible', 'wheelchair', 'cane'], dim: 76, weight: 4.0 },
    { words: ['walking', 'step count', 'distance', 'stairs', 'elevator', 'heat', 'fatigue', 'pacing', 'rest'], dim: 82, weight: 3.5 },

    // Transit & Airport
    { words: ['airport', 'terminal', 'gate', 'transit', 'transfer', 'boarding', 'digiyatra', 'skytrain'], dim: 90, weight: 3.5 },
    { words: ['taxi', 'cab', 'grab', 'metro', 'subway', 'bus', 'train', 'suica', 'pasmo', 'ic card'], dim: 98, weight: 3.2 },

    // Travel Preparation & Rules
    { words: ['currency', 'cash', 'dong', 'yen', 'baht', 'atm', 'sim', 'esim', 'connectivity'], dim: 106, weight: 3.0 },
    { words: ['preparation', 'rules', 'regulations', 'safety', 'hygiene', 'health', 'flags', 'dress code', 'temple'], dim: 114, weight: 3.2 }
  ];

  async generateEmbedding(text: string): Promise<number[]> {
    const vector = new Array(this.dimension).fill(0);
    const cleaned = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
    const tokens = cleaned.split(/\s+/).filter((t) => t.length > 1);

    if (tokens.length === 0) {
      return vector;
    }

    // 1. Direct semantic anchor matching
    for (const anchor of DeterministicEmbeddingProvider.SEMANTIC_ANCHORS) {
      for (const word of anchor.words) {
        if (cleaned.includes(word)) {
          // Spread influence across neighboring dimensions
          for (let offset = 0; offset < 6; offset++) {
            const targetDim = (anchor.dim + offset) % this.dimension;
            vector[targetDim] += anchor.weight / (1 + offset * 0.4);
          }
        }
      }
    }

    // 2. Token frequency & subword hashing for open vocabulary
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      let hash = 0;
      for (let j = 0; j < token.length; j++) {
        hash = (hash * 31 + token.charCodeAt(j)) >>> 0;
      }
      const dim = hash % this.dimension;
      const weight = 1.0 / Math.log2(tokens.length + 2);
      vector[dim] += weight;

      // Bigram projection
      if (i < tokens.length - 1) {
        const bigram = `${token}_${tokens[i + 1]}`;
        let biHash = 0;
        for (let j = 0; j < bigram.length; j++) {
          biHash = (biHash * 37 + bigram.charCodeAt(j)) >>> 0;
        }
        const biDim = biHash % this.dimension;
        vector[biDim] += weight * 1.4;
      }
    }

    // 3. L2 Normalization (so dot-product == cosine similarity)
    let norm = 0;
    for (let i = 0; i < this.dimension; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < this.dimension; i++) {
        vector[i] = vector[i] / norm;
      }
    }

    return vector;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.generateEmbedding(t)));
  }
}
