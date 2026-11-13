import { PlacePhoto } from './PlacePhoto';
import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Check,
  Sparkles,
  Building2,
  Plane,
  Train,
  Car,
  ArrowRight,
  Sliders,
  ChevronDown,
  ChevronUp,
  Star,
  X,
  Info,
  ShieldCheck
} from 'lucide-react';
import { TripPlan, TripPreferences } from '../../../types/travelBooking';
import { PlanTierOption, generatePlanOptions } from '../../../services/planOptionsGenerator';
import { computeFullTripCost } from '../../../services/fullTripCostHelper';
import { placesThatFit } from '../../../services/budgetFixes';
import { FullTripCostCard } from './FullTripCostCard';
import { trackOptionSwitched } from '../../../services/telemetry/posthog';

interface PlanOptionsSelectorProps {
  currentPlan: TripPlan;
  preferences?: TripPreferences | null;
  onSelectOptionPlan: (plan: TripPlan) => void;
  onCardFocus?: (cardId: string) => void;
  /** Start a new plan for a place that fits the budget ("3 days in Gokarna …") */
  onTryPlace?: (place: string) => void;
}

const TIER_PHOTOS: Record<string, string> = {
  budget: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
  balanced: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80',
  comfort: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80'
};

// Max 12 words trade-off line per tier using real area type (Prompt 5: no beachfront for backwaters or hills)
export const PlanOptionsSelector: React.FC<PlanOptionsSelectorProps> = ({
  currentPlan,
  preferences,
  onSelectOptionPlan,
  onCardFocus,
  onTryPlace
}) => {
  // Build the 3 options from the ORIGINAL plan
  const baseRef = useRef<TripPlan>(currentPlan);
  const emittedRef = useRef<TripPlan | null>(null);
  const [selectedTier, setSelectedTier] = useState<'budget' | 'balanced' | 'comfort'>('balanced');
  
  // Surprise buffer is fixed strictly at 15% (Prompt 1 rule)
  const bufferPercent = 15;
  const [activeSheetOption, setActiveSheetOption] = useState<PlanTierOption | null>(null);

  if (currentPlan !== baseRef.current && currentPlan !== emittedRef.current) {
    baseRef.current = currentPlan;
    emittedRef.current = null;
    if (selectedTier !== 'balanced') setSelectedTier('balanced');
  }

  const basePlan = baseRef.current;
  const options = useMemo(
    () => generatePlanOptions(basePlan, preferences),
    [basePlan, preferences]
  );

  const targetBudget = preferences?.budgetTotalINR || basePlan.budget?.targetINR || 60000;
  const travellersCount = Math.max(1, (preferences?.adultsCount || basePlan.travellers?.adults || 2) + (preferences?.childrenCount || basePlan.travellers?.children || 0));
  const targetBudgetPerPerson = Math.round(targetBudget / travellersCount);

  const fullCost = useMemo(
    () => computeFullTripCost(basePlan, preferences),
    [basePlan, preferences]
  );
  const isOverBudget = fullCost.budgetStatus === 'over';

  const fittingOptions = useMemo(
    () => options.filter((o) => o.totalCostINR <= targetBudget),
    [options, targetBudget]
  );
  const noneFits = isOverBudget && fittingOptions.length === 0;

  const bestFitOption = useMemo(() => {
    if (!isOverBudget) return null;
    if (fittingOptions.length > 0) {
      return [...fittingOptions].sort((a, b) => a.totalCostINR - b.totalCostINR)[0];
    }
    return options.find((o) => o.id === 'budget') || options[0];
  }, [isOverBudget, fittingOptions, options]);

  // Computed concrete levers when none fits (Prompt 4 rule)
  // Real fixes, priced by the same cost engine: shorter versions of the cheapest way
  const cheapestOption = useMemo(
    () => options.reduce((m, o) => (o.totalCostINR < m.totalCostINR ? o : m), options[0]),
    [options]
  );
  const otherPlaces = useMemo(
    () => (noneFits
      ? placesThatFit({
          origin: basePlan.origin,
          days: basePlan.durationDays,
          adults: basePlan.travellers.adults + (basePlan.travellers.seniors || 0),
          children: basePlan.travellers.children || 0,
          childAges: basePlan.travellers.childAges,
          budgetINR: targetBudget,
          excludeName: basePlan.destination.replace(/,.*$/, '').trim()
        })
      : []),
    [noneFits, basePlan, targetBudget]
  );

  // What just changed, so a tap never feels like nothing happened
  const [lastChange, setLastChange] = useState<{ text: string; previous: TripPlan } | null>(null);

  const hasAutoSelectedRef = useRef(false);
  useEffect(() => {
    if (isOverBudget && bestFitOption && !hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = true;
      setSelectedTier(bestFitOption.id);
      if (bestFitOption.plan !== currentPlan) {
        emittedRef.current = bestFitOption.plan;
        onSelectOptionPlan(bestFitOption.plan);
      }
    }
  }, [isOverBudget, bestFitOption, currentPlan, onSelectOptionPlan]);

  const handleSelect = (option: PlanTierOption) => {
    setSelectedTier(option.id);
    emittedRef.current = option.plan;
    onSelectOptionPlan(option.plan);
    const tierName = (option.id.charAt(0).toUpperCase() + option.id.slice(1)) as 'Budget' | 'Balanced' | 'Comfort';
    trackOptionSwitched({
      optionTier: tierName,
      totalCost: option.totalCostINR
    });
    if (onCardFocus) onCardFocus(option.id);
  };

  const getTravelIcon = (mode: string) => {
    switch (mode) {
      case 'Train':
        return <Train className="h-3.5 w-3.5 text-[#0E6B59] shrink-0" />;
      case 'Cab':
      case 'Road':
        return <Car className="h-3.5 w-3.5 text-[#0E6B59] shrink-0" />;
      default:
        return <Plane className="h-3.5 w-3.5 text-[#0E6B59] shrink-0" />;
    }
  };

  const getOptionBadge = (opt: PlanTierOption) => {
    const isSelected = selectedTier === opt.id;
    const isRec = opt.badge === 'Recommended';

    if (isSelected) {
      return {
        text: isRec ? 'Current plan · Recommended' : 'Current plan',
        className: 'bg-[#0E6B59] text-white',
        isOver: false
      };
    }

    if (isRec) {
      return {
        text: 'Recommended',
        className: 'bg-[#0E6B59] text-white',
        isOver: false
      };
    }

    const fitsBudget = targetBudget > 0 && opt.totalCostINR <= targetBudget;
    if (fitsBudget) {
      return {
        text: opt.id === 'budget' ? 'Fits your budget' : opt.tier,
        className: 'bg-[#E3F1EC] text-[#0A5546]',
        isOver: false
      };
    }

    const overAmount = opt.totalCostINR - targetBudget;
    return {
      text: `₹${overAmount.toLocaleString('en-IN')} over budget`,
      className: 'bg-[#FCEFD9] text-[#8A4307] ring-1 ring-[#8A4307]/50',
      isOver: true
    };
  };

  const activePlanOption = options.find((o) => o.id === selectedTier) || options[0];
  const activePercentOfBudget = targetBudget > 0 ? Math.min(100, Math.round((activePlanOption.totalCostINR / targetBudget) * 100)) : 0;
  const isSelectedOverBudget = targetBudget > 0 && activePlanOption.totalCostINR > targetBudget;

  const overINR = targetBudget > 0 ? activePlanOption.totalCostINR - targetBudget : 0;
  const withinPct = targetBudget > 0 ? Math.min(100, Math.round((Math.min(activePlanOption.totalCostINR, targetBudget) / activePlanOption.totalCostINR) * 100)) : 100;

  return (
    <div className="space-y-4 text-left">
      {/* 1. THE ANSWER: one total, the budget bar, and what it is made of */}
      <section
        id="plan-answer-card"
        aria-labelledby="plan-answer-title"
        className="rounded-[18px] bg-white border border-[#E2E6E1] p-4 sm:p-5 space-y-3.5"
      >
        <h2 id="plan-answer-title" className="text-[13px] font-semibold text-[#55625E]">
          Real total for {travellersCount === 1 ? 'you' : `all ${travellersCount}`} · incl. 15% buffer
        </h2>
        <div className="flex items-end justify-between gap-3">
          <div className="text-[40px] leading-[44px] font-bold tracking-tight text-[#15201D] tabular-nums">
            ₹{activePlanOption.totalCostINR.toLocaleString('en-IN')}
          </div>
          {travellersCount > 1 && (
            <div className="text-right">
              <div className="text-lg font-bold text-[#15201D] tabular-nums">₹{activePlanOption.perPersonCostINR.toLocaleString('en-IN')}</div>
              <div className="text-xs text-[#55625E]">each</div>
            </div>
          )}
        </div>

        {targetBudget > 0 && (
          <div className="space-y-1.5">
            <div className="h-2.5 rounded-full bg-[#F0E9DD] overflow-hidden flex" aria-hidden="true">
              <div className="bg-[#0E6B59]" style={{ width: `${overINR > 0 ? withinPct : activePercentOfBudget}%` }} />
              {overINR > 0 && <div className="bg-[#C2620A]" style={{ width: `${100 - withinPct}%` }} />}
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[#55625E]">Your budget ₹{targetBudget.toLocaleString('en-IN')}</span>
              {overINR > 0 ? (
                <span className="font-bold text-[#9A4A00]">₹{overINR.toLocaleString('en-IN')} over</span>
              ) : (
                <span className="font-bold text-[#0A5546]">Fits · ₹{(-overINR).toLocaleString('en-IN')} left</span>
              )}
            </div>
          </div>
        )}

        <FullTripCostCard plan={activePlanOption.plan} preferences={preferences} embedded />
      </section>

      {/* 2. OPTIONS */}
      <section aria-labelledby="plan-options-title" className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="plan-options-title" className="text-[17px] font-bold text-[#15201D]">
            {options.length === 1 ? 'Your trip' : `${options.length} ways to do this trip`}
          </h2>
          {options.length > 1 && <span className="text-xs text-[#55625E]">same cost engine</span>}
        </div>

        <div id="plan-options-list" className="space-y-2.5">
          {options.map((opt) => {
            const isSelected = selectedTier === opt.id;
            const over = targetBudget > 0 ? opt.totalCostINR - targetBudget : 0;
            const fits = targetBudget > 0 && over <= 0;
            const badge = isSelected
              ? { text: 'Your plan', className: 'bg-[#0E6B59] text-white' }
              : fits
              ? { text: 'Fits your budget', className: 'bg-[#E3F1EC] text-[#0A5546]' }
              : opt.badge === 'Recommended'
              ? { text: 'Recommended', className: 'bg-[#E3F1EC] text-[#0A5546]' }
              : null;

            return (
              <article
                key={opt.id}
                className={`rounded-[14px] bg-white p-3.5 space-y-2 ${isSelected ? 'border-2 border-[#0E6B59]' : 'border border-[#E2E6E1]'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[15px] font-bold text-[#15201D]">{opt.tier}</h3>
                    {badge && <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${badge.className}`}>{badge.text}</span>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[17px] font-bold text-[#15201D] tabular-nums">₹{opt.totalCostINR.toLocaleString('en-IN')}</div>
                    {travellersCount > 1 && <div className="text-[11px] text-[#55625E]">₹{opt.perPersonCostINR.toLocaleString('en-IN')} each</div>}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                <PlacePhoto
                  place={opt.plan.isAiEstimatedDestination ? (opt.plan.hotel.area || opt.plan.destination) : opt.plan.hotel.name}
                  destination={opt.plan.hotel.city || opt.plan.destination}
                  kind={opt.plan.isAiEstimatedDestination ? 'place' : 'hotel'}
                  area={opt.plan.hotel.area || opt.plan.destination}
                  className="h-16 w-20 shrink-0 rounded-lg"
                />
                <div className="text-[13px] text-[#15201D] space-y-0.5 min-w-0">
                  <div>🛏 {opt.stayName}</div>
                  <div>{({ Flight: '✈️', Train: '🚆', Bus: '🚌', Cab: '🚗', Road: '🚐' } as Record<string, string>)[opt.travelMode] || '🚗'} {opt.travelDetail.replace(/ · Non-stop$/, '')}{opt.travelTime ? ` · ${opt.travelTime.replace(/^approx\. /, '~')}` : ''}</div>
                  {opt.id !== 'balanced' && opt.diffFromBalanced && /₹/.test(opt.diffFromBalanced) && (
                    <div className="text-xs text-[#55625E]">{opt.diffFromBalanced.replace(/^\+/, '')} vs Balanced</div>
                  )}
                </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[13px] font-semibold ${targetBudget <= 0 ? 'text-[#55625E]' : fits ? 'text-[#0A5546]' : 'text-[#9A4A00]'}`}>
                    {targetBudget <= 0 ? '' : fits ? `Fits · ₹${(-over).toLocaleString('en-IN')} left` : `₹${over.toLocaleString('en-IN')} over`}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveSheetOption(opt)}
                      className="h-10 px-2 text-[13px] font-semibold text-[#0E6B59] hover:underline cursor-pointer"
                    >
                      Costs
                    </button>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => !isSelected && handleSelect(opt)}
                      className={`h-10 px-3.5 rounded-[10px] border border-[#0E6B59] text-[13px] font-semibold cursor-pointer ${
                        isSelected ? 'bg-[#0E6B59] text-white cursor-default' : 'bg-white text-[#0E6B59] hover:bg-[#E3F1EC]'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Switch to this'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 3B. WHAT JUST CHANGED */}
      {lastChange && (
        <div id="plan-last-change" role="status" className="rounded-xl bg-[#E3F1EC] px-3 py-2.5 text-[13px] text-[#0A5546] flex items-center justify-between gap-2">
          <span><strong>Updated.</strong> {lastChange.text}</span>
          <button
            type="button"
            onClick={() => { onSelectOptionPlan(lastChange.previous); setLastChange(null); }}
            className="text-xs font-semibold underline cursor-pointer shrink-0"
          >
            Undo
          </button>
        </div>
      )}

      {/* 3C. NOTHING FITS: say it plainly, keep the user's days, show what does fit */}
      {noneFits && (
        <section id="none-fits-budget-banner" aria-labelledby="none-fits-title" className="rounded-2xl bg-[#FFFDF7] border border-[#8A4307]/30 p-4 space-y-3">
          <div>
            <h3 id="none-fits-title" className="text-[15px] font-bold text-[#15201D]">
              {basePlan.durationDays} days in {basePlan.destination.replace(/,.*$/, '')} costs at least ₹{cheapestOption.totalCostINR.toLocaleString('en-IN')}
            </h3>
            <p className="text-xs text-[#55625E] mt-0.5">
              That is the cheapest way ({cheapestOption.tier}: {cheapestOption.stayName.replace(/,.*$/, '')} + {cheapestOption.travelMode.toLowerCase()}) — ₹{(cheapestOption.totalCostINR - targetBudget).toLocaleString('en-IN')} more than your ₹{targetBudget.toLocaleString('en-IN')} budget. Your {basePlan.durationDays} days stay as you asked.
            </p>
          </div>

          <div className="grid gap-2">
            {selectedTier !== cheapestOption.id && (
              <button
                type="button"
                id="pick-cheapest-way"
                onClick={() => handleSelect(cheapestOption)}
                className="w-full rounded-xl bg-white border border-[#E2E6E1] hover:border-[#0E6B59] p-3 text-left flex items-center justify-between gap-3 cursor-pointer"
              >
                <span>
                  <span className="block text-sm font-bold text-[#15201D]">Go the cheapest way</span>
                  <span className="block text-xs text-[#55625E]">Same {basePlan.durationDays} days · {cheapestOption.stayName.replace(/,.*$/, '')} · {cheapestOption.travelMode.toLowerCase()}</span>
                </span>
                <span className="block text-sm font-bold text-[#15201D] shrink-0">₹{cheapestOption.totalCostINR.toLocaleString('en-IN')}</span>
              </button>
            )}

            {otherPlaces.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#15201D] pt-1">
                  Or the same {basePlan.durationDays} days somewhere that fits ₹{targetBudget.toLocaleString('en-IN')}:
                </div>
                {otherPlaces.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    disabled={!onTryPlace}
                    onClick={() => onTryPlace && onTryPlace(p.name)}
                    className="w-full rounded-xl bg-white border border-[#E2E6E1] hover:border-[#0E6B59] p-2.5 text-left flex items-center gap-3 cursor-pointer disabled:cursor-default"
                  >
                    <PlacePhoto place={p.name} className="h-14 w-16 shrink-0 rounded-lg" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-[#15201D]">{p.name}</span>
                      <span className="block text-xs text-[#55625E]">{p.state} · about {p.roadKm} km by road</span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block text-sm font-bold text-[#15201D]">from ₹{p.totalINR.toLocaleString('en-IN')}</span>
                      <span className="block text-[11px] font-semibold text-[#0A5546]">Fits · estimate</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. PROGRESSIVE DISCLOSURE BOTTOM SHEET MODAL (Stacked cost bar + expandable list + buffer slider) */}
      {activeSheetOption && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in-slide"
        >
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto border border-[#E2E6E1] shadow-2xl text-left">
            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E6E1]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0E6B59] bg-[#E3F1EC] px-2 py-0.5 rounded-full">
                  {activeSheetOption.tier} · what it costs
                </span>
                <h4 className="text-base sm:text-lg font-bold text-[#15201D] font-heading mt-1">
                  ₹{activeSheetOption.totalCostINR.toLocaleString('en-IN')}{' '}
                  <span className="text-xs font-normal text-[#55625E]">
                    (₹{activeSheetOption.perPersonCostINR.toLocaleString('en-IN')} / person)
                  </span>
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveSheetOption(null)}
                className="w-9 h-9 rounded-full bg-[#F5F6F3] text-[#55625E] hover:text-[#15201D] hover:bg-[#E2E6E1] flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px]"
                aria-label="Close details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* STACKED COST BAR (Shown ONCE) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#55625E]">
                <span className="font-semibold">All-in cost distribution</span>
                <span>Includes {bufferPercent}% buffer</span>
              </div>
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-[#E2E6E1]">
                <div
                  title={`Stay: ₹${activeSheetOption.stayCostINR.toLocaleString('en-IN')}`}
                  style={{ width: `${(activeSheetOption.stayCostINR / activeSheetOption.totalCostINR) * 100}%` }}
                  className="bg-[#0E6B59] h-full"
                />
                <div
                  title={`Travel: ₹${activeSheetOption.travelCostINR.toLocaleString('en-IN')}`}
                  style={{ width: `${(activeSheetOption.travelCostINR / activeSheetOption.totalCostINR) * 100}%` }}
                  className="bg-[#1D74F5] h-full"
                />
                <div
                  title={`Local Transport: ₹${activeSheetOption.localTransportCostINR.toLocaleString('en-IN')}`}
                  style={{ width: `${(activeSheetOption.localTransportCostINR / activeSheetOption.totalCostINR) * 100}%` }}
                  className="bg-[#0284C7] h-full"
                />
                <div
                  title={`Food: ₹${activeSheetOption.foodCostINR.toLocaleString('en-IN')}`}
                  style={{ width: `${(activeSheetOption.foodCostINR / activeSheetOption.totalCostINR) * 100}%` }}
                  className="bg-[#D97706] h-full"
                />
                <div
                  title={`Shopping: ₹${activeSheetOption.shoppingCostINR.toLocaleString('en-IN')}`}
                  style={{ width: `${(activeSheetOption.shoppingCostINR / activeSheetOption.totalCostINR) * 100}%` }}
                  className="bg-[#8B5CF6] h-full"
                />
                <div
                  title={`Extra Money Buffer: ₹${activeSheetOption.bufferCostINR.toLocaleString('en-IN')}`}
                  style={{ width: `${(activeSheetOption.bufferCostINR / activeSheetOption.totalCostINR) * 100}%` }}
                  className="bg-[#10B981] h-full"
                />
              </div>

              {/* Legend row */}
              <div className="flex flex-wrap gap-2 text-[10px] text-[#55625E] pt-1">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#0E6B59]" />Stay</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#1D74F5]" />Travel</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#0284C7]" />Local Cabs</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#D97706]" />Food</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />Shopping</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10B981]" />Surprise Buffer</span>
              </div>
            </div>

            {/* EXPANDABLE COST LIST */}
            <div className="space-y-2 pt-2 border-t border-[#E2E6E1]/70 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#FAFCFA]">
                <span>🏨 Stay in {activeSheetOption.stayArea}</span>
                <span className="font-bold text-[#15201D]">₹{activeSheetOption.stayCostINR.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#FAFCFA]">
                <span>✈️ Travel ({activeSheetOption.travelMode})</span>
                <span className="font-bold text-[#15201D]">₹{activeSheetOption.travelCostINR.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#FAFCFA]">
                <span>🚖 Local transport & transfers</span>
                <span className="font-bold text-[#15201D]">₹{activeSheetOption.localTransportCostINR.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#FAFCFA]">
                <span>🍽️ Food & dining</span>
                <span className="font-bold text-[#15201D]">₹{activeSheetOption.foodCostINR.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#FAFCFA]">
                <span>🛍️ Shopping & souvenirs</span>
                <span className="font-bold text-[#15201D]">₹{activeSheetOption.shoppingCostINR.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#E3F1EC]/60 text-[#0E6B59] font-bold">
                <span>🛡️ Extra money for surprises ({bufferPercent}%)</span>
                <span>₹{activeSheetOption.bufferCostINR.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Surprise Buffer: 15% fixed (Prompt 1 rule) */}
            <div className="p-3.5 rounded-xl bg-[#F4F9F7] border border-[#0E6B59]/20 flex items-center justify-between text-xs text-[#15201D]">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="h-4 w-4 text-[#0E6B59]" />
                <span>Surprise Buffer: <strong className="text-[#0E6B59]">15% included</strong></span>
              </div>
              <span className="text-[10px] text-[#55625E]">Fixed safety margin for unexpected expenses</span>
            </div>

            {/* Apply & Select Plan Button */}
            <button
              type="button"
              onClick={() => {
                handleSelect(activeSheetOption);
                setActiveSheetOption(null);
              }}
              className="btn-primary w-full min-h-[44px] py-3 text-xs sm:text-sm font-bold shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Apply {activeSheetOption.tier} Plan</span>
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
