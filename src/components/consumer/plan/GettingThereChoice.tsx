import React, { useMemo } from 'react';
import { TripPlan, TripPreferences } from '../../../types/travelBooking';
import { gettingThereOptions, gettingThereAdvice, GettingThereOption } from '../../../services/gettingThere';

interface GettingThereChoiceProps {
  plan: TripPlan;
  preferences?: TripPreferences | null;
  onChoose: (option: GettingThereOption) => void;
}

const ICON: Record<string, string> = { flight: '✈️', train: '🚆', bus: '🚌', road: '🚗' };
const WHEN: Record<string, string> = {
  flight: 'Short on time',
  train: 'Save money, sleep on the way',
  bus: 'Save money, sleep on the way',
  road: 'Time to spare, want to stop on the way'
};

/**
 * "How do you want to get there?" — visible near the top so the traveller can decide by
 * how much time they have. Each card's total is the whole trip with that travel, from the
 * same cost engine as the big total above; one tap switches the plan.
 */
export const GettingThereChoice: React.FC<GettingThereChoiceProps> = ({ plan, preferences, onChoose }) => {
  const options = useMemo(() => gettingThereOptions(plan, preferences), [plan, preferences]);
  if (options.length < 2) return null;
  const current = options.find((o) => o.isCurrent);
  const advice = gettingThereAdvice(options, plan.durationDays);
  const fastest = options.reduce((m, o) => (o.hours < m.hours ? o : m), options[0]);
  const cheapest = options.reduce((m, o) => (o.totalINR < m.totalINR ? o : m), options[0]);
  const inr = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`;
  const from = plan.origin.replace(/\s*\([^)]*\)/, '');
  const to = plan.destination.replace(/,.*$/, '');

  return (
    <section id="getting-there-choice" aria-labelledby="getting-there-title" className="rounded-[18px] bg-white border border-[#E2E6E1] p-4 sm:p-5 space-y-3 text-left">
      <div>
        <h2 id="getting-there-title" className="text-[17px] font-bold text-[#15201D]">How do you want to get there?</h2>
        <p className="text-xs text-[#55625E] mt-0.5">
          {from} → {to}. Pick by how much time you have — each price is the whole {plan.durationDays}-day trip for {plan.travellers.total === 1 ? 'you' : plan.travellers.total === 2 ? 'both of you' : `all ${plan.travellers.total}`} with that travel.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {options.map((o) => {
          const diff = current ? o.totalINR - current.totalINR : 0;
          return (
            <article
              key={o.key}
              className={`rounded-[14px] p-3 flex flex-col gap-1.5 ${o.isCurrent ? 'border-2 border-[#0E6B59] bg-[#F4F9F7]' : 'border border-[#E2E6E1] bg-white'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-bold text-[#15201D]">{ICON[o.key]} {o.label}</span>
                <span className="flex gap-1">
                  {o === fastest && <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5 bg-[#E3F1EC] text-[#0A5546]">Fastest</span>}
                  {o === cheapest && <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5 bg-[#FCEFD9] text-[#8A4307]">Cheapest</span>}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-[#0E6B59]">{WHEN[o.key]}</div>
              <div className="text-[13px] text-[#15201D] font-semibold">{o.timeText}</div>
              <div className="text-xs text-[#55625E]">{o.detail}{o.overnight && o.key !== 'road' ? ' · overnight' : ''}</div>
              <div className="mt-auto pt-1.5 space-y-2">
                <div>
                  <div className="text-[17px] font-bold text-[#15201D] tabular-nums">{inr(o.totalINR)}</div>
                  <div className="text-[11px] text-[#55625E]">
                    {o.isCurrent ? 'your plan now' : diff === 0 ? 'same total' : `${diff > 0 ? '+' : '−'}${inr(diff)} vs now`}
                  </div>
                </div>
                <button
                  type="button"
                  id={`choose-travel-${o.key}`}
                  aria-pressed={o.isCurrent}
                  onClick={() => !o.isCurrent && onChoose(o)}
                  className={`h-10 w-full px-3 rounded-[10px] border border-[#0E6B59] text-[13px] font-semibold whitespace-nowrap ${
                    o.isCurrent ? 'bg-[#0E6B59] text-white cursor-default' : 'bg-white text-[#0E6B59] hover:bg-[#E3F1EC] cursor-pointer'
                  }`}
                >
                  {o.isCurrent ? 'Selected' : `Go by ${o.label.toLowerCase()}`}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {advice.length > 0 && (
        <ul className="text-xs text-[#15201D] space-y-1 list-disc pl-4">
          {advice.map((a) => <li key={a}>{a}</li>)}
        </ul>
      )}
      <p className="text-[11px] text-[#55625E]">
        Flight and train totals include cabs to and from the airport / station. Road = a private cab with driver, both ways. Times are from the listed schedule; check the exact timing when you book.
      </p>
    </section>
  );
};
