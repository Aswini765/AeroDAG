import React, { useState, useMemo, useEffect } from 'react';
import {
  Check,
  Users,
  Calendar,
  Wallet,
  Compass,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  ChevronRight,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { TripPreferences, TripPlan } from '../../types/travelBooking';
import { TripContext } from '../../services/requirementEngine';
import { TripPlanningEngine } from '../../services/tripPlanningEngine';
import { getSeasonOptionsForDestination, isDetailedDestination } from '../../services/destinationsData';
import { resolveTravelDates, formatDateRange } from '../../services/dateResolver';
import { findLongWeekends } from '../../services/longWeekendFinder';
import { fetchDestinationProfile } from '../../services/destinationProfileClient';
import { buildPlanFromDestinationProfile } from '../../services/aiDestinationPlanBuilder';
import { DESTINATIONS } from './WhereShouldWeGo';

interface ClarifyScreenProps {
  initialPrompt: string;
  tripContext: TripContext;
  onPlanReady: (plan: TripPlan, preferences: TripPreferences, context?: TripContext) => void;
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

type StepKey = 'basics' | 'dates' | 'who' | 'time' | 'needs' | 'budget';

export const ClarifyScreen: React.FC<ClarifyScreenProps> = ({
  initialPrompt,
  tripContext: initialContext,
  onPlanReady,
  onBackToDescribe
}) => {
  const [tripContext, setTripContext] = useState<TripContext>(initialContext);
  const [isLoading, setIsLoading] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [freeTextDate, setFreeTextDate] = useState('');

  // 1. Determine which questions are already answered vs needed
  const datesAlreadyStated = Boolean(
    initialContext.fieldSources?.dates === 'stated' &&
    initialContext.dates &&
    !initialContext.dates.includes('Selecting')
  );

  const travellersAlreadyStated = Boolean(
    initialContext.fieldSources?.travellers === 'stated' &&
    initialContext.adultsCount &&
    initialContext.adultsCount > 0
  );

  const timeAlreadyStated = Boolean(
    initialContext.fieldSources?.pace === 'stated' &&
    initialContext.travelStyle
  );

  const needsAlreadyStated = Boolean(
    initialContext.tripNeeds &&
    initialContext.tripNeeds.length > 0
  );

  const budgetAlreadyStated = Boolean(
    initialContext.fieldSources?.budget === 'stated' &&
    initialContext.budgetTotalINR &&
    initialContext.budgetTotalINR > 0
  );

  // Active step flow: only include questions the user has not already answered
  const activeSteps = useMemo<StepKey[]>(() => {
    const list: StepKey[] = [];
    // Prompt 4 rule: When budget or traveller count is missing from the prompt, show ONE short question step
    if (!travellersAlreadyStated || !budgetAlreadyStated) {
      list.push('basics');
    }
    // Dates, pace and needs have sensible defaults shown as editable chips on the plan,
    // so they are not extra steps before the answer.
    return list;
  }, [datesAlreadyStated, travellersAlreadyStated, timeAlreadyStated, needsAlreadyStated, budgetAlreadyStated]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Active step key, or null if all answered
  const currentStep: StepKey | 'ready' = activeSteps.length > 0 && currentStepIndex < activeSteps.length
    ? activeSteps[currentStepIndex]
    : 'ready';

  // Helper date tools
  const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fromIso = (v: string) => { const [y, m, d] = v.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  const todayIso = toIso(new Date());

  const prefill = (() => {
    const r = tripContext.dates ? resolveTravelDates(tripContext.dates) : null;
    return r && r.ok ? { from: toIso(r.start), to: toIso(r.end) } : { from: '', to: '' };
  })();
  const [holidayFrom, setHolidayFrom] = useState(prefill.from);
  const [holidayTo, setHolidayTo] = useState(prefill.to);
  const holidayDays = holidayFrom && holidayTo ? Math.round((fromIso(holidayTo).getTime() - fromIso(holidayFrom).getTime()) / 86400000) + 1 : 0;

  const longWeekends = useMemo(() => findLongWeekends(new Date(), 12), []);
  const seasonOptions = useMemo(() => getSeasonOptionsForDestination(tripContext.destination || 'Goa'), [tripContext.destination]);

  // Persona
  const [persona, setPersona] = useState<'family' | 'couple' | 'friends' | 'solo'>(
    tripContext.partyType === 'family' ? 'family'
    : tripContext.partyType === 'couple' ? 'couple'
    : tripContext.partyType === 'friends' ? 'friends'
    : tripContext.partyType === 'solo' ? 'solo'
    : ((tripContext.childrenCount && tripContext.childrenCount > 0) || (tripContext.seniorsCount && tripContext.seniorsCount > 0)) ? 'family'
    : (tripContext.adultsCount === 2) ? 'couple'
    : 'family'
  );

  const [selectedNeeds, setSelectedNeeds] = useState<string[]>(tripContext.tripNeeds || []);

  // Prompt 4: Combined Basics Quick Picks (Travellers & Budget)
  const [selectedTravellersCount, setSelectedTravellersCount] = useState<number>(
    tripContext.totalTravellers && tripContext.totalTravellers > 0 ? tripContext.totalTravellers : 2
  );
  const [pickedBudgetINR, setSelectedBudgetINR] = useState<number | null>(
    tripContext.budgetTotalINR && tripContext.budgetTotalINR > 0 && tripContext.fieldSources?.budget === 'stated'
      ? tripContext.budgetTotalINR
      : null
  );

  // Budget quick picks are centred on a typical total for this place, length and group size,
  // so a Coorg weekend isn't offered ₹1,00,000 and nothing silently defaults to ₹60,000.
  const roundTo = (n: number, step: number) => Math.max(step, Math.round(n / step) * step);
  const typicalTotalINR = (() => {
    const destName = (tripContext.destination || '').toLowerCase();
    const card = DESTINATIONS.find((d) => destName.includes(d.name.toLowerCase()));
    const perDay = card ? card.baseCostPerDayINR : 3500;
    const days = Math.max(1, tripContext.durationDays || 4);
    return roundTo(perDay * days * Math.max(1, selectedTravellersCount), 1000);
  })();
  const budgetQuickPicks = Array.from(new Set([
    roundTo(typicalTotalINR * 0.75, 5000),
    roundTo(typicalTotalINR, 5000),
    roundTo(typicalTotalINR * 1.5, 5000)
  ]));
  const selectedBudgetINR = pickedBudgetINR ?? roundTo(typicalTotalINR, 5000);
  const [customTravellersInput, setCustomTravellersInput] = useState('');
  const [customBudgetInput, setCustomBudgetInput] = useState('');
  const [isCustomTravellersOpen, setIsCustomTravellersOpen] = useState(false);
  const [isCustomBudgetOpen, setIsCustomBudgetOpen] = useState(false);

  const handleApplyBasics = () => {
    const finalTravellers = isCustomTravellersOpen && parseInt(customTravellersInput, 10) > 0
      ? parseInt(customTravellersInput, 10)
      : selectedTravellersCount;
    const finalBudget = isCustomBudgetOpen && parseInt(customBudgetInput.replace(/[^\d]/g, ''), 10) > 0
      ? parseInt(customBudgetInput.replace(/[^\d]/g, ''), 10)
      : selectedBudgetINR;

    const updated = {
      ...tripContext,
      adultsCount: finalTravellers,
      totalTravellers: finalTravellers,
      budgetTotalINR: finalBudget,
      fieldSources: {
        ...tripContext.fieldSources,
        travellers: 'stated' as const,
        budget: 'stated' as const
      }
    };
    setTripContext(updated);
    handleNextStep();
  };

  // Prompt 7: Conversational question phrasing acknowledging user inputs
  const conversationalAck = useMemo(() => {
    const parts: string[] = [];
    if (tripContext.durationDays && tripContext.durationDays > 0) {
      parts.push(`${tripContext.durationDays} days`);
    }
    const pax = (tripContext.adultsCount || 0) + (tripContext.childrenCount || 0) + (tripContext.seniorsCount || 0);
    if (pax > 0) {
      parts.push(`${pax} of you`);
    } else if (tripContext.totalTravellers && tripContext.totalTravellers > 0) {
      parts.push(`${tripContext.totalTravellers} of you`);
    }
    if (tripContext.budgetTotalINR && tripContext.budgetTotalINR > 0) {
      parts.push(`₹${tripContext.budgetTotalINR.toLocaleString('en-IN')}`);
    }
    if (parts.length >= 2) {
      return `Got it — ${parts.join(', ')}. `;
    }
    return '';
  }, [tripContext.durationDays, tripContext.adultsCount, tripContext.childrenCount, tripContext.seniorsCount, tripContext.totalTravellers, tripContext.budgetTotalINR]);

  const handleNextStep = () => {
    if (currentStepIndex < activeSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setCurrentStepIndex(activeSteps.length);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    } else {
      onBackToDescribe();
    }
  };

  // Step 1: Dates handlers
  const handleSelectLongWeekend = (lw: { startDateIso: string; endDateIso: string; daysCount: number; label: string }) => {
    setHolidayFrom(lw.startDateIso);
    setHolidayTo(lw.endDateIso);
    setDateError(null);
    const rangeFormatted = formatDateRange(fromIso(lw.startDateIso), fromIso(lw.endDateIso));
    setTripContext((prev) => ({
      ...prev,
      dates: rangeFormatted,
      durationDays: lw.daysCount,
      fieldSources: { ...prev.fieldSources, dates: 'stated', duration: 'stated' }
    }));
    handleNextStep();
  };

  const handleSelectSeasonDate = (dateVal: string) => {
    const r = resolveTravelDates(dateVal);
    const updated = r && r.ok
      ? { ...tripContext, dates: r.label, durationDays: r.days, fieldSources: { ...tripContext.fieldSources, dates: 'stated' as const, duration: 'stated' as const } }
      : { ...tripContext, dates: dateVal, fieldSources: { ...tripContext.fieldSources, dates: 'stated' as const } };
    if (r && r.ok) {
      setHolidayFrom(toIso(r.start));
      setHolidayTo(toIso(r.end));
    }
    setDateError(null);
    setTripContext(updated);
    handleNextStep();
  };

  const handleCustomDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!freeTextDate.trim()) return;
    const resolved = resolveTravelDates(freeTextDate);
    if (resolved && !resolved.ok) {
      setDateError(resolved.error);
      return;
    }
    if (resolved && resolved.ok) {
      setDateError(null);
      setHolidayFrom(toIso(resolved.start));
      setHolidayTo(toIso(resolved.end));
      setTripContext((prev) => ({
        ...prev,
        dates: resolved.label,
        durationDays: resolved.days,
        fieldSources: { ...prev.fieldSources, dates: 'stated', duration: 'stated' }
      }));
      handleNextStep();
      return;
    }
    const res = validateTravelDate(freeTextDate);
    if (!res.isValid) {
      setDateError(res.error || 'Please enter a valid upcoming date.');
      return;
    }
    setDateError(null);
    setTripContext((prev) => ({
      ...prev,
      dates: res.normalized || freeTextDate.trim(),
      fieldSources: { ...prev.fieldSources, dates: 'stated' }
    }));
    handleNextStep();
  };

  // Step 2: Who is going handlers
  const handleSelectPersona = (newPersona: 'family' | 'couple' | 'friends' | 'solo') => {
    setPersona(newPersona);
    const updated = { ...tripContext };
    if (newPersona === 'family') {
      updated.partyType = 'family';
      if (!updated.adultsCount || updated.adultsCount < 2) updated.adultsCount = 2;
      if (updated.childrenCount === null || updated.childrenCount === undefined) updated.childrenCount = 1;
      if (!updated.childrenAges || updated.childrenAges.length === 0) updated.childrenAges = [10];
      updated.walkingIntensity = 'Low';
      updated.priority = 'Family Friendly';
      updated.accommodationPreference = 'Connecting Family Suite';
      setTripContext(updated);
      // Don't auto-advance for family so they can adjust adults/kids count
    } else {
      if (newPersona === 'couple') {
        updated.partyType = 'couple';
        updated.adultsCount = 2;
        updated.childrenCount = 0;
        updated.childrenAges = [];
        updated.seniorsCount = 0;
        updated.priority = 'Romantic & Peaceful';
        updated.accommodationPreference = 'Boutique Sea-view King Room';
      } else if (newPersona === 'friends') {
        updated.partyType = 'friends';
        updated.adultsCount = 4;
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
      updated.fieldSources = { ...updated.fieldSources, travellers: 'stated' };
      setTripContext(updated);
      handleNextStep();
    }
  };

  // Step 3: Time to spare handlers
  const handleSelectTime = (style: 'Relaxed' | 'Balanced' | 'Action-Packed') => {
    const intensity = style === 'Relaxed' ? 'Low' : style === 'Action-Packed' ? 'Active' : 'Moderate';
    setTripContext((prev) => ({
      ...prev,
      travelStyle: style,
      walkingIntensity: intensity,
      fieldSources: { ...prev.fieldSources, pace: 'stated' }
    }));
    handleNextStep();
  };

  // Step 4: Needs toggle
  const handleToggleNeed = (need: string) => {
    const next = selectedNeeds.includes(need)
      ? selectedNeeds.filter((n) => n !== need)
      : [...selectedNeeds, need];
    setSelectedNeeds(next);
    const updated: TripContext = { ...tripContext, tripNeeds: next };
    if (next.includes('Kid-friendly stay') || next.includes('Travelling with kids') || next.includes('Less walking / lift access')) {
      updated.travelStyle = 'Relaxed';
      updated.walkingIntensity = 'Low';
    }
    if (next.includes('Veg food') || next.includes('Vegetarian food nearby')) {
      updated.dietaryPreference = 'Vegetarian';
    }
    setTripContext(updated);
  };

  // Step 5: Budget per person handlers
  const handleSelectBudgetPerPerson = (perPersonINR: number) => {
    const travellers = (tripContext.adultsCount || 2) + (tripContext.childrenCount || 0);
    const totalINR = perPersonINR * Math.max(1, travellers);
    const tier = totalINR <= 35000 ? 'Frugal' : totalINR <= 90000 ? 'Comfortable' : 'Premium';
    setTripContext((prev) => ({
      ...prev,
      budgetTotalINR: totalINR,
      budgetTier: tier,
      fieldSources: { ...prev.fieldSources, budget: 'stated' }
    }));
    handleNextStep();
  };

  // Remove understood chips
  const handleRemoveUnderstoodChip = (key: 'destination' | 'dates' | 'travellers' | 'budget' | 'need', value?: string) => {
    const updated = { ...tripContext };
    if (key === 'dates') {
      updated.dates = null;
      updated.fieldSources = { ...updated.fieldSources, dates: 'assumed' };
      setHolidayFrom('');
      setHolidayTo('');
      setCurrentStepIndex(activeSteps.indexOf('dates') !== -1 ? activeSteps.indexOf('dates') : 0);
    } else if (key === 'travellers') {
      updated.adultsCount = 2;
      updated.childrenCount = 0;
      updated.fieldSources = { ...updated.fieldSources, travellers: 'assumed' };
      setCurrentStepIndex(activeSteps.indexOf('who') !== -1 ? activeSteps.indexOf('who') : 0);
    } else if (key === 'budget') {
      updated.budgetTotalINR = 60000;
      updated.fieldSources = { ...updated.fieldSources, budget: 'assumed' };
      setCurrentStepIndex(activeSteps.indexOf('budget') !== -1 ? activeSteps.indexOf('budget') : 0);
    } else if (key === 'need' && value) {
      const next = selectedNeeds.filter((n) => n !== value);
      setSelectedNeeds(next);
      updated.tripNeeds = next;
    }
    setTripContext(updated);
  };

  const buildLockRef = React.useRef(false);
  // Trigger Plan Generation
  const handleBuildPlan = async () => {
    if (buildLockRef.current || isLoading) return;
    buildLockRef.current = true;
    setIsLoading(true);
    try {
      const wantedDays = Math.max(1, tripContext.durationDays || 4);
      let finalDates = tripContext.dates || '';
      if (!finalDates || !resolveTravelDates(finalDates)?.ok) {
        // Next Friday at least a week away, matching the trip length
        const now = new Date();
        const toFri = (5 - now.getDay() + 7) % 7;
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + toFri + 7);
        const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + wantedDays - 1);
        finalDates = formatDateRange(start, end);
      }
      const resolved = resolveTravelDates(finalDates);
      const daysCount = resolved && resolved.ok ? resolved.days : wantedDays;

      const ctxToBuild: TripContext = {
        ...tripContext,
        dates: finalDates,
        durationDays: daysCount,
        fieldSources: {
          ...tripContext.fieldSources,
          // Keep "assumed" when we picked the dates, so the user can see and change them
          dates: tripContext.fieldSources?.dates === 'stated' ? 'stated' : 'assumed',
          duration: tripContext.fieldSources?.duration || 'assumed'
        }
      };

      let generatedPlan: TripPlan;
      if (isDetailedDestination(ctxToBuild.destination || '')) {
        generatedPlan = await TripPlanningEngine.buildDeterministicPlan(ctxToBuild);
      } else {
        const profile = await fetchDestinationProfile(ctxToBuild.destination || '', ctxToBuild.origin || 'Bengaluru');
        if (profile && !('unsupported' in profile)) {
          generatedPlan = buildPlanFromDestinationProfile(ctxToBuild, profile);
        } else {
          generatedPlan = await TripPlanningEngine.buildDeterministicPlan(ctxToBuild);
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
        budgetTier: (ctxToBuild.budgetTier === 'Budget' ? 'Frugal' : (ctxToBuild.budgetTier || 'Comfortable')) as any,
        travelStyle: ctxToBuild.travelStyle === 'Relaxed' || ctxToBuild.travelStyle === 'Action-Packed' ? ctxToBuild.travelStyle : 'Balanced',
        priority: 'Family Friendly',
        accommodationPreference: (ctxToBuild.accommodationPreference as any) || 'Connecting Family Suite',
        dietaryOrNotes: ctxToBuild.notes.join('; '),
        scope: generatedPlan.scope,
        transportMode: ctxToBuild.transportMode || undefined,
        dietaryPreference: ctxToBuild.dietaryPreference || undefined,
        selectedTrain: generatedPlan.selectedTrain,
        tripNeeds: ctxToBuild.tripNeeds || selectedNeeds
      };

      setTimeout(() => {
        onPlanReady(generatedPlan, preferences, ctxToBuild);
      }, 800);
    } catch (err) {
      console.error('Plan generation failed', err);
      setIsLoading(false);
    }
  };

  // Nothing left to ask: build the plan straight away (no extra "Build" tap)
  useEffect(() => {
    if (currentStep === 'ready' && !isLoading && !buildLockRef.current) {
      void handleBuildPlan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // Loading screen with 4 plain-language lines
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
              <span className="text-xs text-[#15201D] font-medium">Matching stays tailored to your party within budget cap...</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-4.5 w-4.5 rounded-full bg-[#E2E6E1] shrink-0" />
              <span className="text-xs text-[#55625E]/60">Allocating food, local cabs, and surprise buffer...</span>
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

  const cleanDest = tripContext.destination?.replace(/,\s*India$/i, '').trim() || 'Goa';
  const totalSteps = activeSteps.length;
  const isFinalStepOrReady = currentStep === 'ready' || currentStepIndex >= totalSteps;

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in-slide space-y-4 text-left">
      {/* Top Bar: Progress Indicator & Back */}
      <div className="flex items-center justify-between gap-2 pb-2">
        <button
          type="button"
          onClick={handlePrevStep}
          className="text-xs font-semibold text-[#55625E] hover:text-[#0E6B59] flex items-center gap-1 min-h-[44px] px-2 py-1"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        {totalSteps > 1 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#0E6B59]">
              {Math.min(currentStepIndex + 1, totalSteps)} of {totalSteps}
            </span>
            <div className="flex gap-1">
              {activeSteps.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx <= currentStepIndex ? 'w-5 bg-[#0E6B59]' : 'w-2 bg-[#E2E6E1]'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* "What we understood" as small removable chips, NOT a table */}
      <div id="clarify-what-we-understood" className="p-3 rounded-2xl bg-[#F6F8F6] border border-[#E2E6E1] space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-[#55625E]">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[#15201D]">What we understood:</span>
            {tripContext.parseMode === 'basic' ? (
              <span id="clarify-basic-mode-badge" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FCEFD9] text-[#8A4307] border border-[#8A4307]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8A4307]" />
                Basic mode
              </span>
            ) : (
              <span id="clarify-ai-mode-badge" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E3F1EC] text-[#0E6B59] border border-[#0E6B59]/30">
                AI parsed
              </span>
            )}
          </div>
          <span>Tap ✕ to change</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Destination Chip */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#CBD5E1] text-xs font-semibold text-[#15201D] shadow-2xs">
            <span>📍 {cleanDest}</span>
            <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-[#E3F1EC] text-[#0E6B59]">
              {tripContext.fieldSources?.destination === 'assumed' ? 'assumed' : 'stated'}
            </span>
          </span>

          {/* Dates Chip if known */}
          {tripContext.dates && (
            <button
              type="button"
              onClick={() => handleRemoveUnderstoodChip('dates')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#CBD5E1] text-xs font-semibold text-[#15201D] hover:border-[#DC2626] hover:text-[#DC2626] transition shadow-2xs cursor-pointer"
              title="Click to change dates"
            >
              <span>📅 {tripContext.dates}</span>
              <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${tripContext.fieldSources?.dates === 'stated' ? 'bg-[#E3F1EC] text-[#0E6B59]' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                {tripContext.fieldSources?.dates === 'stated' ? 'stated' : 'assumed'}
              </span>
              <X className="h-3 w-3" />
            </button>
          )}

          {/* Travellers Chip if known */}
          {tripContext.adultsCount && (
            <button
              type="button"
              onClick={() => handleRemoveUnderstoodChip('travellers')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#CBD5E1] text-xs font-semibold text-[#15201D] hover:border-[#DC2626] hover:text-[#DC2626] transition shadow-2xs cursor-pointer"
              title="Click to change travellers"
            >
              <span>👥 {formatTravellers(tripContext)}</span>
              <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${tripContext.fieldSources?.travellers === 'stated' ? 'bg-[#E3F1EC] text-[#0E6B59]' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                {tripContext.fieldSources?.travellers === 'stated' ? 'stated' : 'assumed'}
              </span>
              <X className="h-3 w-3" />
            </button>
          )}

          {/* Budget Chip only once the user has given a budget (never show a silent default) */}
          {tripContext.budgetTotalINR && tripContext.fieldSources?.budget === 'stated' && (
            <button
              type="button"
              onClick={() => handleRemoveUnderstoodChip('budget')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#CBD5E1] text-xs font-semibold text-[#15201D] hover:border-[#DC2626] hover:text-[#DC2626] transition shadow-2xs cursor-pointer"
              title="Click to change budget"
            >
              <span>💰 ₹{tripContext.budgetTotalINR.toLocaleString('en-IN')}</span>
              <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${tripContext.fieldSources?.budget === 'stated' ? 'bg-[#E3F1EC] text-[#0E6B59]' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                {tripContext.fieldSources?.budget === 'stated' ? 'stated' : 'assumed'}
              </span>
              <X className="h-3 w-3" />
            </button>
          )}

          {/* Needs / Preferences Chips */}
          {selectedNeeds.map((need) => (
            <button
              key={need}
              type="button"
              onClick={() => handleRemoveUnderstoodChip('need', need)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E3F1EC] border border-[#0E6B59]/30 text-xs font-semibold text-[#0E6B59] hover:border-[#DC2626] hover:text-[#DC2626] transition shadow-2xs cursor-pointer"
              title={`Remove ${need}`}
            >
              <span>✓ {need}</span>
              <span className="text-[9px] uppercase tracking-wider font-bold px-1 py-0.5 rounded bg-white text-[#0E6B59]">
                stated
              </span>
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      </div>

      {/* ONE QUESTION PER STEP AS A CHAT BUBBLE */}
      <div className="card-consumer p-5 sm:p-6 space-y-5 border border-[#E2E6E1] bg-white rounded-2xl shadow-xs">
        {/* User Prompt Context Bubble */}
        <div className="flex justify-end">
          <div className="max-w-[85%] bg-[#E3F1EC] text-[#15201D] text-xs sm:text-sm rounded-2xl rounded-tr-sm p-3.5 border border-[#0E6B59]/20 shadow-2xs leading-relaxed">
            {initialPrompt}
          </div>
        </div>

        {/* STEP 1: DATES */}
        {currentStep === 'dates' && (
          <div className="space-y-4 animate-fade-in-slide">
            {/* AI Chat Bubble */}
            <div className="flex items-start gap-2.5">
              <span className="w-8 h-8 rounded-full bg-[#0E6B59] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                AI
              </span>
              <div className="bg-[#F6F8F6] rounded-2xl rounded-tl-sm p-4 text-xs sm:text-sm text-[#15201D] space-y-1 border border-[#E2E6E1]">
                <div className="font-bold">{conversationalAck}When would you like to travel to {cleanDest}?</div>
                <div className="text-[11px] text-[#55625E]">
                  Long weekends with fewest leave days first:
                </div>
              </div>
            </div>

            {/* Long Weekends Chips (Fewest leave days first) */}
            <div className="space-y-2 pt-1 pl-10">
              <div className="flex flex-wrap gap-2">
                {longWeekends.slice(0, 4).map((lw) => (
                  <button
                    key={`${lw.startDateIso}-${lw.endDateIso}`}
                    type="button"
                    onClick={() => handleSelectLongWeekend(lw)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border border-[#E2E6E1] bg-white text-[#15201D] hover:border-[#0E6B59] hover:bg-[#E3F1EC] transition flex items-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <span>🗓️ {lw.label}</span>
                    <span className="text-[10px] font-bold bg-[#E3F1EC] text-[#0A5546] px-1.5 py-0.5 rounded">
                      {lw.leaveDays === 0 ? '0 leave days' : `${lw.leaveDays} leave day`}
                    </span>
                  </button>
                ))}
              </div>

              {/* Seasonal Value Weeks */}
              <div className="pt-2 space-y-1.5">
                <span className="text-[11px] font-semibold text-[#55625E] block">Seasonal best value:</span>
                <div className="flex flex-wrap gap-2">
                  {seasonOptions.slice(0, 2).map((opt) => (
                    <button
                      key={opt.dates}
                      type="button"
                      onClick={() => handleSelectSeasonDate(opt.dates)}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border border-[#E2E6E1] bg-white text-[#15201D] hover:border-[#0E6B59] hover:bg-[#E3F1EC] transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span>✨ {opt.dates}</span>
                      <span className="text-[10px] text-[#0A5546]">· Best value</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Or type custom date */}
              <form onSubmit={handleCustomDateSubmit} className="pt-2 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={freeTextDate}
                    onChange={(e) => {
                      setFreeTextDate(e.target.value);
                      if (dateError) setDateError(null);
                    }}
                    placeholder="Or type date: Oct 14–20, 2026"
                    className="flex-1 bg-white border border-[#E2E6E1] rounded-xl px-3.5 py-2 text-xs text-[#15201D] focus:ring-2 focus:ring-[#0E6B59] focus:outline-none min-h-[44px]"
                  />
                  <button
                    type="submit"
                    disabled={!freeTextDate.trim()}
                    className="btn-primary min-h-[44px] px-4 py-2 text-xs font-bold shrink-0"
                  >
                    <span>Apply</span>
                  </button>
                </div>
                {dateError && (
                  <p role="alert" className="text-xs text-[#DC2626] font-medium">
                    {dateError}
                  </p>
                )}
              </form>
            </div>
          </div>
        )}

        {/* STEP: BASICS (Prompt 4 rule: "How many of you, and roughly what budget?") */}
        {currentStep === 'basics' && (
          <div className="space-y-4 animate-fade-in-slide">
            <div className="flex items-start gap-2.5">
              <span className="w-8 h-8 rounded-full bg-[#0E6B59] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                AI
              </span>
              <div className="bg-[#F6F8F6] rounded-2xl rounded-tl-sm p-4 text-xs sm:text-sm text-[#15201D] space-y-1 border border-[#E2E6E1]">
                <div className="font-bold">How many of you, and roughly what budget?</div>
                <div className="text-[11px] text-[#55625E]">
                  Quick picks to tailor your options and stay within a realistic cap:
                </div>
              </div>
            </div>

            <div className="space-y-4 pl-10">
              {/* 1. Travellers Quick Picks */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#15201D] flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-[#0E6B59]" />
                  <span>Number of travellers:</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setSelectedTravellersCount(num);
                        setIsCustomTravellersOpen(false);
                      }}
                      className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        !isCustomTravellersOpen && selectedTravellersCount === num
                          ? 'border-[#0E6B59] bg-[#E3F1EC] text-[#0E6B59] shadow-xs'
                          : 'border-[#E2E6E1] bg-white text-[#15201D] hover:border-[#0E6B59]/40'
                      }`}
                    >
                      {num} {num === 1 ? 'person' : 'people'}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsCustomTravellersOpen(true)}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      isCustomTravellersOpen
                        ? 'border-[#0E6B59] bg-[#E3F1EC] text-[#0E6B59] shadow-xs'
                        : 'border-[#E2E6E1] bg-white text-[#15201D] hover:border-[#0E6B59]/40'
                    }`}
                  >
                    More / custom
                  </button>
                </div>
                {isCustomTravellersOpen && (
                  <div className="pt-1 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={customTravellersInput}
                      onChange={(e) => setCustomTravellersInput(e.target.value)}
                      placeholder="e.g. 5"
                      className="w-32 bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-bold text-[#15201D] focus:ring-2 focus:ring-[#0E6B59] focus:outline-none min-h-[44px]"
                    />
                    <span className="text-xs text-[#55625E]">travellers</span>
                  </div>
                )}
              </div>

              {/* 2. Budget Quick Picks */}
              <div className="space-y-2 pt-2 border-t border-[#E2E6E1]/70">
                <label className="text-xs font-bold text-[#15201D] flex items-center gap-1.5">
                  <Wallet className="h-4 w-4 text-[#0E6B59]" />
                  <span>Rough total trip budget:</span>
                </label>
                <p className="text-[11px] text-[#55625E]">
                  Typical for {selectedTravellersCount} {selectedTravellersCount === 1 ? 'person' : 'people'}: about ₹{typicalTotalINR.toLocaleString('en-IN')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {budgetQuickPicks.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setSelectedBudgetINR(amt);
                        setIsCustomBudgetOpen(false);
                      }}
                      className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        !isCustomBudgetOpen && selectedBudgetINR === amt
                          ? 'border-[#0E6B59] bg-[#E3F1EC] text-[#0E6B59] shadow-xs'
                          : 'border-[#E2E6E1] bg-white text-[#15201D] hover:border-[#0E6B59]/40'
                      }`}
                    >
                      ₹{amt.toLocaleString('en-IN')}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsCustomBudgetOpen(true)}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      isCustomBudgetOpen
                        ? 'border-[#0E6B59] bg-[#E3F1EC] text-[#0E6B59] shadow-xs'
                        : 'border-[#E2E6E1] bg-white text-[#15201D] hover:border-[#0E6B59]/40'
                    }`}
                  >
                    Type own
                  </button>
                </div>
                {isCustomBudgetOpen && (
                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-xs font-bold text-[#15201D]">₹</span>
                    <input
                      type="text"
                      value={customBudgetInput}
                      onChange={(e) => setCustomBudgetInput(e.target.value)}
                      placeholder="e.g. 75000"
                      className="w-40 bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-bold text-[#15201D] focus:ring-2 focus:ring-[#0E6B59] focus:outline-none min-h-[44px]"
                    />
                  </div>
                )}
              </div>

              {/* Continue Button */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleApplyBasics}
                  className="btn-primary w-full min-h-[44px] py-2.5 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: WHO IS GOING */}
        {currentStep === 'who' && (
          <div className="space-y-4 animate-fade-in-slide">
            {/* AI Chat Bubble */}
            <div className="flex items-start gap-2.5">
              <span className="w-8 h-8 rounded-full bg-[#0E6B59] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                AI
              </span>
              <div className="bg-[#F6F8F6] rounded-2xl rounded-tl-sm p-4 text-xs sm:text-sm text-[#15201D] space-y-1 border border-[#E2E6E1]">
                <div className="font-bold">{conversationalAck}Who is travelling with you?</div>
                <div className="text-[11px] text-[#55625E]">
                  Pick your party type to set room configuration and pacing:
                </div>
              </div>
            </div>

            {/* Persona Chips */}
            <div className="grid grid-cols-2 gap-2.5 pl-10">
              {[
                { id: 'couple', icon: '💑', label: 'Couple', desc: '1 King room, romantic pace' },
                { id: 'family', icon: '👨‍👩‍👧', label: 'Family with kids', desc: 'Family suite, low walking' },
                { id: 'friends', icon: '👥', label: 'Friends group', desc: 'Shared rooms, nightlife' },
                { id: 'solo', icon: '🎒', label: 'Solo', desc: 'Walkable central stay' }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPersona(p.id as any)}
                  className={`min-h-[44px] p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    persona === p.id
                      ? 'border-[#0E6B59] bg-[#E3F1EC] text-[#0E6B59] font-bold shadow-xs'
                      : 'border-[#E2E6E1] bg-white text-[#15201D] hover:border-[#0E6B59]/40 hover:bg-[#F9FAF9]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                  </div>
                  <div className="text-[10px] text-[#55625E] mt-0.5 font-normal">
                    {p.desc}
                  </div>
                </button>
              ))}
            </div>

            {/* When family is selected: Ask "How many adults and kids?" */}
            {persona === 'family' && (
              <div className="p-3.5 rounded-xl bg-[#F4F9F7] border border-[#0E6B59]/30 space-y-3 ml-10">
                <div className="text-xs font-bold text-[#15201D]">
                  How many adults and kids?
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Adults Counter */}
                  <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-[#E2E6E1]">
                    <div>
                      <div className="text-xs font-bold text-[#15201D]">Adults</div>
                      <div className="text-[10px] text-[#55625E]">Age 12+</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const count = Math.max(1, (tripContext.adultsCount || 2) - 1);
                          setTripContext((prev) => ({
                            ...prev,
                            adultsCount: count,
                            totalTravellers: count + (prev.childrenCount || 0),
                            fieldSources: { ...prev.fieldSources, travellers: 'stated' }
                          }));
                        }}
                        className="w-8 h-8 rounded-lg border border-[#CBD5E1] bg-white font-bold text-sm text-[#15201D] hover:bg-slate-50 flex items-center justify-center min-h-[32px] cursor-pointer"
                      >
                        −
                      </button>
                      <span className="w-5 text-center font-bold text-xs text-[#15201D]">
                        {tripContext.adultsCount || 2}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const count = Math.min(8, (tripContext.adultsCount || 2) + 1);
                          setTripContext((prev) => ({
                            ...prev,
                            adultsCount: count,
                            totalTravellers: count + (prev.childrenCount || 0),
                            fieldSources: { ...prev.fieldSources, travellers: 'stated' }
                          }));
                        }}
                        className="w-8 h-8 rounded-lg border border-[#CBD5E1] bg-white font-bold text-sm text-[#15201D] hover:bg-slate-50 flex items-center justify-center min-h-[32px] cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Kids Counter */}
                  <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-[#E2E6E1]">
                    <div>
                      <div className="text-xs font-bold text-[#15201D]">Kids</div>
                      <div className="text-[10px] text-[#55625E]">Age 2–11</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const count = Math.max(0, (tripContext.childrenCount || 0) - 1);
                          setTripContext((prev) => ({
                            ...prev,
                            childrenCount: count,
                            totalTravellers: (prev.adultsCount || 2) + count,
                            fieldSources: { ...prev.fieldSources, travellers: 'stated' }
                          }));
                        }}
                        className="w-8 h-8 rounded-lg border border-[#CBD5E1] bg-white font-bold text-sm text-[#15201D] hover:bg-slate-50 flex items-center justify-center min-h-[32px] cursor-pointer"
                      >
                        −
                      </button>
                      <span className="w-5 text-center font-bold text-xs text-[#15201D]">
                        {tripContext.childrenCount ?? 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const count = Math.min(6, (tripContext.childrenCount || 0) + 1);
                          setTripContext((prev) => ({
                            ...prev,
                            childrenCount: count,
                            totalTravellers: (prev.adultsCount || 2) + count,
                            fieldSources: { ...prev.fieldSources, travellers: 'stated' }
                          }));
                        }}
                        className="w-8 h-8 rounded-lg border border-[#CBD5E1] bg-white font-bold text-sm text-[#15201D] hover:bg-slate-50 flex items-center justify-center min-h-[32px] cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="btn-primary w-full min-h-[44px] text-xs font-bold py-2 mt-2"
                >
                  <span>Confirm Family ({ (tripContext.adultsCount || 2) + (tripContext.childrenCount ?? 1) } travellers)</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: TIME TO SPARE (Scenic vs Fastest) */}
        {currentStep === 'time' && (
          <div className="space-y-4 animate-fade-in-slide">
            {/* AI Chat Bubble */}
            <div className="flex items-start gap-2.5">
              <span className="w-8 h-8 rounded-full bg-[#0E6B59] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                AI
              </span>
              <div className="bg-[#F6F8F6] rounded-2xl rounded-tl-sm p-4 text-xs sm:text-sm text-[#15201D] space-y-1 border border-[#E2E6E1]">
                <div className="font-bold">{conversationalAck}How much time do you have to spare?</div>
                <div className="text-[11px] text-[#55625E]">
                  Choose scenic drive vs fastest travel to set itinerary pacing:
                </div>
              </div>
            </div>

            {/* Time / Pace Chips */}
            <div className="space-y-2.5 pl-10">
              {[
                { id: 'Relaxed', icon: '🌿', title: 'Scenic drive (relaxed pace)', desc: 'Low driving, late mornings, time to relax.' },
                { id: 'Balanced', icon: '⚖️', title: 'Balanced highlights', desc: 'Top sights in morning, free afternoons.' },
                { id: 'Action-Packed', icon: '⚡', title: 'Fastest route (packed)', desc: 'Cover maximum places, early departures.' }
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => handleSelectTime(style.id as any)}
                  className="w-full min-h-[44px] p-3 rounded-xl border border-[#E2E6E1] bg-white hover:border-[#0E6B59] hover:bg-[#E3F1EC] transition text-left flex items-start gap-3 cursor-pointer shadow-2xs"
                >
                  <span className="text-xl">{style.icon}</span>
                  <div>
                    <div className="font-bold text-xs text-[#15201D]">{style.title}</div>
                    <div className="text-[11px] text-[#55625E] mt-0.5">{style.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: NEEDS */}
        {currentStep === 'needs' && (
          <div className="space-y-4 animate-fade-in-slide">
            {/* AI Chat Bubble */}
            <div className="flex items-start gap-2.5">
              <span className="w-8 h-8 rounded-full bg-[#0E6B59] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                AI
              </span>
              <div className="bg-[#F6F8F6] rounded-2xl rounded-tl-sm p-4 text-xs sm:text-sm text-[#15201D] space-y-1 border border-[#E2E6E1]">
                <div className="font-bold">{conversationalAck}Any specific needs for your stay in {cleanDest}?</div>
                <div className="text-[11px] text-[#55625E]">
                  Select all that apply. We filter hotels and areas to match:
                </div>
              </div>
            </div>

            {/* Needs Chips */}
            <div className="grid grid-cols-2 gap-2 pl-10">
              {[
                { id: 'Veg food', icon: '🥗', label: 'Veg food' },
                { id: 'Kitchen', icon: '🍳', label: 'Kitchen in stay' },
                { id: 'Medical care', icon: '🏥', label: 'Medical care nearby' },
                { id: 'Family area', icon: '👶', label: 'Family area' }
              ].map((need) => {
                const isChecked = selectedNeeds.includes(need.id) || selectedNeeds.some(n => n.toLowerCase().includes(need.id.toLowerCase()));
                return (
                  <button
                    key={need.id}
                    type="button"
                    onClick={() => handleToggleNeed(need.id)}
                    className={`min-h-[44px] p-3 rounded-xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                      isChecked
                        ? 'border-[#0E6B59] bg-[#E3F1EC] text-[#0E6B59] font-bold shadow-xs'
                        : 'border-[#E2E6E1] bg-white text-[#15201D] hover:border-[#0E6B59]/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{need.icon}</span>
                      <span className="text-xs">{need.label}</span>
                    </div>
                    <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                      isChecked ? 'bg-[#0E6B59] border-[#0E6B59] text-white' : 'border-[#CBD5E1]'
                    }`}>
                      {isChecked ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pl-10 pt-2 flex items-center justify-between">
              <span className="text-[11px] text-[#55625E]">You can skip or tap Next</span>
              <button
                type="button"
                onClick={handleNextStep}
                className="btn-primary min-h-[44px] px-5 py-2 text-xs font-bold"
              >
                <span>Next: Budget</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: BUDGET PER PERSON */}
        {currentStep === 'budget' && (
          <div className="space-y-4 animate-fade-in-slide">
            {/* AI Chat Bubble */}
            <div className="flex items-start gap-2.5">
              <span className="w-8 h-8 rounded-full bg-[#0E6B59] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                AI
              </span>
              <div className="bg-[#F6F8F6] rounded-2xl rounded-tl-sm p-4 text-xs sm:text-sm text-[#15201D] space-y-1 border border-[#E2E6E1]">
                <div className="font-bold">{conversationalAck}What is your budget per person?</div>
                <div className="text-[11px] text-[#55625E]">
                  All options include stay, transit, food and an extra surprise buffer:
                </div>
              </div>
            </div>

            {/* Budget Per Person Chips */}
            <div className="grid grid-cols-2 gap-2.5 pl-10">
              {[
                { perPerson: 15000, label: '₹15,000 / person', tier: 'Budget tier' },
                { perPerson: 25000, label: '₹25,000 / person', tier: 'Balanced (Most popular)' },
                { perPerson: 40000, label: '₹40,000 / person', tier: 'Comfort tier' },
                { perPerson: 60000, label: '₹60,000 / person', tier: 'Premium boutique' }
              ].map((b) => (
                <button
                  key={b.perPerson}
                  type="button"
                  onClick={() => handleSelectBudgetPerPerson(b.perPerson)}
                  className="min-h-[44px] p-3 rounded-xl border border-[#E2E6E1] bg-white hover:border-[#0E6B59] hover:bg-[#E3F1EC] transition text-left cursor-pointer shadow-2xs"
                >
                  <div className="font-bold text-xs text-[#15201D]">{b.label}</div>
                  <div className="text-[10px] text-[#55625E] mt-0.5">{b.tier}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* READY STATE: Build Plan CTA */}
        {isFinalStepOrReady && (
          <div className="p-4 rounded-xl bg-[#F4F9F7] border border-[#0E6B59]/30 text-center space-y-3">
            <div className="space-y-1">
              <div className="text-sm font-bold text-[#15201D]">
                Ready to build your {cleanDest} trip plan!
              </div>
              <div className="text-xs text-[#55625E]">
                We'll compute 3 options with route checks and surprise buffers.
              </div>
            </div>
            <button
              type="button"
              onClick={handleBuildPlan}
              className="btn-primary w-full min-h-[44px] py-3 px-5 text-sm font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Build Tailored {cleanDest} Plan</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
