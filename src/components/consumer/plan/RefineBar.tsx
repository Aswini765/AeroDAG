import React, { useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface RefineBarProps {
  onRefinePlan: (promptText: string) => void;
  isUpdating?: boolean;
}

export const RefineBar: React.FC<RefineBarProps> = ({ onRefinePlan, isUpdating = false }) => {
  const [refineInput, setRefineInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refineInput.trim() || isUpdating) return;
    onRefinePlan(refineInput.trim());
    setRefineInput('');
  };

  return (
    <form onSubmit={handleSubmit} className="card-consumer p-3 sm:p-4 text-left">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={refineInput}
            onChange={(e) => setRefineInput(e.target.value)}
            placeholder="Ask for a change — e.g. 'can we take the train instead?'"
            className="w-full bg-[#FFFFFF] border border-[#E2E6E1] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#15201D] placeholder-[#55625E]/70 focus:outline-none focus:ring-2 focus:ring-[#7CC4B3]"
          />
        </div>

        <button
          type="submit"
          disabled={!refineInput.trim() || isUpdating}
          className="btn-primary shrink-0 py-2.5 px-4 text-xs sm:text-sm"
        >
          {isUpdating ? (
            <span>Updating...</span>
          ) : (
            <>
              <span>Update plan</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};
