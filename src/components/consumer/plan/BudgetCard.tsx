import React from 'react';
import { TripSummary } from '../../../services/tripSummaryHelper';
import { TripPlan, TripPreferences } from '../../../types/travelBooking';
import { computeFullTripCost } from '../../../services/fullTripCostHelper';
import { Sparkles } from 'lucide-react';

interface BudgetCardProps {
  plan?: TripPlan;
  preferences?: TripPreferences | null;
  summary?: TripSummary;
  targetBudgetINR?: number;
}

export const BudgetCard: React.FC<BudgetCardProps> = ({
  plan,
  preferences,
  summary,
  targetBudgetINR = 60000
}) => {
  // If plan is provided, use authoritative fullTripCostHelper as single source of truth
  const cost = plan ? computeFullTripCost(plan, preferences) : null;

  const total = cost ? cost.totalWithBufferINR : (summary?.totalINR || 0);
  const target = cost ? cost.targetBudgetINR : targetBudgetINR;
  const isOver = cost ? cost.budgetStatus === 'over' : (total > target);
  const overAmount = isOver ? (cost ? cost.budgetDifferenceINR : total - target) : 0;
  const remaining = !isOver ? (cost ? cost.budgetDifferenceINR : target - total) : 0;

  // Percentage capped at 100 for meter display
  const meterPercent = target > 0 ? Math.min(100, Math.round((total / target) * 100)) : 100;

  return (
    <div className="card-consumer p-5 sm:p-6 space-y-5 text-left border-[#E2E6E1] bg-white rounded-2xl shadow-xs">
      {/* Title & Status Pill */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E6E1]">
        <h2 className="text-base font-bold text-[#15201D] font-heading">
          Total trip cost
        </h2>
        <span
          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
            isOver
              ? 'bg-[#FCEFD9] text-[#8A4307]'
              : 'bg-[#E3F1EC] text-[#0E6B59]'
          }`}
        >
          {isOver ? `₹${overAmount.toLocaleString('en-IN')} over` : 'Within budget'}
        </span>
      </div>

      {/* Big Total: ₹X of ₹Y */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#15201D] font-heading">
            ₹{total.toLocaleString('en-IN')}
          </span>
          <span className="text-sm font-medium text-[#55625E]">
            of ₹{target.toLocaleString('en-IN')} budget
          </span>
        </div>

        {/* Animated Progress Meter */}
        <div className="w-full h-2.5 rounded-full bg-[#E2E6E1] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isOver ? 'bg-[#8A4307]' : 'bg-[#0E6B59]'
            }`}
            style={{ width: `${meterPercent}%` }}
          />
        </div>

        {/* Budget Difference Subtitle */}
        <div className="text-xs text-[#55625E] font-medium">
          {isOver ? (
            <span className="text-[#8A4307]">
              ₹{overAmount.toLocaleString('en-IN')} over your budget
            </span>
          ) : (
            <span className="text-[#0E6B59]">
              ₹{remaining.toLocaleString('en-IN')} left in your budget
            </span>
          )}
        </div>
      </div>

      {/* Cost Line Items matching authoritative FullTripCost breakdown */}
      {cost && (
        <div className="space-y-2.5 pt-3 border-t border-[#E2E6E1]">
          {cost.lines.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5 truncate">
                <div className="font-semibold text-[#15201D] flex items-center gap-1.5 truncate">
                  <span>{item.name}</span>
                  {item.isEstimate && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#E4EDF8] text-[#1E4F8A]">
                      Estimate
                    </span>
                  )}
                </div>
                {item.subtitle && (
                  <div className="text-[#55625E] text-[11px] truncate">
                    {item.subtitle}
                  </div>
                )}
              </div>

              <div className="font-bold text-[#15201D] shrink-0">
                ₹{item.amountINR.toLocaleString('en-IN')}
              </div>
            </div>
          ))}

          {/* 15% Buffer Line */}
          <div className="flex items-center justify-between gap-3 text-xs pt-1 border-t border-[#E2E6E1]/60 font-medium text-[#0E6B59]">
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span>Buffer for surprises (15%)</span>
            </div>
            <div className="font-bold">
              ₹{cost.bufferAmountINR.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      )}

      {/* "Not included" Note */}
      <div className="pt-3 border-t border-[#E2E6E1] text-[11px] text-[#55625E] leading-relaxed">
        <span className="font-semibold text-[#15201D]">Not included:</span> Personal shopping beyond misc estimate, and flight baggage upgrades.
      </div>
    </div>
  );
};
