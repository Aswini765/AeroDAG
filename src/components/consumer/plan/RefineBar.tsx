import React, { useState } from 'react';
import { Sparkles, ArrowRight, CornerDownLeft } from 'lucide-react';

interface RefineBarProps {
  onRefinePlan: (promptText: string) => void;
  isUpdating?: boolean;
}

const QUICK_TWEAKS = [
  { label: '💰 Cheaper', prompt: 'make it cheaper with budget hotel' },
  { label: '🚗 Less driving', prompt: 'less driving and more relaxed pace' },
  { label: '🚆 Take the train', prompt: 'switch to scenic train journey' },
  { label: '🥗 Pure veg', prompt: 'vegetarian food nearby and veg restaurants' }
];

export const RefineBar: React.FC<RefineBarProps> = ({ onRefinePlan, isUpdating = false }) => {
  const [refineInput, setRefineInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refineInput.trim() || isUpdating) return;
    onRefinePlan(refineInput.trim());
    setRefineInput('');
  };

  const handleQuickTweak = (prompt: string) => {
    if (isUpdating) return;
    onRefinePlan(prompt);
  };

  return (
    <div className="bg-white p-3 sm:p-4 border border-[#E2E6E1] shadow-2xs rounded-2xl transition-all">
      {/* Quick Tweak Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none text-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#55625E] shrink-0 mr-1 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-[#0E6B59]" />
          <span>Change the plan:</span>
        </span>
        {QUICK_TWEAKS.map((tweak) => (
          <button
            key={tweak.label}
            type="button"
            disabled={isUpdating}
            onClick={() => handleQuickTweak(tweak.prompt)}
            className="min-h-[44px] px-3 py-1.5 rounded-full border border-[#CBD5E1] bg-white text-[#15201D] hover:border-[#0E6B59] hover:bg-[#E3F1EC] transition font-medium shrink-0 cursor-pointer shadow-2xs"
          >
            {tweak.label}
          </button>
        ))}
      </div>

      {/* Main Chat Input Form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={refineInput}
            onChange={(e) => setRefineInput(e.target.value)}
            disabled={isUpdating}
            placeholder='e.g. cheaper, less driving'
            className="w-full bg-[#FAFCFA] border border-[#CBD5E1] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#15201D] placeholder-[#55625E]/70 focus:outline-none focus:ring-2 focus:ring-[#0E6B59] min-h-[44px]"
          />
        </div>

        <button
          type="submit"
          disabled={!refineInput.trim() || isUpdating}
          className="btn-primary shrink-0 min-h-[44px] px-4 py-2.5 text-xs sm:text-sm flex items-center gap-1.5 shadow-sm"
        >
          {isUpdating ? (
            <span>Updating…</span>
          ) : (
            <>
              <span className="hidden sm:inline">Update</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
