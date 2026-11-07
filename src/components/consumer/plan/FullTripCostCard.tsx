import React, { useState } from 'react';
import { TripPlan, TripPreferences } from '../../../types/travelBooking';
import { computeFullTripCost } from '../../../services/fullTripCostHelper';
import { Sparkles, Info, AlertTriangle, CheckCircle2, Share2, MessageCircle, Check, Sliders } from 'lucide-react';
import { shareTripPlan, getWhatsAppShareUrl } from '../../../services/shareTripHelper';

interface FullTripCostCardProps {
  plan: TripPlan;
  preferences?: TripPreferences | null;
}

export const FullTripCostCard: React.FC<FullTripCostCardProps> = ({
  plan,
  preferences
}) => {
  const [bufferPercent, setBufferPercent] = useState<number>(25);
  const cost = computeFullTripCost(plan, preferences, { customBufferPercent: bufferPercent, useCategoryWeights: true });
  const childrenCount = (plan.travellers?.children ?? (plan.travellers?.childAges?.length || 0)) || (preferences?.childrenCount ?? (preferences?.childrenAges?.length || 0)) || 0;
  const hasChildren = childrenCount > 0;
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared'>('idle');

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
            Trip Cost Breakdown
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

          {/* B5: Share Breakdown with family/friends */}
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
