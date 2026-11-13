import { REGION_ALIASES, regionKeyFor } from '../services/regionRoutesData';
// src/server/parseTripHandler.ts
import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { generateJsonWithFallback } from './geminiModels';
import { impliedPartySize } from './partySize';
import { getModelRouter } from '../services/optimization';
import { getTelemetryTracer, getTelemetryMetricsCollector, TraceContext } from '../services/telemetry';
import { z } from 'zod';

// Zod schema for Gemini output
const childSchema = z.object({
  age: z.number().int().positive().nullable().optional()
});

/** States/regions that get the "Which part of …?" route step. Derived from the route data so they never drift apart. */
export const KNOWN_REGIONS = Object.values(REGION_ALIASES).flat();

/**
 * True only when the whole place name is a state/region ("Rajasthan", "Himachal Pradesh",
 * "Kashmir valley") — never for a town that merely sits in one ("Coorg, Karnataka", "Leh Ladakh").
 */
export function isKnownRegion(dest?: string | null): boolean {
  return regionKeyFor(dest) !== null;
}

const tripSchema = z.object({
  destination: z.string().nullable().optional(),
  destinationType: z.enum(['city', 'region']).nullable().optional(),
  origin: z.string().nullable().optional(),
  durationDays: z.number().int().positive().nullable().optional(),
  dates: z.string().nullable().optional(),
  adults: z.number().int().nonnegative().nullable().optional(),
  children: z.array(childSchema).nullable().optional(),
  seniors: z.array(childSchema).nullable().optional(),
  budgetINR: z.number().int().nonnegative().nullable().optional(),
  pace: z.string().nullable().optional(),
  freeTextPreferences: z.string().nullable().optional(),
  accommodationPreference: z.string().nullable().optional(),
  transportPreference: z.string().nullable().optional(),
  // source and quote for each field
  destinationSource: z.enum(['stated','assumed','missing']).nullable().optional(),
  destinationQuote: z.string().nullable().optional(),
  destinationTypeSource: z.enum(['stated','assumed','missing']).nullable().optional(),
  originSource: z.enum(['stated','assumed','missing']).nullable().optional(),
  originQuote: z.string().nullable().optional(),
  durationDaysSource: z.enum(['stated','assumed','missing']).nullable().optional(),
  durationDaysQuote: z.string().nullable().optional(),
  datesSource: z.enum(['stated','assumed','missing']).nullable().optional(),
  datesQuote: z.string().nullable().optional(),
  adultsSource: z.enum(['stated','assumed','missing']).nullable().optional(),
  adultsQuote: z.string().nullable().optional(),
  childrenSource: z.enum(['stated','assumed','missing']).nullable().optional(),
  childrenQuote: z.string().nullable().optional(),
  seniorsSource: z.enum(['stated','assumed','missing']).nullable().optional(),
  seniorsQuote: z.string().nullable().optional(),
  budgetINRSource: z.enum(['stated','assumed','missing']).nullable().optional(),
  budgetINRQuote: z.string().nullable().optional(),
  paceSource: z.enum(['stated','assumed','missing']).nullable().optional(),
  paceQuote: z.string().nullable().optional(),
  freeTextPreferencesSource: z.enum(['stated','assumed','missing']).nullable().optional(),
  freeTextPreferencesQuote: z.string().nullable().optional(),
  accommodationPreferenceSource: z.enum(['stated','assumed','missing']).nullable().optional(),
  accommodationPreferenceQuote: z.string().nullable().optional(),
  transportPreferenceSource: z.enum(['stated','assumed','missing']).nullable().optional(),
  transportPreferenceQuote: z.string().nullable().optional()
});

// Destinations the catalog can actually plan, mapped to the app's canonical names.
// (Origins like Bengaluru/Delhi are NOT destinations.)
const SUPPORTED_DESTINATIONS: Array<{ canonical: string; aliases: string[] }> = [
  { canonical: 'Goa', aliases: ['goa', 'panaji', 'panjim', 'calangute', 'baga', 'colva', 'palolem'] },
  { canonical: 'Coorg', aliases: ['coorg', 'kodagu', 'madikeri'] },
  { canonical: 'Kerala', aliases: ['kerala', 'munnar', 'alleppey', 'alappuzha', 'kumarakom', 'thekkady', 'wayanad', 'varkala', 'kovalam', 'fort kochi'] },
  { canonical: 'Mysuru', aliases: ['mysuru', 'mysore'] },
  { canonical: 'Araku Valley', aliases: ['araku', 'araku valley', 'borra caves'] }
];

