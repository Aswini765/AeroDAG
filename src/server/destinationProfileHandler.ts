/**
 * AeroDAG — Server-side AI Destination Profile Handler
 * 
 * Provides destination profiles for ANY location in India via Gemini.
 * Hardened with:
 * - Hand-written strict schema validation and clamp rules (drive hours 0–24, costs ₹200–₹50,000)
 * - Rate limiting via sliding-window RateLimiter
 * - 7-day in-memory server cache
 * - 10s timeout protection
 * - 429/503 graceful handling
 */

import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { generateJsonWithFallback } from './geminiModels.ts';
import { getRateLimiter } from '../services/security/rateLimiter.ts';
import { getTelemetryTracer, getTelemetryMetricsCollector } from '../services/telemetry/index.ts';
import { DestinationProfile, DestinationProfileApiResponse } from '../types/destinationProfile.ts';

interface CacheEntry {
  data: DestinationProfile | { unsupported: true; place?: string };
  expiresAt: number;
}

const serverProfileCache = new Map<string, CacheEntry>();
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface ValidationResult {
  valid: boolean;
  profile?: DestinationProfile | { unsupported: true; place?: string };
  errors?: string[];
}

/**
 * Hand-written strict validator for Gemini destination profiles.
 * Clamps sensible ranges (0–24h drives, ₹200–₹50,000 costs) and rejects nonsense.
 */
export function validateDestinationProfile(raw: any): ValidationResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, errors: ['Profile must be a JSON object'] };
  }

  // International check
  if (raw.isInIndia === false) {
    return {
      valid: true,
      profile: {
        unsupported: true,
        place: typeof raw.name === 'string' ? raw.name : undefined
      }
    };
  }

  const errors: string[] = [];

  // Name
  if (!raw.name || typeof raw.name !== 'string' || raw.name.trim() === '') {
    errors.push('Missing or invalid destination name');
  }
  const name = String(raw.name || '').trim();
  const state = String(raw.state || '').trim();

  // Nearest Airports
  if (!Array.isArray(raw.nearestAirports) || raw.nearestAirports.length === 0) {
    errors.push('nearestAirports must be a non-empty array');
  }

  const nearestAirports = (raw.nearestAirports || []).map((a: any, idx: number) => {
    if (!a || typeof a !== 'object') {
      errors.push(`Airport at index ${idx} is not an object`);
      return { code: '', name: '', driveHoursToCenter: 2 };
    }
    const code = String(a.code || '').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) {
      errors.push(`Airport code '${code}' at index ${idx} must be a 3-letter uppercase IATA code`);
    }
    const rawHours = Number(a.driveHoursToCenter);
    if (isNaN(rawHours)) {
      errors.push(`Airport drive hours '${a.driveHoursToCenter}' is not a valid number`);
    }
    // Clamp drive hours between 0 and 24
    const driveHoursToCenter = Math.min(24, Math.max(0, isNaN(rawHours) ? 2 : rawHours));

    return {
      code,
      name: String(a.name || `${code} Airport`).trim(),
      driveHoursToCenter: Math.round(driveHoursToCenter * 10) / 10
    };
  });

  // Nearest Railway (optional or null)
  let nearestRailway = null;
  if (raw.nearestRailway && typeof raw.nearestRailway === 'object') {
    const rawRlyHours = Number(raw.nearestRailway.driveHoursToCenter);
    const driveHoursToCenter = isNaN(rawRlyHours) ? 1 : Math.min(24, Math.max(0, rawRlyHours));
    nearestRailway = {
      name: String(raw.nearestRailway.name || `${name} Railway Station`).trim(),
      driveHoursToCenter: Math.round(driveHoursToCenter * 10) / 10
    };
  }

  // Stay Areas (3–4 areas)
  if (!Array.isArray(raw.stayAreas) || raw.stayAreas.length < 2) {
    errors.push('stayAreas must contain at least 2 distinct areas');
  }
  const stayAreas = (raw.stayAreas || []).slice(0, 4).map((s: any, idx: number) => {
    const areaName = String(s?.name || `Central Area ${idx + 1}`).trim();
    const whyStayHere = String(s?.whyStayHere || 'Convenient base for local exploration').trim();
    const rawLevel = String(s?.priceLevel || '').toLowerCase();
    const priceLevel: 'budget' | 'mid' | 'premium' =
      rawLevel === 'budget' || rawLevel === 'premium' ? rawLevel : 'mid';
    return { name: areaName, whyStayHere, priceLevel };
  });

  // Top Sights (6–10 sights)
  if (!Array.isArray(raw.topSights) || raw.topSights.length < 4) {
    errors.push('topSights must contain at least 4 items');
  }
  const topSights = (raw.topSights || []).slice(0, 10).map((t: any, idx: number) => {
    const sightName = String(t?.name || `Sight ${idx + 1}`).trim();
    const sightArea = String(t?.area || stayAreas[0]?.name || 'Central').trim();
    const rawHours = Number(t?.hoursNeeded);
    const hoursNeeded = isNaN(rawHours) ? 2 : Math.min(12, Math.max(0.5, rawHours));
    return {
      name: sightName,
      area: sightArea,
      hoursNeeded: Math.round(hoursNeeded * 10) / 10
    };
  });

  // Costs check & clamping: ₹200 to ₹50,000/day
  const clampCost = (val: any, fieldName: string, defaultVal: number): number => {
    const num = Number(val);
    if (isNaN(num)) {
      errors.push(`Cost for ${fieldName} is not a valid number`);
      return defaultVal;
    }
    if (num < 0) {
      errors.push(`Cost for ${fieldName} cannot be negative (${num})`);
      return defaultVal;
    }
    // Clamp between ₹200 and ₹50,000
    return Math.min(50000, Math.max(200, Math.round(num)));
  };

  const costsRaw = raw.typicalDailyCostPerPersonINR || {};
  const stayRaw = costsRaw.stay || {};

  const typicalDailyCostPerPersonINR = {
    stay: {
      budget: clampCost(stayRaw.budget, 'stay.budget', 1200),
      mid: clampCost(stayRaw.mid, 'stay.mid', 2800),
      premium: clampCost(stayRaw.premium, 'stay.premium', 6500)
    },
    food: clampCost(costsRaw.food, 'food', 800),
    localTransport: clampCost(costsRaw.localTransport, 'localTransport', 600),
    activities: clampCost(costsRaw.activities, 'activities', 500)
  };

  // Best months & Weather note
  const bestMonths = String(raw.bestMonths || 'October to March (Pleasant weather)').trim();
  const weatherNote = String(raw.weatherNote || 'Comfortable daytime temperatures with cool evenings.').trim();

  // Local Tips (3 tips)
  let localTips = Array.isArray(raw.localTips)
    ? raw.localTips.map((t: any) => String(t || '').trim()).filter(Boolean)
    : [];
  if (localTips.length < 3) {
    localTips = [
      ...localTips,
      'Pre-book local sightseeing cabs for better rates during peak weekends.',
      'Carry light warm layers for early mornings and late evenings.',
      'Check local market timings before heading out.'
    ].slice(0, 3);
  } else {
    localTips = localTips.slice(0, 3);
  }

  // Veg friendly
  const vegRaw = String(raw.vegFriendly || '').toLowerCase();
  const vegFriendly: 'low' | 'medium' | 'high' =
    vegRaw === 'low' || vegRaw === 'high' ? vegRaw : 'medium';

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    profile: {
      name,
      state,
      isInIndia: true,
      nearestAirports,
      nearestRailway,
      stayAreas,
      topSights,
      typicalDailyCostPerPersonINR,
      bestMonths,
      weatherNote,
      localTips,
      vegFriendly
    }
  };
}

