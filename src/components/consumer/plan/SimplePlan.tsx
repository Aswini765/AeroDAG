import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { TripPlan, TripPreferences } from '../../../types/travelBooking';
import { computeFullTripCost } from '../../../services/fullTripCostHelper';
import { budgetLine } from '../../../services/budgetBasis';
import { cheapestPlan } from './StepPlanner';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/**
 * The one card that answers "what does it cost, and does it fit?":
 * a big total, FITS / OVER, one "Make it fit" button, and what the price includes.
 */
export const PlanSummary: React.FC<{
  plan: TripPlan;
  preferences?: TripPreferences | null;
  budgetINR: number;
  onApply: (next: TripPlan, msg: string) => void;
  details?: React.ReactNode;
}> = ({ plan, preferences, budgetINR, onApply, details }) => {
  const [open, setOpen] = useState(false);
  const cost = computeFullTripCost(plan, preferences || undefined);
  const total = cost.totalWithBufferINR;
  const pax = Math.max(1, plan.travellers.total);
  const basis = plan.budget?.basis || 'total';
  const noBudget = basis === 'none' || budgetINR <= 0;
  const over = noBudget ? 0 : total - budgetINR;
  const cheapest = useMemo(() => (over > 0 || noBudget ? cheapestPlan(plan, preferences) : null), [plan, preferences, over, noBudget]);
  const fixFits = cheapest && !noBudget && cheapest.total <= budgetINR;
  const cancel = plan.hotel?.freeCancellation ? (plan.hotel.cancellationPolicy || 'Free cancellation') : (plan.hotel?.cancellationPolicy || '');

  return (
    <div id="plan-summary" className="bg-white border border-[#E2E6E1] rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div id="plan-total" className="text-[38px] leading-[42px] font-extrabold tracking-tight text-[#15201D] tabular-nums">{inr(total)}</div>
          <div className="text-sm text-[#55625E]">
            {pax > 1 ? `${inr(total / pax)} each · ` : ''}{noBudget ? 'no budget given' : `budget ${budgetLine(budgetINR, basis, pax).replace(/ · about.*$/, '')}`}
          </div>
        </div>
        {!noBudget && (over <= 0 ? (
          <div id="plan-badge" className="shrink-0 flex items-center gap-1.5 bg-[#DDF1E7] text-[#0A5A3C] font-extrabold text-base px-3 py-2 rounded-xl">
            <Check className="h-5 w-5" strokeWidth={3} /> FITS
          </div>
        ) : (
          <div id="plan-badge" className="shrink-0 text-center bg-[#FCE9D6] text-[#8A3D00] font-extrabold text-base px-3 py-1.5 rounded-xl leading-tight">
            {basis === 'per_person' && pax > 1 ? `${inr(Math.ceil(over / pax))} each` : inr(over)}<br />OVER
          </div>
        ))}
      </div>

      {!noBudget && (
        <div className="h-2.5 rounded-full bg-[#EEF0EB] overflow-hidden flex" aria-hidden="true">
          <div className="bg-[#0E6B59]" style={{ width: `${Math.round((Math.min(total, budgetINR) / Math.max(total, budgetINR)) * 100)}%` }} />
          {over > 0 && <div className="bg-[#D9822B]" style={{ width: `${100 - Math.round((budgetINR / total) * 100)}%` }} />}
        </div>
      )}

      {over > 0 && cheapest && (
        <div className="space-y-2">
          <button
            type="button"
            id="make-it-fit"
            onClick={() => onApply(cheapest.plan, `Cheapest way: ${cheapest.label} · ${inr(total)} → ${inr(cheapest.total)}`)}
            className="w-full h-[52px] rounded-xl bg-[#0E6B59] text-white text-base font-extrabold cursor-pointer hover:bg-[#0A5546]"
          >
            {fixFits ? 'Make it fit' : 'Make it cheapest'}
          </button>
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${fixFits ? 'bg-[#F1F8F4] text-[#0A5A3C]' : 'bg-[#FFF6EC] text-[#8A3D00]'}`}>
            {fixFits && <Check className="h-4 w-4 shrink-0" strokeWidth={3} />}
            <span><span className="font-extrabold">{inr(cheapest.total)}</span> with {cheapest.label}{fixFits ? '' : ` — still ${inr(cheapest.total - budgetINR)} over`}</span>
          </div>
        </div>
      )}
      {noBudget && cheapest && cheapest.total < total - 200 && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-[#F1F8F4] text-[#0A5A3C] px-3 py-2.5 text-sm">
          <span>Cheapest way: <span className="font-extrabold">{inr(cheapest.total)}</span>{pax > 1 ? ` (${inr(cheapest.total / pax)} each)` : ''}</span>
          <button type="button" onClick={() => onApply(cheapest.plan, `Cheapest way: ${cheapest.label}`)} className="font-bold underline cursor-pointer shrink-0">Use it</button>
        </div>
      )}

      <div className="border-t border-[#EEF0EB] pt-3 space-y-1 text-sm text-[#15201D]">
        <div><span className="font-bold">Includes:</span> travel, stay, food, local cabs, tickets, 15% buffer</div>
        {cancel && <div><span className="font-bold">Stay:</span> {cancel.toLowerCase().startsWith('free') ? cancel : `cancellation: ${cancel}`}</div>}
      </div>

      {details && (
        <div>
          <button
            type="button"
            id="price-details-toggle"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="w-full h-11 rounded-xl border border-[#D5D3CA] bg-white text-sm font-bold text-[#15201D] flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#F9FAF9]"
          >
            Price details and where to book {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {open && <div className="pt-3">{details}</div>}
        </div>
      )}
    </div>
  );
};

/** One picked thing (travel, stay, days): what it is, why we picked it, and Change. */
export const ChoiceRow: React.FC<{
  id: string;
  icon: string;
  title: string;
  sub?: string;
  why?: string;
  open: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}> = ({ id, icon, title, sub, why, open, onToggle, children }) => (
  <div id={id} className={`bg-white border rounded-2xl ${open ? 'border-[#0E6B59]' : 'border-[#E2E6E1]'}`}>
    <div className="flex items-center gap-3 p-3 sm:p-3.5">
      <div className="h-12 w-12 rounded-xl bg-[#E4F2EC] flex items-center justify-center text-2xl shrink-0" aria-hidden="true">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-base font-bold text-[#15201D] leading-snug line-clamp-2">{title}</div>
        {sub && <div className="text-[13px] text-[#55625E] line-clamp-2">{sub}</div>}
      </div>
      {why && <span className="hidden sm:inline text-xs font-extrabold px-2 py-1.5 rounded-lg bg-[#DDF1E7] text-[#0A5A3C] shrink-0">{why}</span>}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={onToggle}
        className={`h-10 px-3.5 rounded-xl border text-sm font-bold shrink-0 cursor-pointer ${open ? 'bg-[#0E6B59] border-[#0E6B59] text-white' : 'bg-white border-[#0E6B59] text-[#0E6B59] hover:bg-[#E3F1EC]'}`}
      >
        {open ? 'Done' : 'Change'}
      </button>
    </div>
    {why && <div className="sm:hidden px-3 -mt-1 pb-3"><span className="text-xs font-extrabold px-2 py-1 rounded-lg bg-[#DDF1E7] text-[#0A5A3C]">{why}</span></div>}
    {open && children && <div id={`${id}-panel`} className="border-t border-[#E2E6E1] p-3 sm:p-4">{children}</div>}
  </div>
);
