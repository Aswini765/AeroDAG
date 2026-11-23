import React, { useMemo, useState } from 'react';
import { Check, Lock } from 'lucide-react';
import { TripPlan, TripPreferences } from '../../../types/travelBooking';
import { computeFullTripCost } from '../../../services/fullTripCostHelper';
import { formatTripShareText } from '../../../services/shareTripHelper';
import { bestFitPlan, cheapestPlan } from './StepPlanner';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const NAMES = ['You', 'Priya', 'Rahul', 'Divya', 'Karthik', 'Sneha', 'Arjun', 'Meera', 'Vikram', 'Ananya', 'Rohan', 'Kavya'];
const COLORS = ['#0E6B59', '#6A4FA3', '#B0623A', '#2F7A8C', '#7A6A4F', '#8C4F6A', '#4F6B3F', '#3A5A8C'];
// Demo: how far each friend's budget sits from the group's (the tightest one is what counts)
const SPREAD = [1, 1, 1.3, 0.9, 0.8, 1.1, 1.2, 0.95, 1.05, 1.15, 0.85, 1];

/** A friends trip: who's in, and the tightest budget (private: never shown next to a name). Demo data. */
export function isFriendsTrip(plan: TripPlan, partyType?: string | null): boolean {
  const t = plan.travellers;
  return t.total >= 3 && (t.children || 0) === 0 && (partyType === 'friends' || partyType === 'group' || (!partyType && t.total >= 4));
}

export const FriendsGroup: React.FC<{
  plan: TripPlan;
  preferences?: TripPreferences | null;
  onApply: (next: TripPlan, msg: string) => void;
}> = ({ plan, preferences, onApply }) => {
  const n = Math.min(NAMES.length, Math.max(3, plan.travellers.total));
  const cost = computeFullTripCost(plan, preferences || undefined);
  const each = cost.totalWithBufferINR / plan.travellers.total;
  // The group's per-person budget: what they wrote, else the plan's total split evenly
  const groupEach = plan.budget?.basis === 'none' ? Math.round(each / 500) * 500 : (plan.budget?.targetINR || cost.totalWithBufferINR) / plan.travellers.total;
  const [replied, setReplied] = useState<boolean[]>(() => Array.from({ length: n }, (_, i) => i < n - 1));
  // Fixed once per trip: "Make it fit" changes the plan's budget, not what each friend said they can spend
  const [friends] = useState(() => Array.from({ length: n }, (_, i) => ({
    name: NAMES[i],
    color: COLORS[i % COLORS.length],
    budget: Math.round((groupEach * SPREAD[i]) / 500) * 500
  })));
  const inCount = replied.filter(Boolean).length;
  const tightest = Math.min(...friends.filter((_, i) => replied[i]).map((f) => f.budget));
  const short = each - tightest;
  // The way to fit the tightest budget: the best plan that fits, else simply the cheapest way
  const fix = useMemo(() => {
    if (short <= 0) return null;
    const target = tightest * plan.travellers.total;
    const base = { ...plan, budget: { ...plan.budget, targetINR: target, basis: 'per_person' as const } };
    const fit = bestFitPlan(base, preferences, target);
    const fitTotal = computeFullTripCost(fit, preferences || undefined).totalWithBufferINR;
    if (fitTotal <= target) return { plan: fit, each: fitTotal / plan.travellers.total, fits: true };
    const cheap = cheapestPlan(base, preferences);
    return cheap && cheap.total < cost.totalWithBufferINR - 200 ? { plan: cheap.plan, each: cheap.total / plan.travellers.total, fits: cheap.total <= target } : null;
  }, [plan, preferences, short, tightest]);
  const shareText = `${formatTripShareText(plan, preferences)}\n\nAbout ${inr(each)} each. Are you in? Reply to me privately with what you can spend: only the lowest budget is used, nobody sees yours.`;

  return (
    <div id="friends-group" className="bg-white border border-[#E2E6E1] rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-bold text-[#15201D]">Who's in · {inCount} of {n}</div>
          <div className="text-xs text-[#55625E]">Sample friends (demo)</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-[#55625E]">Tightest budget</div>
          <div className="text-xl font-extrabold text-[#15201D] tabular-nums">{inr(tightest)} <span className="text-sm font-semibold text-[#55625E]">each</span></div>
        </div>
      </div>

      <div className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm ${short <= 0 ? 'bg-[#F1F8F4] text-[#0A5A3C]' : 'bg-[#FFF6EC] text-[#8A3D00]'}`}>
        <span className="flex items-center gap-1.5">
          {short <= 0 && <Check className="h-4 w-4" strokeWidth={3} />}
          {short <= 0 ? `Fits everyone: ${inr(each)} each` : `${inr(short)} each more than the tightest budget`}
        </span>
        {fix && (
          <button
            type="button"
            id="friends-make-it-fit"
            onClick={() => onApply(fix.plan, fix.fits ? `Fits the tightest budget: ${inr(fix.each)} each` : `Cheapest way: ${inr(fix.each)} each — still ${inr(fix.each - tightest)} each over the tightest budget`)}
            className="h-9 px-3 rounded-lg bg-[#0E6B59] text-white text-[13px] font-bold shrink-0 cursor-pointer"
          >
            {fix.fits ? `Make it fit ${inr(tightest)}` : `Cheapest: ${inr(fix.each)} each`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {friends.map((f, i) => (
          <div key={f.name} className="flex items-center gap-2.5 rounded-xl border border-[#E2E6E1] px-3 py-2">
            <div className="h-9 w-9 rounded-full text-white text-sm font-extrabold flex items-center justify-center shrink-0" style={{ background: f.color }} aria-hidden="true">{f.name[0]}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-[#15201D]">{f.name}</div>
              <div className="text-xs text-[#55625E]">{replied[i] ? 'Budget sent' : 'Not replied yet'}</div>
            </div>
            {replied[i] ? (
              <span className="text-xs font-extrabold px-2 py-1 rounded-lg bg-[#DDF1E7] text-[#0A5A3C]">IN</span>
            ) : (
              <button
                type="button"
                onClick={() => setReplied((r) => r.map((v, j) => (j === i ? true : v)))}
                className="text-xs font-extrabold px-2 py-1 rounded-lg bg-[#EEF0EB] text-[#55625E] cursor-pointer hover:bg-[#E2E6E1]"
                title="Demo: pretend they replied"
              >
                WAITING
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-[#55625E]">
        <Lock className="h-3.5 w-3.5" /> Budgets are private. Only the tightest one is used.
      </div>

      <a
        id="friends-send"
        href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="h-12 rounded-xl bg-[#1E8E4E] text-white text-base font-extrabold flex items-center justify-center gap-2 hover:bg-[#187A42]"
      >
        Send to the group on WhatsApp
      </a>
    </div>
  );
};