/**
 * Express handler for POST /api/destination-profile
 */
export async function handleDestinationProfile(req: Request, res: Response) {
  const startedAt = Date.now();
  const tracer = getTelemetryTracer();
  const metrics = getTelemetryMetricsCollector();
  const rootSpan = tracer.startTrace('api_destination_profile', 'api', {
    requestId: (req.headers['x-request-id'] as string) || `req_${Date.now()}`
  });

  try {
    const destination = String(req.body?.destination || '').trim();
    const origin = String(req.body?.origin || 'Bengaluru').trim();

    if (!destination) {
      return res.status(400).json({ error: 'Missing destination parameter', code: 'INVALID_REQUEST' });
    }

    const cacheKey = destination.toLowerCase().trim();

    // 1. Check server-side memory cache (7 days TTL)
    const cached = serverProfileCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      tracer.endSpan(rootSpan.spanId, 'SUCCESS', { cached: true });
      metrics.recordRequest(Date.now() - startedAt, true);
      return res.json(cached.data);
    }

    // 2. Rate Limiting Check
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'client_default';
    const rateLimiter = getRateLimiter();
    const rateStatus = rateLimiter.consume('destination_profile', clientIp, { maxRequests: 20, windowMs: 60 * 1000 });
    if (!rateStatus.allowed) {
      return res.status(429).json({
        error: 'AI planning is busy right now — try again in a minute, or plan one of our detailed destinations.',
        code: 'AI_RATE_LIMITED',
        retryAfterSec: rateStatus.retryAfterSec
      });
    }

    // 3. Gemini API Key check
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'AI planning is busy right now — try again in a minute, or plan one of our detailed destinations.',
        code: 'NO_GEMINI_KEY'
      });
    }

    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

    const prompt = `You are an expert Indian travel planner. Provide a comprehensive, accurate travel profile for the destination "${destination}" for a trip originating from "${origin}".
Return ONLY valid JSON with this exact schema:
{
  "name": "Canonical city or town name (e.g. Ooty)",
  "state": "State in India (e.g. Tamil Nadu) or country if outside India",
  "isInIndia": true or false,
  "nearestAirports": [
    {
      "code": "3-letter uppercase IATA code (e.g. CJB)",
      "name": "Airport name (e.g. Coimbatore International Airport)",
      "driveHoursToCenter": number of hours by road (0 to 24)
    }
  ],
  "nearestRailway": {
    "name": "Railway station name",
    "driveHoursToCenter": number of hours (0 to 24)
  } or null,
  "stayAreas": [
    {
      "name": "Area or neighborhood name",
      "whyStayHere": "Brief reason why stay here",
      "priceLevel": "budget" | "mid" | "premium"
    }
  ],
  "topSights": [
    {
      "name": "Sight or attraction name",
      "area": "Neighborhood or area matching stay areas",
      "hoursNeeded": number of hours needed (0.5 to 8)
    }
  ],
  "typicalDailyCostPerPersonINR": {
    "stay": {
      "budget": number in INR (e.g. 1200),
      "mid": number in INR (e.g. 2600),
      "premium": number in INR (e.g. 6000)
    },
    "food": number in INR (e.g. 700),
    "localTransport": number in INR (e.g. 500),
    "activities": number in INR (e.g. 400)
  },
  "bestMonths": "Best months to visit (e.g. October to May)",
  "weatherNote": "Brief realistic weather summary",
  "localTips": [
    "Tip 1",
    "Tip 2",
    "Tip 3"
  ],
  "vegFriendly": "low" | "medium" | "high"
}
Rules:
- Provide 3 to 4 distinct stayAreas.
- Provide 6 to 10 topSights.
- Provide 3-letter IATA airport codes in uppercase.
- Ensure all costs are realistic Indian Rupee figures.
- If the destination is outside India, set "isInIndia": false.`;

    // 4. Enforce 10s timeout protection
    const callPromise = generateJsonWithFallback(ai, prompt, [
      process.env.MODEL_DESTINATION_PROFILE,
      process.env.MODEL_PARSE_TRIP
    ]);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI_TIMEOUT_10S')), 10000);
    });

    const response = await Promise.race([callPromise, timeoutPromise]);
    const rawText = response.text;

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      return res.status(422).json({
        error: 'Invalid JSON returned by AI model',
        code: 'BAD_AI_RESPONSE'
      });
    }

    // 5. Strict Hand-Written Validation & Clamping
    const validation = validateDestinationProfile(parsedJson);
    if (!validation.valid || !validation.profile) {
      return res.status(422).json({
        error: 'Destination profile failed schema validation',
        code: 'VALIDATION_FAILED',
        details: validation.errors
      });
    }

    // 6. Cache profile for 7 days
    serverProfileCache.set(cacheKey, {
      data: validation.profile,
      expiresAt: Date.now() + SEVEN_DAYS_MS
    });

    tracer.endSpan(rootSpan.spanId, 'SUCCESS', { destination, isInIndia: (validation.profile as any).isInIndia });
    metrics.recordRequest(Date.now() - startedAt, true);

    return res.json(validation.profile);
  } catch (err: any) {
    const status = Number(err?.status ?? err?.code ?? 0);
    const message = String(err?.message ?? err).slice(0, 300);
    console.error(`[destination-profile] Gemini call failed (status ${status || 'n/a'}): ${message}`);

    tracer.endSpan(rootSpan.spanId, 'ERROR', { error: message });
    metrics.recordRequest(Date.now() - startedAt, false);

    if (message.includes('AI_TIMEOUT_10S')) {
      return res.status(503).json({
        error: 'AI planning is busy right now — try again in a minute, or plan one of our detailed destinations.',
        code: 'AI_TIMEOUT'
      });
    }

    if (status === 429 || /RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(message)) {
      return res.status(503).json({
        error: 'AI planning is busy right now — try again in a minute, or plan one of our detailed destinations.',
        code: 'AI_RATE_LIMITED'
      });
    }

    return res.status(503).json({
      error: 'AI planning is busy right now — try again in a minute, or plan one of our detailed destinations.',
      code: 'AI_UNAVAILABLE'
    });
  }
}
