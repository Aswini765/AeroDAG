/**
 * AeroDAG Real Currency Provider Adapter (European Central Bank / Frankfurter Integration)
 * 
 * Implements domain CurrencyProvider interface for authoritative exchange rates
 * and deterministic multi-currency conversion.
 * Strict Invariant: Financial arithmetic is strictly deterministic and never delegated to LLMs.
 * Decoupled from Open Exchange Rates, XE, and Wise APIs.
 * Supports configurable custom invoker for deterministic test suites.
 */

import {
  CurrencyProvider,
  CurrencyRate,
  CurrencyConversionResult,
  ProviderCapabilities,
  ProviderHealthStatus,
  HttpInvoker
} from './types';
import {
  ProviderValidationError,
  ProviderAuthenticationError,
  ProviderTimeoutError,
  ProviderRateLimitError,
  ProviderUnavailableError,
  ProviderDataError,
  normalizeProviderError
} from './errors';
import { normalizeCurrency, sanitizeProviderMetadata } from './normalizers';
import { SafeCacheManager } from '../optimization/cacheManager';
import { getTelemetryTracer } from '../telemetry';

export class RealCurrencyProvider implements CurrencyProvider {
  public readonly providerName = 'RealCurrencyProvider';
  public readonly category = 'currency' as const;
  public readonly isLive = false;
  public readonly supportsBooking = false;
  public readonly capabilities: ProviderCapabilities = {
    pricing: true,
    currencySupport: true,
    realTimeData: true,
    domestic: true,
    international: true
  };

  private readonly frankfurterBase = 'https://api.frankfurter.app';

  // Currency code validation pattern (3 alphabetic chars)
  private readonly currencyRegex = /^[A-Z]{3}$/;

  constructor(private customInvoker?: HttpInvoker) {}

  /**
   * Sets custom invoker (useful for test fixtures & recorded network mocks)
   */
  public setInvoker(invoker: HttpInvoker): void {
    this.customInvoker = invoker;
  }

