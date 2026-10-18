import React, { useMemo, useRef, useState } from 'react';
import { Check, Sparkles, Building2, Plane, Train, Car, ArrowRight } from 'lucide-react';
import { TripPlan, TripPreferences } from '../../../types/travelBooking';
import { PlanTierOption, generatePlanOptions } from '../../../services/planOptionsGenerator';

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

  return (
    <div className="card-consumer p-4 sm:p-5 space-y-4 text-left border border-[#E2E6E1] bg-white rounded-2xl shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-[#E2E6E1]">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#0E6B59]" />
            <h3 className="text-sm sm:text-base font-bold text-[#15201D] font-heading">
              Compare 3 Plan Versions
            </h3>
          </div>
          <p className="text-xs text-[#55625E] mt-0.5">
            Pick a tier to match your comfort and transit style. You can still swap hotels or travel anytime.
          </p>
        </div>
        <div className="text-[11px] font-semibold text-[#0E6B59] bg-[#E3F1EC] px-2.5 py-1 rounded-full self-start sm:self-auto">
          3 Real Options
        </div>
      </div>

      {/* Swipeable cards on mobile, 3-column grid on desktop */}
      <div className="flex sm:grid sm:grid-cols-3 gap-3 overflow-x-auto pb-2 pt-1 -mx-2 px-2 sm:mx-0 sm:px-0 snap-x snap-mandatory scrollbar-thin">
        {options.map((opt) => {
          const isSelected = selectedTier === opt.id;
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
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#55625E]">
                    {opt.tier}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    opt.id === 'balanced'
                      ? 'bg-[#0E6B59] text-white'
                      : opt.id === 'budget'
                      ? 'bg-[#E3F1EC] text-[#0A5546]'
                      : 'bg-[#FCEFD9] text-[#8A4307]'
                  }`}>
                    {opt.badge}
                  </span>
                </div>
                <div className="text-base font-extrabold text-[#15201D]">
                  ₹{opt.totalCostINR.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-[#55625E]">
                  Per person: <span className="font-semibold text-[#15201D]">₹{opt.perPersonCostINR.toLocaleString('en-IN')}</span> (all-in)
                </div>
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
