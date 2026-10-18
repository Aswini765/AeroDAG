import React, { useState } from 'react';
import {
  Send,
  Check,
  Edit2,
  Users,
  Calendar,
  Wallet,
  Compass,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { TripPreferences, TripPlan } from '../../types/travelBooking';
import { TripContext } from '../../services/requirementEngine';
import { TripPlanningEngine } from '../../services/tripPlanningEngine';
import { getSeasonOptionsForDestination, isDetailedDestination } from '../../services/destinationsData';
import { resolveTravelDates, formatDateRange } from '../../services/dateResolver';
import { findLongWeekends } from '../../services/longWeekendFinder';
import { getDestinationContent } from '../../config/destinationContent';
import { fetchDestinationProfile } from '../../services/destinationProfileClient';
import { buildPlanFromDestinationProfile } from '../../services/aiDestinationPlanBuilder';
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

  // 4 Clarifying Dimensions State
  const [dateFlexibility, setDateFlexibility] = useState<'fixed' | 'flexible'>('flexible');
  const [persona, setPersona] = useState<'family' | 'couple' | 'friends' | 'solo'>(
    initialContext.partyType === 'family' ? 'family'
    : initialContext.partyType === 'couple' ? 'couple'
    : initialContext.partyType === 'friends' ? 'friends'
    : initialContext.partyType === 'solo' ? 'solo'
    : ((initialContext.childrenCount && initialContext.childrenCount > 0) || (initialContext.seniorsCount && initialContext.seniorsCount > 0)) ? 'family'
    : (initialContext.adultsCount === 2) ? 'couple'
    : 'family'
  );
  const [budgetConstraint, setBudgetConstraint] = useState<'strict' | 'flexible'>('strict');
  const [selectedStyle, setSelectedStyle] = useState<'Relaxed' | 'Balanced' | 'Action-Packed'>(
    initialContext.travelStyle === 'Relaxed' ? 'Relaxed'
    : initialContext.travelStyle === 'Action-Packed' ? 'Action-Packed'
    : 'Balanced'
  );

  // B3: Needs Question State
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>(initialContext.tripNeeds || []);
  const [isNeedsOpen, setIsNeedsOpen] = useState(false);

  const handleToggleNeed = (need: string) => {
    const next = selectedNeeds.includes(need)
      ? selectedNeeds.filter((n) => n !== need)
      : [...selectedNeeds, need];
    setSelectedNeeds(next);
    const updated: TripContext = { ...tripContext, tripNeeds: next };
    if (next.includes('Travelling with kids') || next.includes('Elderly / less walking')) {
      updated.travelStyle = 'Relaxed';
      updated.walkingIntensity = 'Low';
      setSelectedStyle('Relaxed');
    }
    if (next.includes('Vegetarian food nearby')) {
      updated.dietaryPreference = 'Vegetarian';
    }
    setTripContext(updated);
  };

  // B6: Long Weekends for the next 12 months
  const longWeekends = findLongWeekends(new Date(), 12);

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

  const handlePersonaChange = (newPersona: 'family' | 'couple' | 'friends' | 'solo') => {
    setPersona(newPersona);
    const updated = { ...tripContext };
    if (newPersona === 'family') {
      updated.partyType = 'family';
      if (!updated.adultsCount || updated.adultsCount < 2) updated.adultsCount = 2;
      if (updated.childrenCount === 0 || updated.childrenCount === null) updated.childrenCount = 1;
      if (!updated.childrenAges || updated.childrenAges.length === 0) updated.childrenAges = [10];
      updated.walkingIntensity = 'Low';
      updated.priority = 'Family Friendly';
      updated.accommodationPreference = 'Connecting Family Suite';
    } else if (newPersona === 'couple') {
      updated.partyType = 'couple';
      updated.adultsCount = 2;
      updated.childrenCount = 0;
      updated.childrenAges = [];
      updated.seniorsCount = 0;
      updated.priority = 'Romantic & Peaceful';
      updated.accommodationPreference = 'Boutique Sea-view King Room';
    } else if (newPersona === 'friends') {
      updated.partyType = 'friends';
      updated.adultsCount = Math.max(3, updated.adultsCount || 3);
      updated.childrenCount = 0;
      updated.childrenAges = [];
      updated.walkingIntensity = 'Active';
      updated.priority = 'Nightlife & Activities';
      updated.accommodationPreference = 'Shared Villa / Connecting Rooms';
    } else if (newPersona === 'solo') {
      updated.partyType = 'solo';
      updated.adultsCount = 1;
      updated.childrenCount = 0;
      updated.childrenAges = [];
      updated.walkingIntensity = 'Active';
      updated.priority = 'Central & Walkable';
      updated.accommodationPreference = 'Central Boutique Stay';
    }
    updated.totalTravellers = (updated.adultsCount || 0) + (updated.childrenCount || 0) + (updated.seniorsCount || 0);
    setTripContext(updated);
  };

  const handleBudgetChange = (amountINR: number) => {
    const tier: 'Frugal' | 'Comfortable' | 'Premium' = amountINR <= 35000 ? 'Frugal' : amountINR <= 90000 ? 'Comfortable' : 'Premium';
    const updated: TripContext = {
      ...tripContext,
      budgetTotalINR: amountINR,
      budgetTier: tier
    };
    setTripContext(updated);
  };

  const handleStyleChange = (style: 'Relaxed' | 'Balanced' | 'Action-Packed') => {
    setSelectedStyle(style);
    const intensity: 'Low' | 'Moderate' | 'Active' = style === 'Relaxed' ? 'Low' : style === 'Action-Packed' ? 'Active' : 'Moderate';
    const updated: TripContext = {
      ...tripContext,
      travelStyle: style,
      walkingIntensity: intensity
    };
    setTripContext(updated);
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
      let generatedPlan: TripPlan;
      if (isDetailedDestination(ctx.destination || '')) {
        generatedPlan = await TripPlanningEngine.buildDeterministicPlan(ctx);
      } else {
        const profile = await fetchDestinationProfile(ctx.destination || '', ctx.origin || 'Bengaluru');
        if (profile && !('unsupported' in profile)) {
          generatedPlan = buildPlanFromDestinationProfile(ctx, profile);
        } else {
          generatedPlan = await TripPlanningEngine.buildDeterministicPlan(ctx);
        }
      }
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
        budgetTier: (ctx.budgetTier === 'Budget' ? 'Frugal' : (ctx.budgetTier || 'Comfortable')) as any,
        travelStyle: ctx.travelStyle === 'Relaxed' || ctx.travelStyle === 'Action-Packed' ? ctx.travelStyle : 'Balanced',
        priority: 'Family Friendly',
        accommodationPreference: (ctx.accommodationPreference as any) || 'Connecting Family Suite',
        dietaryOrNotes: ctx.notes.join('; '),
        scope: generatedPlan.scope,
        transportMode: ctx.transportMode || undefined,
        dietaryPreference: ctx.dietaryPreference || undefined,
        selectedTrain: generatedPlan.selectedTrain,
        tripNeeds: ctx.tripNeeds || selectedNeeds
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

  const handleGenerateTailoredPlan = async () => {
    if (!holidayFrom || !holidayTo) {
      if (!tripContext.dates) {
        setDateError('Please pick your travel dates to build your plan.');
        return;
      }
    } else {
      if (holidayTo < holidayFrom) {
        setDateError('The last day is before the first day. Please check your dates.');
        return;
      }
      if (holidayFrom < todayIso) {
        setDateError('That date has already passed. Please pick upcoming dates.');
        return;
      }
    }
    setDateError(null);
    const updated = {
      ...tripContext,
      dates: holidayFrom && holidayTo ? formatDateRange(fromIso(holidayFrom), fromIso(holidayTo)) : (tripContext.dates || '14–20 Nov 2026'),
      durationDays: holidayDays > 0 ? holidayDays : (tripContext.durationDays || 7),
      fieldSources: { ...tripContext.fieldSources, dates: 'stated' as const, duration: 'stated' as const }
    };
    setTripContext(updated);
    await triggerPlanGeneration(updated);
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto my-16 px-4 animate-fade-in-slide">
        <div className="card-consumer p-8 text-center space-y-6">
          <div className="h-12 w-12 mx-auto rounded-full border-3 border-[#E2E6E1] border-t-[#0E6B59] animate-spin" />
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#15201D] font-heading">
              Building your {tripContext.destination?.replace(/,.*$/, '') || 'Goa'} plan
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
              <span className="text-xs text-[#15201D] font-medium">Matching stays tailored to {persona} within budget cap...</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-4.5 w-4.5 rounded-full bg-[#E2E6E1] shrink-0" />
              <span className="text-xs text-[#55625E]/60">Allocating 15%–20% on-ground buffer and hidden transport costs...</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-4.5 w-4.5 rounded-full bg-[#E2E6E1] shrink-0" />
              <span className="text-xs text-[#55625E]/60">Verifying {selectedStyle} pacing, rest times, and provider trust...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const destContent = getDestinationContent(tripContext.destination || undefined);

  // Ask only what's missing or assumed: hide sections whose answer the user already stated
  const datesStated = tripContext.fieldSources?.dates === 'stated' && Boolean(holidayFrom && holidayTo);
  const travellersStated = tripContext.fieldSources?.travellers === 'stated';
  const budgetStated = tripContext.fieldSources?.budget === 'stated';
  const paceStated = tripContext.fieldSources?.pace === 'stated';

  let qCount = 1;
  const datesQNum = !datesStated ? qCount++ : 0;
  const travellersQNum = !travellersStated ? qCount++ : 0;
  const budgetQNum = !budgetStated ? qCount++ : 0;
  const paceQNum = !paceStated ? qCount++ : 0;
  const totalQuestionsShown = qCount - 1;

  const headerBadge = totalQuestionsShown === 0
    ? 'Ready to plan'
    : totalQuestionsShown === 1
    ? '1 quick check'
    : `${totalQuestionsShown} quick checks`;

  const headerPill = totalQuestionsShown === 0
    ? '· Trip details confirmed'
    : totalQuestionsShown === 1
    ? '· 1 Quick Clarification'
    : `· ${totalQuestionsShown} Quick Clarifications`;

  const headerDescription = totalQuestionsShown === 0
    ? 'All key details are confirmed from your message. Review the summary or add specific needs below.'
    : totalQuestionsShown === 1
    ? 'Just 1 quick check to tailor your trip.'
    : "Let's fine-tune a couple details to make sure your plan fits your group.";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-fade-in-slide">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: CHAT & INTERACTIVE CLARIFYING QUESTIONS (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* User's Message Bubble */}
          <div className="flex justify-end">
            <div className="max-w-lg bg-[#E3F1EC] text-[#15201D] rounded-2xl rounded-tr-sm p-4 text-sm sm:text-base leading-relaxed border border-[#0E6B59]/20 shadow-sm">
              {initialPrompt}
            </div>
          </div>

          {/* Interactive AI Assistant Card */}
          <div className="card-consumer p-5 sm:p-6 space-y-6 shadow-sm text-left border-[#E2E6E1]">
            <div className="space-y-1.5 pb-4 border-b border-[#E2E6E1]">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E3F1EC] text-[#0E6B59] uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {headerBadge}
                </span>
                <span className="text-xs text-[#55625E]">{headerPill}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-[#15201D] font-heading">
                Let's tailor your {tripContext.destination?.replace(/,.*$/, '') || 'trip'}
              </h2>
              <p className="text-xs sm:text-sm text-[#55625E]">
                {headerDescription}
              </p>
            </div>

            {/* 1. CLARIFYING QUESTION 1: EXACT DATES & DATE FLEXIBILITY */}
            {!datesStated && (
            <div className="space-y-3.5 pb-5 border-b border-[#E2E6E1]">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#0E6B59] text-white text-[11px] font-bold">{datesQNum}</span>
                <h3 className="text-sm sm:text-base font-bold text-[#15201D]">
                  Exact Dates & Flexibility
                </h3>
              </div>

              {/* Date pickers */}
              <form onSubmit={handleHolidaySubmit} className="space-y-3" id="holiday-dates-form">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-[#55625E]">First day of trip</span>
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
                    <span className="text-xs font-semibold text-[#55625E]">Last day of trip</span>
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
                    {holidayDays > 0 ? `${holidayDays} day${holidayDays === 1 ? '' : 's'} · ${Math.max(0, holidayDays - 1)} night${holidayDays - 1 === 1 ? '' : 's'}` : 'Pick first and last day'}
                  </span>
                  <button type="submit" className="btn-secondary w-full sm:w-auto text-xs py-2 px-4 min-h-[44px]" disabled={!holidayFrom || !holidayTo || isLoading}>
                    <span>{isLoading ? 'Applying…' : 'Apply Dates'}</span>
                  </button>
                </div>
              </form>

              {/* Or type in natural language */}
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
                    placeholder="Or type custom dates, e.g. Oct 19th for 5 days"
                    className="flex-1 bg-[#FFFFFF] border border-[#E2E6E1] rounded-xl px-3.5 py-2 text-sm text-[#15201D] focus:ring-2 focus:ring-[#7CC4B3] focus:outline-none min-h-[44px]"
                  />
                  <button type="submit" disabled={!freeTextDate.trim() || isLoading} className="btn-ghost shrink-0 text-xs min-h-[44px] px-3.5">
                    <span>{isLoading ? 'Using…' : 'Use these'}</span>
                  </button>
                </div>
                {dateError && (
                  <p id="custom-date-error" data-testid="custom-date-error" role="alert" className="text-xs text-[#DC2626] font-medium">
                    {dateError}
                  </p>
                )}
              </form>

              {/* Date Flexibility Selector */}
              <div className="pt-2">
                <span className="text-xs font-semibold text-[#55625E] block mb-2">Date Flexibility:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDateFlexibility('fixed')}
                    className={`p-2.5 rounded-xl text-left border transition text-xs ${
                      dateFlexibility === 'fixed'
                        ? 'border-[#0E6B59] bg-[#E3F1EC]/60 text-[#15201D] font-bold'
                        : 'border-[#E2E6E1] bg-white text-[#55625E] hover:border-[#0E6B59]/40'
                    }`}
                  >
                    <div className="font-semibold text-[#15201D]">Strict Fixed Dates</div>
                    <div className="text-[11px] text-[#55625E]">Plan strictly around selected days</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateFlexibility('flexible')}
                    className={`p-2.5 rounded-xl text-left border transition text-xs ${
                      dateFlexibility === 'flexible'
                        ? 'border-[#0E6B59] bg-[#E3F1EC]/60 text-[#15201D] font-bold'
                        : 'border-[#E2E6E1] bg-white text-[#55625E] hover:border-[#0E6B59]/40'
                    }`}
                  >
                    <div className="font-semibold text-[#15201D] flex items-center gap-1.5">
                      <span>±2 Days Flexible</span>
                      <span className="text-[10px] bg-[#0E6B59] text-white px-1.5 py-0.2 rounded font-normal">Save ₹4k+</span>
                    </div>
                    <div className="text-[11px] text-[#55625E]">Shift by 1–2 days for cheaper flights</div>
                  </button>
                </div>
              </div>

              {/* Cheaper weeks pills */}
              <div className="pt-2 space-y-2">
                <div className="text-xs font-semibold text-[#55625E]">
                  Flexible? Seasonal value weeks in {tripContext.destination?.replace(/,.*$/, '') || 'destination'}:
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

              {/* B6: Long Weekends (fewest leave days) */}
              {longWeekends.length > 0 && (
                <div className="pt-3 space-y-2 border-t border-[#E2E6E1]/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-bold text-[#15201D] flex items-center gap-1.5">
                      <span>🗓️ Long weekends (fewest leave days)</span>
                      <span className="text-[10px] bg-[#E3F1EC] text-[#0A5546] font-semibold px-2 py-0.5 rounded-full">Next 12 months</span>
                    </span>
                    <span className="text-[11px] text-[#55625E]">Check your own office/school holiday list</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {longWeekends.map((lw) => {
                      const isSelected = holidayFrom === lw.startDateIso && holidayTo === lw.endDateIso;
                      return (
                        <button
                          key={`${lw.startDateIso}-${lw.endDateIso}`}
                          type="button"
                          onClick={() => {
                            setHolidayFrom(lw.startDateIso);
                            setHolidayTo(lw.endDateIso);
                            setDateError(null);
                          }}
                          className={`pill-chip text-xs transition border flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-[#0E6B59] text-white border-[#0E6B59] font-bold shadow-xs'
                              : 'bg-white text-[#15201D] border-[#E2E6E1] hover:border-[#0E6B59]/40 hover:bg-[#E3F1EC]/40'
                          }`}
                        >
                          <span>{lw.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-[#E3F1EC] text-[#0A5546]'
                          }`}>
                            {lw.leaveDays === 0 ? '0 leave days' : `${lw.leaveDays} leave day${lw.leaveDays > 1 ? 's' : ''}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            )}

            {/* 2. CLARIFYING QUESTION 2: GROUP PERSONA */}
            {!travellersStated && (
            <div className="space-y-3 pb-5 border-b border-[#E2E6E1]">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#0E6B59] text-white text-[11px] font-bold">{travellersQNum}</span>
                <h3 className="text-sm sm:text-base font-bold text-[#15201D]">
                  Who is Travelling? (Group Persona)
                </h3>
              </div>
              <p className="text-xs text-[#55625E]">
                We adapt walking intensity, hotel floors, and room interconnectivity based on who is travelling.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handlePersonaChange('family')}
                  className={`p-3 rounded-xl text-left border transition text-xs space-y-1 ${
                    persona === 'family'
                      ? 'border-[#0E6B59] bg-[#E3F1EC]/60 text-[#15201D] font-bold'
                      : 'border-[#E2E6E1] bg-white text-[#55625E] hover:border-[#0E6B59]/40'
                  }`}
                >
                  <div className="font-bold text-[#15201D] flex items-center gap-1.5">
                    <span>👨‍👩‍👧 Family with Elders/Kids</span>
                  </div>
                  <div className="text-[11px] text-[#55625E]">
                    Low walking, connecting family suites, lift/ground floor rooms, kid friendly.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handlePersonaChange('couple')}
                  className={`p-3 rounded-xl text-left border transition text-xs space-y-1 ${
                    persona === 'couple'
                      ? 'border-[#0E6B59] bg-[#E3F1EC]/60 text-[#15201D] font-bold'
                      : 'border-[#E2E6E1] bg-white text-[#55625E] hover:border-[#0E6B59]/40'
                  }`}
                >
                  <div className="font-bold text-[#15201D] flex items-center gap-1.5">
                    <span>💑 Couples / Honeymoon</span>
                  </div>
                  <div className="text-[11px] text-[#55625E]">
                    Quiet scenic boutique stays, romantic sunset spots, privacy, slow pace.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handlePersonaChange('friends')}
                  className={`p-3 rounded-xl text-left border transition text-xs space-y-1 ${
                    persona === 'friends'
                      ? 'border-[#0E6B59] bg-[#E3F1EC]/60 text-[#15201D] font-bold'
                      : 'border-[#E2E6E1] bg-white text-[#55625E] hover:border-[#0E6B59]/40'
                  }`}
                >
                  <div className="font-bold text-[#15201D] flex items-center gap-1.5">
                    <span>👥 Friends / Bachelors</span>
                  </div>
                  <div className="text-[11px] text-[#55625E]">
                    High-energy spots, shared villas, vibrant cafes, cliff walks & night culture.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handlePersonaChange('solo')}
                  className={`p-3 rounded-xl text-left border transition text-xs space-y-1 ${
                    persona === 'solo'
                      ? 'border-[#0E6B59] bg-[#E3F1EC]/60 text-[#15201D] font-bold'
                      : 'border-[#E2E6E1] bg-white text-[#55625E] hover:border-[#0E6B59]/40'
                  }`}
                >
                  <div className="font-bold text-[#15201D] flex items-center gap-1.5">
                    <span>🎒 Solo Explorer</span>
                  </div>
                  <div className="text-[11px] text-[#55625E]">
                    Agile transit hubs, walkable boutique rooms, self-paced exploration.
                  </div>
                </button>
              </div>
            </div>
            )}

            {/* 3. CLARIFYING QUESTION 3: BUDGET CONSTRAINTS & FLEXIBILITY */}
            {!budgetStated && (
            <div className="space-y-3 pb-5 border-b border-[#E2E6E1]">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#0E6B59] text-white text-[11px] font-bold">{budgetQNum}</span>
                <h3 className="text-sm sm:text-base font-bold text-[#15201D]">
                  Budget Constraints & Flexibility
                </h3>
              </div>

              {/* Quick budget chips */}
              <div>
                <span className="text-xs font-semibold text-[#55625E] block mb-2">Target Total Budget:</span>
                <div className="flex flex-wrap gap-2">
                  {[25000, 45000, 60000, 85000, 120000, 150000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleBudgetChange(amt)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                        tripContext.budgetTotalINR === amt
                          ? 'border-[#0E6B59] bg-[#0E6B59] text-white'
                          : 'border-[#E2E6E1] bg-white text-[#15201D] hover:border-[#0E6B59]/40'
                      }`}
                    >
                      ₹{amt.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget Constraint Toggle */}
              <div className="pt-2">
                <span className="text-xs font-semibold text-[#55625E] block mb-2">Budget Flexibility:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBudgetConstraint('strict')}
                    className={`p-2.5 rounded-xl text-left border transition text-xs ${
                      budgetConstraint === 'strict'
                        ? 'border-[#0E6B59] bg-[#E3F1EC]/60 text-[#15201D] font-bold'
                        : 'border-[#E2E6E1] bg-white text-[#55625E] hover:border-[#0E6B59]/40'
                    }`}
                  >
                    <div className="font-semibold text-[#15201D]">Strict Hard Ceiling</div>
                    <div className="text-[11px] text-[#55625E]">Never exceed target budget, even by ₹1</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBudgetConstraint('flexible')}
                    className={`p-2.5 rounded-xl text-left border transition text-xs ${
                      budgetConstraint === 'flexible'
                        ? 'border-[#0E6B59] bg-[#E3F1EC]/60 text-[#15201D] font-bold'
                        : 'border-[#E2E6E1] bg-white text-[#55625E] hover:border-[#0E6B59]/40'
                    }`}
                  >
                    <div className="font-semibold text-[#15201D]">Flexible (+10%–15%)</div>
                    <div className="text-[11px] text-[#55625E]">Willing to stretch slightly for {destContent.clarifyStretchNote}</div>
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* 4. CLARIFYING QUESTION 4: TRAVEL STYLE & PACING */}
            {!paceStated && (
            <div className="space-y-3 pb-5 border-b border-[#E2E6E1]">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#0E6B59] text-white text-[11px] font-bold">{paceQNum}</span>
                <h3 className="text-sm sm:text-base font-bold text-[#15201D]">
                  Travel Style & Pacing
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleStyleChange('Relaxed')}
                  className={`p-3 rounded-xl text-left border transition text-xs space-y-1 ${
                    selectedStyle === 'Relaxed'
                      ? 'border-[#0E6B59] bg-[#E3F1EC]/60 text-[#15201D] font-bold'
                      : 'border-[#E2E6E1] bg-white text-[#55625E] hover:border-[#0E6B59]/40'
                  }`}
                >
                  <div className="font-bold text-[#15201D]">🌿 Nature / Relaxation</div>
                  <div className="text-[11px] text-[#55625E]">Quiet coffee estates, calm sunset strolls, leisurely pace.</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleStyleChange('Balanced')}
                  className={`p-3 rounded-xl text-left border transition text-xs space-y-1 ${
                    selectedStyle === 'Balanced'
                      ? 'border-[#0E6B59] bg-[#E3F1EC]/60 text-[#15201D] font-bold'
                      : 'border-[#E2E6E1] bg-white text-[#55625E] hover:border-[#0E6B59]/40'
                  }`}
                >
                  <div className="font-bold text-[#15201D]">⚖️ Balanced Highlights</div>
                  <div className="text-[11px] text-[#55625E]">Top sights in mornings, free relaxed afternoons, comfortable dining.</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleStyleChange('Action-Packed')}
                  className={`p-3 rounded-xl text-left border transition text-xs space-y-1 ${
                    selectedStyle === 'Action-Packed'
                      ? 'border-[#0E6B59] bg-[#E3F1EC]/60 text-[#15201D] font-bold'
                      : 'border-[#E2E6E1] bg-white text-[#55625E] hover:border-[#0E6B59]/40'
                  }`}
                >
                  <div className="font-bold text-[#15201D]">⚡ Packed Sightseeing</div>
                  <div className="text-[11px] text-[#55625E]">Full-day discovery, water sports, vibrant markets, energetic.</div>
                </button>
              </div>
            </div>
            )}

            {/* 5. COLLAPSED NEEDS QUESTION: CHIP TOGGLE */}
            <div className="pt-2 pb-2">
              {!isNeedsOpen ? (
                <div>
                  <button
                    type="button"
                    id="add-needs-toggle-btn"
                    onClick={() => setIsNeedsOpen(true)}
                    className="pill-chip text-xs bg-white text-[#0E6B59] border border-[#0E6B59]/40 hover:bg-[#E3F1EC] transition flex items-center gap-1.5 font-bold py-2.5 px-4 shadow-2xs"
                  >
                    <span>+ Add needs (veg, kids, elderly…)</span>
                    {selectedNeeds.length > 0 && (
                      <span className="ml-1 bg-[#0E6B59] text-white text-[10px] px-1.5 py-0.2 rounded-full font-normal">
                        {selectedNeeds.length} active
                      </span>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 p-4 rounded-2xl bg-[#F9FAF9] border border-[#E2E6E1]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#15201D]">
                        Anything important for this trip?
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsNeedsOpen(false)}
                      className="text-xs text-[#0E6B59] hover:underline font-semibold"
                    >
                      Done
                    </button>
                  </div>
                  <p className="text-xs text-[#55625E]">
                    Select any that apply. We use these to rank stays, highlight walking distances, and adapt itinerary pacing.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { id: 'Vegetarian food nearby', icon: '🥗', title: 'Vegetarian food nearby', desc: 'Top pure-veg / Jain options within walking distance' },
                      { id: 'Kitchen in the stay', icon: '🍳', title: 'Kitchen in the stay', desc: 'Private kitchenette for baby food or home cooking' },
                      { id: 'Travelling with kids', icon: '👶', title: 'Travelling with kids', desc: 'Child-safe balcony, early dining & relaxed pacing' },
                      { id: 'Elderly / less walking', icon: '🧓', title: 'Elderly / less walking', desc: 'Lift/ground floor, low walking, step-free access' },
                      { id: 'Supermarket or pharmacy nearby', icon: '🏪', title: 'Supermarket or pharmacy nearby', desc: 'Medical shop and essentials within 5–10 mins walk' },
                    ].map((item) => {
                      const isChecked = selectedNeeds.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleToggleNeed(item.id)}
                          className={`p-3 rounded-xl text-left border transition text-xs space-y-1 flex items-start gap-2.5 min-h-[44px] ${
                            isChecked
                              ? 'border-[#0E6B59] bg-[#E3F1EC]/60 text-[#15201D] font-bold'
                              : 'border-[#E2E6E1] bg-white text-[#55625E] hover:border-[#0E6B59]/40'
                          }`}
                        >
                          <span className="text-base leading-none pt-0.5">{item.icon}</span>
                          <div className="space-y-0.5 flex-1">
                            <div className="font-bold text-[#15201D] flex items-center justify-between">
                              <span>{item.title}</span>
                              <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                                isChecked ? 'bg-[#0E6B59] border-[#0E6B59] text-white' : 'border-[#CBD5E1] bg-white'
                              }`}>
                                {isChecked ? '✓' : ''}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#55625E] font-normal">
                              {item.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* PRIMARY CTA: BUILD TAILORED PLAN */}
            <div className="pt-4 border-t border-[#E2E6E1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-[#55625E]">
                All options include realistic budget buffers and route comparisons
              </div>
              <button
                type="button"
                onClick={handleGenerateTailoredPlan}
                disabled={isLoading}
                className="btn-primary w-full sm:w-auto py-3 px-6 text-sm flex items-center justify-center gap-2 shadow-sm font-bold min-h-[44px]"
              >
                <span>{isLoading ? 'Building your plan…' : `Build Tailored ${tripContext.destination?.replace(/,.*$/, '') || 'Trip'} Plan`}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
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

              {/* Selected Trip Needs */}
              {selectedNeeds.length > 0 && (
                <div className="pt-2 border-t border-[#E2E6E1]/60">
                  <div className="text-xs text-[#55625E] mb-1.5 font-medium">Trip priorities:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNeeds.map((need) => (
                      <span
                        key={need}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-[#E3F1EC] text-[#0A5546] font-medium"
                      >
                        ✓ {need}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
