/**
 * AeroDAG Centralized Provider Registry & Fallback Orchestration
 * 
 * Provides configuration-driven provider resolution, capability inspection,
 * health tracking, safe fallback chains, and security boundaries.
 * Enforces that agents only ever interface through domain-level abstractions.
 */

import {
  BaseProvider,
  ProviderCategory,
  ProviderCapabilities,
  ProviderHealthStatus,
  ProviderHealthState
} from './types';
import {
  ProviderNotSupportedError,
  ProviderValidationError,
  ProviderUnavailableError,
  normalizeProviderError
} from './errors';
import { getTelemetryTracer } from '../telemetry';

export interface FallbackOptions {
  allowSimulatedFallback?: boolean;
  fallbackChain?: string[];
}

export class ProviderRegistry {
  private static instance: ProviderRegistry | null = null;

  // Category -> (ProviderName -> Provider Instance)
  private providers = new Map<ProviderCategory, Map<string, BaseProvider>>();
  // Category -> Default Provider Name
  private defaultProviders = new Map<ProviderCategory, string>();
  // Provider Health Cache
  private healthStates = new Map<string, ProviderHealthStatus>();

  private constructor() {
    this.initializeCategoryMaps();
  }

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  /**
   * Resets registry instance (primarily for isolated test fixtures)
   */
  public static resetInstance(): void {
    ProviderRegistry.instance = null;
  }

  private initializeCategoryMaps(): void {
    const categories: ProviderCategory[] = [
      'flights',
      'hotels',
      'transport',
      'activities',
      'maps',
      'weather',
      'currency',
      'payment',
      'llm',
      'embeddings',
      'travelKnowledge'
    ];
    categories.forEach(cat => {
      this.providers.set(cat, new Map());
    });
  }

  /**
   * Server-side registration of a domain provider instance
   */
  public registerProvider<T extends BaseProvider>(
    category: ProviderCategory,
    provider: T,
    isDefault = false,
    aliases: string[] = []
  ): void {
    // Security check: validate category and provider name
    if (!category || !this.providers.has(category)) {
      throw new ProviderValidationError(
        provider?.providerName || 'unknown',
        'register',
        `Invalid or unsupported provider category '${category}'`
      );
    }

    if (!provider || typeof provider.providerName !== 'string' || !provider.providerName.trim()) {
      throw new ProviderValidationError(
        'registry',
        'register',
        'Provider must possess a non-empty providerName'
      );
    }

    // Security check: reject prototype pollution attempts or path traversal
    if (
      provider.providerName === '__proto__' ||
      provider.providerName === 'constructor' ||
      provider.providerName === 'prototype' ||
      provider.providerName.includes('/') ||
      provider.providerName.includes('\\')
    ) {
      throw new ProviderValidationError(
        provider.providerName,
        'register',
        'Malicious or illegal provider name rejected'
      );
    }

    const catMap = this.providers.get(category)!;
    catMap.set(provider.providerName.toLowerCase(), provider);
    for (const alias of aliases) {
      if (alias && typeof alias === 'string' && !alias.includes('/') && !alias.includes('\\')) {
        catMap.set(alias.toLowerCase(), provider);
      }
    }

    // Set as default if requested or if it's the first provider in category
    if (isDefault || !this.defaultProviders.has(category)) {
      this.defaultProviders.set(category, provider.providerName.toLowerCase());
    }

    // Initialize health status
    this.healthStates.set(`${category}:${provider.providerName.toLowerCase()}`, {
      providerName: provider.providerName,
      category,
      state: 'available',
      lastChecked: new Date().toISOString()
    });
  }

