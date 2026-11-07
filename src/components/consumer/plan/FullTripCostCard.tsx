import React, { useState, useMemo } from 'react';
import { TripPlan, TripPreferences } from '../../../types/travelBooking';
import { computeFullTripCost } from '../../../services/fullTripCostHelper';
import {
  Sparkles,
  Info,
  AlertTriangle,
  CheckCircle2,
  Share2,
  MessageCircle,
  Check,
  Sliders,
  Calculator,
  Users,
  Moon,
  Plane,
  Train,
  Car,
  Building2,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { shareTripPlan, getWhatsAppShareUrl } from '../../../services/shareTripHelper';

interface FullTripCostCardProps {
  plan: TripPlan;
  preferences?: TripPreferences | null;
  onApplyEstimate?: (updatedPlan: TripPlan) => void;
}

export const FullTripCostCard: React.FC<FullTripCostCardProps> = ({
  plan,
  preferences,
  onApplyEstimate
}) => {
  // 1. Core buffer percent state (Prompt / PRD rule: defaults to 25%)
  const [bufferPercent, setBufferPercent] = useState<number>(25);

  // Compute standard plan cost
  const cost = computeFullTripCost(plan, preferences, {
    customBufferPercent: bufferPercent,
    useCategoryWeights: true
  });

  const baseAdults = plan.travellers?.adults || preferences?.adultsCount || 2;
  const baseKids = (plan.travellers?.children ?? (plan.travellers?.childAges?.length || 0)) ||
    (preferences?.childrenCount ?? (preferences?.childrenAges?.length || 0)) || 0;
  const hasChildren = baseKids > 0;

  // 2. Real-Time Estimator Controls State
  const [showEstimator, setShowEstimator] = useState<boolean>(false);
  const [estNights, setEstNights] = useState<number>(plan.itinerary?.length ? Math.max(1, plan.itinerary.length - 1) : 4);
  const [estAdults, setEstAdults] = useState<number>(baseAdults);
  const [estKids, setEstKids] = useState<number>(baseKids);
  const [estTransitMode, setEstTransitMode] = useState<'flight' | 'train' | 'cab'>(
    plan.flight ? 'flight' : (plan as any).trains?.length || (plan as any).train ? 'train' : 'flight'
  );
  const [estStayTier, setEstStayTier] = useState<'budget' | 'standard' | 'luxury'>(
    plan.hotel?.starRating && plan.hotel.starRating >= 4 ? 'luxury' : 'standard'
  );

  // Sharing state
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared'>('idle');

  // Real-Time Estimation Math Engine
  const liveEstimate = useMemo(() => {
    const totalPax = estAdults + estKids;
    const roomsCount = Math.max(1, Math.ceil((estAdults + (estKids > 1 ? 1 : 0)) / 2));

    // Per night stay rates based on tier & destination
    const stayRatePerNight = estStayTier === 'budget' ? 1800 : estStayTier === 'standard' ? 3600 : 7500;
    const staysTotal = estNights * roomsCount * stayRatePerNight;

    // Transit fares per person return
    const transitUnitFare = estTransitMode === 'flight' ? 4800 : estTransitMode === 'train' ? 1650 : 2500;
    const transitTotal = estTransitMode === 'cab'
      ? Math.max(transitUnitFare * 2, transitUnitFare * Math.ceil(totalPax / 4))
      : totalPax * transitUnitFare;

    // Meals: ~₹900/adult/day, ~₹450/child/day
    const daysCount = estNights + 1;
    const mealsTotal = daysCount * (estAdults * 900 + estKids * 450);

    // Sightseeing & Activities: ~₹600/adult/day, ~₹250/child/day
    const activitiesTotal = daysCount * (estAdults * 600 + estKids * 250);

    // Local transfers / cabs within city: ~₹950/day
    const localTransportTotal = daysCount * 950;

    // Base subtotal
    const subtotal = staysTotal + transitTotal + mealsTotal + activitiesTotal + localTransportTotal;

    // Dynamic buffer with category weights (PRD: food 35%, shopping/quirks 40%)
    const weightedBuffer = Math.round(
      subtotal * (bufferPercent / 100) * 1.05
    );

    const grandTotal = subtotal + weightedBuffer;
    const targetBudget = cost.targetBudgetINR || 60000;
    const diffINR = targetBudget - grandTotal;
    const perPersonINR = Math.round(grandTotal / Math.max(1, totalPax));

    return {
      totalPax,
      roomsCount,
      daysCount,
      staysTotal,
      transitTotal,
      mealsTotal,
      activitiesTotal,
      localTransportTotal,
      subtotal,
      weightedBuffer,
      grandTotal,
      diffINR,
      perPersonINR,
      isUnderBudget: diffINR >= 0
    };
  }, [estNights, estAdults, estKids, estTransitMode, estStayTier, bufferPercent, cost.targetBudgetINR]);

  const handleShareClick = async () => {
    const res = await shareTripPlan(plan, preferences);
    if (res.method === 'clipboard') {
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2500);
    } else if (res.method === 'whatsapp') {
      window.open(getWhatsAppShareUrl(plan, preferences), '_blank', 'noopener,noreferrer');
    } else if (res.method === 'native' && res.success) {
      setShareStatus('shared');
      setTimeout(() => setShareStatus('idle'), 2500);
    }
  };

  const whatsappUrl = getWhatsAppShareUrl(plan, preferences);

  // Apply Real-Time Estimate to active trip plan
  const handleApplyEstimate = () => {
    if (!onApplyEstimate) return;
    const updatedPlan: TripPlan = {
      ...plan,
      travellers: {
        total: estAdults + estKids,
        adults: estAdults,
        children: estKids,
        childAges: Array(estKids).fill(5),
        seniors: 0
      },
      hotel: {
        ...plan.hotel,
        pricePerNightINR: estStayTier === 'budget' ? 1800 : estStayTier === 'standard' ? 3600 : 7500,
        totalPriceINR: liveEstimate.staysTotal
      }
    };
    onApplyEstimate(updatedPlan);
  };

  return (
    <div
      id="full-trip-cost-card"
      data-testid="full-trip-cost-card"
      className="card-consumer p-5 sm:p-6 mb-6 space-y-5 text-left border-[#E2E6E1] bg-white shadow-sm"
    >
      {/* Header with Title and Budget Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E6E1]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E3F1EC] text-[#0E6B59]">
              REAL TOTAL COST
            </span>
            <span className="text-xs text-[#55625E]">Before you go</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#15201D] font-heading mt-1">
            Trip Cost Breakdown & Live Estimations
          </h2>
        </div>

        {/* Budget Status Badge */}
        <div className="flex items-center gap-2">
          {cost.budgetStatus === 'over' ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-[#FCEFD9] text-[#8A4307]">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{cost.statusLabel}</span>
            </span>
          ) : cost.budgetStatus === 'close' ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-[#FEF3C7] text-[#92400E]">
              <Info className="h-3.5 w-3.5" />
              <span>{cost.statusLabel}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-[#E3F1EC] text-[#0E6B59]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{cost.statusLabel}</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Totals: Total with Buffer & Per Person */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#F5F6F3] border border-[#E2E6E1]">
        <div className="space-y-1">
          <div className="text-xs font-medium text-[#55625E]">
            Total with {cost.bufferPercent}% buffer
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#15201D] font-heading tracking-tight">
            ₹{cost.totalWithBufferINR.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-[#55625E]">
            Target budget: ₹{cost.targetBudgetINR.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="space-y-1 sm:text-right border-t sm:border-t-0 sm:border-l border-[#E2E6E1] pt-3 sm:pt-0 sm:pl-4">
          <div className="text-xs font-medium text-[#55625E]">
            Per person (all travellers)
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#0E6B59] font-heading tracking-tight">
            ₹{cost.perPersonINR.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-[#55625E]">
            Across {cost.totalTravellers} traveller{cost.totalTravellers === 1 ? '' : 's'}{hasChildren ? ' (including children)' : ''}
          </div>
        </div>
      </div>

      {/* Real-Time Estimator & Interactive Budget Simulator Toggle */}
      <div className="rounded-xl border border-[#0E6B59]/30 bg-[#F8FCFA] p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-[#0E6B59]" />
            <div>
              <div className="text-xs font-bold text-[#15201D] flex items-center gap-1.5">
                <span>Real-Time Budget Estimator</span>
                <span className="text-[10px] bg-[#0E6B59] text-white px-1.5 py-0.2 rounded font-semibold">
                  Interactive
                </span>
              </div>
              <div className="text-[10px] text-[#55625E]">
                Test live variations: change nights, party size, transit or stay tier
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowEstimator(!showEstimator)}
            className="text-xs font-bold text-[#0E6B59] hover:underline px-2.5 py-1 rounded-lg bg-white border border-[#0E6B59]/30"
          >
            {showEstimator ? 'Close Levers' : 'Open Levers'}
          </button>
        </div>

        {/* Live Estimator Levers Panel */}
        {showEstimator && (
          <div className="space-y-3 pt-2 border-t border-[#0E6B59]/20 animate-fade-in text-xs">
            {/* Levers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Nights / Duration */}
              <div className="p-2.5 bg-white rounded-lg border border-[#CBD5E1] space-y-1.5">
                <div className="flex items-center justify-between font-bold text-[#15201D] text-[11px]">
                  <span className="flex items-center gap-1">
                    <Moon className="h-3 w-3 text-[#0E6B59]" />
                    <span>Duration</span>
                  </span>
                  <span className="text-[#0E6B59]">{estNights} Nights ({estNights + 1} Days)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[3, 4, 6, 8, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setEstNights(n)}
                      className={`flex-1 py-1 rounded text-[10px] font-semibold transition ${
                        estNights === n
                          ? 'bg-[#0E6B59] text-white'
                          : 'bg-[#F1F5F9] text-[#55625E] hover:bg-[#E2E8F0]'
                      }`}
                    >
                      {n}N
                    </button>
                  ))}
                </div>
              </div>

              {/* Travellers (Adults + Kids) */}
              <div className="p-2.5 bg-white rounded-lg border border-[#CBD5E1] space-y-1.5">
                <div className="flex items-center justify-between font-bold text-[#15201D] text-[11px]">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-[#0E6B59]" />
                    <span>Travellers</span>
                  </span>
                  <span className="text-[#0E6B59]">{estAdults} Adults{estKids > 0 ? `, ${estKids} Kids` : ''}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="text-[#55625E]">Adults:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEstAdults((p) => Math.max(1, p - 1))}
                        className="h-5 w-5 rounded bg-slate-200 text-[#15201D] font-bold"
                      >
                        -
                      </button>
                      <span className="w-4 text-center font-bold">{estAdults}</span>
                      <button
                        type="button"
                        onClick={() => setEstAdults((p) => Math.min(8, p + 1))}
                        className="h-5 w-5 rounded bg-slate-200 text-[#15201D] font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="text-[#55625E]">Kids:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEstKids((p) => Math.max(0, p - 1))}
                        className="h-5 w-5 rounded bg-slate-200 text-[#15201D] font-bold"
                      >
                        -
                      </button>
                      <span className="w-4 text-center font-bold">{estKids}</span>
                      <button
                        type="button"
                        onClick={() => setEstKids((p) => Math.min(5, p + 1))}
                        className="h-5 w-5 rounded bg-slate-200 text-[#15201D] font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transit Mode */}
              <div className="p-2.5 bg-white rounded-lg border border-[#CBD5E1] space-y-1.5">
                <div className="flex items-center justify-between font-bold text-[#15201D] text-[11px]">
                  <span className="flex items-center gap-1">
                    <Plane className="h-3 w-3 text-[#0E6B59]" />
                    <span>Transit Mode</span>
                  </span>
                  <span className="text-[#0E6B59] capitalize">{estTransitMode}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'flight', label: '✈️ Flights' },
                    { id: 'train', label: '🚆 2AC Train' },
                    { id: 'cab', label: '🚗 Cab/Drive' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setEstTransitMode(m.id as any)}
                      className={`py-1 rounded text-[10px] font-semibold transition ${
                        estTransitMode === m.id
                          ? 'bg-[#0E6B59] text-white'
                          : 'bg-[#F1F5F9] text-[#55625E] hover:bg-[#E2E8F0]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stay Tier */}
              <div className="p-2.5 bg-white rounded-lg border border-[#CBD5E1] space-y-1.5">
                <div className="flex items-center justify-between font-bold text-[#15201D] text-[11px]">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-[#0E6B59]" />
                    <span>Stay Tier</span>
                  </span>
                  <span className="text-[#0E6B59] capitalize">{estStayTier}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'budget', label: 'Budget (~1.8k)' },
                    { id: 'standard', label: 'Standard (3.6k)' },
                    { id: 'luxury', label: 'Luxury (7.5k)' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setEstStayTier(t.id as any)}
                      className={`py-1 rounded text-[10px] font-semibold transition ${
                        estStayTier === t.id
                          ? 'bg-[#0E6B59] text-white'
                          : 'bg-[#F1F5F9] text-[#55625E] hover:bg-[#E2E8F0]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Real-Time Estimation Results Summary Bar */}
            <div className="p-3 bg-white rounded-xl border border-[#0E6B59]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-[10px] uppercase font-bold text-[#55625E]">
                  Live Dynamic Estimated Total ({bufferPercent}% buffer)
                </div>
                <div className="text-xl font-black text-[#15201D]">
                  ₹{liveEstimate.grandTotal.toLocaleString('en-IN')}{' '}
                  <span className="text-xs font-normal text-[#55625E]">
                    (₹{liveEstimate.perPersonINR.toLocaleString('en-IN')}/person)
                  </span>
                </div>
                <div className="text-[11px]">
                  {liveEstimate.isUnderBudget ? (
                    <span className="font-semibold text-[#0E6B59]">
                      ✓ Within Target: ₹{Math.abs(liveEstimate.diffINR).toLocaleString('en-IN')} remaining
                    </span>
                  ) : (
                    <span className="font-semibold text-[#8A4307]">
                      ⚠ ₹{Math.abs(liveEstimate.diffINR).toLocaleString('en-IN')} over target budget
                    </span>
                  )}
                </div>
              </div>

              {onApplyEstimate && (
                <button
                  type="button"
                  onClick={handleApplyEstimate}
                  className="btn-primary text-xs py-2 px-3 flex items-center justify-center gap-1.5 shrink-0"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Apply to Plan</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Buffer Slider: Per-Category weighted buffer */}
      <div className="p-3.5 rounded-xl bg-[#F4F9F7] border border-[#0E6B59]/20 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#15201D]">
            <Sliders className="h-3.5 w-3.5 text-[#0E6B59]" />
            <span>Buffer Slider: {bufferPercent}%</span>
            <span className="text-[10px] text-[#0E6B59] bg-[#E3F1EC] px-2 py-0.5 rounded-full font-medium">
              Heavier on Food (+35%) & Shopping (+40%)
            </span>
          </div>
          <div className="text-[11px] text-[#55625E]">
            Move slider to stress-test your budget against real overruns
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-medium text-[#55625E]">10%</span>
          <input
            type="range"
            min={10}
            max={50}
            step={5}
            value={bufferPercent}
            onChange={(e) => setBufferPercent(Number(e.target.value))}
            className="w-full h-2 bg-[#CBD5E1] rounded-lg appearance-none cursor-pointer accent-[#0E6B59]"
            aria-label="Cost buffer slider"
          />
          <span className="text-[11px] font-medium text-[#55625E]">50%</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pt-0.5 scrollbar-none text-[10px]">
          {[
            { val: 15, label: '15% Tight' },
            { val: 25, label: '25% (Default · Recommended)' },
            { val: 35, label: '35% Realistic' },
            { val: 45, label: '45% Extra Safe' }
          ].map((preset) => (
            <button
              key={preset.val}
              type="button"
              onClick={() => setBufferPercent(preset.val)}
              className={`px-2 py-0.5 rounded font-medium transition shrink-0 ${
                bufferPercent === preset.val
                  ? 'bg-[#0E6B59] text-white'
                  : 'bg-white border border-[#CBD5E1] text-[#55625E] hover:border-[#0E6B59]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Over Budget Tip when over */}
      {cost.statusTip && (
        <div className="p-3 rounded-xl bg-[#FCEFD9] border border-[#8A4307]/30 text-xs text-[#8A4307] flex items-start gap-2">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{cost.statusTip}</span>
        </div>
      )}

      {/* 6 Cost Lines Breakdown Table */}
      <div className="space-y-2.5 pt-2">
        <div className="text-xs font-semibold text-[#55625E] uppercase tracking-wider mb-2">
          Cost Breakdown
        </div>

        <div className="space-y-2">
          {cost.lines.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-[#F5F6F3]/80 transition-colors text-xs border border-transparent hover:border-[#E2E6E1]"
            >
              <div className="space-y-0.5 truncate">
                <div className="font-semibold text-[#15201D] flex items-center gap-2 truncate">
                  <span>{item.name}</span>
                  {item.isEstimate && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E4EDF8] text-[#1E4F8A]">
                      {(plan as any).isAiEstimatedDestination ? 'AI estimate' : 'Estimate'}
                    </span>
                  )}
                </div>
                {item.subtitle && (
                  <div className="text-[11px] text-[#55625E] truncate">
                    {item.subtitle}
                  </div>
                )}
              </div>

              <div className="font-bold text-sm text-[#15201D] shrink-0">
                ₹{item.amountINR.toLocaleString('en-IN')}
              </div>
            </div>
          ))}

          {/* Buffer for Surprises Line with Category Details */}
          <div className="p-3 rounded-xl bg-[#E3F1EC]/40 text-xs border border-[#0E6B59]/20 font-medium space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="font-bold text-[#0E6B59] flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Buffer for surprises ({cost.bufferPercent}%)</span>
                </div>
                <div className="text-[11px] text-[#55625E]">
                  Weighted heavier on food and shopping based on traveller overruns (24%–70%)
                </div>
              </div>
              <div className="font-bold text-sm text-[#0E6B59] shrink-0">
                ₹{cost.bufferAmountINR.toLocaleString('en-IN')}
              </div>
            </div>

            {cost.categoryBuffers && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1.5 border-t border-[#0E6B59]/20 text-[10px] text-[#55625E]">
                <div className="bg-white/70 p-1.5 rounded">Food buffer: <strong className="text-[#15201D]">₹{cost.categoryBuffers.foodBufferINR.toLocaleString('en-IN')}</strong></div>
                <div className="bg-white/70 p-1.5 rounded">Shopping buffer: <strong className="text-[#15201D]">₹{cost.categoryBuffers.shoppingBufferINR.toLocaleString('en-IN')}</strong></div>
                <div className="bg-white/70 p-1.5 rounded">Local cabs: <strong className="text-[#15201D]">₹{cost.categoryBuffers.localTransportBufferINR.toLocaleString('en-IN')}</strong></div>
                <div className="bg-white/70 p-1.5 rounded">Stay: <strong className="text-[#15201D]">₹{cost.categoryBuffers.stayBufferINR.toLocaleString('en-IN')}</strong></div>
                <div className="bg-white/70 p-1.5 rounded">Transit: <strong className="text-[#15201D]">₹{cost.categoryBuffers.travelBufferINR.toLocaleString('en-IN')}</strong></div>
                <div className="bg-white/70 p-1.5 rounded">Activities: <strong className="text-[#15201D]">₹{cost.categoryBuffers.activitiesBufferINR.toLocaleString('en-IN')}</strong></div>
              </div>
            )}
          </div>

          {/* Grand Total Row */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#E2E6E1] text-sm font-bold">
            <span className="text-[#15201D]">Total with buffer</span>
            <span className="text-base text-[#15201D] font-black font-heading">
              ₹{cost.totalWithBufferINR.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Share Breakdown with family/friends */}
          <div className="pt-3 border-t border-[#E2E6E1]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <span className="text-[11px] text-[#55625E]">
              Compare with your group before booking
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShareClick}
                className="btn-secondary min-h-[44px] px-3.5 py-1.5 text-xs font-bold inline-flex items-center justify-center gap-1.5 text-[#15201D]"
              >
                {shareStatus === 'copied' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#0E6B59]" />
                    <span className="text-[#0E6B59]">Copied to clipboard!</span>
                  </>
                ) : shareStatus === 'shared' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#0E6B59]" />
                    <span className="text-[#0E6B59]">Shared!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5 text-[#0E6B59]" />
                    <span>Share cost breakdown</span>
                  </>
                )}
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary min-h-[44px] px-3 py-1.5 text-xs font-bold inline-flex items-center justify-center gap-1.5 text-[#128C7E] border-[#128C7E]/30 hover:border-[#128C7E]"
                title="Share cost breakdown on WhatsApp"
              >
                <MessageCircle className="h-3.5 w-3.5 text-[#128C7E]" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
