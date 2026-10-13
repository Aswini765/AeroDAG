/**
 * AeroDAG Safe Model Router
 * 
 * Maps travel tasks to optimal model tiers based on operational complexity:
 * - LOW COMPLEXITY: Extraction, classification, normalization (Fastest / Lowest cost)
 * - MEDIUM COMPLEXITY: Requirement interpretation, conversational modifications
 * - HIGH COMPLEXITY: Multi-constraint planning, conflict resolution
 * 
 * Preserves provider neutrality and configures default model tiers transparently.
 */

import { ComplexityTier, OperationType, ModelRouteConfig } from './types';

export class ModelRouter {
  private static instance: ModelRouter | null = null;

  private config: ModelRouteConfig;

  private constructor() {
    const safeEnv = typeof process !== 'undefined' && process.env ? process.env : ({} as Record<string, string | undefined>);
    this.config = {
      lowComplexityModel: safeEnv.MODEL_LOW_COMPLEXITY || 'gemini-2.5-flash',
      mediumComplexityModel: safeEnv.MODEL_MEDIUM_COMPLEXITY || 'gemini-2.5-flash',
      highComplexityModel: safeEnv.MODEL_HIGH_COMPLEXITY || 'gemini-2.5-pro',
      defaultModel: safeEnv.EVAL_JUDGE_MODEL || 'gemini-2.5-flash'
    };
  }

  static getInstance(): ModelRouter {
    if (!ModelRouter.instance) {
      ModelRouter.instance = new ModelRouter();
    }
    return ModelRouter.instance;
  }

  /**
   * Classifies an operation into its complexity tier
   */
  classifyComplexity(operation: OperationType): ComplexityTier {
    switch (operation) {
      case 'EXTRACTION':
      case 'CLASSIFICATION':
      case 'NORMALIZATION':
        return 'LOW';
      case 'REQUIREMENT_INTERPRETATION':
      case 'CONVERSATIONAL_MODIFICATION':
      case 'ITINERARY_ADJUSTMENT':
        return 'MEDIUM';
      case 'COMPLEX_PLANNING':
      case 'CONFLICT_RESOLUTION':
      default:
        return 'HIGH';
    }
  }

  /**
   * Resolves the recommended model for a given operation or complexity tier
   */
  resolveModel(target: OperationType | ComplexityTier): string {
    const tier: ComplexityTier =
      target === 'LOW' || target === 'MEDIUM' || target === 'HIGH'
        ? target
        : this.classifyComplexity(target as OperationType);

    switch (tier) {
      case 'LOW':
        return this.config.lowComplexityModel;
      case 'MEDIUM':
        return this.config.mediumComplexityModel;
      case 'HIGH':
        return this.config.highComplexityModel;
      default:
        return this.config.defaultModel;
    }
  }

  /**
   * Updates configuration dynamically for test or deployment overrides
   */
  updateConfig(overrides: Partial<ModelRouteConfig>): void {
    this.config = {
      ...this.config,
      ...overrides
    };
  }

  /**
   * Returns active routing configuration
   */
  getConfig(): Readonly<ModelRouteConfig> {
    return { ...this.config };
  }
}

export function getModelRouter(): ModelRouter {
  return ModelRouter.getInstance();
}
