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
import { BudgetCard } from './plan/BudgetCard';
import { StaySelector } from './plan/StaySelector';
import { InfeasiblePlanCard } from './plan/InfeasiblePlanCard';
import { MoreOptionsModal } from './plan/MoreOptionsModal';
import { RouteTradeOffComparison } from './plan/RouteTradeOffComparison';
import { SeasonalAndPersonaCard } from './plan/SeasonalAndPersonaCard';
import { BudgetBufferAndQuirksCard } from './plan/BudgetBufferAndQuirksCard';
import { TrustAndVerificationCard } from './plan/TrustAndVerificationCard';
import { FullTripCostCard } from './plan/FullTripCostCard';
import { AlertTriangle, ArrowRight, Sparkles, MapPin, ChevronDown, ChevronUp, Plane, ShieldCheck, Calendar, Info, Clock } from 'lucide-react';
import { computeFullTripCost } from '../../services/fullTripCostHelper';
import { generatePlanOptions } from '../../services/planOptionsGenerator';
import { PlanOptionsSelector } from './plan/PlanOptionsSelector';
import { NearbyAmenitiesCard } from './plan/NearbyAmenitiesCard';
import { StayAreaMapCard } from './plan/StayAreaMapCard';
import { UnifiedPlanMap } from './plan/UnifiedPlanMap';
import { WhatWeUnderstoodPanel } from './WhatWeUnderstoodPanel';
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
  onContinueWithEmail
}) => {
  const [emailCardDismissed, setEmailCardDismissed] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isRefining, setIsRefining] = useState(false);
  const [moreOptionsView, setMoreOptionsView] = useState<'flights' | 'hotels' | 'dining' | 'map' | null>(null);
  const [activePin, setActivePin] = useState<number>(1);

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

  const handleRefinePlan = async (userChangeRequest: string) => {
    setIsRefining(true);
    const lower = userChangeRequest.toLowerCase();

    if (lower.includes('train') || lower.includes('rail')) {
      const updatedContext = {
        ...preferences,
        transportMode: 'Train',
        budgetTotalINR: targetBudget
      };
      const newPlan = await TripPlanningEngine.buildDeterministicPlan(updatedContext as any);
      onPlanChange(newPlan);
    } else if (lower.includes('flight') || lower.includes('fly')) {
      const updatedContext = {
        ...preferences,
        transportMode: 'Flight',
        budgetTotalINR: targetBudget
      };
      const newPlan = await TripPlanningEngine.buildDeterministicPlan(updatedContext as any);
      onPlanChange(newPlan);
    } else if (lower.includes('cheaper') || lower.includes('budget') || lower.includes('save money')) {
      const updatedContext = {
        ...preferences,
        budgetTier: 'Frugal',
        budgetTotalINR: targetBudget
      };
      const newPlan = await TripPlanningEngine.buildDeterministicPlan(updatedContext as any);
      onPlanChange(newPlan);
    } else if (lower.includes('less driving') || lower.includes('relaxed')) {
      const updatedContext = {
        ...preferences,
        travelStyle: 'Relaxed',
        walkingIntensity: 'Low',
        budgetTotalINR: targetBudget
      };
      const newPlan = await TripPlanningEngine.buildDeterministicPlan(updatedContext as any);
      onPlanChange(newPlan);
    } else if (lower.includes('veg') || lower.includes('vegetarian')) {
      const updatedContext = {
        ...preferences,
        dietaryPreference: 'Vegetarian',
        tripNeeds: [...(preferences.tripNeeds || []), 'Vegetarian food nearby'],
        budgetTotalINR: targetBudget
      };
      const newPlan = await TripPlanningEngine.buildDeterministicPlan(updatedContext as any);
      onPlanChange(newPlan);
    }

    setTimeout(() => {
      setIsRefining(false);
    }, 500);
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
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 animate-fade-in-slide space-y-4">
      {/* "What we understood" panel collapsed above the plan (Prompt 2 requirement) */}
      <WhatWeUnderstoodPanel
        context={effectiveContext}
        onEdit={onDescribeAgain}
        initiallyCollapsed={true}
      />

      {/* 1. Header (Eyebrow, title, meta line, action buttons) */}
      <PlanHeader
        plan={plan}
        preferences={preferences}
        onSaveTrip={handleSaveTrip}
        onProceedToReview={onProceedToReview}
        saveState={saveState}
      />

      {/* Prompt 9: "Worth it in {month}?" banner */}
      {plan.monthWorthiness && (
        <div
          id="plan-month-worthiness-banner"
          className="p-3.5 sm:px-4 rounded-2xl border border-[#E2E6E1] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-2xs"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[#15201D]">
              Worth it in {plan.monthWorthiness.month}?
            </span>
            <span
              className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                plan.monthWorthiness.verdict === 'Yes'
                  ? 'bg-[#E3F1EC] text-[#0E6B59]'
                  : plan.monthWorthiness.verdict === 'Mixed'
                  ? 'bg-[#FCEFD9] text-[#8A4307]'
                  : 'bg-[#FEE2E2] text-[#991B1B]'
              }`}
            >
              {plan.monthWorthiness.verdict}
            </span>
            <span className="text-[#55625E]">{plan.monthWorthiness.reason}</span>
          </div>
          <span className="text-[10px] text-[#55625E]/70 shrink-0">
            Source: {plan.monthWorthiness.sourceLabel}
          </span>
        </div>
      )}

      {/* Prompt 9: "Leaning offbeat" badge */}
      {plan.isOffbeatLeaning && (
        <div
          id="plan-offbeat-leaning-badge"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#E3F1EC] border border-[#0E6B59]/30 text-xs font-semibold text-[#0E6B59]"
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span>Leaning offbeat · Avoids peak crowds & crowded tourist corridors</span>
        </div>
      )}

      {/* Prompt 9: Stay area choice reason */}
      {plan.stayAreaReason && (
        <div
          id="plan-stay-area-reason-pill"
          className="p-2.5 rounded-xl bg-[#F6F8F6] border border-[#E2E6E1] text-xs text-[#55625E] flex items-center gap-2"
        >
          <MapPin className="h-3.5 w-3.5 text-[#0E6B59] shrink-0" />
          <span>
            <strong className="text-[#15201D]">Staying in {currentStayArea}:</strong> {plan.stayAreaReason}
          </span>
        </div>
      )}

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

      {/* 2. Infeasible Blocking Check (Only when > 10% over budget) */}
      {isBlockingInfeasible && plan.concreteFixes && plan.concreteFixes.length > 0 ? (
        <InfeasiblePlanCard
          destination={plan.destination}
          targetBudgetINR={targetBudget}
          calculatedCostINR={cost.totalWithBufferINR}
          shortfallINR={overAmountINR}
          concreteFixes={plan.concreteFixes}
          onApplyFix={handleApplyConcreteFix}
          onModifyPrompt={onDescribeAgain}
        />
      ) : (
        <>
          {/* Over-budget banner when <= 10% over budget */}
          {isSlightlyOverBudget && (
            <div className="card-consumer p-3.5 sm:p-4 mb-4 border-[#8A4307]/40 bg-[#FFFDF7] space-y-2 text-left rounded-2xl shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-[#FCEFD9] text-[#8A4307]">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#15201D]">
                      Trip is slightly over budget by ₹{overAmountINR.toLocaleString('en-IN')} ({percentOver.toFixed(1)}%)
                    </h3>
                    <p className="text-[11px] text-[#55625E]">
                      {generatePlanOptions(plan, preferences).some((o) => o.id === 'budget')
                        ? `Pick the Budget tier option to stay within your ₹${targetBudget.toLocaleString('en-IN')} target.`
                        : `Adjust trip duration or transit to stay within your ₹${targetBudget.toLocaleString('en-IN')} target.`}
                    </p>
                  </div>
                </div>
                {generatePlanOptions(plan, preferences).some((o) => o.id === 'budget') && (
                  <button
                    type="button"
                    onClick={() => {
                      const options = generatePlanOptions(plan, preferences);
                      const budgetOpt = options.find((o) => o.id === 'budget');
                      if (budgetOpt) {
                        onPlanChange(budgetOpt.plan);
                      }
                    }}
                    className="btn-primary text-xs py-2 px-3.5 shrink-0 min-h-[44px] flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Choose Budget option</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* AI Destination Honest Estimate Banner */}
          {plan.isAiEstimatedDestination && (
            <div
              id="ai-destination-estimate-banner"
              className="bg-[#EFF8F5] border border-[#0E6B59]/30 rounded-2xl p-3.5 flex items-start gap-2.5 shadow-xs text-left"
            >
              <Sparkles className="h-4 w-4 text-[#0E6B59] shrink-0 mt-0.5" />
              <div className="text-xs text-[#15201D] leading-relaxed">
                <span className="font-bold text-[#0E6B59]">New destination</span> — details are AI estimates. Check on Google Maps and official booking sites before you book.
              </div>
            </div>
          )}

          {/* MOBILE: Collapsible Map (collapsed by default at 375px per Prompt 6) */}
          <div className="block lg:hidden mb-3">
            <details className="card-consumer p-0 overflow-hidden border border-[#E2E6E1] bg-white rounded-2xl shadow-xs group">
              <summary className="p-3.5 flex items-center justify-between text-xs font-bold text-[#15201D] cursor-pointer hover:bg-[#F9FAF9] select-none">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#0E6B59]" />
                  <span>Map & Route Visualizer</span>
                </div>
                <span className="text-[11px] font-semibold text-[#0E6B59]">Tap to view map</span>
              </summary>
              <div className="p-2 border-t border-[#E2E6E1]">
                <UnifiedPlanMap
                  destination={plan.destination}
                  stayArea={currentStayArea}
                  activePin={activePin}
                  onSelectPin={(pin) => setActivePin(pin)}
                  itinerary={plan.itinerary}
                  className="h-[36vh] min-h-[210px] max-h-[280px]"
                />
              </div>
            </details>
          </div>

          {/* TWO PANES ON DESKTOP (Left = Chat & Plan Cards; Right = Sticky Map) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT PANE (Chat & Plan Cards - 7 columns) */}
            <div className="lg:col-span-7 space-y-5">
              {/* VISIBLE BY DEFAULT 1: Top Summary Bar & 3 Option Cards (Budget / Balanced / Comfort) */}
              <PlanOptionsSelector
                currentPlan={plan}
                preferences={preferences}
                onSelectOptionPlan={onPlanChange}
                onCardFocus={(id) => {
                  if (id === 'budget') setActivePin(1);
                  else if (id === 'balanced') setActivePin(2);
                  else setActivePin(3);
                }}
              />

              {/* VISIBLE BY DEFAULT 2 (Mobile): Full Trip Cost Card */}
              <div className="block lg:hidden">
                <FullTripCostCard
                  plan={plan}
                  preferences={preferences}
                />
              </div>

              {/* VISIBLE BY DEFAULT 3: Day-by-day Itinerary */}
              <DayByDay
                itinerary={plan.itinerary}
                destination={plan.destination}
                stayArea={currentStayArea}
                onAdjustDay={onUpdateItineraryDay}
                onCardFocus={(pinNum) => setActivePin(pinNum)}
              />

              {/* ======================================================== */}
              {/* 4 TAP-TO-OPEN SECTIONS (Prompt 7 requirement)            */}
              {/* ======================================================== */}

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
                      <h3 className="text-sm font-bold text-[#15201D]">Travel & stay details</h3>
                      <p className="text-[11px] text-[#55625E]">Flights, stays per base, transfers, and direct booking links</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-[#0E6B59]">
                      {collapsedSections.travelStay ? 'Tap to close' : 'Tap to open'}
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
                    />
                    <FeasibilityNote
                      airportSelectionReason={plan.airportSelectionReason}
                      verificationChecks={plan.verificationChecks || []}
                    />
                  </div>
                )}
              </div>

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
                      <p className="text-[11px] text-[#55625E]">Stay area highlights, local amenities, and neighborhood pins</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-[#0E6B59]">
                      {collapsedSections.nearStay ? 'Tap to close' : 'Tap to open'}
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
                      <h3 className="text-sm font-bold text-[#15201D]">Before you book</h3>
                      <p className="text-[11px] text-[#55625E]">Trust checks, driver vetting, real buffers & local quirks</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-[#0E6B59]">
                      {collapsedSections.beforeBooking ? 'Tap to close' : 'Tap to open'}
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
                      <h3 className="text-sm font-bold text-[#15201D]">Best time to go & transit</h3>
                      <p className="text-[11px] text-[#55625E]">Seasonal crowds, weather advisory, and multi-modal transit comparison</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-[#0E6B59]">
                      {collapsedSections.bestTime ? 'Tap to close' : 'Tap to open'}
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

                    {/* Prompt 9: "How to get there" multi-mode comparison */}
                    {plan.transitModeComparison && plan.transitModeComparison.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-[#E2E6E1]">
                        <h4 className="text-xs font-bold text-[#15201D] uppercase tracking-wider">
                          How to get there · Door-to-door comparison
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {plan.transitModeComparison.map((m) => (
                            <div
                              key={m.mode}
                              className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                                m.isRecommended
                                  ? 'border-[#0E6B59] bg-[#E3F1EC]/30 ring-1 ring-[#0E6B59]/40'
                                  : 'border-[#E2E6E1] bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#15201D]">{m.mode}</span>
                                {m.isRecommended && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#E3F1EC] text-[#0E6B59]">
                                    Recommended
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#55625E] font-medium">
                                ⏱️ {m.doorToDoorHoursText}
                              </div>
                              <div className="text-xs font-bold text-[#15201D]">
                                ₹{m.costForGroupINR.toLocaleString('en-IN')} <span className="text-[10px] font-normal text-[#55625E]">for party</span>
                              </div>
                              <div className="text-[11px] text-[#55625E] italic">
                                "{m.scenicNote}"
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Route Trade-offs */}
                    <RouteTradeOffComparison
                      comparison={plan.routeComparison}
                      selectedMode={preferences.transportMode || (plan.flight ? 'Flight' : 'Train')}
                      onSelectMode={(mode) => {
                        if (mode === 'Train') handleRefinePlan('switch to train');
                        else if (mode === 'Flight') handleRefinePlan('switch to flight');
                        else handleRefinePlan('switch to road trip');
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Sticky Bottom Chat Box (Edits cards, never walls of text) */}
              <RefineBar
                onRefinePlan={handleRefinePlan}
                isUpdating={isRefining}
              />
            </div>

            {/* RIGHT PANE: DESKTOP STICKY MAP & SUMMARY (5 columns) */}
            <div className="hidden lg:block lg:col-span-5 space-y-4 sticky top-20">
              {/* Sticky Map Component */}
              <UnifiedPlanMap
                destination={plan.destination}
                stayArea={currentStayArea}
                activePin={activePin}
                onSelectPin={(pin) => setActivePin(pin)}
                itinerary={plan.itinerary}
                className="h-[46vh] min-h-[300px]"
              />

              {/* Full Trip Cost Card (stacked buffer breakdown & share button) */}
              <FullTripCostCard
                plan={plan}
                preferences={preferences}
              />
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