  /**
   * Retrieves a specific registered provider by category and optional name
   */
  public getProvider<T extends BaseProvider>(category: ProviderCategory, name?: string): T {
    const catMap = this.providers.get(category);
    if (!catMap || catMap.size === 0) {
      throw new ProviderUnavailableError(
        name || 'unspecified',
        'lookup',
        `No providers registered for category '${category}'`
      );
    }

    const targetKey = name ? name.toLowerCase() : this.defaultProviders.get(category);
    if (!targetKey || !catMap.has(targetKey)) {
      throw new ProviderValidationError(
        name || 'unknown',
        'lookup',
        `Provider '${name}' is not registered in category '${category}'`
      );
    }

    return catMap.get(targetKey) as T;
  }

  /**
   * Resolves the configured provider for a given category based on server configuration.
   * Ensures client cannot supply arbitrary untrusted provider class names.
   */
  public resolveProvider<T extends BaseProvider>(
    category: ProviderCategory,
    overrideName?: string
  ): T {
    const catMap = this.providers.get(category);
    if (!catMap || catMap.size === 0) {
      throw new ProviderUnavailableError(
        'registry',
        'resolve',
        `No providers available for category '${category}'`
      );
    }

    // Check configuration environment
    let chosenName: string | undefined = undefined;

    if (overrideName) {
      // Validate requested name exists in safe registered list
      if (!catMap.has(overrideName.toLowerCase())) {
        throw new ProviderValidationError(
          overrideName,
          'resolve',
          `Unauthorized or unknown provider '${overrideName}' for category '${category}'`
        );
      }
      chosenName = overrideName.toLowerCase();
    } else {
      // Read from server environment (support both singular and plural e.g. FLIGHT_PROVIDER & FLIGHTS_PROVIDER)
      const safeEnv = typeof process !== 'undefined' && process.env ? process.env : ({} as Record<string, string | undefined>);
      const singularCat = category.endsWith('s') ? category.slice(0, -1) : category;
      const envValue = safeEnv[`${singularCat.toUpperCase()}_PROVIDER`] ||
                       safeEnv[`${category.toUpperCase()}_PROVIDER`];
      if (envValue && catMap.has(envValue.toLowerCase())) {
        chosenName = envValue.toLowerCase();
      } else {
        chosenName = this.defaultProviders.get(category);
      }
    }

    if (!chosenName || !catMap.has(chosenName)) {
      // Fall back to first available in category
      const firstEntry = catMap.values().next().value;
      return firstEntry as T;
    }

    return catMap.get(chosenName) as T;
  }

  /**
   * Lists all registered providers, their capabilities, and current health states
   */
  public listProviders(category?: ProviderCategory): Array<{
    name: string;
    category: ProviderCategory;
    capabilities: ProviderCapabilities;
    health: ProviderHealthState;
    isDefault: boolean;
  }> {
    const result: Array<{
      name: string;
      category: ProviderCategory;
      capabilities: ProviderCapabilities;
      health: ProviderHealthState;
      isDefault: boolean;
    }> = [];

    const categoriesToList = category ? [category] : Array.from(this.providers.keys());

    for (const cat of categoriesToList) {
      const catMap = this.providers.get(cat);
      if (!catMap) continue;

      const def = this.defaultProviders.get(cat);
      const seen = new Set<BaseProvider>();
      for (const [key, prov] of catMap.entries()) {
        if (seen.has(prov)) continue;
        seen.add(prov);
        const health = this.healthStates.get(`${cat}:${prov.providerName.toLowerCase()}`)?.state || 'available';
        result.push({
          name: prov.providerName,
          category: cat,
          capabilities: prov.capabilities,
          health,
          isDefault: prov.providerName.toLowerCase() === def
        });
      }
    }

    return result;
  }

  /**
   * Asserts that a provider supports a given capability. Throws ProviderNotSupportedError if not.
   */
  public assertCapability(provider: BaseProvider, capability: keyof ProviderCapabilities): void {
    if (!provider.capabilities || !provider.capabilities[capability]) {
      throw new ProviderNotSupportedError(
        provider.providerName,
        'capabilityCheck',
        String(capability)
      );
    }
  }

