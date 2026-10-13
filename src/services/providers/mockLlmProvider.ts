/**
 * AeroDAG Deterministic Mock LLM Provider
 * 
 * Implements the domain LLMProvider interface for unit tests, offline development,
 * and deterministic evaluation runs.
 * Returns structured and freeform text responses with simulated metadata.
 */

import {
  LLMProvider,
  LLMGenerateRequest,
  LLMGenerateResponse,
  LLMStructuredRequest,
  LLMStructuredResponse,
  ProviderCapabilities,
  ProviderHealthStatus
} from './types';
import { sanitizeProviderMetadata } from './normalizers';

export class MockLLMProvider implements LLMProvider {
  public readonly providerName = 'MockLLMProvider';
  public readonly category = 'llm' as const;
  public readonly isLive = false;
  public readonly supportsBooking = false;
  public readonly capabilities: ProviderCapabilities = {
    search: false,
    realTimeData: false,
    structuredOutput: true,
    streaming: false,
    embeddings: true
  };

  async generate(request: LLMGenerateRequest): Promise<LLMGenerateResponse> {
    const text = `[MockLLM Response] Processed query: "${request.prompt.slice(0, 80)}"`;
    const promptTokens = Math.ceil(request.prompt.length / 4);
    const completionTokens = Math.ceil(text.length / 4);

    return {
      text,
      model: request.model || 'mock-llm-v1',
      tokenUsage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens
      },
      providerMetadata: sanitizeProviderMetadata(
        this.providerName,
        true,
        { model: request.model || 'mock-llm-v1' },
        15,
        0
      )
    };
  }

  async generateStructured<T>(request: LLMStructuredRequest<T>): Promise<LLMStructuredResponse<T>> {
    // Provide deterministic simulated structured JSON
    const data = {
      message: 'Simulated AI travel consultation response',
      extractedRequirements: {
        destination: 'Goa',
        durationDays: 5,
        adultsCount: 2
      },
      missingRequirements: [],
      nextQuestion: null,
      readyToPlan: true
    } as unknown as T;

    const rawText = JSON.stringify(data);
    const promptTokens = Math.ceil(request.prompt.length / 4);
    const completionTokens = Math.ceil(rawText.length / 4);

    return {
      data,
      rawText,
      model: request.model || 'mock-llm-v1',
      tokenUsage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens
      },
      providerMetadata: sanitizeProviderMetadata(
        this.providerName,
        true,
        { model: request.model || 'mock-llm-v1' },
        20,
        0
      )
    };
  }

  async embed(text: string): Promise<number[]> {
    // Deterministic 768-dim pseudo vector
    const vector = new Array(768).fill(0);
    for (let i = 0; i < Math.min(text.length, 768); i++) {
      vector[i] = Number((Math.sin(text.charCodeAt(i) + i) * 0.1).toFixed(6));
    }
    return vector;
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    return {
      providerName: this.providerName,
      category: this.category,
      state: 'available',
      latencyMs: 15,
      lastChecked: new Date().toISOString(),
      details: 'Deterministic mock LLM provider ready'
    };
  }
}
