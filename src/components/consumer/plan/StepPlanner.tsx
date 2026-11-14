import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Lock, Check, ExternalLink } from 'lucide-react';
import { TripPlan, TripPreferences, HotelItem } from '../../../types/travelBooking';
import { computeFullTripCost } from '../../../services/fullTripCostHelper';
import { TripPlanningEngine } from '../../../services/tripPlanningEngine';
import {
  travelOptions, applyTravelOption, journeyDates, selfDriveCost, trainCostForClass, fuelPriceFor,
  routeGeometry, TravelOption, formatHours
} from '../../../services/routeOptions';
import { resolveTravelDates } from '../../../services/dateResolver';
import { PlacePhoto } from './PlacePhoto';
import { FullTripCostCard } from './FullTripCostCard';
import { buildFlightSearchUrl, buildHotelSearchUrl, buildBusSearchUrl } from '../../../services/bookingLinks';
import { placesThatFit } from '../../../services/budgetFixes';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const ICON: Record<string, string> = { flight: '✈️', train: '🚆', bus: '🚌', selfdrive: '🚗', cab: '🚕' };

/* ------------------------------------------------------------------ */
/* One step: a dropdown that shows a one-line summary when it's done   */
/* ------------------------------------------------------------------ */
export const StepCard: React.FC<{
  n: number;
  title: string;
  /** one line shown when the step is done and closed, e.g. "Train · 18047 · 3A · ₹7,960" */
  summary?: string | null;
  open: boolean;
  locked?: boolean;
  lockedText?: string;
  onToggle: () => void;
  id?: string;
  children: React.ReactNode;
}> = ({ n, title, summary, open, locked, lockedText, onToggle, id, children }) => (
  <section id={id} className={`rounded-[18px] border bg-white text-left ${open ? 'border-[#0E6B59]' : 'border-[#E2E6E1]'} ${locked ? 'opacity-70' : ''}`}>
    <button
      type="button"
      onClick={() => !locked && onToggle()}
      aria-expanded={open}
      disabled={locked}
      className="w-full flex items-center gap-3 p-4 text-left cursor-pointer disabled:cursor-not-allowed"
    >
      <span className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${summary ? 'bg-[#0E6B59] text-white' : 'bg-[#E3F1EC] text-[#0E6B59]'}`}>
        {summary ? <Check className="h-4 w-4" /> : n}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[16px] font-bold text-[#15201D]">{title}</span>
        {locked ? (
          <span className="block text-xs text-[#55625E]">{lockedText}</span>
        ) : summary && !open ? (
          <span className="block text-xs text-[#0A5546] font-semibold truncate">{summary}</span>
        ) : null}
      </span>
      {locked ? <Lock className="h-4 w-4 text-[#55625E]" /> : open ? <ChevronUp className="h-5 w-5 text-[#55625E]" /> : (
        <span className="flex items-center gap-1 text-xs font-semibold text-[#0E6B59]">{summary ? 'Change' : 'Open'} <ChevronDown className="h-5 w-5" /></span>
      )}
    </button>
    {open && !locked && <div className="px-4 pb-4 space-y-3">{children}</div>}
  </section>
);

function tripDays(plan: TripPlan): { first: Date; last: Date } | null {
  const r = plan.dates ? resolveTravelDates(plan.dates) : null;
  return r && r.ok ? { first: r.start, last: r.end } : null;
}

/* ------------------------------------------------------------------ */
/* Step 1: how do you want to get there?                               */
/* ------------------------------------------------------------------ */
export const TravelStep: React.FC<{
  plan: TripPlan;
  daysIncludeTravel?: boolean;
  budgetINR: number;
  onChoose: (next: TripPlan, summary: string) => void;
  /** "Do these days include travel?" — answered here when the check screen was skipped */
  onDaysIncludeTravel?: (v: boolean) => void;
}> = ({ plan, daysIncludeTravel, budgetINR, onChoose, onDaysIncludeTravel }) => {
  const options = useMemo(() => travelOptions(plan), [plan.origin, plan.destination, plan.travellers?.total, plan.durationDays]);
  const pax = Math.max(1, plan.travellers?.total || 1);
  const days = tripDays(plan);
  const g = routeGeometry(plan);
  const chosenKey = plan.userChoices?.travelKey || '';

  // Train class and self-drive settings, per card
  const [trainClass, setTrainClass] = useState<Record<string, 'SL' | '3A' | '2A'>>({});
  const fp = fuelPriceFor(plan.origin);
  const [sd, setSd] = useState(plan.userChoices?.selfDrive || { fuel: 'petrol' as 'petrol' | 'diesel', kmpl: 15, cars: Math.max(1, Math.ceil(pax / 5)), fuelPriceINR: fp.petrol });

  if (options.length === 0) {
    return <p className="text-sm text-[#55625E]">{g.destName} is in or right next to {g.originName} — no long journey to plan. Go to step 2.</p>;
  }

  const costOf = (o: TravelOption) => {
    if (o.mode === 'train') return trainCostForClass(o, trainClass[o.key] || '3A', pax);
    if (o.mode === 'selfdrive') { const c = selfDriveCost({ roadKm: o.roadKm || 0, roadHours: o.oneWayHours, ...sd }); return { totalINR: c.totalINR, line: c.lines.join(' · ') }; }
    return { totalINR: o.travelCostINR, line: o.howPriced.join(' · ') };
  };
  const doorHours = (o: TravelOption) => o.oneWayHours + o.overheadHours;
  const fastest = options.reduce((m, o) => (doorHours(o) < doorHours(m) ? o : m), options[0]);
  const slowest = options.reduce((m, o) => (doorHours(o) > doorHours(m) ? o : m), options[0]);
  const cheapest = options.reduce((m, o) => (costOf(o).totalINR < costOf(m).totalINR ? o : m), options[0]);
  const flight = options.find((o) => o.mode === 'flight');
  // one per way of travelling, for the comparison lines (Bengaluru has two sample flights)
  const perMode = options.filter((o, i) => options.findIndex((x) => x.mode === o.mode) === i);
  const ground = options.filter((o) => o.mode !== 'flight').sort((a, b) => costOf(a).totalINR - costOf(b).totalINR)[0];

  return (
    <div className="space-y-3">
      {/* Available time flips the choice (Nani's rule) — with this trip's real numbers */}
      <div id="available-time-card" className="rounded-xl bg-[#F4F9F7] border border-[#0E6B59]/25 p-3.5 space-y-1.5">
        <div className="text-sm font-bold text-[#0E6B59]">⏳ Available time flips the choice (Nani's rule)</div>
        <ul className="text-[13px] text-[#15201D] space-y-1">
          <li><strong>Short on time?</strong> {ICON[fastest.mode]} {fastest.title}: about {formatHours(doorHours(fastest))} door to door each way.</li>
          {fastest.mode !== slowest.mode && (
            <li><strong>Time to spare?</strong> {perMode.filter((o) => o.mode !== fastest.mode).map((o) => `${ICON[o.mode]} ${o.title} ${formatHours(doorHours(o))}`).join(' · ')} — slower, but {cheapest !== fastest ? `${cheapest.title.toLowerCase()} is the cheapest` : 'you see the country on the way'}.</li>
          )}
          {flight && ground && costOf(flight).totalINR > costOf(ground).totalINR && (
            <li>Flying costs {inr(costOf(flight).totalINR - costOf(ground).totalINR)} more than the {ground.title.toLowerCase()} for {pax === 1 ? 'you' : `${pax} people`} and saves about {formatHours(doorHours(ground) - doorHours(flight))} each way.</li>
          )}
          {daysIncludeTravel && (
            <li className="text-[#9A4A00]">Your {plan.durationDays} days include travel: {perMode.map((o) => {
              const left = Math.max(0, plan.durationDays - Math.round(((doorHours(o) + o.haltNightsEachWay * 13) * 2) / 24 * 2) / 2);
              return `${o.title.toLowerCase()} leaves about ${left} day${left === 1 ? '' : 's'} in ${g.destName}`;
            }).join(' · ')}.</li>
          )}
        </ul>
        {onDaysIncludeTravel && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs" role="group" aria-label="Do your days include travel?">
            <span className="text-[#55625E]">Your {plan.durationDays} days:</span>
            {[false, true].map((v) => (
              <button key={String(v)} type="button" id={v ? 'step-days-include-travel' : 'step-days-without-travel'} aria-pressed={Boolean(daysIncludeTravel) === v}
                onClick={() => onDaysIncludeTravel(v)}
                className={`h-8 px-3 rounded-full border font-semibold cursor-pointer ${Boolean(daysIncludeTravel) === v ? 'bg-[#0E6B59] text-white border-[#0E6B59]' : 'bg-white text-[#15201D] border-[#D5D3CA]'}`}>
                {v ? 'include travel' : `in ${g.destName}, travel on top`}
              </button>
            ))}
          </div>
        )}
      </div>

      {options.map((o) => {
        const cost = costOf(o);
        const j = days ? journeyDates(o, days.first, days.last) : null;
        const key = o.mode === 'train' ? `${o.key}-${trainClass[o.key] || '3A'}` : o.key;
        const isChosen = chosenKey === key || (o.mode !== 'train' && chosenKey === o.key);
        const share = budgetINR > 0 ? Math.round((cost.totalINR / budgetINR) * 100) : 0;
        return (
          <article key={o.key} id={`travel-option-${o.mode}`} className={`rounded-[14px] p-3.5 space-y-2 ${isChosen ? 'border-2 border-[#0E6B59] bg-[#F4F9F7]' : 'border border-[#E2E6E1]'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[15px] font-bold text-[#15201D]">{ICON[o.mode]} {o.title}</span>
                  {o === fastest && <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5 bg-[#E3F1EC] text-[#0A5546]">Fastest</span>}
                  {o === cheapest && <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5 bg-[#FCEFD9] text-[#8A4307]">Cheapest</span>}
                  <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${o.checked ? 'bg-[#E3F1EC] text-[#0A5546]' : 'bg-[#F0E9DD] text-[#8A4307]'}`}>{o.checked ? 'Checked' : 'Estimate'}</span>
                </div>
                <div className="text-xs text-[#55625E] mt-0.5">{o.detail}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[17px] font-bold text-[#15201D] tabular-nums">{inr(cost.totalINR)}</div>
                <div className="text-[11px] text-[#55625E]">both ways, {pax === 1 ? 'you' : `${pax} people`}</div>
              </div>
            </div>

            <div className="text-[13px] text-[#15201D]">
              <strong>{formatHours(o.oneWayHours)}</strong> {o.mode === 'flight' ? 'in the air' : o.mode === 'selfdrive' || o.mode === 'cab' ? 'driving' : 'on board'} each way
              {o.overheadHours > 0 && <> · about {formatHours(doorHours(o))} door to door</>}
              {o.haltNightsEachWay > 0 && <> · {o.haltNightsEachWay} night stop{o.haltNightsEachWay > 1 ? 's' : ''} each way</>}
            </div>

            {j && (
              <div className="text-xs text-[#15201D] bg-[#F7F5F0] rounded-lg p-2 space-y-0.5">
                <div>🛫 Leave {g.originName}: <strong>{j.leave}</strong> → reach {g.destName}: <strong>{j.arrive}</strong></div>
                <div>🏠 Leave {g.destName}: {j.leaveGoa} → home: {j.home} · {j.awayDays} days away from home</div>
                {j.note && <div className="text-[#9A4A00]">{j.note}</div>}
              </div>
            )}

            {o.mode === 'train' && o.classes && (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Train class">
                {o.classes.map((c) => {
                  const on = (trainClass[o.key] || '3A') === c.code;
                  return (
                    <button key={c.code} type="button" onClick={() => setTrainClass((s) => ({ ...s, [o.key]: c.code }))}
                      className={`h-9 px-3 rounded-lg border text-xs font-semibold cursor-pointer ${on ? 'bg-[#0E6B59] text-white border-[#0E6B59]' : 'bg-white text-[#15201D] border-[#D5D3CA]'}`}>
                      {c.code} · {c.name} · {inr(c.fareINR)}/person
                    </button>
                  );
                })}
              </div>
            )}

            {o.mode === 'selfdrive' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <label className="space-y-1"><span className="block text-[#55625E]">Fuel</span>
                  <select value={sd.fuel} onChange={(e) => { const fuel = e.target.value as 'petrol' | 'diesel'; setSd((s) => ({ ...s, fuel, fuelPriceINR: fuel === 'diesel' ? fp.diesel : fp.petrol, kmpl: fuel === 'diesel' ? 18 : 15 })); }}
                    className="h-9 w-full rounded-lg border border-[#D5D3CA] px-2 bg-white">
                    <option value="petrol">Petrol</option><option value="diesel">Diesel</option>
                  </select></label>
                <label className="space-y-1"><span className="block text-[#55625E]">Mileage (km/l)</span>
                  <input type="number" min={5} max={40} value={sd.kmpl} onChange={(e) => setSd((s) => ({ ...s, kmpl: Math.max(5, Number(e.target.value) || 15) }))} className="h-9 w-full rounded-lg border border-[#D5D3CA] px-2" /></label>
                <label className="space-y-1"><span className="block text-[#55625E]">₹ per litre</span>
                  <input type="number" min={50} max={200} step={0.01} value={sd.fuelPriceINR} onChange={(e) => setSd((s) => ({ ...s, fuelPriceINR: Number(e.target.value) || s.fuelPriceINR }))} className="h-9 w-full rounded-lg border border-[#D5D3CA] px-2" /></label>
                <label className="space-y-1"><span className="block text-[#55625E]">Cars</span>
                  <input type="number" min={1} max={5} value={sd.cars} onChange={(e) => setSd((s) => ({ ...s, cars: Math.min(5, Math.max(1, Number(e.target.value) || 1)) }))} className="h-9 w-full rounded-lg border border-[#D5D3CA] px-2" /></label>
                <p className="col-span-2 sm:col-span-4 text-[11px] text-[#55625E]">
                  {sd.fuel === 'petrol' ? 'Petrol' : 'Diesel'} price {fp.checked ? `in ${fp.name}, checked Nov 2026` : '(India average — change it to your pump price)'}.
                </p>
              </div>
            )}

            <details className="text-xs text-[#55625E]">
              <summary className="cursor-pointer font-semibold text-[#0E6B59]">How this price is worked out</summary>
              <ul className="mt-1 space-y-0.5 list-disc pl-4">
                {cost.line.split(' · ').filter(Boolean).map((l) => <li key={l}>{l}</li>)}
                <li>{o.sourceNote}</li>
                {o.mode !== 'selfdrive' && o.mode !== 'cab' && <li>Cabs to and from the {o.mode === 'flight' ? 'airport' : o.mode === 'bus' ? 'bus stand' : 'station'} are added in the total.</li>}
              </ul>
            </details>

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className={`text-xs ${share > 100 ? 'text-[#9A4A00] font-semibold' : 'text-[#55625E]'}`}>
                {budgetINR > 0 ? `${share}% of your ${inr(budgetINR)} budget` : ''}
              </span>
              <button
                type="button"
                id={`choose-travel-${o.mode}`}
                onClick={() => {
                  const next = applyTravelOption(plan, o, {
                    trainClass: trainClass[o.key] || '3A',
                    selfDrive: o.mode === 'selfdrive' ? sd : undefined,
                    firstDay: days?.first, lastDay: days?.last
                  });
                  const label = o.mode === 'train' ? `${o.title} · ${o.detail.split(' · ')[0]} · ${trainClass[o.key] || '3A'}` : `${o.title} · ${o.detail.split(' · ')[0]}`;
                  onChoose(next, `${ICON[o.mode]} ${label} · ${inr(cost.totalINR)} both ways`);
                }}
                className={`h-10 px-4 rounded-[10px] text-[13px] font-semibold cursor-pointer ${isChosen ? 'bg-[#0E6B59] text-white' : 'border border-[#0E6B59] bg-white text-[#0E6B59] hover:bg-[#E3F1EC]'}`}
              >
                {isChosen ? 'Chosen ✓ (tap to update)' : `Choose ${o.title.toLowerCase()}`}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Step 2: where do you want to stay?                                  */
/* ------------------------------------------------------------------ */
export function stayChoices(plan: TripPlan): HotelItem[] {
  const listed = [...(plan.availableHotels || [])];
  if (listed.length === 0 && plan.hotel) listed.push(plan.hotel);
  const cheapest = [...listed].sort((a, b) => a.pricePerNightINR - b.pricePerNightINR)[0];
  // A budget guesthouse / homestay, as people really book it (estimate)
  if (cheapest && cheapest.pricePerNightINR > 1500 && !listed.some((h) => /guesthouse|homestay/i.test(h.name))) {
    const price = Math.max(900, Math.round((cheapest.pricePerNightINR * 0.6) / 50) * 50);
    listed.push({
      ...cheapest,
      id: `${cheapest.id}-guesthouse`,
      name: `Guesthouse / homestay in ${(cheapest.area || plan.destination).replace(/,.*$/, '')}`,
      roomType: 'Clean double room, private bath', starRating: 2, pricePerNightINR: price, totalPriceINR: 0,
      reviewScore: 0, reviewsCount: 0, breakfastIncluded: false, tag: 'Within Budget', source: 'estimate', sourceLabel: 'Estimate'
    });
  }
  return listed.sort((a, b) => a.pricePerNightINR - b.pricePerNightINR);
}

export const StayStep: React.FC<{
  plan: TripPlan;
  preferences?: TripPreferences | null;
  onChoose: (next: TripPlan, summary: string) => void;
}> = ({ plan, preferences, onChoose }) => {
  const hotels = useMemo(() => stayChoices(plan), [plan.availableHotels, plan.hotel?.id]);
  const regions = Array.from(new Set(hotels.map((h) => (h.area.match(/(North|South|Central|Old)\s+[A-Z][a-z]+/) || [])[0]).filter(Boolean))) as string[];
  const [region, setRegion] = useState<string>('All');
  const [maxPrice, setMaxPrice] = useState<number>(0);
  const nights = Math.max(1, plan.durationDays - 1) + (plan.userChoices?.extraNights || 0);
  const shown = hotels.filter((h) => (region === 'All' || h.area.includes(region)) && (!maxPrice || h.pricePerNightINR <= maxPrice));
  const priceSteps = [2000, 4000, 8000].filter((p) => hotels.some((h) => h.pricePerNightINR <= p) && hotels.some((h) => h.pricePerNightINR > p));

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#55625E]">
        {nights} night{nights > 1 ? 's' : ''}{plan.userChoices?.extraNights ? ` (incl. ${plan.userChoices.extraNights} extra for your train times)` : ''}. Photos show the area around each stay (not the hotel itself) unless they say otherwise. Prices are sample rates — check the live price when you book.
      </p>
      {(regions.length > 1 || priceSteps.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {regions.length > 1 && ['All', ...regions].map((r) => (
            <button key={r} type="button" onClick={() => setRegion(r)} className={`h-8 px-3 rounded-full border text-xs font-semibold cursor-pointer ${region === r ? 'bg-[#0E6B59] text-white border-[#0E6B59]' : 'bg-white border-[#D5D3CA] text-[#15201D]'}`}>{r}</button>
          ))}
          {priceSteps.map((p) => (
            <button key={p} type="button" onClick={() => setMaxPrice(maxPrice === p ? 0 : p)} className={`h-8 px-3 rounded-full border text-xs font-semibold cursor-pointer ${maxPrice === p ? 'bg-[#0E6B59] text-white border-[#0E6B59]' : 'bg-white border-[#D5D3CA] text-[#15201D]'}`}>Under {inr(p)}/night</button>
          ))}
        </div>
      )}
      {shown.map((h) => {
        const withThis = TripPlanningEngine.swapComponent(plan, { hotel: h });
        const stayLine = computeFullTripCost(withThis, preferences || undefined).lines.find((l) => l.id === 'cost-stay');
        const chosen = plan.userChoices?.hotelId === h.id;
        const reviewsUrl = `https://www.google.com/search?q=${encodeURIComponent(`${h.name.replace(/,.*$/, '')} ${h.area} reviews`)}&hl=en&lr=lang_en&gl=in`;
        const isEstimate = h.source === 'estimate';
        return (
          <article key={h.id} id={`stay-${h.id}`} className={`rounded-[14px] p-3 flex gap-3 ${chosen ? 'border-2 border-[#0E6B59] bg-[#F4F9F7]' : 'border border-[#E2E6E1]'}`}>
            <PlacePhoto
              place={isEstimate ? h.area : h.name}
              destination={h.city || plan.destination}
              kind={isEstimate ? 'place' : 'hotel'}
              area={h.area}
              label={isEstimate ? `Area: ${h.area.replace(/,.*$/, '')}` : undefined}
              showCredit
              className="h-28 w-32 sm:h-32 sm:w-44 shrink-0 rounded-xl"
              fallback={<div className="h-28 w-32 sm:h-32 sm:w-44 shrink-0 rounded-xl bg-[#EEF1EC] flex items-center justify-center text-3xl">🏨</div>}
            />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[15px] font-bold text-[#15201D] leading-snug">{h.name.replace(/,\s*~₹.*$/, '')}</div>
                  <div className="text-xs text-[#55625E]">{h.area} · {h.starRating}★{h.reviewScore ? ` · ${h.reviewScore}/5 (${h.reviewsCount.toLocaleString('en-IN')} reviews, sample)` : ''}</div>
                </div>
                <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 shrink-0 ${isEstimate ? 'bg-[#F0E9DD] text-[#8A4307]' : 'bg-[#EEF1EC] text-[#55625E]'}`}>{isEstimate ? 'Estimate' : 'Sample'}</span>
              </div>
              <div className="text-xs text-[#15201D]">{h.roomType}{h.breakfastIncluded ? ' · breakfast included' : ''}{h.freeCancellation ? ' · free cancellation' : ''}</div>
              <div className="flex items-end justify-between gap-2 pt-1">
                <div>
                  <div className="text-[15px] font-bold text-[#15201D]">{inr(h.pricePerNightINR)}<span className="text-xs font-normal text-[#55625E]">/night</span></div>
                  {stayLine && <div className="text-[11px] text-[#55625E]">{inr(stayLine.amountINR)} for {nights} night{nights > 1 ? 's' : ''}{/×\s*\d+ rooms|rooms/.test(stayLine.subtitle || '') ? ' (all rooms)' : ''}</div>}
                </div>
                <div className="flex items-center gap-2">
                  {!isEstimate && (
                    <a href={reviewsUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#0E6B59] hover:underline inline-flex items-center gap-1">Reviews <ExternalLink className="h-3 w-3" /></a>
                  )}
                  <button
                    type="button"
                    id={`choose-stay-${h.id}`}
                    onClick={() => onChoose({ ...withThis, userChoices: { ...(plan.userChoices || {}), hotelId: h.id } }, `🛏 ${h.name.replace(/,\s*~₹.*$/, '')} · ${inr(h.pricePerNightINR)}/night`)}
                    className={`h-10 px-3.5 rounded-[10px] text-[13px] font-semibold cursor-pointer ${chosen ? 'bg-[#0E6B59] text-white' : 'border border-[#0E6B59] bg-white text-[#0E6B59] hover:bg-[#E3F1EC]'}`}
                  >
                    {chosen ? 'Chosen ✓' : 'Choose'}
                  </button>
                </div>
              </div>
            </div>
          </article>
        );
      })}
      {shown.length === 0 && <p className="text-sm text-[#55625E]">No stays match these filters.</p>}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Step 3 helper: add your own place to a day                          */
/* ------------------------------------------------------------------ */
export const AddPlaceToDay: React.FC<{ plan: TripPlan; onAdd: (next: TripPlan, msg: string) => void }> = ({ plan, onAdd }) => {
  const [text, setText] = useState('');
  const [day, setDay] = useState(Math.min(2, plan.itinerary.length));
  const add = () => {
    const place = text.trim().replace(/^add\s+/i, '');
    if (!place) return;
    // Saved as a choice; the day plan, the map and the Google Maps route all pick it up
    const addedStops = [...(plan.userChoices?.addedStops || []), { day, place }];
    onAdd({ ...plan, userChoices: { ...(plan.userChoices || {}), addedStops } }, `Added ${place} to Day ${day}${day > 1 ? ' — tap “See days” below to see it' : ''}`);
    setText('');
  };
  return (
    <div className="rounded-xl border border-dashed border-[#0E6B59]/40 bg-[#F9FBFA] p-3 space-y-2">
      <div className="text-sm font-bold text-[#15201D]">Add a place or activity</div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          id="add-place-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
          placeholder="e.g. Dudhsagar Falls, a spice farm, Fontainhas walk"
          className="h-10 flex-1 rounded-lg border border-[#D5D3CA] px-3 text-sm focus:ring-2 focus:ring-[#0E6B59] focus:outline-none"
        />
        <select id="add-place-day" value={day} onChange={(e) => setDay(Number(e.target.value))} className="h-10 rounded-lg border border-[#D5D3CA] px-2 text-sm bg-white">
          {plan.itinerary.map((d, i) => <option key={i} value={i + 1}>Day {i + 1}</option>)}
        </select>
        <button id="add-place-button" type="button" onClick={add} className="h-10 px-4 rounded-lg bg-[#0E6B59] text-white text-sm font-semibold cursor-pointer">Add</button>
      </div>
      <p className="text-[11px] text-[#55625E]">It appears on that day, on the map and in the Google Maps route. Entry tickets for added places aren't in the total.</p>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Step 4: one total, what fits, and where to book                     */
/* ------------------------------------------------------------------ */

export const TotalStep: React.FC<{
  plan: TripPlan;
  preferences?: TripPreferences | null;
  budgetINR: number;
  onApply: (next: TripPlan, msg: string) => void;
  onTryPlace?: (place: string) => void;
}> = ({ plan, preferences, budgetINR, onApply, onTryPlace }) => {
  const cost = computeFullTripCost(plan, preferences || undefined);
  const total = cost.totalWithBufferINR;
  const pax = Math.max(1, plan.travellers?.total || 1);
  const over = budgetINR > 0 ? total - budgetINR : 0;
  const days = tripDays(plan);

  // The cheapest way to do these same days: every travel option × every stay, same cost engine
  const cheapest = useMemo(() => {
    if (over <= 0) return null;
    let best: { plan: TripPlan; total: number; label: string } | null = null;
    for (const o of travelOptions(plan)) {
      const variants = o.mode === 'train' ? (['SL', '3A'] as const) : ([undefined] as const);
      for (const cls of variants) {
        const withTravel = applyTravelOption(plan, o, { trainClass: cls, firstDay: days?.first, lastDay: days?.last });
        for (const h of stayChoices(plan)) {
          const p = { ...TripPlanningEngine.swapComponent(withTravel, { hotel: h }), userChoices: { ...(withTravel.userChoices || {}), hotelId: h.id } };
          const t = computeFullTripCost(p, preferences || undefined).totalWithBufferINR;
          if (!best || t < best.total) best = { plan: p, total: t, label: `${o.title}${cls ? ` (${cls})` : ''} + ${h.name.replace(/,\s*~₹.*$/, '')}` };
        }
      }
    }
    return best && best.total < total - 200 ? best : null;
  }, [plan, preferences, over]);

  const cheapestStillOver = cheapest ? cheapest.total > budgetINR : over > 0;
  const fitPlaces = useMemo(() => (over > 0 && cheapestStillOver
    ? placesThatFit({
        origin: plan.origin, days: plan.durationDays,
        adults: plan.travellers.adults + (plan.travellers.seniors || 0), children: plan.travellers.children || 0,
        childAges: plan.travellers.childAges, budgetINR, excludeName: plan.destination.replace(/,.*$/, '').trim(), limit: 3
      })
    : []), [over, cheapestStillOver, plan.origin, plan.durationDays, budgetINR]);

  const party = { adults: plan.travellers.adults + (plan.travellers.seniors || 0), children: plan.travellers.children, childAges: plan.travellers.childAges };
  const g = routeGeometry(plan);
  const links: { label: string; url: string }[] = [];
  if (plan.flight) { const u = buildFlightSearchUrl(plan.flight.originCode, plan.flight.destinationCode, plan.dates, party); if (u) links.push({ label: `Flights ${plan.flight.originCode} ⇄ ${plan.flight.destinationCode} on MakeMyTrip`, url: u }); }
  else if (plan.selectedTrain?.mode === 'bus') links.push({ label: `Buses ${g.originName} ⇄ ${g.destName} on redBus`, url: buildBusSearchUrl(g.originName, g.destName) });
  else if (plan.selectedTrain) links.push({ label: `Train ${plan.selectedTrain.trainNumber || ''} on IRCTC`.replace('  ', ' '), url: 'https://www.irctc.co.in/nget/train-search' });
  links.push({ label: `Stays in ${(plan.hotel.area || g.destName).replace(/,.*$/, '')} on Booking.com`, url: buildHotelSearchUrl(plan.hotel.area || plan.hotel.city || g.destName, plan.dates, party) });

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[13px] font-semibold text-[#55625E]">Real total for {pax === 1 ? 'you' : `all ${pax}`} · incl. 15% buffer</div>
        <div className="flex items-end justify-between gap-3">
          <div id="step-total-amount" className="text-[36px] leading-[40px] font-bold tracking-tight text-[#15201D] tabular-nums">{inr(total)}</div>
          {pax > 1 && <div className="text-right"><div className="text-lg font-bold text-[#15201D] tabular-nums">{inr(cost.perPersonINR)}</div><div className="text-xs text-[#55625E]">each</div></div>}
        </div>
      </div>
      {budgetINR > 0 && (
        <div className="space-y-1">
          <div className="h-2.5 rounded-full bg-[#F0E9DD] overflow-hidden flex" aria-hidden="true">
            <div className="bg-[#0E6B59]" style={{ width: `${Math.min(100, Math.round((Math.min(total, budgetINR) / Math.max(total, budgetINR)) * 100))}%` }} />
            {over > 0 && <div className="bg-[#C2620A]" style={{ width: `${100 - Math.round((budgetINR / total) * 100)}%` }} />}
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-[#55625E]">Your budget {inr(budgetINR)}</span>
            {over > 0 ? <span className="font-bold text-[#9A4A00]">{inr(over)} over</span> : <span className="font-bold text-[#0A5546]">Fits · {inr(-over)} left</span>}
          </div>
        </div>
      )}

      {over > 0 && (
        <div id="over-budget-help" className="rounded-xl bg-[#FFFDF7] border border-[#8A4307]/30 p-3 space-y-2">
          {cheapest ? (
            <>
              <div className="text-sm text-[#15201D]">
                The cheapest way to do these same {plan.durationDays} days is <strong>{inr(cheapest.total)}</strong>: {cheapest.label}.
                {cheapest.total > budgetINR ? ` Still ${inr(cheapest.total - budgetINR)} over.` : ' That fits your budget.'}
              </div>
              <button type="button" id="apply-cheapest" onClick={() => onApply(cheapest.plan, `Cheapest way: ${cheapest.label}: ${inr(total)} → ${inr(cheapest.total)}`)}
                className="h-10 px-4 rounded-[10px] border border-[#0E6B59] bg-white text-[#0E6B59] text-[13px] font-semibold cursor-pointer hover:bg-[#E3F1EC]">
                Switch to the cheapest way
              </button>
            </>
          ) : (
            <div className="text-sm text-[#15201D]">This is already the cheapest way to do these {plan.durationDays} days.</div>
          )}
          {fitPlaces.length === 0 && cheapestStillOver && (
            <div className="text-xs text-[#55625E]">
              No place in our list fits {inr(budgetINR)} for {plan.durationDays} days for {pax === 1 ? 'you' : `${pax} people`} from {g.originName}. To do this trip the cheapest way, plan for {inr(cheapest ? cheapest.total : total)}.
            </div>
          )}
          {fitPlaces.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="text-xs font-semibold text-[#15201D]">Or {plan.durationDays} days somewhere that fits {inr(budgetINR)}:</div>
              {fitPlaces.map((p) => (
                <button key={p.name} type="button" disabled={!onTryPlace} onClick={() => onTryPlace && onTryPlace(p.name)}
                  className="w-full rounded-xl bg-white border border-[#E2E6E1] hover:border-[#0E6B59] p-2.5 text-left flex items-center gap-3 cursor-pointer disabled:cursor-default">
                  <PlacePhoto place={p.name} className="h-14 w-16 shrink-0 rounded-lg" />
                  <span className="flex-1 min-w-0"><span className="block text-sm font-bold text-[#15201D]">{p.name}</span><span className="block text-xs text-[#55625E]">{p.state} · about {p.roadKm} km by road</span></span>
                  <span className="text-right shrink-0"><span className="block text-sm font-bold text-[#15201D]">from {inr(p.totalINR)}</span><span className="block text-[11px] font-semibold text-[#0A5546]">Fits · estimate</span></span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <FullTripCostCard plan={plan} preferences={preferences} embedded />

      <div className="space-y-1.5">
        <div className="text-sm font-bold text-[#15201D]">Book</div>
        {links.map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl border border-[#E2E6E1] px-3 py-2.5 text-sm font-semibold text-[#0E6B59] hover:border-[#0E6B59]">
            <span>{l.label}</span><ExternalLink className="h-4 w-4" />
          </a>
        ))}
        <p className="text-[11px] text-[#55625E]">You book on these sites; prices there are live and may differ from our estimate.</p>
      </div>
    </div>
  );
};
