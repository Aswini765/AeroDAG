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
  Info
} from 'lucide-react';
import { TripPlan, TripPreferences } from '../../../types/travelBooking';
import { PlanTierOption, generatePlanOptions } from '../../../services/planOptionsGenerator';
import { computeFullTripCost } from '../../../services/fullTripCostHelper';
import { trackOptionSwitched } from '../../../services/telemetry/posthog';

interface PlanOptionsSelectorProps {
  currentPlan: TripPlan;
  preferences?: TripPreferences | null;
  onSelectOptionPlan: (plan: TripPlan) => void;
  onCardFocus?: (cardId: string) => void;
}

const TIER_PHOTOS: Record<string, string> = {
  budget: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
  balanced: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80',
  comfort: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80'
};

const TIER_RATINGS: Record<string, { rating: number; reviews: number }> = {
  budget: { rating: 4.2, reviews: 184 },
  balanced: { rating: 4.5, reviews: 312 },
  comfort: { rating: 4.8, reviews: 520 }
};

// Max 12 words trade-off line per tier
const TIER_TRADEOFFS: Record<string, string> = {
  budget: 'Comfortable central stay that saves money for local dining and activities.',
  balanced: 'Ideal mix of scenic resort location, direct flights, and relaxed pacing.',
  comfort: 'Premium beachfront stay with luxury amenities and fastest private cab transfers.'
};

