import React, { useState } from 'react';
import { Send, Check, Edit2 } from 'lucide-react';
import { TripPreferences, TripPlan } from '../../types/travelBooking';
import { TripContext } from '../../services/requirementEngine';
import { TripPlanningEngine } from '../../services/tripPlanningEngine';
import { getSeasonOptionsForDestination } from '../../services/destinationsData';
import { resolveTravelDates, formatDateRange } from '../../services/dateResolver';
import { SourceTag } from './SourceTag';

interface ClarifyScreenProps {
  initialPrompt: string;
  tripContext: TripContext;
  onPlanReady: (plan: TripPlan, preferences: TripPreferences) => void;
  onBackToDescribe: () => void;
}

/** "2 adults, 1 child (10)" · "1 adult, 2 seniors (70)" · "2 adults, 2 children (6, 10)" */
export function formatTravellers(ctx: {
  adultsCount?: number | null;
  childrenCount?: number | null;
  childrenAges?: number[] | null;
  seniorsCount?: number | null;
  seniorsAges?: number[] | null;
}): string {
  const ageText = (list: number[] | null | undefined) => {
    const known = (list || []).filter((n) => typeof n === 'number' && n > 0);
    if (known.length === 0) return '';
    const unique = Array.from(new Set(known));
    return ` (${unique.length === 1 ? unique[0] : known.join(', ')})`;
  };
  const adults = ctx.adultsCount || 0;
  const children = ctx.childrenAges?.length || ctx.childrenCount || 0;
  const seniors = ctx.seniorsAges?.length || ctx.seniorsCount || 0;
  const parts: string[] = [];
  if (adults > 0) parts.push(`${adults} adult${adults === 1 ? '' : 's'}`);
  if (children > 0) parts.push(`${children} ${children === 1 ? 'child' : 'children'}${ageText(ctx.childrenAges)}`);
  if (seniors > 0) parts.push(`${seniors} senior${seniors === 1 ? '' : 's'}${ageText(ctx.seniorsAges)}`);
  return parts.length ? parts.join(', ') : 'Not specified';
}

export function validateTravelDate(dateStr: string): { isValid: boolean; normalized?: string; error?: string } {
  const trimmed = dateStr.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Please enter a travel date.' };
  }
  const lower = trimmed.toLowerCase();

  // Reject relative past dates
  if (lower.includes('yesterday') || lower.includes('last week') || lower.includes('last month') || lower.includes('last year') || lower.includes('ago')) {
    return { isValid: false, error: 'Travel dates must be in the future. Past dates cannot be booked.' };
  }

  // Reject invalid days like "32 Feb", "32 Nov", "30 Feb", etc.
  const invalidDayMatch = trimmed.match(/\b(3[2-9]|[4-9]\d)\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
  if (invalidDayMatch) {
    return { isValid: false, error: 'Invalid calendar date. Please enter a valid day of the month.' };
  }

  const invalidFebMatch = trimmed.match(/\b(3[0-1])\s*(?:feb|february)/i);
  if (invalidFebMatch) {
    return { isValid: false, error: 'February cannot have more than 29 days.' };
  }

  // Reject past years
  const pastYearMatch = trimmed.match(/\b(19\d\d|20[0-1]\d|202[0-5])\b/);
  if (pastYearMatch) {
    return { isValid: false, error: `Year ${pastYearMatch[1]} is in the past. Please select an upcoming date in 2026 or 2027.` };
  }

  // Reject gibberish that lacks any digits or month names
  const hasMonth = /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(trimmed);
  const hasDigits = /\d+/.test(trimmed);
  if (!hasMonth && !hasDigits) {
    return { isValid: false, error: 'Could not recognize this date. Please enter a date like "14–20 Nov 2026".' };
  }

  return { isValid: true, normalized: trimmed.includes('2026') ? trimmed : `${trimmed} 2026` };
}

