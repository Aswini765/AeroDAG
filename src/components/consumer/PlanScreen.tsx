import React, { useState } from 'react';
import {
  TripPlan,
  TripPreferences,
  FlightItem,
  HotelItem,
  TransferItem,
  ActivityDayItem,
  PlanUpgradeOption,
  BalancingOption,
  ConcreteBudgetFix
} from '../../types/travelBooking';
import { getTripSummary } from '../../services/tripSummaryHelper';
import { TripPlanningEngine } from '../../services/tripPlanningEngine';
import { PlanHeader } from './plan/PlanHeader';
import { KeepTripsCard } from './KeepTripsCard';
import { BookedItems } from './plan/BookedItems';
import { FeasibilityNote } from './plan/FeasibilityNote';
import { DayByDay } from './plan/DayByDay';
import { RefineBar } from './plan/RefineBar';
import { ForYourTripCard } from './plan/ForYourTripCard';
import { PlacePhoto } from './plan/PlacePhoto';
import { alignItineraryToPlan } from '../../services/itineraryText';
import { BudgetCard } from './plan/BudgetCard';
import { StaySelector } from './plan/StaySelector';
import { MoreOptionsModal } from './plan/MoreOptionsModal';
import { StepCard, TravelStep, StayStep, AddPlaceToDay, TotalStep } from './plan/StepPlanner';
import { gettingThereOptions } from '../../services/gettingThere';
import { SeasonalAndPersonaCard } from './plan/SeasonalAndPersonaCard';
import { BudgetBufferAndQuirksCard } from './plan/BudgetBufferAndQuirksCard';
import { TrustAndVerificationCard } from './plan/TrustAndVerificationCard';
import { AlertTriangle, ArrowRight, Sparkles, MapPin, ChevronDown, ChevronUp, Plane, ShieldCheck, Calendar, Info, Clock } from 'lucide-react';
import { computeFullTripCost } from '../../services/fullTripCostHelper';
import { generatePlanOptions } from '../../services/planOptionsGenerator';
import { NearbyAmenitiesCard } from './plan/NearbyAmenitiesCard';
import { StayAreaMapCard } from './plan/StayAreaMapCard';
import { UnifiedPlanMap } from './plan/UnifiedPlanMap';
import { TripContext } from '../../services/requirementEngine';
import { trackPlanShown } from '../../services/telemetry/posthog';

interface PlanScreenProps {
  plan: TripPlan;
  preferences: TripPreferences;
  tripContext?: TripContext;
  onPlanChange: (updatedPlan: TripPlan) => void;
  onProceedToReview: () => void;
  onDescribeAgain: () => void;
  onUpdateItineraryDay?: (dayNumber: number, modificationType: 'relaxed' | 'food' | 'budget') => void;
  onSaveDraft?: () => Promise<boolean>;
  isGuest?: boolean;
  onContinueWithEmail?: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  /** Plan a different place with the same group, days and budget */
  onStartNewPlan?: (prompt: string) => void;
}

