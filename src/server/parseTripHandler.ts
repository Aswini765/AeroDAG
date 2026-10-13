// src/server/parseTripHandler.ts
import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { getModelRouter } from '../services/optimization';
import { getTelemetryTracer, getTelemetryMetricsCollector, TraceContext } from '../services/telemetry';
import { z } from 'zod';

// Zod schema for Gemini output
const childSchema = z.object({
  age: z.number().int().positive().nullable().optional()
});

const tripSchema = z.object({
  destination: z.string().nullable().optional(),
  origin: z.string().nullable().optional(),
  durationDays: z.number().int().positive().nullable().optional(),
  dates: z.string().nullable().optional(),
  adults: z.number().int().nonnegative().nullable().optional(),
  children: z.array(childSchema).nullable().optional(),
  seniors: z.array(childSchema).nullable().optional(),
  budgetINR: z.number().int().nonnegative().nullable().optional(),
  pace: z.string().nullable().optional(),
  accommodationPreference: z.string().nullable().optional(),
  transportPreference: z.string().nullable().optional(),
  // source and quote for each field
  destinationSource: z.enum(['stated','assumed','missing']).nullable().optional(),
  destinationQuote: z.string().nullable().optional(),
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
  accommodationPreferenceSource: z.enum(['stated','assumed','missing']).nullable().optional(),
  accommodationPreferenceQuote: z.string().nullable().optional(),
  transportPreferenceSource: z.enum(['stated','assumed','missing']).nullable().optional(),
  transportPreferenceQuote: z.string().nullable().optional()
});

// Destinations the catalog can actually plan, mapped to the app's canonical names.
// (Origins like Bengaluru/Delhi are NOT destinations.)
const SUPPORTED_DESTINATIONS: Array<{ canonical: string; aliases: string[] }> = [
  { canonical: 'Goa, India', aliases: ['goa', 'panaji', 'panjim', 'calangute', 'baga', 'colva', 'palolem'] },
  { canonical: 'Coorg, Karnataka', aliases: ['coorg', 'kodagu', 'madikeri'] },
  { canonical: 'Kerala, India', aliases: ['kerala', 'munnar', 'alleppey', 'alappuzha', 'kumarakom', 'thekkady', 'wayanad', 'varkala', 'kovalam', 'fort kochi'] },
  { canonical: 'Mysuru, Karnataka', aliases: ['mysuru', 'mysore'] }
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
    const model = process.env.MODEL_PARSE_TRIP || 'gemini-2.5-flash-lite';
    const ai = new GoogleGenAI({apiKey: apiKey.trim()});
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
    const prompt = `Today is ${today} (India). Extract the fields from the user message and return JSON matching the schema. Include "<field>Source" (stated|assumed|missing) and, if stated, "<field>Quote" with the exact phrase from the message.\nFor "dates", convert relative phrases ("20th to 27th this month", "next weekend") to an exact range written like "20-27 Oct 2026" or "28 Oct - 2 Nov 2026"; the quote must still be the user's own words. Ages: "children" are under 18, "seniors" are 60 or older.\nUser: \"${userMessage}\"\nSchema: ${JSON.stringify(tripSchema.shape)}\n`;
    const response = await ai.models.generateContent({model,contents:prompt,config:{responseMimeType:'application/json'}});
    const raw = response.text?.trim() ?? '';
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return res.status(502).json({error:'Invalid JSON from Gemini',code:'BAD_GEMINI_RESPONSE'}); }
    const result = tripSchema.safeParse(parsed);
    if (!result.success) return res.status(502).json({error:'Schema mismatch',details:result.error.format(),code:'BAD_GEMINI_RESPONSE'});
    const data = result.data;
    // Quote verification
    const lowerMsg = userMessage.toLowerCase();
    const fields = ['destination','origin','durationDays','dates','adults','children','seniors','budgetINR','pace','accommodationPreference','transportPreference'];
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
    const adults = data.adults ?? 0;
    const childrenCount = (data.children ?? []).length;
    const seniorsCount = (data.seniors ?? []).length;
    const totalTravellers = adults + childrenCount + seniorsCount;
    // Destination must exist – otherwise unparseable
    if (!data.destination || data.destination.trim() === '') {
      return res.status(422).json({code:'UNPARSEABLE'});
    }
    // Unsupported destinations (checked before traveller details)
    const canonicalDestination = matchSupportedDestination(data.destination);
    if (!canonicalDestination) {
      return res.status(200).json({unsupported: data.destination});
    }
    // No traveller count given: report as missing (the UI assumes a default and labels it "assumed").
    if (totalTravellers === 0) {
      data.adultsSource = 'missing';
      data.childrenSource = 'missing';
      data.seniorsSource = 'missing';
    }
    const responseBody = {
      destination: canonicalDestination,
      origin: data.origin ?? null,
      durationDays: data.durationDays ?? null,
      dates: data.dates ?? null,
      adults,
      children: data.children ?? [],
      seniors: data.seniors ?? [],
      budgetINR: data.budgetINR ?? null,
      pace: data.pace ?? null,
      accommodationPreference: data.accommodationPreference ?? null,
      transportPreference: data.transportPreference ?? null,
      sources: {
        destination: data.destinationSource ?? 'missing',
        origin: data.originSource ?? 'missing',
        durationDays: data.durationDaysSource ?? 'missing',
        dates: data.datesSource ?? 'missing',
        adults: data.adultsSource ?? 'missing',
        children: data.childrenSource ?? 'missing',
        seniors: data.seniorsSource ?? 'missing',
        budgetINR: data.budgetINRSource ?? 'missing',
        pace: data.paceSource ?? 'missing',
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
    // Log the cause (never the API key) so failures are diagnosable from the terminal.
    console.error(`[parse-trip] Gemini call failed (status ${status || 'n/a'}): ${message}`);
    tracer.endSpan(rootSpan.spanId,'ERROR',{error:message});
    metrics.recordRequest(Date.now()-startedAt,false);
    if (status === 429 || /RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(message)) {
      return res.status(503).json({error:'AI parsing is busy (rate limit). Using basic mode.',code:'AI_RATE_LIMITED'});
    }
    return res.status(500).json({error:'Internal server error',code:'INTERNAL_ERROR'});
  }
}