export const PlanOptionsSelector: React.FC<PlanOptionsSelectorProps> = ({
  currentPlan,
  preferences,
  onSelectOptionPlan,
  onCardFocus
}) => {
  // Build the 3 options from the ORIGINAL plan
  const baseRef = useRef<TripPlan>(currentPlan);
  const emittedRef = useRef<TripPlan | null>(null);
  const [selectedTier, setSelectedTier] = useState<'budget' | 'balanced' | 'comfort'>('balanced');
  
  // Buffer slider defaults to 25% (must keep useState<number>(25), min={10}, max={50})
  const [bufferPercent, setBufferPercent] = useState<number>(25);
  const [activeSheetOption, setActiveSheetOption] = useState<PlanTierOption | null>(null);

  if (currentPlan !== baseRef.current && currentPlan !== emittedRef.current) {
    baseRef.current = currentPlan;
    emittedRef.current = null;
    if (selectedTier !== 'balanced') setSelectedTier('balanced');
  }

  const basePlan = baseRef.current;
  const options = useMemo(
    () => generatePlanOptions(basePlan, preferences, { customBufferPercent: bufferPercent, useCategoryWeights: true }),
    [basePlan, preferences, bufferPercent]
  );

  const targetBudget = preferences?.budgetTotalINR || basePlan.budget?.targetINR || 60000;
  const travellersCount = Math.max(1, (preferences?.adultsCount || basePlan.travellers?.adults || 2) + (preferences?.childrenCount || basePlan.travellers?.children || 0));
  const targetBudgetPerPerson = Math.round(targetBudget / travellersCount);

  const fullCost = useMemo(
    () => computeFullTripCost(basePlan, preferences, { customBufferPercent: bufferPercent, useCategoryWeights: true }),
    [basePlan, preferences, bufferPercent]
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
  const computedLevers = useMemo(() => {
    if (!noneFits) return [];
    const levers: Array<{ title: string; description: string; savingsINR: number; newTotalINR: number }> = [];
    const lowestTotal = Math.min(...options.map((o) => o.totalCostINR));
    const nights = Math.max(2, basePlan.durationDays - 1);

    // Lever 1: Fewer nights
    if (basePlan.durationDays > 3) {
      const reducedDays = Math.max(3, basePlan.durationDays - 2);
      const daysDiff = basePlan.durationDays - reducedDays;
      const nightlyStay = basePlan.hotel?.pricePerNightINR || 3500;
      const dailyFood = 1500;
      const savings = Math.round((nightlyStay * daysDiff + dailyFood * daysDiff) * 1.25);
      levers.push({
        title: `Fewer nights (${reducedDays} days instead of ${basePlan.durationDays})`,
        description: `Shorten trip by ${daysDiff} nights`,
        savingsINR: savings,
        newTotalINR: Math.max(0, lowestTotal - savings)
      });
    }

    // Lever 2: Switch to train
    if (basePlan.flight) {
      const flightCost = fullCost.lines.find((l) => l.id === 'cost-travel')?.amountINR || 16000;
      const trainCostEst = Math.round(1800 * travellersCount);
      const savings = Math.max(0, Math.round((flightCost - trainCostEst) * 1.25));
      if (savings > 2000) {
        levers.push({
          title: 'Switch to train transport',
          description: 'Comfortable sleeper/chair car instead of flight',
          savingsINR: savings,
          newTotalINR: Math.max(0, lowestTotal - savings)
        });
      }
    }

    // Lever 3: Fewer bases / Standard budget stay
    const stayCost = fullCost.lines.find((l) => l.id === 'cost-stay')?.amountINR || 25000;
    const budgetStaySavings = Math.round(stayCost * 0.28);
    if (budgetStaySavings > 1500) {
      levers.push({
        title: 'Choose standard 3★ stay / single base',
        description: 'Standard verified stay with included breakfast',
        savingsINR: budgetStaySavings,
        newTotalINR: Math.max(0, lowestTotal - budgetStaySavings)
      });
    }

    return levers;
  }, [noneFits, options, basePlan, fullCost, travellersCount]);

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
      text: `Over by ₹${overAmount.toLocaleString('en-IN')}`,
      className: 'bg-[#FCEFD9] text-[#8A4307] ring-1 ring-[#8A4307]/50',
      isOver: true
    };
  };

  const activePlanOption = options.find((o) => o.id === selectedTier) || options[0];
  const activePercentOfBudget = targetBudget > 0 ? Math.min(100, Math.round((activePlanOption.totalCostINR / targetBudget) * 100)) : 0;
  const isSelectedOverBudget = targetBudget > 0 && activePlanOption.totalCostINR > targetBudget;

  return (
    <div className="card-consumer p-4 sm:p-5 space-y-4 text-left border border-[#E2E6E1] bg-white rounded-2xl shadow-xs">
      {/* 1. TOP SUMMARY BAR: Total Per Person + Budget Progress Bar */}
      <div className="p-3.5 rounded-2xl bg-[#F6F8F6] border border-[#0E6B59]/20 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#55625E]">
              Selected Tier · {activePlanOption.tier}
            </div>
            <div className="text-base sm:text-lg font-black text-[#15201D] font-heading flex items-baseline gap-1.5">
              <span>₹{activePlanOption.perPersonCostINR.toLocaleString('en-IN')}</span>
              <span className="text-xs font-semibold text-[#55625E]">/ person (all-in · estimate)</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[#55625E]">Total trip ({travellersCount} travellers)</div>
            <div className="text-xs sm:text-sm font-extrabold text-[#0E6B59]">
              ₹{activePlanOption.totalCostINR.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Budget Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-[#55625E]">
            <span>
              {isSelectedOverBudget ? (
                <span className="text-[#8A4307] font-bold">⚠️ Exceeds budget by ₹{(activePlanOption.totalCostINR - targetBudget).toLocaleString('en-IN')}</span>
              ) : (
                <span><strong>{activePercentOfBudget}%</strong> of ₹{targetBudget.toLocaleString('en-IN')} budget</span>
              )}
            </span>
            <span>Target: ₹{targetBudgetPerPerson.toLocaleString('en-IN')} / person</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#E2E6E1] overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isSelectedOverBudget ? 'bg-[#C2410C]' : 'bg-[#0E6B59]'
              }`}
              style={{ width: `${Math.min(100, activePercentOfBudget)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. SECTION HEADER & AI ESTIMATE LEGEND */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[#15201D] font-heading flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#0E6B59]" />
            <span>{options.length} Trip Options</span>
            {options.length === 2 && (
              <span className="text-[11px] font-semibold text-[#8A4307] bg-[#FCEFD9] px-2 py-0.5 rounded-full">
                Only 2 options fit
              </span>
            )}
          </h3>
          <p className="text-xs text-[#55625E]">
            {options.length === 2
              ? 'Only 2 options fit · Budget and Balanced share stay property and transport mode.'
              : 'Tap any card to view cost breakdown or change plan.'}
          </p>
        </div>
        <div className="text-[11px] text-[#55625E] flex items-center gap-1">
          <Info className="h-3 w-3 text-[#0E6B59]" />
          <span>AI estimate · confirmed before booking</span>
        </div>
      </div>

      {/* 3. THREE SWIPEABLE OPTION CARDS (Budget / Balanced / Comfort) */}
      <div className="flex sm:grid sm:grid-cols-3 gap-3.5 overflow-x-auto pb-2 pt-1 -mx-2 px-2 sm:mx-0 sm:px-0 snap-x snap-mandatory scrollbar-thin">
        {options.map((opt) => {
          const isSelected = selectedTier === opt.id;
          const badge = getOptionBadge(opt);
          const photoUrl = TIER_PHOTOS[opt.id] || TIER_PHOTOS.balanced;
          const ratingData = TIER_RATINGS[opt.id] || { rating: 4.4, reviews: 200 };
          const tradeOff = TIER_TRADEOFFS[opt.id] || opt.tagline;

          return (
            <div
              key={opt.id}
              onClick={() => {
                handleSelect(opt);
                setActiveSheetOption(opt);
              }}
              className={`min-w-[280px] sm:min-w-0 snap-center rounded-2xl border transition-all cursor-pointer flex flex-col justify-between overflow-hidden group shadow-2xs ${
                isSelected
                  ? 'border-[#0E6B59] bg-[#F4F9F7] ring-2 ring-[#0E6B59] shadow-sm'
                  : 'border-[#E2E6E1] bg-white hover:border-[#0E6B59]/50 hover:bg-[#FAFCFA]'
              }`}
            >
              {/* Card Photo Header */}
              <div className="relative h-32 w-full bg-[#E2E6E1] overflow-hidden">
                <img
                  src={photoUrl}
                  alt={opt.stayName}
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs ${badge.className}`}>
                    {badge.text}
                  </span>
                </div>
                <div className="absolute bottom-2.5 right-2.5">
                  <span className="text-[10px] font-semibold text-[#15201D] bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-md shadow-xs">
                    Sample
                  </span>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#55625E]">
                      {opt.tier}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-[#15201D] font-bold">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span>{ratingData.rating}★</span>
                      <span className="text-[10px] text-[#55625E] font-normal">({ratingData.reviews})</span>
                    </div>
                  </div>

                  {/* Stay Area */}
                  <div className="text-xs font-bold text-[#15201D] flex items-center gap-1.5 mt-1">
                    <Building2 className="h-3.5 w-3.5 text-[#0E6B59] shrink-0" />
                    <span className="truncate">Stay in {opt.stayArea}</span>
                  </div>

                  {/* One-line Trade-off (Max 12 words) */}
                  <p className="text-[11px] text-[#55625E] leading-relaxed mt-1 line-clamp-2">
                    {tradeOff}
                  </p>
                </div>

                {/* Price & Action */}
                <div className="pt-2.5 border-t border-[#E2E6E1]/70 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] text-[#55625E]">Per person (all-in)</div>
                    <div className="text-xs font-black text-[#15201D]">
                      ₹{opt.perPersonCostINR.toLocaleString('en-IN')}{' '}
                      <span className="text-[10px] font-normal text-[#55625E]">· est</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(opt);
                      setActiveSheetOption(opt);
                    }}
                    className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-[#0E6B59] text-white shadow-xs'
                        : 'bg-white border border-[#0E6B59] text-[#0E6B59] hover:bg-[#E3F1EC]'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                        <span>Selected</span>
                      </>
                    ) : (
                      <>
                        <span>Details</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3B. NONE FITS NOTIFICATION & CONCRETE LEVERS */}
      {noneFits && (
        <div id="none-fits-budget-banner" className="card-consumer p-4 bg-[#FFFDF7] border-[#8A4307]/40 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#FCEFD9] text-[#8A4307]">
              <Info className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-[#15201D]">
                None of the {options.length} options fit ₹{targetBudget.toLocaleString('en-IN')} — here's what would:
              </h4>
              <p className="text-[11px] text-[#55625E]">
                Concrete levers with computed savings to bring this trip within your target:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {computedLevers.map((lever, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-white border border-[#E2E6E1] space-y-1 text-left shadow-2xs">
                <div className="text-xs font-bold text-[#15201D]">{lever.title}</div>
                <div className="text-[11px] text-[#55625E]">{lever.description}</div>
                <div className="text-xs font-extrabold text-[#0E6B59] pt-1">
                  Save ~₹{lever.savingsINR.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-[#55625E]">
                  New total: ~₹{lever.newTotalINR.toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>
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
                  {activeSheetOption.tier} Tier Cost Breakdown
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

            {/* ADJUSTABLE BUFFER SLIDER (Default > 15%, test requires min={10}, max={50}, useState<number>(25)) */}
            <div className="p-3.5 rounded-xl bg-[#F4F9F7] border border-[#0E6B59]/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#15201D]">
                <div className="flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-[#0E6B59]" />
                  <span>Adjust Surprise Buffer: <strong className="text-[#0E6B59]">{bufferPercent}%</strong></span>
                </div>
                <span className="text-[10px] text-[#55625E]">Default 25% (overruns 24–70%)</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#55625E]">10%</span>
                <input
                  type="range"
                  min={10}
                  max={50}
                  step={5}
                  value={bufferPercent}
                  onChange={(e) => setBufferPercent(Number(e.target.value))}
                  className="w-full h-2 bg-[#CBD5E1] rounded-lg appearance-none cursor-pointer accent-[#0E6B59]"
                  aria-label="Adjust surprise buffer"
                />
                <span className="text-[11px] text-[#55625E]">50%</span>
              </div>
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
