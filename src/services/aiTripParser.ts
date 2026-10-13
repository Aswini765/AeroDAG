// src/services/aiTripParser.ts
// Client-side bridge to POST /api/parse-trip (server-side Gemini).
// The rule-based parser in App.tsx is always the fallback ("Basic mode").

import type { TripContext } from './requirementEngine';
import { resolveTravelDates } from './dateResolver';

type Source = 'stated' | 'assumed' | 'missing';

export interface ParseTripData {
  destination: string;
  origin: string | null;
  durationDays: number | null;
  dates: string | null;
  adults: number;
  children: Array<{ age?: number | null }>;
  seniors: Array<{ age?: number | null }>;
  budgetINR: number | null;
  pace: string | null;
  accommodationPreference: string | null;
  transportPreference: string | null;
  sources: Record<string, Source>;
  totalTravellers: number;
}

export type ParseTripResult =
  | { kind: 'ok'; data: ParseTripData }
  | { kind: 'unsupported'; place: string }
  | { kind: 'unparseable' }
  | { kind: 'failed' };

export async function callParseTrip(text: string, timeoutMs = 8000): Promise<ParseTripResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('/api/parse-trip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage: text }),
      signal: controller.signal
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return { kind: 'failed' };
    const body = await res.json();
    if (res.status === 422 && body?.code === 'UNPARSEABLE') return { kind: 'unparseable' };
    if (!res.ok) return { kind: 'failed' };
    if (body?.basicMode) return { kind: 'failed' };
    if (typeof body?.unsupported === 'string') return { kind: 'unsupported', place: body.unsupported };
    if (typeof body?.destination === 'string' && body.sources) return { kind: 'ok', data: body as ParseTripData };
    return { kind: 'failed' };
  } catch {
    return { kind: 'failed' };
  } finally {
    clearTimeout(timer);
  }
}

const ORIGIN_LABELS: Array<[RegExp, string]> = [
  [/delhi/i, 'New Delhi (DEL)'],
  [/mumbai|bombay/i, 'Mumbai (BOM)'],
  [/kochi|cochin/i, 'Kochi (COK)'],
  [/bengaluru|bangalore|blr/i, 'Bengaluru (BLR)'],
  [/chennai|madras/i, 'Chennai (MAA)'],
  [/hyderabad/i, 'Hyderabad (HYD)']
];

const toTag = (s: Source | undefined): 'stated' | 'assumed' => (s === 'stated' ? 'stated' : 'assumed');

const ages = (list: Array<{ age?: number | null }> | undefined, fallback: number): number[] =>
  (list || []).map((x) => (typeof x?.age === 'number' && x.age > 0 ? x.age : fallback));

/**
 * Overlay the AI parse onto a context produced by the rule-based parser.
 * Only fields the AI actually returned replace the basic values.
 */
export function applyAiParse(
  ctx: TripContext,
  fieldSources: Record<string, 'stated' | 'assumed' | 'needed'>,
  data: ParseTripData
): void {
  const src = data.sources || {};

  ctx.destination = data.destination;
  fieldSources.destination = 'stated';

  // Origin
  if (data.origin) {
    const hit = ORIGIN_LABELS.find(([re]) => re.test(data.origin as string));
    ctx.origin = hit ? hit[1] : data.origin;
    fieldSources.origin = toTag(src.origin);
  }

  // Duration
  if (data.durationDays && data.durationDays > 0) {
    ctx.durationDays = data.durationDays;
    fieldSources.duration = toTag(src.durationDays);
  }

  // Budget
  if (data.budgetINR && data.budgetINR >= 1000) {
    ctx.budgetTotalINR = data.budgetINR;
    fieldSources.budget = toTag(src.budgetINR);
  }

  // Travellers
  if (data.totalTravellers > 0) {
    const childAges = ages(data.children, 8);
    const seniorAges = ages(data.seniors, 65);
    ctx.adultsCount = data.adults || 0;
    ctx.childrenCount = childAges.length;
    ctx.childrenAges = childAges;
    ctx.seniorsCount = seniorAges.length;
    ctx.seniorsAges = seniorAges;
    ctx.totalTravellers = ctx.adultsCount + ctx.childrenCount + ctx.seniorsCount;
    if (ctx.totalTravellers === 1) ctx.partyType = 'solo';
    else if (ctx.childrenCount > 0 || ctx.seniorsCount > 0) ctx.partyType = 'family';
    else if (ctx.totalTravellers === 2) ctx.partyType = 'couple';
    else ctx.partyType = 'friends';
    const anyStated = [src.adults, src.children, src.seniors].includes('stated');
    fieldSources.travellers = anyStated ? 'stated' : 'assumed';
  }

  // Pace
  const pace = (data.pace || '').toLowerCase();
  if (pace) {
    if (/relax|slow|easy|leisure|not too much|less walking|low/.test(pace)) {
      ctx.travelStyle = 'Relaxed';
      ctx.walkingIntensity = 'Low';
    } else if (/active|packed|fast|adventur|hectic/.test(pace)) {
      ctx.travelStyle = 'Action-Packed';
      ctx.walkingIntensity = 'Active';
    } else {
      ctx.travelStyle = 'Balanced';
      ctx.walkingIntensity = 'Moderate';
    }
    fieldSources.pace = toTag(src.pace);
  } else if ((ctx.seniorsCount || 0) > 0) {
    ctx.travelStyle = 'Relaxed';
    ctx.walkingIntensity = 'Low';
    fieldSources.pace = 'assumed';
  }

  // Accommodation
  if (data.accommodationPreference) {
    ctx.accommodationPreference = data.accommodationPreference;
    fieldSources.accommodation = toTag(src.accommodationPreference);
  } else if ((ctx.seniorsCount || 0) > 0) {
    ctx.accommodationPreference = 'Accessible 3–4★ stay (lift or ground floor)';
    fieldSources.accommodation = 'assumed';
  }

  // Transport
  const transport = (data.transportPreference || '').toLowerCase();
  if (/train|rail/.test(transport)) ctx.transportMode = 'Train';
  else if (/car|cab|road|drive|taxi/.test(transport)) ctx.transportMode = 'Cab';
  else if (/fl(y|ight)|air/.test(transport)) ctx.transportMode = 'Flight';

  // Dates: only accept ones the user actually wrote and that validate
  if (data.dates && src.dates === 'stated') {
    const r = resolveTravelDates(data.dates);
    if (r && r.ok) {
      ctx.dates = r.label;
      ctx.durationDays = r.days;
      fieldSources.dates = 'stated';
      fieldSources.duration = 'stated';
    }
  }

  ctx.parseMode = 'ai';
}