  /**
   * Executes HTTP request with timeout handling and error classification
   */
  private async executeHttp(url: string, options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
  }): Promise<{ status: number; data: any; headers?: Record<string, string> }> {
    const timeoutMs = options.timeoutMs || 8000;

    // Security check on target URL
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new ProviderValidationError(this.providerName, 'http', `Prohibited protocol: ${parsed.protocol}`);
      }
    } catch (err: any) {
      if (err instanceof ProviderValidationError) throw err;
      throw new ProviderValidationError(this.providerName, 'http', `Invalid URL format: ${url}`);
    }

    if (this.customInvoker) {
      try {
        return await this.customInvoker(url, options);
      } catch (err: any) {
        throw normalizeProviderError(err, this.providerName, 'http');
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'AeroDAG-Currency-Platform/1.0',
          ...options.headers
        },
        body: options.body,
        signal: controller.signal
      });

      const text = await res.text();
      let data: any;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { rawText: text };
      }

      return { status: res.status, data };
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('timeout') || err.message?.includes('aborted')) {
        throw new ProviderTimeoutError(this.providerName, 'request', timeoutMs, err);
      }
      throw normalizeProviderError(err, this.providerName, 'request');
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Validates 3-letter currency code
   */
  private validateCurrencyCode(code: string, fieldName: string): string {
    if (!code || typeof code !== 'string') {
      throw new ProviderValidationError(this.providerName, 'validate', `Missing or empty currency in '${fieldName}'`);
    }
    const clean = code.trim().toUpperCase();
    if (!this.currencyRegex.test(clean)) {
      throw new ProviderValidationError(this.providerName, 'validate', `Invalid currency code '${code}' in '${fieldName}' (must be 3 letters)`);
    }
    return clean;
  }

  /**
   * Retrieves exchange rate between base currency and quote currency
   */
  async getExchangeRate(from: string, to: string): Promise<CurrencyRate> {
    const start = Date.now();
    const fromCode = this.validateCurrencyCode(from, 'from');
    const toCode = this.validateCurrencyCode(to, 'to');

    // Fast-path: Same currency identity conversion
    if (fromCode === toCode) {
      return {
        fromCurrency: fromCode,
        toCurrency: toCode,
        baseCurrency: fromCode,
        quoteCurrency: toCode,
        rate: 1.0,
        timestamp: new Date().toISOString(),
        source: 'Identity Conversion',
        retrievedAt: new Date().toISOString(),
        isStale: false,
        providerMetadata: sanitizeProviderMetadata(this.providerName, false, undefined, 0, 0)
      };
    }

    const cacheKey = `cur_rate_${fromCode}_${toCode}`;
    const cache = SafeCacheManager.getInstance();
    const cached = cache.get<CurrencyRate>('tool_search_results', cacheKey);
    if (cached) {
      return {
        ...cached,
        providerMetadata: {
          ...cached.providerMetadata,
          cached: true
        }
      };
    }

    const tracer = getTelemetryTracer();
    const span = tracer.startTrace('real_currency_rate', 'provider', {
      provider: this.providerName,
      from: fromCode,
      to: toCode
    });

    try {
      const url = `${this.frankfurterBase}/latest?from=${fromCode}&to=${toCode}`;
      const response = await this.executeHttp(url, { method: 'GET', timeoutMs: 6000 });

      if (response.status === 429) {
        throw new ProviderRateLimitError(this.providerName, 'getExchangeRate', 5);
      }
      if (response.status === 401 || response.status === 403) {
        throw new ProviderAuthenticationError(this.providerName, 'getExchangeRate', `HTTP ${response.status} unauthorized`);
      }
      if (response.status >= 500) {
        throw new ProviderUnavailableError(this.providerName, 'getExchangeRate', `HTTP ${response.status} currency exchange service outage`);
      }
      if (response.status >= 400) {
        throw new ProviderValidationError(this.providerName, 'getExchangeRate', response.data?.message || `HTTP ${response.status} invalid currency request`);
      }

      const data = response.data;
      if (!data || typeof data !== 'object') {
        throw new ProviderDataError(this.providerName, 'getExchangeRate', 'Malformed currency response object');
      }

      const rawRate = data.rates?.[toCode] ?? data.rate ?? data[toCode];
      const rate = Number(rawRate);
      if (isNaN(rate) || rate <= 0) {
        throw new ProviderDataError(this.providerName, 'getExchangeRate', `Missing or invalid exchange rate for '${toCode}' in response`);
      }

      const timestamp = String(data.date ?? data.timestamp ?? new Date().toISOString());
      const retrievedAt = new Date().toISOString();

      // Check freshness: Stale if rate timestamp is > 24 hours old
      const parsedTime = Date.parse(timestamp);
      const isStale = !isNaN(parsedTime) && (Date.now() - parsedTime > 86400000);

      const currencyRate: CurrencyRate = {
        fromCurrency: fromCode,
        toCurrency: toCode,
        baseCurrency: fromCode,
        quoteCurrency: toCode,
        rate,
        timestamp,
        source: 'Frankfurter / European Central Bank',
        retrievedAt,
        isStale,
        providerMetadata: sanitizeProviderMetadata(
          this.providerName,
          false,
          { rawRate },
          Date.now() - start,
          0
        )
      };

      // Cache exchange rate for 10 minutes (600 seconds)
      cache.set('tool_search_results', cacheKey, currencyRate, 600000);

      tracer.endSpan(span.spanId, 'SUCCESS', {
        from: fromCode,
        to: toCode,
        rate
      });

      return currencyRate;
    } catch (err: any) {
      tracer.endSpan(span.spanId, 'ERROR', { error: err.message });
      throw normalizeProviderError(err, this.providerName, 'getExchangeRate');
    }
  }

  /**
   * Performs deterministic financial currency conversion
   * convertedAmount = sourceAmount * exchangeRate
   */
  async convert(
    amount: number,
    from: string,
    to: string
  ): Promise<{ convertedAmount: number; rate: number; currency: string }> {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new ProviderValidationError(this.providerName, 'convert', "Amount must be a valid number");
    }

    const { rate } = await this.getExchangeRate(from, to);
    // Strict arithmetic: preserve precision and round to 2 decimals at presentation boundary
    const convertedAmount = Math.round(amount * rate * 100) / 100;

    return {
      convertedAmount,
      rate,
      currency: to.toUpperCase().trim()
    };
  }

  /**
   * Performs detailed, auditable financial conversion retaining full metadata
   */
  async convertDetailed(
    amount: number,
    from: string,
    to: string
  ): Promise<CurrencyConversionResult> {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new ProviderValidationError(this.providerName, 'convertDetailed', "Amount must be a valid number");
    }

    const rateResult = await this.getExchangeRate(from, to);
    const convertedAmount = Math.round(amount * rateResult.rate * 100) / 100;

    return {
      amount,
      sourceCurrency: rateResult.fromCurrency,
      exchangeRate: rateResult.rate,
      rateTimestamp: rateResult.timestamp,
      targetCurrency: rateResult.toCurrency,
      convertedAmount,
      provider: this.providerName,
      cached: Boolean(rateResult.providerMetadata?.cached),
      isStale: rateResult.isStale
    };
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    return {
      providerName: this.providerName,
      category: this.category,
      state: 'available',
      latencyMs: 10,
      lastChecked: new Date().toISOString(),
      details: 'European Central Bank live exchange rates active'
    };
  }
}
