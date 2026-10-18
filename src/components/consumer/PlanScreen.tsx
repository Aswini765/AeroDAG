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
import { AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import { computeFullTripCost } from '../../services/fullTripCostHelper';
import { generatePlanOptions } from '../../services/planOptionsGenerator';
import { PlanOptionsSelector } from './plan/PlanOptionsSelector';
import { NearbyAmenitiesCard } from './plan/NearbyAmenitiesCard';

interface PlanScreenProps {
  plan: TripPlan;
  preferences: TripPreferences;
  onPlanChange: (updatedPlan: TripPlan) => void;
  onProceedToReview: () => void;
  onDescribeAgain: () => void;
  onUpdateItineraryDay?: (dayNumber: number, modificationType: 'relaxed' | 'food' | 'budget') => void;
  /** Saves this plan as a draft in My Trips. Resolves true on success. */
  onSaveDraft?: () => Promise<boolean>;
  /** Guest (not signed in) — after saving we offer the optional email card */
  isGuest?: boolean;
  onContinueWithEmail?: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export const PlanScreen: React.FC<PlanScreenProps> = ({
  plan,
  preferences,
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
  const handleSaveTrip = async () => {
    if (!onSaveDraft || saveState === 'saving' || saveState === 'saved') return;
    setSaveState('saving');
    const ok = await onSaveDraft().catch(() => false);
    setSaveState(ok ? 'saved' : 'error');
  };
  const [isRefining, setIsRefining] = useState(false);
  const [moreOptionsView, setMoreOptionsView] = useState<'flights' | 'hotels' | 'dining' | 'map' | null>(null);

  // Authoritative Trip Summary (sum of line items === totalINR)
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

  // Blocking only when MORE than 10% over budget
  const isBlockingInfeasible = isOverBudget && percentOver > 10;
  // Banner when slightly over budget (10% or less)
  const isSlightlyOverBudget = isOverBudget && percentOver <= 10;

  // Handle Upgrade Selection
  const handleSelectUpgrade = (upgrade: PlanUpgradeOption) => {
    const upgraded = TripPlanningEngine.applyUpgrade(plan, upgrade);
    onPlanChange(upgraded);
  };

  // Handle reverting back to standard stay
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

  // Handle Balancing Option Application
  const handleApplyBalancingOption = async (option: BalancingOption) => {
    if (option.title.toLowerCase().includes('days') || option.title.toLowerCase().includes('reduce')) {
      // Re-run plan with fewer days
      const updatedContext = {
        ...preferences,
        durationDays: 5,
        budgetTotalINR: targetBudget
      };
      const newPlan = await TripPlanningEngine.buildDeterministicPlan(updatedContext as any);
      onPlanChange(newPlan);
    } else if (option.title.toLowerCase().includes('train') || option.title.toLowerCase().includes('rail') || option.title.toLowerCase().includes('vande')) {
      // Switch flight to scenic train
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

  // Handle Infeasible Concrete Fix Application
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

  // Handle Natural Language Refine
  const handleRefinePlan = async (userChangeRequest: string) => {
    setIsRefining(true);
    const lower = userChangeRequest.toLowerCase();

    // Check if user asked for train
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
    } else if (lower.includes('road') || lower.includes('bus') || lower.includes('drive')) {
      const updatedContext = {
        ...preferences,
        transportMode: 'Cab',
        budgetTotalINR: targetBudget
      };
      const newPlan = await TripPlanningEngine.buildDeterministicPlan(updatedContext as any);
      onPlanChange(newPlan);
    } else if (lower.includes('cheaper') || lower.includes('budget hotel') || lower.includes('save money')) {
      const updatedContext = {
        ...preferences,
        budgetTier: 'Frugal',
        budgetTotalINR: targetBudget
      };
      const newPlan = await TripPlanningEngine.buildDeterministicPlan(updatedContext as any);
      onPlanChange(newPlan);
    } else if (lower.includes('fewer days') || lower.includes('shorten') || lower.includes('4 days')) {
      const updatedContext = {
        ...preferences,
        durationDays: 4,
        budgetTotalINR: targetBudget
      };
      const newPlan = await TripPlanningEngine.buildDeterministicPlan(updatedContext as any);
      onPlanChange(newPlan);
    }

    setTimeout(() => {
      setIsRefining(false);
    }, 600);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-fade-in-slide">
      {/* 1. Plan Header (Eyebrow, title, meta line, buttons) */}
      <PlanHeader
        plan={plan}
        preferences={preferences}
        onSaveTrip={handleSaveTrip}
        onProceedToReview={onProceedToReview}
        saveState={saveState}
      />

      {saveState === 'saved' && isGuest && onContinueWithEmail && !emailCardDismissed && (
        <div className="mb-6">
          <KeepTripsCard
            id="save-trip-email-card"
            title="Saved — find it anytime under Saved plans"
            description="Want it on your phone or another laptop too? Add your email — no password, we just send you a link."
            onSubmitEmail={onContinueWithEmail}
            onDismiss={() => setEmailCardDismissed(true)}
          />
        </div>
      )}

      {/* 2. INFEASIBLE STATE CHECK: Only block when trip is MORE than 10% over budget */}
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
          {/* Over-budget banner when 10% or less over budget */}
          {isSlightlyOverBudget && (
            <div className="card-consumer p-4 sm:p-5 mb-6 border-[#8A4307]/40 bg-[#FFFDF7] space-y-3.5 text-left rounded-2xl shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E2E6E1]/60">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-[#FCEFD9] text-[#8A4307]">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#15201D] font-heading">
                      Trip is slightly over budget by ₹{overAmountINR.toLocaleString('en-IN')} ({percentOver.toFixed(1)}%)
                    </h3>
                    <p className="text-xs text-[#55625E]">
                      We've shown your full plan below. Choose a fix or pick the Budget option to fit within your ₹{targetBudget.toLocaleString('en-IN')} budget:
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const options = generatePlanOptions(plan, preferences);
                    const budgetOpt = options.find((o) => o.id === 'budget');
                    if (budgetOpt) {
                      onPlanChange(budgetOpt.plan);
                    }
                  }}
                  className="btn-primary text-xs py-2 px-3.5 shrink-0 min-h-[38px] flex items-center gap-1.5 shadow-xs"
                >
                  <span>Choose Budget option</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Choose a fix buttons */}
              {plan.concreteFixes && plan.concreteFixes.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#55625E]">
                    Choose a fix:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {plan.concreteFixes.map((fix) => (
                      <button
                        key={fix.id}
                        type="button"
                        onClick={() => handleApplyConcreteFix(fix)}
                        className="p-2.5 rounded-xl border border-[#E2E6E1] bg-white hover:border-[#0E6B59] hover:bg-[#E3F1EC]/40 transition text-left space-y-0.5 group cursor-pointer"
                      >
                        <div className="text-xs font-bold text-[#15201D] group-hover:text-[#0E6B59] flex items-center justify-between">
                          <span className="truncate">{fix.title}</span>
                          <span className="text-[10px] text-[#0A5546] font-semibold bg-[#E3F1EC] px-1.5 py-0.2 rounded shrink-0 ml-1">
                            Save ₹{fix.rupeeImpactINR.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#55625E] line-clamp-1">
                          {fix.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Destination Honest Estimate Banner */}
          {plan.isAiEstimatedDestination && (
            <div
              id="ai-destination-estimate-banner"
              className="bg-[#EFF8F5] border border-[#0E6B59]/30 rounded-2xl p-4 flex items-start gap-3 shadow-xs text-left"
            >
              <Sparkles className="h-5 w-5 text-[#0E6B59] shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-[#15201D] leading-relaxed">
                <span className="font-bold text-[#0E6B59]">New destination</span> — details are AI estimates. Check on Google Maps and booking sites before you book.
              </div>
            </div>
          )}

          {/* A3. FULL TRIP COST CARD near the top of PlanScreen */}
          <FullTripCostCard plan={plan} preferences={preferences} />

          {/* B1. 2–3 OPTIONS: Budget / Balanced / Comfort versions */}
          <PlanOptionsSelector
            currentPlan={plan}
            preferences={preferences}
            onSelectOptionPlan={onPlanChange}
          />

          {/* 3. TWO-COLUMN PLAN LAYOUT (≥1024px; stacked on mobile) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: 7 Columns on Desktop */}
          <div className="lg:col-span-7 space-y-6">
            {/* Contextual & Seasonal Recommendations (Peak experiences & Persona sub-zones) */}
            <SeasonalAndPersonaCard
              recommendation={plan.seasonalRecommendation}
              destination={plan.destination}
            />

            {/* Route Discovery & Trade-off Comparisons (Flight vs Train vs Bus on time, cost & scenic highlights) */}
            <RouteTradeOffComparison
              comparison={plan.routeComparison}
              selectedMode={preferences.transportMode || (plan.flight ? 'Flight' : 'Train')}
              onSelectMode={(mode) => {
                if (mode === 'Train') {
                  handleRefinePlan('switch to train');
                } else if (mode === 'Flight') {
                  handleRefinePlan('switch to flight');
                } else if (mode === 'Bus' || mode === 'Road') {
                  handleRefinePlan('switch to road trip');
                }
              }}
            />

            {/* 3 Summary Cards: Flights / Stay / Transfers */}
            <BookedItems
              flight={plan.flight}
              hotel={plan.hotel}
              transfer={plan.transfer}
              nightsCount={nightsCount}
              isAiEstimated={plan.isAiEstimatedDestination}
              onOpenFlightsModal={() => setMoreOptionsView('flights')}
              onOpenStaysModal={() => setMoreOptionsView('hotels')}
            />

            {/* B4. NEARBY AMENITIES CARD for stay area */}
            <NearbyAmenitiesCard
              stayArea={plan.hotel.area || plan.hotelZone || plan.destination}
              destination={plan.destination}
              hotelName={plan.hotel.name}
              isVegetarian={preferences.dietaryPreference === 'Vegetarian'}
              tripNeeds={preferences.tripNeeds}
            />

            {/* Trust & Quality Safety (Vetted user reviews, sleeper fraud prevention, driver vetting, Google Maps photos) */}
            <TrustAndVerificationCard
              trust={plan.trustVerification}
              hotel={plan.hotel}
              transfer={plan.transfer}
            />

            {/* Feasibility Notes & Green Airport Reason Note */}
            <FeasibilityNote
              airportSelectionReason={plan.airportSelectionReason}
              verificationChecks={plan.verificationChecks || []}
            />

            {/* "Day by day" Itinerary Card */}
            <DayByDay
              itinerary={plan.itinerary}
              onAdjustDay={onUpdateItineraryDay}
            />

            {/* Refine Bar */}
            <RefineBar
              onRefinePlan={handleRefinePlan}
              isUpdating={isRefining}
            />
          </div>

          {/* RIGHT COLUMN: 5 Columns on Desktop */}
          <div className="lg:col-span-5 space-y-6 sticky top-24">
            {/* "Total trip cost" Card */}
            <BudgetCard
              plan={plan}
              preferences={preferences}
              summary={summary}
              targetBudgetINR={targetBudget}
            />

            {/* Realistic Budget Buffers (15%-20% contingency) & Hidden Cost Warnings */}
            <BudgetBufferAndQuirksCard
              buffer={plan.budgetBuffer}
              targetBudgetINR={targetBudget}
            />

            {/* "Your stay" Selector (budget option vs upgrades) */}
            <StaySelector
              currentHotel={plan.hotel}
              upgradeOptions={plan.upgradeOptions}
              isOverBudget={plan.budget.isOverBudget}
              overBudgetAmountINR={plan.budget.overBudgetAmountINR}
              onSelectUpgrade={handleSelectUpgrade}
              onApplyBalancingOption={handleApplyBalancingOption}
              onRevertToStandard={handleRevertToStandard}
            />
          </div>
        </div>
      </>
    )}

      {/* Secondary Options Modal (Alternative flights, stays, dining, route map) */}
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