export function matchSupportedDestination(destination: string): string | null {
  const lower = destination.toLowerCase();
  for (const d of SUPPORTED_DESTINATIONS) {
    if (d.aliases.some((a) => lower.includes(a))) return d.canonical;
  }
  return null;
}

export async function handleParseTrip(req: Request, res: Response) {
  const startedAt = Date.now();
  const tracer = getTelemetryTracer();
  const metrics = getTelemetryMetricsCollector();
  const rootSpan = tracer.startTrace('api_parse_trip','api',{
    requestId: (req.headers['x-request-id'] as string) || `req_${Date.now()}`
  });
  try {
    const userMessage = (req.body?.userMessage ?? req.body?.message ?? '').trim();
    if (!userMessage) return res.status(400).json({error:'Missing userMessage',code:'INVALID_REQUEST'});
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(200).json({basicMode:true,reason:'no_gemini_key'});
    // Lightweight model: reading a trip description doesn't need a big model, and it has its own free-tier quota.
    const ai = new GoogleGenAI({apiKey: apiKey.trim()});
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
    const prompt = `Today is ${today} (India). Extract the fields from the user message and return JSON matching the schema.
Set "destinationType" to "region" for states or multi-city regions (e.g. Rajasthan, Kerala, Himachal, Uttarakhand, North-East, Kashmir, Ladakh), or "city" for a specific city/town (e.g. Jaipur, Udaipur, Munnar, Goa, Mysuru, Coorg).
Store specific atmosphere/style phrases like "offbeat", "not touristy", "heritage" in "freeTextPreferences" (do not overwrite pace with them).
Include "<field>Source" (stated|assumed|missing) and, if stated, "<field>Quote" with the exact phrase from the message.
For "dates", convert relative phrases ("20th to 27th this month", "next weekend") to an exact range written like "20-27 Oct 2026" or "28 Oct - 2 Nov 2026"; the quote must still be the user's own words. Ages: "children" are under 18, "seniors" are 60 or older. The person writing is one of the travellers: "me, my wife and our son" is 2 adults + 1 child.
User: "${userMessage}"
Schema: ${JSON.stringify(tripSchema.shape)}
`;
    const modelToUse = process.env.MODEL_PARSE_TRIP;
    const { text: raw, model: usedModel } = await generateJsonWithFallback(ai, prompt, [modelToUse]);
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return res.status(502).json({error:'Invalid JSON from Gemini',code:'BAD_GEMINI_RESPONSE'}); }
    let data = tripSchema.safeParse(parsed).success ? tripSchema.parse(parsed) : null;
    if (!data) {
      // One bad field (e.g. "children": "none") shouldn't throw away the whole answer:
      // keep every field that is valid on its own and drop the rest.
      const salvaged: Record<string, unknown> = {};
      const shape = tripSchema.shape as Record<string, z.ZodTypeAny>;
      if (parsed && typeof parsed === 'object') {
        for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
          const fieldSchema = shape[key];
          if (fieldSchema && fieldSchema.safeParse(value).success) salvaged[key] = value;
        }
      }
      const retry = tripSchema.safeParse(salvaged);
      if (!retry.success || !retry.data.destination) {
        return res.status(502).json({error:'Schema mismatch',code:'BAD_GEMINI_RESPONSE'});
      }
      data = retry.data;
    }
    // Quote verification
    const lowerMsg = userMessage.toLowerCase();
    const fields = ['destination','origin','durationDays','dates','adults','children','seniors','budgetINR','pace','freeTextPreferences','accommodationPreference','transportPreference'];
    for (const f of fields) {
      const srcKey = `${f}Source` as keyof typeof data;
      const quoteKey = `${f}Quote` as keyof typeof data;
      if (data[srcKey] === 'stated') {
        const quote = (data[quoteKey] ?? '').toString().toLowerCase();
        if (!quote || !lowerMsg.includes(quote)) {
          (data as any)[srcKey] = 'assumed';
          delete (data as any)[quoteKey];
        }
      }
    }
    let adults = data.adults ?? 0;
    const childrenCount = (data.children ?? []).length;
    const seniorsCount = (data.seniors ?? []).length;
    // Never count fewer people than the message clearly names (models often forget the writer).
    const implied = impliedPartySize(userMessage);
    if (implied && adults + childrenCount + seniorsCount < implied.total) {
      adults = implied.total - childrenCount - seniorsCount;
      data.adultsSource = 'stated';
    }
    // "with my family" without specific counts: parse as unspecified/missing
    const hasUnspecifiedFamily = /\b(family|families)\b/i.test(userMessage) && !/\bfamily of\s*\d/i.test(userMessage) && !/\b\d+\s*(?:adults?|people|persons?|kids?|children)\b/i.test(userMessage);
    if (hasUnspecifiedFamily && childrenCount === 0 && seniorsCount === 0) {
      adults = 0;
      data.adultsSource = 'missing';
      data.childrenSource = 'missing';
      data.seniorsSource = 'missing';
    }
    const totalTravellers = adults + childrenCount + seniorsCount;
    // Destination must exist – otherwise unparseable
    if (!data.destination || data.destination.trim() === '') {
      return res.status(422).json({code:'UNPARSEABLE'});
    }
    // Use canonical catalog destination if matched, or fallback to parsed destination
    const canonicalDestination = matchSupportedDestination(data.destination) || data.destination.trim();
    // Our own list decides what is a region; the model's guess never overrides it (Goa, Coorg and cities stay single-place trips).
    const destinationType = isKnownRegion(canonicalDestination) ? 'region' : 'city';

    // No traveller count given: report as missing (the UI assumes a default and labels it "assumed").
    if (totalTravellers === 0) {
      data.adultsSource = 'missing';
      data.childrenSource = 'missing';
      data.seniorsSource = 'missing';
    }
    const responseBody = {
      destination: canonicalDestination,
      destinationType,
      origin: data.origin ?? null,
      durationDays: data.durationDays ?? null,
      dates: data.dates ?? null,
      adults,
      children: data.children ?? [],
      seniors: data.seniors ?? [],
      budgetINR: data.budgetINR ?? null,
      pace: data.pace ?? null,
      freeTextPreferences: data.freeTextPreferences ?? null,
      accommodationPreference: data.accommodationPreference ?? null,
      transportPreference: data.transportPreference ?? null,
      sources: {
        destination: data.destinationSource ?? 'missing',
        destinationType: data.destinationTypeSource ?? 'assumed',
        origin: data.originSource ?? 'missing',
        durationDays: data.durationDaysSource ?? 'missing',
        dates: data.datesSource ?? 'missing',
        adults: data.adultsSource ?? 'missing',
        children: data.childrenSource ?? 'missing',
        seniors: data.seniorsSource ?? 'missing',
        budgetINR: data.budgetINRSource ?? 'missing',
        pace: data.paceSource ?? 'missing',
        freeTextPreferences: data.freeTextPreferencesSource ?? 'missing',
        accommodationPreference: data.accommodationPreferenceSource ?? 'missing',
        transportPreference: data.transportPreferenceSource ?? 'missing'
      },
      totalTravellers
    };
    tracer.endSpan(rootSpan.spanId,'SUCCESS',{parsed:true});
    metrics.recordRequest(Date.now()-startedAt,true);
    return res.json(responseBody);
  } catch (err:any) {
    const status = Number(err?.status ?? err?.code ?? 0);
    const message = String(err?.message ?? err).slice(0, 300);
    const modelName = process.env.MODEL_PARSE_TRIP || 'gemini-fallback';
    // Log the actual exception for 500s (model name, status, message — never the API key)
    console.error(`[parse-trip] Gemini call failed (model: ${modelName}, status: ${status || 500}): ${message}`);
    tracer.endSpan(rootSpan.spanId,'ERROR',{error:message});
    metrics.recordRequest(Date.now()-startedAt,false);
    if (status === 429 || /RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(message)) {
      return res.status(429).json({error:'AI is busy, try again in a minute',code:'RATE_LIMIT_EXCEEDED'});
    }
    return res.status(500).json({error:'Internal server error',code:'INTERNAL_ERROR'});
  }
}
