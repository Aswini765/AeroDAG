/**
 * AeroDAG Centralized Environment Configuration & Hardening
 * 
 * Provides strict startup validation, distinction between required and optional variables,
 * environment isolation (development, test, production), and zero secret exposure.
 */

export type Environment = 'development' | 'test' | 'production';

export interface AppEnvConfig {
  nodeEnv: Environment;
  port: number;
  appUrl: string;
  geminiApiKey?: string;
  adminKey?: string;
  jwtSecret: string;
  evalJudgeModel: string;
  defaultFastModel: string;
  defaultReasoningModel: string;
  flightProvider: string;
  hotelProvider: string;
  transportProvider: string;
  activityProvider: string;
  mapProvider: string;
  weatherProvider: string;
  currencyProvider: string;
  paymentProvider: string;
  llmProvider: string;
  embeddingProvider: string;
  demoMode: boolean;
  amadeusClientId?: string;
  amadeusClientSecret?: string;
  isProduction: boolean;
  isTest: boolean;
  isDevelopment: boolean;
}

export interface SafePublicConfig {
  nodeEnv: Environment;
  port: number;
  appUrl: string;
  evalJudgeModel: string;
  defaultFastModel: string;
  defaultReasoningModel: string;
  flightProvider: string;
  hotelProvider: string;
  mapProvider: string;
  weatherProvider: string;
  currencyProvider: string;
  paymentProvider: string;
  llmProvider: string;
  demoMode: boolean;
  isProduction: boolean;
  hasGeminiKey: boolean;
}

export class EnvValidationError extends Error {
  constructor(public readonly missingVars: string[], public readonly reason: string) {
    super(`Environment Configuration Error: ${reason}. Missing or invalid variables: [${missingVars.join(', ')}]`);
    this.name = 'EnvValidationError';
  }
}

let cachedEnvConfig: AppEnvConfig | null = null;

/**
 * Validates environment variables and constructs typed configuration.
 * Strictly checks required production variables when NODE_ENV === 'production'.
 */
export function validateEnv(env: Record<string, string | undefined> = process.env): AppEnvConfig {
  const nodeEnv: Environment = (env.NODE_ENV as Environment) || 'development';
  const isProduction = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';
  const isDevelopment = !isProduction && !isTest;

  const missingRequired: string[] = [];

  // Production-only mandatory variables
  const demoMode = env.DEMO_MODE === 'true' || (!isProduction && env.DEMO_MODE !== 'false');

  if (isProduction) {
    if (!env.ADMIN_KEY || env.ADMIN_KEY.trim().length < 16) {
      missingRequired.push('ADMIN_KEY (min 16 chars required in production)');
    }
    if (!env.JWT_SECRET || env.JWT_SECRET.trim().length < 32) {
      missingRequired.push('JWT_SECRET (min 32 chars required in production)');
    }
    if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY' || env.GEMINI_API_KEY.trim().length < 10) {
      missingRequired.push('GEMINI_API_KEY (valid provider key required in production)');
    }
    if (!demoMode && env.FLIGHT_PROVIDER === 'real' && (!env.AMADEUS_CLIENT_ID || !env.AMADEUS_CLIENT_SECRET)) {
      missingRequired.push('AMADEUS_CLIENT_ID & AMADEUS_CLIENT_SECRET (required for real flight provider in production)');
    }
    if (!demoMode && env.HOTEL_PROVIDER === 'real' && (!env.AMADEUS_CLIENT_ID || !env.AMADEUS_CLIENT_SECRET)) {
      missingRequired.push('AMADEUS_CLIENT_ID & AMADEUS_CLIENT_SECRET (required for real hotel provider in production)');
    }
  }

  if (missingRequired.length > 0) {
    throw new EnvValidationError(
      missingRequired,
      'Production environment missing required secure credentials'
    );
  }

  const port = parseInt(env.PORT || '3000', 10);
  const appUrl = env.APP_URL || (isProduction ? 'https://aerodag.internal' : `http://localhost:${port}`);
  const jwtSecret = env.JWT_SECRET || (isProduction ? '' : 'dev_jwt_secret_do_not_use_in_prod_32chars!');
  const adminKey = env.ADMIN_KEY || (isProduction ? '' : 'dev_admin_key_local');
  const geminiApiKey = env.GEMINI_API_KEY;

  const config: AppEnvConfig = {
    nodeEnv,
    port: isNaN(port) ? 3000 : port,
    appUrl,
    geminiApiKey,
    adminKey,
    jwtSecret,
    evalJudgeModel: env.EVAL_JUDGE_MODEL || 'gemini-2.5-pro',
    defaultFastModel: env.DEFAULT_FAST_MODEL || 'gemini-2.5-flash',
    defaultReasoningModel: env.DEFAULT_REASONING_MODEL || 'gemini-2.5-pro',
    flightProvider: env.FLIGHT_PROVIDER || 'mock',
    hotelProvider: env.HOTEL_PROVIDER || 'mock',
    transportProvider: env.TRANSPORT_PROVIDER || 'mock',
    activityProvider: env.ACTIVITY_PROVIDER || 'mock',
    mapProvider: env.MAP_PROVIDER || 'mock',
    weatherProvider: env.WEATHER_PROVIDER || 'mock',
    currencyProvider: env.CURRENCY_PROVIDER || 'mock',
    paymentProvider: env.PAYMENT_PROVIDER || 'sandbox',
    llmProvider: env.LLM_PROVIDER || 'gemini',
    embeddingProvider: env.EMBEDDING_PROVIDER || 'deterministic',
    demoMode,
    amadeusClientId: env.AMADEUS_CLIENT_ID,
    amadeusClientSecret: env.AMADEUS_CLIENT_SECRET,
    isProduction,
    isTest,
    isDevelopment
  };

  cachedEnvConfig = config;
  return config;
}

/**
 * Returns cached or validated environment configuration
 */
export function getEnv(): AppEnvConfig {
  if (!cachedEnvConfig) {
    return validateEnv();
  }
  return cachedEnvConfig;
}

/**
 * Returns strictly public, safe configuration for browser/frontend consumption.
 * NEVER includes API keys, JWT secrets, admin tokens, or database credentials.
 */
export function getSafePublicConfig(): SafePublicConfig {
  const env = getEnv();
  return {
    nodeEnv: env.nodeEnv,
    port: env.port,
    appUrl: env.appUrl,
    evalJudgeModel: env.evalJudgeModel,
    defaultFastModel: env.defaultFastModel,
    defaultReasoningModel: env.defaultReasoningModel,
    flightProvider: env.flightProvider,
    hotelProvider: env.hotelProvider,
    mapProvider: env.mapProvider,
    weatherProvider: env.weatherProvider,
    currencyProvider: env.currencyProvider,
    paymentProvider: env.paymentProvider,
    llmProvider: env.llmProvider,
    demoMode: env.demoMode,
    isProduction: env.isProduction,
    hasGeminiKey: !!(env.geminiApiKey && env.geminiApiKey !== 'MY_GEMINI_API_KEY' && env.geminiApiKey.trim().length > 10)
  };
}

/**
 * Resets cached environment configuration (for unit tests)
 */
export function resetEnvCache(): void {
  cachedEnvConfig = null;
}
