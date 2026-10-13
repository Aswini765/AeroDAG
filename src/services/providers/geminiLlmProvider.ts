/**
 * AeroDAG Gemini LLM Provider Adapter
 * 
 * Implements the domain-neutral LLMProvider interface by adapting Google Gemini.
 * Encapsulates all Gemini-specific SDK calls, token extraction, and cost accounting.
 * Protects travel agents from depending directly on Google GenAI SDK imports.
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
import {
  ProviderAuthenticationError,
  ProviderTimeoutError,
  ProviderRateLimitError,
  ProviderUnavailableError,
  ProviderError
} from './errors';
import { getEnv } from '../../config/env';
import { getFailureInjector } from '../reliability/failureInjector';
import { getTelemetryTracer, getTelemetryMetricsCollector } from '../telemetry';
import { sanitizeProviderMetadata } from './normalizers';

export class GeminiLLMProvider implements LLMProvider {
  public readonly providerName = 'GeminiLLMProvider';
  public readonly category = 'llm' as const;
  public readonly isLive = true;
  public readonly supportsBooking = false;
  public readonly capabilities: ProviderCapabilities = {
    search: false,
    realTimeData: true,
    structuredOutput: true,
    streaming: true,
    embeddings: true
  };

  private client: any = null;

  private async getClient(): Promise<any> {
    if (this.client) return this.client;

    const env = getEnv();
    const apiKey = env.geminiApiKey;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      throw new ProviderAuthenticationError(
        this.providerName,
        'init',
        'Valid GEMINI_API_KEY is not configured'
      );
    }

    try {
      const { GoogleGenAI } = await import('@google/genai');
      this.client = new GoogleGenAI({ apiKey: apiKey.trim() });
      return this.client;
    } catch (err: any) {
      throw new ProviderUnavailableError(
        this.providerName,
        'init',
        `Failed to initialize Gemini SDK: ${err?.message || err}`,
        err
      );
    }
  }

  async generate(request: LLMGenerateRequest): Promise<LLMGenerateResponse> {
    const start = Date.now();
    const model = request.model || getEnv().defaultFastModel || 'gemini-2.5-flash';
    const tracer = getTelemetryTracer();
    const span = tracer.startTrace('llm_generate', 'llm', {
      provider: this.providerName,
      model
    });

    try {
      // Reliability Failure Injection
      const injector = getFailureInjector();
      if (injector.isEnabled() && injector.shouldFail('GEMINI', 'generate')) {
        await injector.inject('GEMINI', 'generate');
      }

      const ai = await this.getClient();
      const response = await ai.models.generateContent({
        model,
        contents: request.prompt,
        config: {
          systemInstruction: request.systemInstruction,
          temperature: request.temperature,
          maxOutputTokens: request.maxTokens
        }
      });

      const latencyMs = Date.now() - start;
      const usage = (response as any).usageMetadata;
      let tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined = undefined;
      let cost: number | 'unavailable' = 'unavailable';

      if (usage && typeof usage.promptTokenCount === 'number' && typeof usage.candidatesTokenCount === 'number') {
        const promptTokens = usage.promptTokenCount;
        const completionTokens = usage.candidatesTokenCount;
        const totalTokens = usage.totalTokenCount || (promptTokens + completionTokens);
        tokenUsage = { promptTokens, completionTokens, totalTokens };
        cost = (promptTokens * 0.000000075) + (completionTokens * 0.0000003);
      }

      tracer.endSpan(span.spanId, 'SUCCESS', {
        model,
        tokenUsage,
        cost,
        latencyMs
      });

      return {
        text: response.text || '',
        model,
        tokenUsage,
        providerMetadata: sanitizeProviderMetadata(
          this.providerName,
          false,
          { model },
          latencyMs,
          cost
        )
      };
    } catch (err: any) {
      tracer.endSpan(span.spanId, 'ERROR', {
        error: err?.message || String(err)
      });
      throw this.normalizeError(err, 'generate');
    }
  }

  async generateStructured<T>(request: LLMStructuredRequest<T>): Promise<LLMStructuredResponse<T>> {
    const start = Date.now();
    const model = request.model || getEnv().defaultFastModel || 'gemini-2.5-flash';
    const tracer = getTelemetryTracer();
    const span = tracer.startTrace('llm_generate_structured', 'llm', {
      provider: this.providerName,
      model
    });

    try {
      const injector = getFailureInjector();
      if (injector.isEnabled() && injector.shouldFail('GEMINI', 'generateStructured')) {
        await injector.inject('GEMINI', 'generateStructured');
      }

      const ai = await this.getClient();
      const response = await ai.models.generateContent({
        model,
        contents: request.prompt,
        config: {
          systemInstruction: request.systemInstruction,
          responseMimeType: 'application/json',
          temperature: request.temperature
        }
      });

      const latencyMs = Date.now() - start;
      const rawText = response.text || '{}';
      const parsedData = JSON.parse(rawText) as T;

      const usage = (response as any).usageMetadata;
      let tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined = undefined;
      let cost: number | 'unavailable' = 'unavailable';

      if (usage && typeof usage.promptTokenCount === 'number') {
        const promptTokens = usage.promptTokenCount;
        const completionTokens = usage.candidatesTokenCount || 0;
        const totalTokens = usage.totalTokenCount || (promptTokens + completionTokens);
        tokenUsage = { promptTokens, completionTokens, totalTokens };
        cost = (promptTokens * 0.000000075) + (completionTokens * 0.0000003);
      }

      tracer.endSpan(span.spanId, 'SUCCESS', {
        model,
        tokenUsage,
        cost,
        latencyMs
      });

      return {
        data: parsedData,
        rawText,
        model,
        tokenUsage,
        providerMetadata: sanitizeProviderMetadata(
          this.providerName,
          false,
          { model },
          latencyMs,
          cost
        )
      };
    } catch (err: any) {
      tracer.endSpan(span.spanId, 'ERROR', {
        error: err?.message || String(err)
      });
      throw this.normalizeError(err, 'generateStructured');
    }
  }

  async embed(text: string): Promise<number[]> {
    const ai = await this.getClient();
    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: text
    });
    return response.embedding.values;
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    const start = Date.now();
    try {
      const ai = await this.getClient();
      if (!ai) {
        return {
          providerName: this.providerName,
          category: this.category,
          state: 'unavailable',
          lastChecked: new Date().toISOString(),
          details: 'Client not initialized'
        };
      }
      return {
        providerName: this.providerName,
        category: this.category,
        state: 'available',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
        details: 'Gemini API client responsive'
      };
    } catch (err: any) {
      const isAuth = err?.message?.includes('API_KEY') || err?.message?.includes('401');
      return {
        providerName: this.providerName,
        category: this.category,
        state: isAuth ? 'authentication_failure' : 'unavailable',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
        details: err?.message || 'Gemini healthcheck failed'
      };
    }
  }

  private normalizeError(err: any, operation: string): ProviderError {
    const msg = err?.message || String(err);
    const lower = msg.toLowerCase();

    if (lower.includes('timeout') || lower.includes('etimedout')) {
      return new ProviderTimeoutError(this.providerName, operation, undefined, err);
    }
    if (lower.includes('429') || lower.includes('quota') || lower.includes('resource exhausted')) {
      return new ProviderRateLimitError(this.providerName, operation, undefined, err);
    }
    if (lower.includes('api key') || lower.includes('unauthorized') || lower.includes('401')) {
      return new ProviderAuthenticationError(this.providerName, operation, msg, err);
    }
    if (lower.includes('503') || lower.includes('unavailable') || lower.includes('bad gateway')) {
      return new ProviderUnavailableError(this.providerName, operation, msg, err);
    }

    return new ProviderError(msg, this.providerName, operation, 'LLM_ERROR', err);
  }
}
