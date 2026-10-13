import React, { useState } from 'react';
import { Building, Sparkles, AlertCircle, ArrowDownRight, Check } from 'lucide-react';
import { HotelItem, PlanUpgradeOption, BalancingOption } from '../../../types/travelBooking';

interface StaySelectorProps {
  currentHotel: HotelItem;
  upgradeOptions?: PlanUpgradeOption[];
  isOverBudget?: boolean;
  overBudgetAmountINR?: number;
  onSelectUpgrade?: (upgrade: PlanUpgradeOption) => void;
  onApplyBalancingOption?: (option: BalancingOption) => void;
  onRevertToStandard?: () => void;
}

export const StaySelector: React.FC<StaySelectorProps> = ({
  currentHotel,
  upgradeOptions = [],
  isOverBudget = false,
  overBudgetAmountINR = 0,
  onSelectUpgrade,
  onApplyBalancingOption,
  onRevertToStandard
}) => {
  const [selectedUpgradeId, setSelectedUpgradeId] = useState<string | null>(null);

  const activeUpgrade = upgradeOptions.find((u) => u.id === selectedUpgradeId) || (isOverBudget && upgradeOptions.length > 0 ? upgradeOptions[0] : null);

  return (
    <div className="card-consumer p-5 sm:p-6 space-y-4 text-left">
      <div className="flex items-center justify-between pb-2 border-b border-[#E2E6E1]">
        <h2 className="text-base font-bold text-[#15201D] font-heading">
          Your stay
        </h2>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          isOverBudget ? 'bg-[#FCEFD9] text-[#8A4307]' : 'bg-[#E3F1EC] text-[#0E6B59]'
        }`}>
          {isOverBudget ? 'Exceeds budget' : 'Fits budget'}
        </span>
      </div>

      {/* Switch back button when upgraded */}
      {(isOverBudget || selectedUpgradeId) && (
        <button
          type="button"
          onClick={() => {
            setSelectedUpgradeId(null);
            if (onRevertToStandard) onRevertToStandard();
          }}
          id="switch-back-to-standard-hotel-btn"
          className="w-full text-xs font-semibold text-[#0E6B59] hover:underline cursor-pointer p-2.5 bg-[#E3F1EC] rounded-xl text-center flex items-center justify-center gap-1.5 transition-colors hover:bg-[#E3F1EC]/80"
        >
          <span>← Switch back to standard stay (Fits budget)</span>
        </button>
      )}

      {/* Current Hotel */}
      <div className="p-3.5 rounded-xl border-2 border-[#0E6B59] bg-[#E3F1EC]/20 space-y-1">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-[#15201D]">
            {currentHotel.name}
          </div>
          <span className="text-xs font-bold text-[#0E6B59] flex items-center gap-1">
            <Check className="h-3.5 w-3.5" />
            <span>Selected</span>
          </span>
        </div>
        <div className="text-xs text-[#55625E]">
          {currentHotel.area} · {currentHotel.starRating}★ · ₹{currentHotel.pricePerNightINR.toLocaleString('en-IN')}/night
        </div>
      </div>

      {/* Luxury Upgrade Options */}
      {upgradeOptions.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[#E2E6E1]">
          <div className="text-xs font-semibold text-[#55625E] flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[#0E6B59]" />
            <span>Available Stays & Upgrades</span>
          </div>

          {upgradeOptions.map((upgrade) => {
            const isSelected = selectedUpgradeId === upgrade.id;

            return (
              <div
                key={upgrade.id}
                id={`upgrade-option-${upgrade.id}`}
                role="button"
                tabIndex={0}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#0E6B59] bg-[#E3F1EC]/30'
                    : 'border-[#E2E6E1] hover:border-[#0E6B59]/40 bg-[#FFFFFF]'
                }`}
                onClick={() => {
                  setSelectedUpgradeId(upgrade.id);
                  if (onSelectUpgrade) onSelectUpgrade(upgrade);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedUpgradeId(upgrade.id);
                    if (onSelectUpgrade) onSelectUpgrade(upgrade);
                  }
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-[#15201D]">
                    {upgrade.title}
                  </div>
                  <span className="text-xs font-bold text-[#0E6B59] shrink-0">
                    {upgrade.deltaText}
                  </span>
                </div>
                <div className="text-[11px] text-[#55625E] mt-0.5">
                  {upgrade.description}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Over-Budget Warning with Balancing Options */}
      {isOverBudget && overBudgetAmountINR > 0 && activeUpgrade && (
        <div className="p-3.5 rounded-xl bg-[#FCEFD9] border border-[#8A4307]/30 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#8A4307]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Upgrade exceeds target budget by ₹{overBudgetAmountINR.toLocaleString('en-IN')}</span>
          </div>

          <div className="text-[11px] text-[#8A4307]/90">
            Balancing options to bring trip back within budget:
          </div>

          <div className="space-y-1.5">
            {activeUpgrade.balancingOptions.map((opt) => (
              <button
                key={opt.title}
                type="button"
                onClick={() => onApplyBalancingOption && onApplyBalancingOption(opt)}
                className="w-full p-2 rounded-lg bg-[#FFFFFF] border border-[#E2E6E1] hover:border-[#0E6B59] text-left text-xs transition cursor-pointer flex items-center justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-[#15201D]">{opt.title}</div>
                  <div className="text-[10px] text-[#55625E]">{opt.description}</div>
                </div>
                <span className="font-bold text-[#0E6B59] shrink-0 text-xs">
                  Saves ₹{opt.rupeeImpactINR.toLocaleString('en-IN')}
                </span>
              </button>
            ))}
          </div>

          {(() => {
            const totalSavings = activeUpgrade.balancingOptions.reduce((acc, o) => acc + o.rupeeImpactINR, 0);
            const stillOver = overBudgetAmountINR - totalSavings;
            if (stillOver > 0) {
              return (
                <div className="text-[11px] text-[#8A4307] font-semibold pt-1 border-t border-[#8A4307]/20">
                  Even with both changes you'd be ₹{stillOver.toLocaleString('en-IN')} over.
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}
    </div>
  );
};
