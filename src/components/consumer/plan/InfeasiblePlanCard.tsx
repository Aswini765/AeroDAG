import React from 'react';
import { AlertCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { ConcreteBudgetFix } from '../../../types/travelBooking';

interface InfeasiblePlanCardProps {
  destination: string;
  targetBudgetINR: number;
  calculatedCostINR: number;
  shortfallINR: number;
  concreteFixes: ConcreteBudgetFix[];
  onApplyFix: (fix: ConcreteBudgetFix) => void;
  onModifyPrompt: () => void;
}

export const InfeasiblePlanCard: React.FC<InfeasiblePlanCardProps> = ({
  destination,
  targetBudgetINR,
  calculatedCostINR,
  shortfallINR,
  concreteFixes,
  onApplyFix,
  onModifyPrompt
}) => {
  return (
    <div className="card-consumer p-6 sm:p-8 max-w-2xl mx-auto my-8 space-y-6 text-left border-[#8A4307]/30 bg-[#FFFFFF] shadow-sm">
      {/* Alert Header */}
      <div className="flex items-start gap-3.5">
        <div className="h-10 w-10 rounded-xl bg-[#FCEFD9] text-[#8A4307] flex items-center justify-center shrink-0 mt-0.5">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-[#15201D] font-heading">
            Trip exceeds budget by ₹{shortfallINR.toLocaleString('en-IN')}
          </h2>
          <p className="text-xs sm:text-sm text-[#55625E]">
            A comfortable trip to {destination} requires at least ₹{calculatedCostINR.toLocaleString('en-IN')} for your party, which exceeds your target of ₹{targetBudgetINR.toLocaleString('en-IN')}.
          </p>
        </div>
      </div>

      {/* Suggested Concrete Fixes */}
      <div className="space-y-3 pt-3 border-t border-[#E2E6E1]">
        <div className="text-xs font-bold uppercase tracking-wider text-[#15201D]">
          Choose a fix to fit inside your budget:
        </div>

        <div className="space-y-2.5">
          {concreteFixes.map((fix) => (
            <button
              key={fix.id}
              id={`concrete-fix-${fix.id}`}
              type="button"
              onClick={() => onApplyFix(fix)}
              className="w-full card-consumer p-4 text-left transition-all hover:border-[#0E6B59] hover:bg-[#F5F6F3]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
            >
              <div className="space-y-0.5">
                <div className="text-sm font-bold text-[#15201D] group-hover:text-[#0E6B59] transition-colors">
                  {fix.title}
                </div>
                <div className="text-xs text-[#55625E]">
                  {fix.description}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-[#0E6B59] px-2.5 py-1 rounded-full bg-[#E3F1EC]">
                  Saves ₹{(fix.rupeeImpactINR ?? (fix as any).savingsAmountINR ?? 0).toLocaleString('en-IN')}
                </span>
                <ArrowRight className="h-4 w-4 text-[#0E6B59] group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Secondary Action */}
      <div className="pt-3 border-t border-[#E2E6E1] flex justify-between items-center text-xs">
        <span className="text-[#55625E]">Or change your initial preferences</span>
        <button
          type="button"
          onClick={onModifyPrompt}
          className="text-[#0E6B59] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Describe trip again</span>
        </button>
      </div>
    </div>
  );
};
