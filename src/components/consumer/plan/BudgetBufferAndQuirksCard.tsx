import React from 'react';
import {
  Wallet,
  AlertTriangle,
  ShoppingBag,
  Utensils,
  Car,
  Info,
  ShieldCheck
} from 'lucide-react';
import { RealisticBudgetBuffer } from '../../../types/travelBooking';

interface BudgetBufferAndQuirksCardProps {
  buffer?: RealisticBudgetBuffer;
  targetBudgetINR: number;
}

export const BudgetBufferAndQuirksCard: React.FC<BudgetBufferAndQuirksCardProps> = ({
  buffer,
  targetBudgetINR
}) => {
  if (!buffer) return null;

  return (
    <div className="card-consumer p-5 sm:p-6 space-y-4 text-left border-[#E2E6E1]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E6E1]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E3F1EC] text-[#0E6B59] uppercase tracking-wider">
              {buffer.percentage}% On-Ground Buffer
            </span>
            <span className="text-xs text-[#55625E]">· Zero Surprise Guarantee</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#15201D] font-heading">
            Realistic Contingency & Local Cost Warnings
          </h3>
        </div>

        <div className="text-xs font-bold text-[#0E6B59] bg-[#E3F1EC]/60 px-3 py-1 rounded-full">
          ₹{buffer.amountINR.toLocaleString('en-IN')} Reserved
        </div>
      </div>

      {/* 3-Part Buffer Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Food & Shacks */}
        <div className="p-3.5 rounded-xl bg-[#F8FAF9] border border-[#E2E6E1] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#15201D]">
            <Utensils className="h-3.5 w-3.5 text-[#0E6B59]" />
            <span>On-Ground Dining</span>
          </div>
          <div className="text-base font-black text-[#15201D] font-heading">
            ₹{buffer.breakdown.onGroundFoodAndSnacksINR.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[#55625E] leading-snug">
            Beach shacks, evening seafood, roadside tea, and cafe snacks.
          </p>
        </div>

        {/* Unexpected Autos & Local Cabs */}
        <div className="p-3.5 rounded-xl bg-[#F8FAF9] border border-[#E2E6E1] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#15201D]">
            <Car className="h-3.5 w-3.5 text-[#0E6B59]" />
            <span>Local Transit & Autos</span>
          </div>
          <div className="text-base font-black text-[#15201D] font-heading">
            ₹{buffer.breakdown.localTransitAndAutosINR.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[#55625E] leading-snug">
            Short auto-rickshaw hops, sunset spot drops, and parking tolls.
          </p>
        </div>

        {/* Shopping & Emergency Reserve */}
        <div className="p-3.5 rounded-xl bg-[#F8FAF9] border border-[#E2E6E1] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#15201D]">
            <ShoppingBag className="h-3.5 w-3.5 text-[#0E6B59]" />
            <span>Shopping & Spares</span>
          </div>
          <div className="text-base font-black text-[#15201D] font-heading">
            ₹{buffer.breakdown.shoppingAndIncidentalsINR.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[#55625E] leading-snug">
            Organic coffee, spices, souvenirs, and emergency medicine reserve.
          </p>
        </div>
      </div>

      {/* Local Transport Quirks & Hidden Cost Warnings */}
      {buffer.hiddenCostWarnings && buffer.hiddenCostWarnings.length > 0 && (
        <div className="p-4 rounded-xl bg-[#FEF6EE] border border-[#F97316]/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#C2410C]">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#C2410C]" />
            <span>Destination Transport Quirks & Hidden Cost Warnings</span>
          </div>
          <ul className="space-y-1.5 text-xs text-[#7C2D12]">
            {buffer.hiddenCostWarnings.map((warning, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#C2410C] mt-1.5 shrink-0" />
                <span className="leading-snug">{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
