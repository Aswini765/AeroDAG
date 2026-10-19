import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Check, Sparkles, Building2, Plane, Train, Car, ArrowRight } from 'lucide-react';
import { TripPlan, TripPreferences } from '../../../types/travelBooking';
import { PlanTierOption, generatePlanOptions } from '../../../services/planOptionsGenerator';
import { computeFullTripCost } from '../../../services/fullTripCostHelper';

interface PlanOptionsSelectorProps {
  currentPlan: TripPlan;
  preferences?: TripPreferences | null;
  onSelectOptionPlan: (plan: TripPlan) => void;
}

export const PlanOptionsSelector: React.FC<PlanOptionsSelectorProps> = ({
  currentPlan,
  preferences,
  onSelectOptionPlan
}) => {
  // Build the 3 options from the ORIGINAL plan, not from whichever option was picked last.
  // Otherwise picking "Budget" turns "Balanced" into the budget plan and the original is lost.
  const baseRef = useRef<TripPlan>(currentPlan);
  const emittedRef = useRef<TripPlan | null>(null);
  const [selectedTier, setSelectedTier] = useState<'budget' | 'balanced' | 'comfort'>('balanced');

  if (currentPlan !== baseRef.current && currentPlan !== emittedRef.current) {
    // A genuinely new plan (refined, re-planned or swapped by hand): start again from it.
    baseRef.current = currentPlan;
    emittedRef.current = null;
    if (selectedTier !== 'balanced') setSelectedTier('balanced');
  }

  const basePlan = baseRef.current;
  const options = useMemo(() => generatePlanOptions(basePlan, preferences), [basePlan, preferences]);

  const targetBudget = preferences?.budgetTotalINR || basePlan.budget?.targetINR || 60000;
  const fullCost = useMemo(() => computeFullTripCost(basePlan, preferences), [basePlan, preferences]);
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
    // If none fits, pre-select Budget option
    return options.find((o) => o.id === 'budget') || options[0];
  }, [isOverBudget, fittingOptions, options]);

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
    const fitsBudget = targetBudget > 0 && opt.totalCostINR <= targetBudget;

    if (noneFits && opt.id === 'budget') {
      const overBudgetDiff = opt.totalCostINR - targetBudget;
      return {
        text: `Cheapest option · ₹${overBudgetDiff.toLocaleString('en-IN')} over budget`,
        className: 'bg-[#FCEFD9] text-[#8A4307] ring-1 ring-[#8A4307]/50'
      };
    }

    if (isOverBudget && fitsBudget && opt.id === bestFitOption?.id) {
      return {
        text: 'Fits your budget',
        className: 'bg-[#E3F1EC] text-[#0A5546] ring-1 ring-[#0E6B59]'
      };
    }

    if (opt.id === 'balanced') {
      return {
        text: opt.badge === 'Fits your budget' && !fitsBudget ? 'Recommended' : opt.badge,
        className: 'bg-[#0E6B59] text-white'
      };
    }
    if (opt.id === 'budget') {
      let text = opt.badge;
      if (text === 'Fits your budget' && !fitsBudget) {
        text = 'Best Value';
      }
      return {
        text,
        className: text.includes('over budget')
          ? 'bg-[#FCEFD9] text-[#8A4307] ring-1 ring-[#8A4307]/50'
          : 'bg-[#E3F1EC] text-[#0A5546]'
      };
    }
    return {
      text: opt.badge === 'Fits your budget' && !fitsBudget ? 'Premium Stay' : opt.badge,
      className: 'bg-[#FCEFD9] text-[#8A4307]'
    };
  };

  return (
    <div className="card-consumer p-4 sm:p-5 space-y-4 text-left border border-[#E2E6E1] bg-white rounded-2xl shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-[#E2E6E1]">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#0E6B59]" />
            <h3 className="text-sm sm:text-base font-bold text-[#15201D] font-heading">
              {options.length === 2 ? 'Compare 2 Plan Versions' : 'Compare 3 Plan Versions'}
            </h3>
          </div>
          <p className="text-xs text-[#55625E] mt-0.5">
            Pick a tier to match your comfort and transit style. You can still swap hotels or travel anytime.
          </p>
        </div>
        <div className="text-[11px] font-semibold text-[#0E6B59] bg-[#E3F1EC] px-2.5 py-1 rounded-full self-start sm:self-auto">
          {options.length === 2 ? '2 Real Options' : '3 Real Options'}
        </div>
      </div>

      {/* Swipeable cards on mobile, grid on desktop */}
      <div className={`flex sm:grid gap-3 overflow-x-auto pb-2 pt-1 -mx-2 px-2 sm:mx-0 sm:px-0 snap-x snap-mandatory scrollbar-thin ${
        options.length === 2 ? 'sm:grid-cols-2 max-w-3xl mx-auto' : 'sm:grid-cols-3'
      }`}>
        {options.map((opt) => {
          const isSelected = selectedTier === opt.id;
          const badge = getOptionBadge(opt);
          return (
            <div
              key={opt.id}
              onClick={() => handleSelect(opt)}
              className={`min-w-[280px] sm:min-w-0 snap-center rounded-xl p-3.5 sm:p-4 border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                isSelected
                  ? 'border-[#0E6B59] bg-[#F4F9F7] ring-1 ring-[#0E6B59] shadow-sm'
                  : 'border-[#E2E6E1] bg-white hover:border-[#0E6B59]/40 hover:bg-[#F9FAF9]'
              }`}
            >
              {/* Header */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#55625E]">
                    {opt.tier}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.className}`}>
                    {badge.text}
                  </span>
                </div>
                <div className="text-base font-extrabold text-[#15201D]">
                  ₹{opt.totalCostINR.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-[#55625E]">
                  Per person: <span className="font-semibold text-[#15201D]">₹{opt.perPersonCostINR.toLocaleString('en-IN')}</span> (all-in)
                </div>
                {opt.diffFromBalanced && (
                  <div className="pt-0.5">
                    <span className="text-[11px] font-semibold text-[#0E6B59] bg-[#E3F1EC]/70 px-2 py-0.5 rounded-md inline-block">
                      {opt.diffFromBalanced}
                    </span>
                  </div>
                )}
              </div>

              {/* Tagline */}
              <div className="text-[11px] text-[#55625E] leading-snug border-t border-[#E2E6E1]/60 pt-2">
                {opt.tagline}
              </div>

              {/* Key Highlights */}
              <div className="space-y-2 pt-1 text-xs">
                {/* Stay */}
                <div className="flex items-start gap-2">
                  <Building2 className="h-3.5 w-3.5 text-[#0E6B59] shrink-0 mt-0.5" />
                  <div className="text-[11px] text-[#15201D] leading-tight">
                    <span className="font-semibold">Stay in {opt.stayArea}</span>
                    <div className="text-[#55625E] truncate max-w-[200px]" title={opt.stayName}>
                      {opt.stayName} ({opt.stayStars}★)
                    </div>
                  </div>
                </div>

                {/* Travel */}
                <div className="flex items-start gap-2">
                  {getTravelIcon(opt.travelMode)}
                  <div className="text-[11px] text-[#15201D] leading-tight">
                    <span className="font-semibold">{opt.travelMode} ({opt.travelTime})</span>
                    <div className="text-[#55625E] truncate max-w-[200px]" title={opt.travelDetail}>
                      {opt.travelDetail}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(opt);
                }}
                className={`w-full min-h-[44px] py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#0E6B59] text-white shadow-xs'
                    : 'bg-white border border-[#0E6B59] text-[#0E6B59] hover:bg-[#E3F1EC]'
                }`}
              >
                {isSelected ? (
                  <>
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                    <span>Selected Plan</span>
                  </>
                ) : (
                  <>
                    <span>Choose {opt.tier}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