export const ClarifyScreen: React.FC<ClarifyScreenProps> = ({
  initialPrompt,
  tripContext: initialContext,
  onPlanReady,
  onBackToDescribe
}) => {
  const [tripContext, setTripContext] = useState<TripContext>(initialContext);
  const [freeTextDate, setFreeTextDate] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  // "When are your holidays?" — From/To pickers, pre-filled from anything the user already said
  const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fromIso = (v: string) => { const [y, m, d] = v.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  const todayIso = toIso(new Date());
  const prefill = (() => {
    const r = initialContext.dates ? resolveTravelDates(initialContext.dates) : null;
    return r && r.ok ? { from: toIso(r.start), to: toIso(r.end) } : { from: '', to: '' };
  })();
  const [holidayFrom, setHolidayFrom] = useState(prefill.from);
  const [holidayTo, setHolidayTo] = useState(prefill.to);
  const holidayDays = holidayFrom && holidayTo ? Math.round((fromIso(holidayTo).getTime() - fromIso(holidayFrom).getTime()) / 86400000) + 1 : 0;

  const handleHolidayFromChange = (v: string) => {
    setHolidayFrom(v);
    setDateError(null);
    // Suggest an end date from the trip length they already gave us
    if (v && (!holidayTo || holidayTo < v) && initialContext.durationDays) {
      const end = fromIso(v);
      end.setDate(end.getDate() + Math.max(0, initialContext.durationDays - 1));
      setHolidayTo(toIso(end));
    }
  };

  const handleHolidaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayFrom || !holidayTo) {
      setDateError('Pick both the first and the last day of your holidays.');
      return;
    }
    if (holidayTo < holidayFrom) {
      setDateError('The last day is before the first day. Please check your dates.');
      return;
    }
    if (holidayFrom < todayIso) {
      setDateError('That date has already passed. Please pick upcoming dates.');
      return;
    }
    if (holidayDays > 60) {
      setDateError('That trip is longer than 60 days. Please pick a shorter range.');
      return;
    }
    setDateError(null);
    const updated = {
      ...tripContext,
      dates: formatDateRange(fromIso(holidayFrom), fromIso(holidayTo)),
      durationDays: holidayDays,
      fieldSources: { ...tripContext.fieldSources, dates: 'stated' as const, duration: 'stated' as const }
    };
    setTripContext(updated);
    await triggerPlanGeneration(updated);
  };
  const [isLoading, setIsLoading] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Destination-tailored season options
  const isRoadOrRailDestination =
    (tripContext.destination || '').toLowerCase().includes('coorg') ||
    (tripContext.destination || '').toLowerCase().includes('mysuru') ||
    (tripContext.destination || '').toLowerCase().includes('mysore');

  const seasonOptions = getSeasonOptionsForDestination(tripContext.destination || 'Goa');
  const dateOptions = seasonOptions.map((opt) => ({
    title: opt.dates,
    note: opt.note || opt.sourceLabel,
    tag: opt.seasonType === 'value' ? 'Best value' : opt.seasonType === 'peak' ? 'May exceed budget' : 'Cheapest option',
    tagType: (opt.seasonType === 'value' ? 'value' : opt.seasonType === 'peak' ? 'budget' : 'flex') as 'value' | 'budget' | 'flex',
    value: opt.dates.includes('2026') ? opt.dates : `${opt.dates} 2026`
  }));

  const handleSelectDate = async (dateVal: string) => {
    const r = resolveTravelDates(dateVal);
    const updated = r && r.ok
      ? { ...tripContext, dates: r.label, durationDays: r.days, fieldSources: { ...tripContext.fieldSources, dates: 'stated' as const, duration: 'stated' as const } }
      : { ...tripContext, dates: dateVal };
    setTripContext(updated);
    await triggerPlanGeneration(updated);
  };

  const handleCustomDateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!freeTextDate.trim()) return;
    const resolved = resolveTravelDates(freeTextDate);
    if (resolved && !resolved.ok) {
      setDateError(resolved.error);
      return;
    }
    if (resolved && resolved.ok) {
      setDateError(null);
      const updatedExact = {
        ...tripContext,
        dates: resolved.label,
        durationDays: resolved.days,
        fieldSources: { ...tripContext.fieldSources, dates: 'stated' as const, duration: 'stated' as const }
      };
      setTripContext(updatedExact);
      await triggerPlanGeneration(updatedExact);
      return;
    }
    const res = validateTravelDate(freeTextDate);
    if (!res.isValid) {
      setDateError(res.error || 'Please enter a valid upcoming date.');
      return;
    }
    setDateError(null);
    const updated = { ...tripContext, dates: res.normalized || freeTextDate.trim() };
    setTripContext(updated);
    await triggerPlanGeneration(updated);
  };

  const triggerPlanGeneration = async (ctx: TripContext) => {
    setIsLoading(true);
    try {
      const generatedPlan = await TripPlanningEngine.buildDeterministicPlan(ctx);
      const preferences: TripPreferences = {
        destination: generatedPlan.destination,
        origin: generatedPlan.origin,
        targetDates: generatedPlan.dates,
        durationDays: generatedPlan.durationDays,
        partySize: generatedPlan.travellers.total,
        adultsCount: generatedPlan.travellers.adults,
        childrenCount: generatedPlan.travellers.children,
        childrenAges: generatedPlan.travellers.childAges,
        budgetTotalINR: generatedPlan.budget.targetINR,
        budgetTotalUSD: Math.round(generatedPlan.budget.targetINR / 84),
        budgetTier: (ctx.budgetTier === 'Budget' ? 'Frugal' : (ctx.budgetTier || 'Frugal')) as any,
        travelStyle: tripContext.travelStyle === 'Relaxed' || tripContext.travelStyle === 'Action-Packed' ? tripContext.travelStyle : 'Balanced',
        priority: 'Family Friendly',
        accommodationPreference: (ctx.accommodationPreference as any) || 'Connecting Family Suite',
        dietaryOrNotes: ctx.notes.join('; '),
        scope: generatedPlan.scope,
        transportMode: ctx.transportMode || undefined,
        dietaryPreference: ctx.dietaryPreference || undefined,
        selectedTrain: generatedPlan.selectedTrain
      };

      // Allow loading screen to show smoothly
      setTimeout(() => {
        onPlanReady(generatedPlan, preferences);
      }, 1200);
    } catch (err) {
      console.error('Plan generation failed', err);
      setIsLoading(false);
    }
  };

  const handleSaveInlineEdit = (field: string) => {
    let updated = { ...tripContext };
    if (field === 'destination') updated.destination = editValue;
    if (field === 'origin') updated.origin = editValue;
    if (field === 'budget') updated.budgetTotalINR = parseInt(editValue.replace(/\D/g, ''), 10) || updated.budgetTotalINR;
    if (field === 'hotel') updated.accommodationPreference = editValue;
    setTripContext(updated);
    setEditingField(null);
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto my-16 px-4 animate-fade-in-slide">
        <div className="card-consumer p-8 text-center space-y-6">
          <div className="h-12 w-12 mx-auto rounded-full border-3 border-[#E2E6E1] border-t-[#0E6B59] animate-spin" />
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#15201D] font-heading">
              Building your {tripContext.destination || 'Goa'} plan
            </h2>
            <p className="text-xs text-[#55625E]">
              Usually takes under 20 seconds
            </p>
          </div>
          <div className="space-y-3 text-left pt-2 border-t border-[#E2E6E1]">
            <div className="flex items-center gap-3">
              <span className="h-4.5 w-4.5 rounded-full bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center shrink-0">
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
              <span className="text-xs text-[#15201D] font-medium">Checking travel options and arrival routes...</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-4.5 w-4.5 rounded-full bg-[#0E6B59] flex items-center justify-center shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              </span>
              <span className="text-xs text-[#15201D] font-medium">Matching family-friendly stays within budget cap...</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-4.5 w-4.5 rounded-full bg-[#E2E6E1] shrink-0" />
              <span className="text-xs text-[#55625E]/60">Allocating food, local cabs, and contingency buffer...</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-4.5 w-4.5 rounded-full bg-[#E2E6E1] shrink-0" />
              <span className="text-xs text-[#55625E]/60">Verifying pacing, rest times, and schedule feasibility...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-fade-in-slide">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: CHAT INTERACTION (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* User's Message Bubble */}
          <div className="flex justify-end">
            <div className="max-w-lg bg-[#E3F1EC] text-[#15201D] rounded-2xl rounded-tr-sm p-4 text-sm sm:text-base leading-relaxed border border-[#0E6B59]/20 shadow-sm">
              {initialPrompt}
            </div>
          </div>

          {/* Assistant's Response Card */}
          <div className="card-consumer p-5 sm:p-6 space-y-4 shadow-sm text-left">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#15201D] font-heading">
                When are your holidays?
              </h2>
              <p className="text-xs sm:text-sm text-[#55625E]">
                Pick your travel dates and we'll plan around them.
              </p>
            </div>

            {/* Primary: the user's own holiday dates */}
            <form onSubmit={handleHolidaySubmit} className="space-y-3" id="holiday-dates-form">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-[#55625E]">First day</span>
                  <input
                    type="date"
                    id="holiday-from"
                    value={holidayFrom}
                    min={todayIso}
                    onChange={(e) => handleHolidayFromChange(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#E2E6E1] rounded-xl px-3.5 py-2.5 text-sm text-[#15201D] focus:ring-2 focus:ring-[#7CC4B3] focus:outline-none"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-[#55625E]">Last day</span>
                  <input
                    type="date"
                    id="holiday-to"
                    value={holidayTo}
                    min={holidayFrom || todayIso}
                    onChange={(e) => { setHolidayTo(e.target.value); setDateError(null); }}
                    className="w-full bg-[#FFFFFF] border border-[#E2E6E1] rounded-xl px-3.5 py-2.5 text-sm text-[#15201D] focus:ring-2 focus:ring-[#7CC4B3] focus:outline-none"
                  />
                </label>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs text-[#55625E]" aria-live="polite">
                  {holidayDays > 0 ? `${holidayDays} day${holidayDays === 1 ? '' : 's'} · ${Math.max(0, holidayDays - 1)} night${holidayDays - 1 === 1 ? '' : 's'}` : 'Choose your first and last day'}
                </span>
                <button type="submit" className="btn-primary" disabled={!holidayFrom || !holidayTo}>
                  <span>Plan these dates</span>
                </button>
              </div>
            </form>

            {/* Or type them in words */}
            <form onSubmit={handleCustomDateSubmit} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={freeTextDate}
                  onChange={(e) => {
                    setFreeTextDate(e.target.value);
                    if (dateError) setDateError(null);
                  }}
                  aria-label="Type your dates"
                  placeholder="Or type them, e.g. 20th to 27th this month"
                  className="flex-1 bg-[#FFFFFF] border border-[#E2E6E1] rounded-xl px-3.5 py-2 text-sm text-[#15201D] focus:ring-2 focus:ring-[#7CC4B3] focus:outline-none"
                />
                <button type="submit" disabled={!freeTextDate.trim()} className="btn-ghost shrink-0">
                  <span>Use these</span>
                </button>
              </div>
              {dateError && (
                <p id="custom-date-error" data-testid="custom-date-error" role="alert" className="text-xs text-[#DC2626] font-medium">
                  {dateError}
                </p>
              )}
            </form>

            {/* Secondary: cheaper weeks, for flexible travellers */}
            <div className="pt-3 border-t border-[#E2E6E1] space-y-2">
              <div className="text-xs font-semibold text-[#55625E]">
                Flexible? These weeks usually cost less in {tripContext.destination?.replace(/,.*$/, '') || 'this destination'}
              </div>
              <div className="flex flex-wrap gap-2">
                {dateOptions.filter((opt) => resolveTravelDates(opt.value)?.ok).map((opt) => (
                  <button
                    key={opt.title}
                    type="button"
                    onClick={() => handleSelectDate(opt.value)}
                    title={opt.note}
                    className="pill-chip text-xs bg-white text-[#15201D] hover:bg-[#E3F1EC] border border-[#E2E6E1] hover:border-[#0E6B59]/40 inline-flex items-center gap-1.5"
                  >
                    <span className="font-semibold">{opt.title}</span>
                    <span className={opt.tagType === 'value' ? 'text-[#0A5546]' : 'text-[#8A4307]'}>· {opt.tag}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: "WHAT WE UNDERSTOOD" PANEL (5 cols) */}
        <div className="lg:col-span-5">
          <div className="card-consumer p-5 sm:p-6 space-y-4 sticky top-24 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E6E1]">
              <h2 className="text-base font-bold text-[#15201D] font-heading">
                What we understood
              </h2>
              {tripContext.parseMode === 'ai' ? (
                <span
                  id="parse-mode-badge"
                  data-mode="ai"
                  title="Your description was read by Gemini on our server. Every value is still editable."
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0E6B59] bg-[#E3F1EC] px-2 py-0.5 rounded-full"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0E6B59]" aria-hidden="true" />
                  Understood by AI
                </span>
              ) : tripContext.parseMode === 'basic' ? (
                <span
                  id="parse-mode-badge"
                  data-mode="basic"
                  title="AI parsing was unavailable, so we used keyword rules. Please double-check these values."
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#8A4307] bg-[#FCEFD9] px-2 py-0.5 rounded-full"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8A4307]" aria-hidden="true" />
                  Basic mode
                </span>
              ) : null}
            </div>

            <div className="space-y-3.5 text-sm">
              {/* Destination */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-[#55625E]">Destination</div>
                  <div className="font-semibold text-[#15201D]">
                    {tripContext.destination || 'Goa, India'}
                  </div>
                </div>
                <SourceTag kind={tripContext.fieldSources?.destination || 'stated'} label={tripContext.fieldSources?.destination || 'stated'} />
              </div>

              {/* Origin */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-[#55625E]">Departing from</div>
                  <div className="font-semibold text-[#15201D]">
                    {tripContext.origin || 'Bengaluru (BLR)'}
                  </div>
                </div>
                <SourceTag kind={tripContext.fieldSources?.origin || 'assumed'} label={tripContext.fieldSources?.origin || 'assumed'} />
              </div>

              {/* Party / Travellers */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-[#55625E]">Travellers</div>
                  <div className="font-semibold text-[#15201D]">
                    {formatTravellers(tripContext)}
                  </div>
                </div>
                <SourceTag kind={tripContext.fieldSources?.travellers || 'assumed'} label={tripContext.fieldSources?.travellers || 'assumed'} />
              </div>

              {/* Duration */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-[#55625E]">Duration</div>
                  <div className="font-semibold text-[#15201D]">
                    {tripContext.durationDays || 7} days ({Math.max(1, (tripContext.durationDays || 7) - 1)} nights)
                  </div>
                </div>
                <SourceTag kind={tripContext.fieldSources?.duration || 'assumed'} label={tripContext.fieldSources?.duration || 'assumed'} />
              </div>

              {/* Target Budget */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-[#55625E]">Budget</div>
                  <div className="font-semibold text-[#15201D]">
                    ₹{(tripContext.budgetTotalINR || 60000).toLocaleString('en-IN')}
                  </div>
                </div>
                <SourceTag kind={tripContext.fieldSources?.budget || 'assumed'} label={tripContext.fieldSources?.budget || 'assumed'} />
              </div>

              {/* Stay / Accommodation Assumption */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-[#55625E]">Accommodation</div>
                  <div className="font-semibold text-[#15201D]">
                    {tripContext.accommodationPreference || '3–4★ stay'}
                  </div>
                </div>
                <SourceTag kind={tripContext.fieldSources?.accommodation || 'assumed'} label={tripContext.fieldSources?.accommodation || 'assumed'} />
              </div>

              {/* Pacing */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-[#55625E]">Pace</div>
                  <div className="font-semibold text-[#15201D]">
                    {tripContext.travelStyle || 'Relaxed'} ({tripContext.walkingIntensity || 'Low'} walking)
                  </div>
                </div>
                <SourceTag kind={tripContext.fieldSources?.pace || 'assumed'} label={tripContext.fieldSources?.pace || 'assumed'} />
              </div>

              {/* Travel Dates */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#E2E6E1]/60">
                <div>
                  <div className="text-xs text-[#55625E]">Travel dates</div>
                  <div className="font-semibold text-[#8A4307]">
                    {tripContext.dates || 'Selecting above'}
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-[#FCEFD9] text-[#8A4307]">
                  Needed
                </span>
              </div>
            </div>

            {/* Domestic Trip Note at Bottom */}
            <div className="pt-3 border-t border-[#E2E6E1] text-xs text-[#55625E] flex items-center gap-1.5">
              <span>🇮🇳</span>
              <span>Domestic trip — no passport or visa details needed.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
