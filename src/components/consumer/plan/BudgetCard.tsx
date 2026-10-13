import React from 'react';
import { TripSummary } from '../../../services/tripSummaryHelper';
import { SourceTag } from '../SourceTag';

interface BudgetCardProps {
  summary: TripSummary;
  targetBudgetINR: number;
}

export const BudgetCard: React.FC<BudgetCardProps> = ({ summary, targetBudgetINR }) => {
  const total = summary.totalINR;
  const isOver = total > targetBudgetINR;
  const overAmount = isOver ? total - targetBudgetINR : 0;
  const remaining = !isOver ? targetBudgetINR - total : 0;

  // Percentage capped at 100 for meter display
  const meterPercent = targetBudgetINR > 0 ? Math.min(100, Math.round((total / targetBudgetINR) * 100)) : 100;

  return (
    <div className="card-consumer p-5 sm:p-6 space-y-5 text-left">
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
            of ₹{targetBudgetINR.toLocaleString('en-IN')} budget
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

      {/* 7 Line Items with Amount + SourceTag */}
      <div className="space-y-3 pt-3 border-t border-[#E2E6E1]">
        {summary.lineItems.map((item: any) => (
          <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5 truncate">
              <div className="font-semibold text-[#15201D] truncate">
                {item.title}
              </div>
              {item.subtitle && (
                <div className="text-[#55625E] text-[11px] truncate">
                  {item.subtitle}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="font-bold text-[#15201D]">
                ₹{item.amountINR.toLocaleString('en-IN')}
              </span>
              <SourceTag kind={item.source} label={item.sourceLabel || item.source} />
            </div>
          </div>
        ))}
      </div>

      {/* "Not included" Note */}
      <div className="pt-3 border-t border-[#E2E6E1] text-[11px] text-[#55625E] leading-relaxed">
        <span className="font-semibold text-[#15201D]">Not included:</span> Personal shopping, unlisted souvenir purchases, alcoholic beverages beyond included dining.
      </div>
    </div>
  );
};
