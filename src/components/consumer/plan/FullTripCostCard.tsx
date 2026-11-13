import React from 'react';
import { TripPlan, TripPreferences } from '../../../types/travelBooking';
import { computeFullTripCost } from '../../../services/fullTripCostHelper';

interface FullTripCostCardProps {
  plan: TripPlan;
  preferences?: TripPreferences | null;
  /** Render just the lines (no card frame) so they sit inside the total card. */
  embedded?: boolean;
}

/** Colour-coded source label for each cost line. */
const SOURCE_STYLES = {
  sample: { label: 'Sample', className: 'bg-[#E8ECF7] text-[#3B4E8C]' },
  checked: { label: 'Checked fare', className: 'bg-[#E3F1EC] text-[#0A5546]' },
  estimate: { label: 'Estimate', className: 'bg-[#FBF1DF] text-[#7A4B00]' },
  ai: { label: 'AI estimate', className: 'bg-[#F1EAF9] text-[#6B3FA0]' }
} as const;

export const FullTripCostCard: React.FC<FullTripCostCardProps> = ({
  plan,
  preferences,
  embedded = false
}) => {
  // Authoritative full cost from fullTripCostHelper (fixed 15% buffer)
  const cost = computeFullTripCost(plan, preferences);
  const isAi = Boolean((plan as any).isAiEstimatedDestination);

  const lines = (
    <div className="space-y-2.5">
      {cost.lines.map((item) => {
        const src = isAi ? SOURCE_STYLES.ai : item.checked ? SOURCE_STYLES.checked : (item.isEstimate || plan.allPricesEstimated) ? SOURCE_STYLES.estimate : SOURCE_STYLES.sample;
        return (
          <div key={item.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap text-sm text-[#15201D]">
                <span>{item.name}</span>
                <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${src.className}`}>{src.label}</span>
              </div>
              {item.subtitle && (
                <div className="text-xs text-[#55625E] break-words mt-0.5">{item.subtitle}</div>
              )}
            </div>
            <span className="text-sm font-semibold text-[#15201D] tabular-nums shrink-0">
              ₹{item.amountINR.toLocaleString('en-IN')}
            </span>
          </div>
        );
      })}

      <div className="flex items-start justify-between gap-3 text-sm text-[#55625E]">
        <div>
          <div>Buffer for surprises ({cost.bufferPercent}%)</div>
          <div className="text-xs">For price changes and delays. Not spent = money saved.</div>
        </div>
        <span className="font-semibold text-[#15201D] tabular-nums shrink-0">₹{cost.bufferAmountINR.toLocaleString('en-IN')}</span>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[#EEECE5] pt-2.5 text-[15px] font-bold text-[#15201D]">
        <span>Total</span>
        <span className="tabular-nums" data-testid="cost-lines-total">₹{cost.totalWithBufferINR.toLocaleString('en-IN')}</span>
      </div>

      <p className="text-xs leading-relaxed text-[#55625E]">
        A planning estimate, not a quote.{' '}
        <strong className="text-[#3B4E8C]">Sample</strong> = demo listing price ·{' '}
        <strong className="text-[#7A4B00]">Estimate</strong> = typical rate for this place ·{' '}
        <strong className="text-[#6B3FA0]">AI estimate</strong> = check before booking.
      </p>
    </div>
  );

  if (embedded) {
    return (
      <div id="full-trip-cost-card" data-testid="full-trip-cost-card" className="border-t border-[#EEECE5] pt-3 text-left">
        {lines}
      </div>
    );
  }

  return (
    <div
      id="full-trip-cost-card"
      data-testid="full-trip-cost-card"
      className="card-consumer p-5 space-y-3 text-left border border-[#E2E6E1] bg-white rounded-2xl"
    >
      <h2 className="text-base font-bold text-[#15201D] font-heading">
        What the ₹{cost.totalWithBufferINR.toLocaleString('en-IN')} is made of
      </h2>
      {lines}
    </div>
  );
};
