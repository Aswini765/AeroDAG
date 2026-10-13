/**
 * AeroDAG Deterministic Mock Currency Provider
 * 
 * Provides exchange rate lookup and multi-currency conversion calculations.
 * Decoupled from Open Exchange Rates, XE, and Wise APIs.
 * Returns strictly simulated metadata.
 */

import {
  CurrencyProvider,
  CurrencyRate,
  ProviderCapabilities,
  ProviderHealthStatus
} from './types';
import { sanitizeProviderMetadata } from './normalizers';

export class MockCurrencyProvider implements CurrencyProvider {
  public readonly providerName = 'MockCurrencyProvider';
  public readonly category = 'currency' as const;
  public readonly isLive = false;
  public readonly supportsBooking = false;
  public readonly capabilities: ProviderCapabilities = {
    pricing: true,
    currencySupport: true,
    realTimeData: false,
    domestic: true,
    international: true
  };

  private ratesToINR: Record<string, number> = {
    INR: 1.0,
    USD: 86.5,
    EUR: 91.2,
    SGD: 64.8,
    AED: 23.5,
    JPY: 0.58,
    GBP: 109.0,
    THB: 2.35,
    VND: 0.0034
  };

  async getExchangeRate(from: string, to: string): Promise<CurrencyRate> {
    const f = from.toUpperCase();
    const t = to.toUpperCase();

    const fromRateInINR = this.ratesToINR[f] ?? 1.0;
    const toRateInINR = this.ratesToINR[t] ?? 1.0;

    // Rate = units of `to` per 1 unit of `from`
    const rate = Number((fromRateInINR / toRateInINR).toFixed(4));

    return {
      fromCurrency: f,
      toCurrency: t,
      baseCurrency: f,
      quoteCurrency: t,
      rate,
      timestamp: new Date().toISOString(),
      retrievedAt: new Date().toISOString(),
      isStale: false,
      providerMetadata: sanitizeProviderMetadata(this.providerName, true, undefined, 4, 0)
    };
  }

  async convert(
    amount: number,
    from: string,
    to: string
  ): Promise<{ convertedAmount: number; rate: number; currency: string }> {
    const { rate } = await this.getExchangeRate(from, to);
    const convertedAmount = Math.round(amount * rate * 100) / 100;

    return {
      convertedAmount,
      rate,
      currency: to.toUpperCase()
    };
  }

  async convertDetailed(
    amount: number,
    from: string,
    to: string
  ): Promise<any> {
    const { convertedAmount, rate } = await this.convert(amount, from, to);
    return {
      amount,
      sourceCurrency: from.toUpperCase(),
      originalAmount: amount,
      exchangeRate: rate,
      rateTimestamp: new Date().toISOString(),
      targetCurrency: to.toUpperCase(),
      convertedAmount,
      provider: this.providerName,
      cached: false,
      isStale: false
    };
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    return {
      providerName: this.providerName,
      category: this.category,
      state: 'available',
      latencyMs: 4,
      lastChecked: new Date().toISOString(),
      details: 'Deterministic mock currency provider online'
    };
  }
}