export const PlanScreen: React.FC<PlanScreenProps> = ({
  plan,
  preferences,
  tripContext,
  onPlanChange,
  onProceedToReview,
  onDescribeAgain,
  onUpdateItineraryDay,
  onSaveDraft,
  isGuest = false,
  onContinueWithEmail,
  onStartNewPlan
}) => {
  const [emailCardDismissed, setEmailCardDismissed] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isRefining, setIsRefining] = useState(false);
  const [moreOptionsView, setMoreOptionsView] = useState<'flights' | 'hotels' | 'dining' | 'map' | null>(null);
  const [activePin, setActivePin] = useState<number>(1);
  // The map follows the day open in "Your days"
  const [mapDay, setMapDay] = useState<number | undefined>(undefined);
  // Step-by-step plan: travel → stay → days → total. Nothing is picked for the traveller.
  const travelChosen = Boolean(plan.userChoices?.travelKey);
  const stayChosen = travelChosen && Boolean(plan.userChoices?.hotelId);
  const daysIncludeTravel = Boolean(plan.daysIncludeTravel ?? (tripContext as any)?.daysIncludeTravel);
  const [openStep, setOpenStep] = useState<number | null>(() => (!plan.userChoices?.travelKey ? 1 : !plan.userChoices?.hotelId ? 2 : 3));
  // One-line summaries of what was chosen, always read from the plan itself
  const travelSummary = !travelChosen ? null : plan.flight
    ? `✈️ Flight · ${plan.flight.flightNumber || plan.flight.airline}`
    : plan.selectedTrain
    ? (plan.selectedTrain.mode === 'bus' ? `🚌 ${plan.selectedTrain.trainName}` : `🚆 ${plan.selectedTrain.trainName}${plan.selectedTrain.trainNumber ? ` (${plan.selectedTrain.trainNumber})` : ''} · ${plan.selectedTrain.selectedClass}`)
    : `🚗 ${plan.transfer?.vehicleType || 'By road'}`;
  const staySummary = stayChosen ? `🛏 ${(plan.hotel?.name || '').replace(/,\s*~₹.*$/, '')} · ₹${(plan.hotel?.pricePerNightINR || 0).toLocaleString('en-IN')}/night` : null;

  // Prompt 7: Collapse rest into 4 tap-to-open sections (collapsed by default)
  const [collapsedSections, setCollapsedSections] = useState<{
    travelStay: boolean;
    nearStay: boolean;
    beforeBooking: boolean;
    bestTime: boolean;
  }>({
    travelStay: false,
    nearStay: false,
    beforeBooking: false,
    bestTime: false
  });

  const toggleSection = (key: keyof typeof collapsedSections) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveLockRef = React.useRef(false);
  const handleSaveTrip = async () => {
    if (!onSaveDraft || saveLockRef.current || saveState === 'saving' || saveState === 'saved') return;
    saveLockRef.current = true;
    setSaveState('saving');
    const ok = await onSaveDraft().catch(() => false);
    setSaveState(ok ? 'saved' : 'error');
    saveLockRef.current = false;
  };

  const summary = getTripSummary({
    tripPlan: plan,
    preferences,
    flight: plan.flight,
    hotel: plan.hotel,
    transfer: plan.transfer,
    visa: plan.visa,
    itinerary: plan.itinerary
  });

  if (!summary) return null;

  const nightsCount = Math.max(1, plan.durationDays - 1);
  const cost = computeFullTripCost(plan, preferences);
  const targetBudget = cost.targetBudgetINR;
  const isOverBudget = cost.budgetStatus === 'over';
  const overAmountINR = cost.budgetDifferenceINR;
  const percentOver = isOverBudget && targetBudget > 0 ? (overAmountINR / targetBudget) * 100 : 0;

  React.useEffect(() => {
    trackPlanShown({
      destination: plan.destination,
      isRegion: plan.destinationType === 'region',
      totalCost: cost.totalWithBufferINR,
      optionCount: 3
    });
  }, [plan.destination, cost.totalWithBufferINR]);

  // Blocking only when MORE than 10% over budget
  const isBlockingInfeasible = isOverBudget && percentOver > 10;
  const isSlightlyOverBudget = isOverBudget && percentOver <= 10;

  const handleSelectUpgrade = (upgrade: PlanUpgradeOption) => {
    const upgraded = TripPlanningEngine.applyUpgrade(plan, upgrade);
    onPlanChange(upgraded);
  };

  const handleRevertToStandard = async () => {
    try {
      const basePlan = await TripPlanningEngine.buildDeterministicPlan({
        ...preferences,
        dates: plan.dates || (preferences as any).targetDates || '14–20 Nov 2026',
        durationDays: plan.durationDays || 7,
        budgetTotalINR: targetBudget || 60000
      } as any);
      onPlanChange(basePlan);
    } catch (err) {
      console.error('Failed to revert to standard stay:', err);
    }
  };

  const handleApplyBalancingOption = async (option: BalancingOption) => {
    if (option.title.toLowerCase().includes('days') || option.title.toLowerCase().includes('reduce')) {
      const updatedContext = {
        ...preferences,
        durationDays: 5,
        budgetTotalINR: targetBudget
      };
      const newPlan = await TripPlanningEngine.buildDeterministicPlan(updatedContext as any);
      onPlanChange(newPlan);
    } else if (option.title.toLowerCase().includes('train') || option.title.toLowerCase().includes('rail')) {
      const updatedPlan = {
        ...plan,
        budget: {
          ...plan.budget,
          flightsCostINR: plan.budget.flightsCostINR - option.rupeeImpactINR,
          grandTotalINR: plan.budget.grandTotalINR - option.rupeeImpactINR,
          isOverBudget: plan.budget.grandTotalINR - option.rupeeImpactINR > targetBudget,
          overBudgetAmountINR: Math.max(0, plan.budget.grandTotalINR - option.rupeeImpactINR - targetBudget)
        }
      };
      onPlanChange(updatedPlan);
    }
  };

  const handleApplyConcreteFix = async (fix: ConcreteBudgetFix) => {
    if (fix.actionType === 'fewer_nights') {
      const updatedContext = {
        ...preferences,
        durationDays: Math.max(3, preferences.durationDays - 2),
        budgetTotalINR: targetBudget
      };
      const newPlan = await TripPlanningEngine.buildDeterministicPlan(updatedContext as any);
      onPlanChange(newPlan);
    } else if (fix.actionType === 'mode_switch') {
      const updatedContext = {
        ...preferences,
        transportMode: 'Train',
        budgetTotalINR: targetBudget
      };
      const newPlan = await TripPlanningEngine.buildDeterministicPlan(updatedContext as any);
      onPlanChange(newPlan);
    } else if (fix.actionType === 'budget_hotel') {
      const updatedContext = {
        ...preferences,
        budgetTier: 'Frugal',
        budgetTotalINR: targetBudget
      };
      const newPlan = await TripPlanningEngine.buildDeterministicPlan(updatedContext as any);
      onPlanChange(newPlan);
    }
  };

  // "Change the plan": change THIS plan (never rebuild a different destination) and always say what happened
  const [refineMsg, setRefineMsg] = useState<string | null>(null);
  const showRefineMsg = (msg: string) => {
    setRefineMsg(msg);
    window.setTimeout(() => setRefineMsg((m) => (m === msg ? null : m)), 6000);
  };
  const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  const handleRefinePlan = async (userChangeRequest: string) => {
    setIsRefining(true);
    const lower = userChangeRequest.toLowerCase();
    const before = computeFullTripCost(plan, preferences).totalWithBufferINR;
    const commit = (next: TripPlan, what: string) => {
      const after = computeFullTripCost(next, preferences).totalWithBufferINR;
      onPlanChange(next);
      showRefineMsg(after !== before ? `${what}: ${inr(before)} → ${inr(after)}` : what);
    };

    try {
      if (lower.includes('train') || lower.includes('rail') || lower.includes('bus')) {
        const ground = [...(plan.availableTrains || [])].sort((x, y) => x.totalPriceINR - y.totalPriceINR)[0];
        if (plan.selectedTrain && !plan.flight) {
          showRefineMsg(`You're already going by ${plan.selectedTrain.mode === 'bus' ? 'bus' : 'train'}.`);
        } else if (ground) {
          commit(TripPlanningEngine.swapComponent(plan, { flight: null, train: ground }), `Switched to ${ground.mode === 'bus' ? ground.trainName.toLowerCase() : 'the train'}`);
        } else {
          showRefineMsg('No sensible train or bus for this route — it is a short drive or needs a flight.');
        }
      } else if (lower.includes('flight') || lower.includes('fly')) {
        const fl = (plan.availableFlights || [])[0];
        if (plan.flight) showRefineMsg('You are already flying.');
        else if (fl) commit(TripPlanningEngine.swapComponent(plan, { flight: fl, train: null }), 'Switched to flights');
        else showRefineMsg('Flying doesn\'t make sense for this trip — it is a short road journey.');
      } else if (/\b(road|drive|driving|cab|car)\b/.test(lower) && !lower.includes('less driving')) {
        const road = gettingThereOptions(plan, preferences).find((o) => o.key === 'road');
        if (!road) showRefineMsg('Driving doesn\'t make sense for this trip — it is too far by road.');
        else if (road.isCurrent) showRefineMsg('You\'re already going by road.');
        else commit(road.plan, `Switched to road (${road.detail})`);
      } else if (lower.includes('cheaper') || lower.includes('budget') || lower.includes('save money')) {
        const opts = generatePlanOptions(plan, preferences);
        const cheapest = opts.reduce((m, o) => (o.totalCostINR < m.totalCostINR ? o : m), opts[0]);
        if (cheapest && cheapest.totalCostINR < before - 500) {
          commit(cheapest.plan, `Cheapest way: ${cheapest.stayName.replace(/,.*$/, '')} + ${cheapest.travelMode.toLowerCase()}`);
        } else {
          showRefineMsg('This is already the cheapest sensible way. Fewer days is the next lever.');
        }
      } else if (lower.includes('less driving') || lower.includes('relaxed')) {
        const lighter: TripPlan = {
          ...plan,
          itinerary: plan.itinerary.map((d, i, all) =>
            i === 0 || i === all.length - 1
              ? d
              : { ...d, afternoon: `Rest at your stay or a café nearby — no long drives today.`, walkingLevel: 'light' as any }
          )
        };
        commit(lighter, 'Days made lighter: one main stop a day, no long afternoon drives');
      } else if (lower.includes('veg') || lower.includes('vegetarian')) {
        const needs = Array.from(new Set([...(plan.groupNeeds || []), 'Pure veg']));
        commit({ ...plan, groupNeeds: needs }, 'Marked pure veg — veg places are listed for your group');
      } else {
        showRefineMsg('Tip: try "cheaper", "take the train", "less driving" or "pure veg".');
      }
    } finally {
      setTimeout(() => setIsRefining(false), 300);
    }
  };

  const currentStayArea = plan.hotel.area || plan.hotelZone || plan.destination;

  const effectiveContext: TripContext = tripContext || {
    destination: plan.destination,
    origin: plan.origin,
    dates: plan.dates,
    durationDays: plan.durationDays,
    totalTravellers: plan.travellers.total,
    adultsCount: plan.travellers.adults,
    childrenCount: plan.travellers.children,
    childrenAges: plan.travellers.childAges,
    seniorsCount: plan.travellers.seniors,
    infantsCount: 0,
    budgetTotalINR: targetBudget,
    partyType: plan.travellers.total === 1 ? 'solo' : plan.travellers.children > 0 ? 'family' : 'couple',
    currency: 'INR',
    budgetTier: 'Comfortable',
    accommodationPreference: preferences.accommodationPreference,
    activities: [],
    transportMode: preferences.transportMode || null,
    walkingIntensity: 'Moderate',
    dietaryPreference: null,
    luggage: 'Standard',
    accessibilityRequired: false,
    travelStyle: preferences.travelStyle || 'Balanced',
    priority: preferences.priority || null,
    scope: plan.scope,
    notes: preferences.dietaryOrNotes ? [preferences.dietaryOrNotes] : [],
    freeTextPreferences: preferences.dietaryOrNotes || null,
    parseMode: plan.isAiEstimatedDestination ? 'ai' : 'basic',
    fieldSources: {
      destination: 'stated',
      dates: 'stated',
      travellers: 'stated',
      budget: 'stated',
      origin: 'stated'
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 pb-24 sm:py-6 animate-fade-in-slide space-y-4">
      {/* 1. Header (Eyebrow, title, meta line, action buttons) */}
      <PlanHeader
        plan={plan}
        preferences={preferences}
        onSaveTrip={handleSaveTrip}
        onProceedToReview={onProceedToReview}
        saveState={saveState}
        onBack={onDescribeAgain}
        bookingReady={stayChosen}
      />

      {/* A real photo of the place (Wikipedia), so the plan feels like a trip, not a spreadsheet */}
      <PlacePhoto
        place={(plan.stays && plan.stays.length > 1 ? plan.stays[0].baseName : plan.destination).replace(/,.*$/, '')}
        className="h-32 sm:h-40 w-full rounded-2xl"
        showCredit
      />

      {saveState === 'saved' && isGuest && onContinueWithEmail && !emailCardDismissed && (
        <div className="mb-4">
          <KeepTripsCard
            id="save-trip-email-card"
            title="Saved — find it anytime under Saved plans"
            description="Want it on your phone or another laptop too? Add your email — no password, we just send you a link."
            onSubmitEmail={onContinueWithEmail}
            onDismiss={() => setEmailCardDismissed(true)}
          />
        </div>
      )}

      {/* 2. Over budget never blocks the plan: the options list shows the cheapest way,
             exact one-tap fixes, or places that fit (see PlanOptionsSelector) */}
      {(
        <>
          {/* TWO PANES ON DESKTOP (Left = Chat & Plan Cards; Right = Sticky Map) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT PANE (Chat & Plan Cards - 7 columns) */}
            <div className="lg:col-span-7 space-y-5">
              {/* THE PLAN, STEP BY STEP: nothing is picked for you. Each step opens after the one before. */}
              <StepCard
                n={1}
                id="step-travel"
                title="How do you want to get there?"
                summary={travelSummary}
                open={openStep === 1}
                onToggle={() => setOpenStep(openStep === 1 ? null : 1)}
              >
                <TravelStep
                  plan={plan}
                  daysIncludeTravel={daysIncludeTravel}
                  onDaysIncludeTravel={(v) => onPlanChange({ ...plan, daysIncludeTravel: v })}
                  budgetINR={targetBudget}
                  onChoose={(next, summary) => {
                    onPlanChange(next);
                    setOpenStep(2);
                    showRefineMsg(`Travel: ${summary}`);
                  }}
                />
              </StepCard>

              <StepCard
                n={2}
                id="step-stay"
                title="Where do you want to stay?"
                summary={staySummary}
                open={openStep === 2}
                locked={!travelChosen}
                lockedText="Choose how you'll travel first"
                onToggle={() => setOpenStep(openStep === 2 ? null : 2)}
              >
                <StayStep
                  plan={plan}
                  preferences={preferences}
                  onChoose={(next, summary) => {
                    onPlanChange(next);
                    setOpenStep(3);
                    showRefineMsg(`Stay: ${summary}`);
                  }}
                />
              </StepCard>

              <StepCard
                n={3}
                id="step-days"
                title="Your days"
                summary={stayChosen && openStep !== 3 ? `${plan.durationDays} days planned${plan.userChoices?.addedStops?.length ? ` · ${plan.userChoices.addedStops.length} place${plan.userChoices.addedStops.length > 1 ? 's' : ''} you added` : ''}` : null}
                open={openStep === 3}
                locked={!stayChosen}
                lockedText="Choose where you'll stay first"
                onToggle={() => setOpenStep(openStep === 3 ? null : 3)}
              >
                {/* Permits and notes for this group (kids, seniors, pure veg, solo, big group) */}
                <ForYourTripCard plan={plan} preferences={preferences} />
                <AddPlaceToDay plan={plan} onAdd={(next, msg) => { onPlanChange(next); showRefineMsg(msg); }} />
                <DayByDay
                  itinerary={alignItineraryToPlan(plan)}
                  destination={plan.destination}
                  stayArea={currentStayArea}
                  onAdjustDay={onUpdateItineraryDay}
                  onCardFocus={(pinNum) => setActivePin(pinNum)}
                  onDayChange={setMapDay}
                />
              </StepCard>

              <StepCard
                n={4}
                id="step-total"
                title="Your total & where to book"
                summary={null}
                open={openStep === 4 || (stayChosen && openStep === 3)}
                locked={!stayChosen}
                lockedText="Your exact total appears once travel and stay are chosen"
                onToggle={() => setOpenStep(openStep === 4 ? 3 : 4)}
              >
                <TotalStep
                  plan={plan}
                  preferences={preferences}
                  budgetINR={targetBudget}
                  onApply={(next, msg) => { onPlanChange(next); showRefineMsg(msg); }}
                  onTryPlace={onStartNewPlan ? (place) => {
                    const t = plan.travellers;
                    const who = t.children > 0 ? `${t.adults} adults and ${t.children} kids` : `${t.total} ${t.total === 1 ? 'person' : 'people'}`;
                    onStartNewPlan(`${plan.durationDays} days in ${place} for ${who} from ${plan.origin.replace(/\s*\([^)]*\)/, '')}, budget ${targetBudget}`);
                  } : undefined}
                />
              </StepCard>

              {/* MOBILE: Collapsible Map (collapsed by default at 375px per Prompt 6) */}
              <div className="block lg:hidden">
                <details className="card-consumer p-0 overflow-hidden border border-[#E2E6E1] bg-white rounded-2xl shadow-xs group">
                  <summary className="p-3.5 flex items-center justify-between text-xs font-bold text-[#15201D] cursor-pointer hover:bg-[#F9FAF9] select-none">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#0E6B59]" />
                      <span className="flex flex-col">
                        <span className="text-sm">Map of your days</span>
                        <span className="text-xs font-normal text-[#55625E]">Your stay and each day's places, with photos</span>
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-[#0E6B59]"><span className="group-open:hidden">Show</span><span className="hidden group-open:inline">Hide</span></span>
                  </summary>
                  <div className="p-2 border-t border-[#E2E6E1]">
                    <UnifiedPlanMap
                      destination={plan.destination}
                      stayArea={currentStayArea}
                      itinerary={alignItineraryToPlan(plan)}
                      className="h-[36vh] min-h-[210px] max-h-[280px]"
                      dayIndex={mapDay}
                      onDayChange={setMapDay}
                    />
                  </div>
                </details>
              </div>


              {stayChosen && (<>
              {/* ======================================================== */}
              {/* 4 TAP-TO-OPEN SECTIONS (Prompt 7 requirement)            */}
              {/* ======================================================== */}

              {/* Section 2: What's near your stay */}
              <div className="card-consumer p-0 overflow-hidden border border-[#E2E6E1] bg-white rounded-2xl shadow-2xs">
                <button
                  type="button"
                  id="section-toggle-near-stay"
                  aria-expanded={collapsedSections.nearStay}
                  aria-controls="section-content-near-stay"
                  onClick={() => toggleSection('nearStay')}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F9FAF9] transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 text-[#0E6B59]" />
                    <div>
                      <h3 className="text-sm font-bold text-[#15201D]">What's near your stay</h3>
                      <p className="text-xs text-[#55625E]">Food, pharmacy, hospital</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-[#0E6B59]">
                      {collapsedSections.nearStay ? 'Hide' : 'Show'}
                    </span>
                    {collapsedSections.nearStay ? (
                      <ChevronUp className="h-4 w-4 text-[#55625E]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#55625E]" />
                    )}
                  </div>
                </button>
                {collapsedSections.nearStay && (
                  <div id="section-content-near-stay" className="p-4 pt-2 border-t border-[#E2E6E1] space-y-4 animate-fade-in">
                    {plan.stayAreaReason && (
                      <p id="plan-stay-area-reason-pill" className="text-xs text-[#55625E]">
                        <strong className="text-[#15201D]">Why {currentStayArea}:</strong> {plan.stayAreaReason}
                      </p>
                    )}
                    <StayAreaMapCard
                      destination={plan.destination}
                      tripNeeds={preferences.tripNeeds}
                      currentStayArea={currentStayArea}
                      onSelectArea={(areaName) => handleRefinePlan(`stay in ${areaName}`)}
                      onPinHover={(pinId) => setActivePin(pinId)}
                    />
                    <NearbyAmenitiesCard
                      destination={plan.destination}
                      stayArea={currentStayArea}
                      tripNeeds={preferences.tripNeeds}
                    />
                  </div>
                )}
              </div>

              {/* Section 1: Travel & stay details */}
              <div className="card-consumer p-0 overflow-hidden border border-[#E2E6E1] bg-white rounded-2xl shadow-2xs">
                <button
                  type="button"
                  id="section-toggle-travel-stay"
                  aria-expanded={collapsedSections.travelStay}
                  aria-controls="section-content-travel-stay"
                  onClick={() => toggleSection('travelStay')}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F9FAF9] transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Plane className="h-4 w-4 text-[#0E6B59]" />
                    <div>
                      <h3 className="text-sm font-bold text-[#15201D]">Travel and stay details</h3>
                      <p className="text-xs text-[#55625E]">Flight, cab, hotels — and links to book them</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-[#0E6B59]">
                      {collapsedSections.travelStay ? 'Hide' : 'Show'}
                    </span>
                    {collapsedSections.travelStay ? (
                      <ChevronUp className="h-4 w-4 text-[#55625E]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#55625E]" />
                    )}
                  </div>
                </button>
                {collapsedSections.travelStay && (
                  <div id="section-content-travel-stay" className="p-4 pt-2 border-t border-[#E2E6E1] space-y-4 animate-fade-in">
                    <BookedItems
                      flight={plan.flight}
                      hotel={plan.hotel}
                      transfer={plan.transfer}
                      nightsCount={nightsCount}
                      isAiEstimated={plan.isAiEstimatedDestination}
                      stays={plan.stays}
                      interCityTravel={plan.interCityTravel}
                      onOpenFlightsModal={() => setMoreOptionsView('flights')}
                      onOpenStaysModal={() => setMoreOptionsView('hotels')}
                      dates={plan.dates}
                      party={{ adults: plan.travellers.adults, children: plan.travellers.children, childAges: plan.travellers.childAges }}
                    />
                    <FeasibilityNote
                      airportSelectionReason={plan.airportSelectionReason}
                      verificationChecks={plan.verificationChecks || []}
                    />
                  </div>
                )}
              </div>

              {/* Section 3: Before you book */}
              <div className="card-consumer p-0 overflow-hidden border border-[#E2E6E1] bg-white rounded-2xl shadow-2xs">
                <button
                  type="button"
                  id="section-toggle-before-booking"
                  aria-expanded={collapsedSections.beforeBooking}
                  aria-controls="section-content-before-booking"
                  onClick={() => toggleSection('beforeBooking')}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F9FAF9] transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-[#0E6B59]" />
                    <div>
                      <h3 className="text-sm font-bold text-[#15201D]">Before you book, check</h3>
                      <p className="text-xs text-[#55625E]">Real reviews, cancellation, local tips</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-[#0E6B59]">
                      {collapsedSections.beforeBooking ? 'Hide' : 'Show'}
                    </span>
                    {collapsedSections.beforeBooking ? (
                      <ChevronUp className="h-4 w-4 text-[#55625E]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#55625E]" />
                    )}
                  </div>
                </button>
                {collapsedSections.beforeBooking && (
                  <div id="section-content-before-booking" className="p-4 pt-2 border-t border-[#E2E6E1] space-y-4 animate-fade-in">
                    <TrustAndVerificationCard
                      trust={plan.trustVerification}
                      hotel={plan.hotel}
                      transfer={plan.transfer}
                    />
                    <BudgetBufferAndQuirksCard
                      buffer={plan.budgetBuffer}
                      targetBudgetINR={targetBudget}
                    />
                  </div>
                )}
              </div>

              {/* Section 4: Best time to go & transit */}
              <div className="card-consumer p-0 overflow-hidden border border-[#E2E6E1] bg-white rounded-2xl shadow-2xs">
                <button
                  type="button"
                  id="section-toggle-best-time"
                  aria-expanded={collapsedSections.bestTime}
                  aria-controls="section-content-best-time"
                  onClick={() => toggleSection('bestTime')}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F9FAF9] transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar className="h-4 w-4 text-[#0E6B59]" />
                    <div>
                      <h3 className="text-sm font-bold text-[#15201D]">{plan.monthWorthiness ? `Is ${plan.monthWorthiness.month} a good time?` : 'Best time to go'}</h3>
                      <p className="text-xs text-[#55625E]">{plan.monthWorthiness ? `${plan.monthWorthiness.verdict} · ${plan.monthWorthiness.reason}` : 'Weather and crowds'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-[#0E6B59]">
                      {collapsedSections.bestTime ? 'Hide' : 'Show'}
                    </span>
                    {collapsedSections.bestTime ? (
                      <ChevronUp className="h-4 w-4 text-[#55625E]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#55625E]" />
                    )}
                  </div>
                </button>
                {collapsedSections.bestTime && (
                  <div id="section-content-best-time" className="p-4 pt-2 border-t border-[#E2E6E1] space-y-4 animate-fade-in">
                    {plan.seasonalRecommendation && (
                      <SeasonalAndPersonaCard
                        recommendation={plan.seasonalRecommendation}
                        destination={plan.destination}
                      />
                    )}

                  </div>
                )}
              </div>

              {/* Change something (no longer pinned, so the Share / Save / Book bar stays visible) */}
              <RefineBar
                onRefinePlan={handleRefinePlan}
                isUpdating={isRefining}
              />
              </>)}
              {refineMsg && (
                <div
                  id="refine-status"
                  role="status"
                  className="fixed left-3 right-3 bottom-[132px] sm:static sm:left-auto sm:right-auto z-40 rounded-xl bg-[#15201D] text-white text-sm px-4 py-3 shadow-lg sm:shadow-none"
                >
                  {refineMsg}
                </div>
              )}
            </div>

            {/* RIGHT PANE: DESKTOP STICKY MAP & SUMMARY (5 columns) */}
            <div className="hidden lg:block lg:col-span-5 space-y-4 sticky top-20">
              {/* Sticky Map Component */}
              <div className="card-consumer p-4 border border-[#E2E6E1] bg-white rounded-2xl">
                <UnifiedPlanMap
                  destination={plan.destination}
                  stayArea={currentStayArea}
                  itinerary={alignItineraryToPlan(plan)}
                  className="h-[34vh] min-h-[240px]"
                  dayIndex={mapDay}
                  onDayChange={setMapDay}
                />
              </div>

            </div>
          </div>
        </>
      )}

      {/* Secondary Options Modal */}
      <MoreOptionsModal
        isOpen={moreOptionsView !== null}
        onClose={() => setMoreOptionsView(null)}
        activeView={moreOptionsView || 'flights'}
        availableFlights={plan.availableFlights}
        availableHotels={plan.availableHotels}
        availableTrains={plan.availableTrains}
        diningSuggestions={plan.diningSuggestions}
        selectedFlightId={plan.flight?.id || ''}
        selectedHotelId={plan.hotel.id}
        onSelectFlight={(fl) => onPlanChange(TripPlanningEngine.swapComponent(plan, { flight: fl }))}
        onSelectHotel={(ht) => onPlanChange(TripPlanningEngine.swapComponent(plan, { hotel: ht }))}
      />
    </div>
  );
};
