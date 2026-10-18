import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { RealisticBudgetBuffer } from '../../../types/travelBooking';

interface BudgetBufferAndQuirksCardProps {
  buffer?: RealisticBudgetBuffer;
  targetBudgetINR?: number;
}

export const BudgetBufferAndQuirksCard: React.FC<BudgetBufferAndQuirksCardProps> = ({
  buffer
}) => {
  if (!buffer || !buffer.hiddenCostWarnings || buffer.hiddenCostWarnings.length === 0) {
    return null;
  }

  return (
    <div className="card-consumer p-5 sm:p-6 space-y-4 text-left border-[#E2E6E1] bg-white rounded-2xl shadow-xs">
      {/* Header without duplicate rupee totals */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E6E1]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FCEFD9] text-[#8A4307] uppercase tracking-wider">
              On-Ground Realities
            </span>
            <span className="text-xs text-[#55625E]">· Tips before you go</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#15201D] font-heading">
            Destination Quirks & Cost Warnings
          </h3>
        </div>
        <span className="text-xs text-[#55625E]">
          Included in your 15% buffer
        </span>
      </div>

      {/* Local Transport Quirks & Hidden Cost Warnings */}
      <div className="p-4 rounded-xl bg-[#FEF6EE] border border-[#F97316]/30 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#C2410C]">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[#C2410C]" />
          <span>Local Transport & Price Nuances</span>
        </div>
        <ul className="space-y-2 text-xs text-[#7C2D12]">
          {buffer.hiddenCostWarnings.map((warning, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C2410C] mt-1.5 shrink-0" />
              <span className="leading-relaxed">{warning}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