  /**
   * Executes an operation with safe fallback through a chain of providers.
   * INVARIANT: Never silently fabricates real availability.
   * If mock provider is used in fallback, returns explicit simulated metadata.
   */
  public async executeWithFallback<TResult>(
    category: ProviderCategory,
    operation: string,
    runner: (provider: any) => Promise<TResult>,
    options: FallbackOptions = {}
  ): Promise<TResult> {
    const catMap = this.providers.get(category);
    if (!catMap || catMap.size === 0) {
      throw new ProviderUnavailableError('registry', operation, `No providers for ${category}`);
    }

    // Determine candidate chain
    const chainKeys: string[] = [];
    if (options.fallbackChain && options.fallbackChain.length > 0) {
      chainKeys.push(...options.fallbackChain.map(s => s.toLowerCase()));
    } else {
      const def = this.defaultProviders.get(category);
      if (def) chainKeys.push(def);
      for (const k of catMap.keys()) {
        if (!chainKeys.includes(k)) chainKeys.push(k);
      }
    }

    let lastError: any = null;
    const tracer = getTelemetryTracer();
    const safeEnv = typeof process !== 'undefined' && process.env ? process.env : ({} as Record<string, string | undefined>);
    const isProduction = safeEnv.NODE_ENV === 'production';
    const isDemoMode = safeEnv.DEMO_MODE === 'true';
    const disallowMock = (isProduction && !isDemoMode && options.allowSimulatedFallback !== true) || options.allowSimulatedFallback === false;

    for (const key of chainKeys) {
      const provider = catMap.get(key);
      if (!provider) continue;

      // If provider is a mock provider and simulated fallback is prohibited, skip
      const isMock = provider.providerName.toLowerCase().includes('mock');
      if (isMock && disallowMock) {
        continue;
      }

      try {
        const result = await runner(provider);
        return result;
      } catch (err: any) {
        lastError = err;
        // Record health degradation
        this.updateHealthState(category, provider.providerName, 'degraded', err.message);

        tracer.startTrace('provider_fallback_attempt', 'reliability', {
          failedProvider: provider.providerName,
          operation,
          error: err.message
        });
      }
    }

    throw normalizeProviderError(
      lastError || new Error(`All providers exhausted in fallback chain for ${category}`),
      'ProviderRegistry',
      operation
    );
  }

  /**
   * Performs health checks on registered providers
   */
  public async healthCheck(category?: ProviderCategory, name?: string): Promise<ProviderHealthStatus[]> {
    const results: ProviderHealthStatus[] = [];
    const categories = category ? [category] : Array.from(this.providers.keys());

    for (const cat of categories) {
      const catMap = this.providers.get(cat);
      if (!catMap) continue;

      for (const [key, prov] of catMap.entries()) {
        if (name && key !== name.toLowerCase()) continue;

        let status: ProviderHealthStatus;
        if (prov.healthCheck) {
          try {
            status = await prov.healthCheck();
          } catch (err: any) {
            status = {
              providerName: prov.providerName,
              category: cat,
              state: 'unavailable',
              lastChecked: new Date().toISOString(),
              details: err?.message || 'Health check error'
            };
          }
        } else {
          status = {
            providerName: prov.providerName,
            category: cat,
            state: 'available',
            lastChecked: new Date().toISOString(),
            details: 'Provider active'
          };
        }

        this.healthStates.set(`${cat}:${key}`, status);
        results.push(status);
      }
    }

    return results;
  }

  public updateHealthState(
    category: ProviderCategory,
    providerName: string,
    state: ProviderHealthState,
    details?: string
  ): void {
    const key = `${category}:${providerName.toLowerCase()}`;
    const existing = this.healthStates.get(key);
    this.healthStates.set(key, {
      providerName,
      category,
      state,
      lastChecked: new Date().toISOString(),
      latencyMs: existing?.latencyMs,
      details: details || existing?.details
    });
  }
}

/**
 * Accessor for singleton registry
 */
export function getProviderRegistry(): ProviderRegistry {
  return ProviderRegistry.getInstance();
}
