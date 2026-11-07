import React, { useState, useEffect } from 'react';
import { Check, Sparkles } from 'lucide-react';

interface LoadingPlanScreenProps {
  destination?: string;
  onFinish?: () => void;
}

const PROGRESS_LINES = [
  'Checking travel options and arrival routes',
  'Matching family-friendly stays within budget cap',
  'Allocating food, local cabs, and contingency buffer',
  'Verifying pacing, rest times, and schedule feasibility'
];

export const LoadingPlanScreen: React.FC<LoadingPlanScreenProps> = ({ destination = 'Goa' }) => {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentLineIndex((prev) => (prev < PROGRESS_LINES.length - 1 ? prev + 1 : prev));
    }, 450);

    const slowTimer = setTimeout(() => {
      setIsSlow(true);
    }, 4000);

    return () => {
      clearInterval(timer);
      clearTimeout(slowTimer);
    };
  }, []);

  return (
    <div className="max-w-md mx-auto my-12 px-4 animate-fade-in-slide space-y-6">
      {/* Active Progress Card */}
      <div className="card-consumer p-6 sm:p-8 text-center space-y-6 border border-[#E2E6E1] bg-white rounded-2xl shadow-sm">
        {/* Spinner */}
        <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
          <div className="w-14 h-14 rounded-full border-3 border-[#E2E6E1] border-t-[#0E6B59] animate-spin motion-reduce:animate-none" />
          <Sparkles className="h-5 w-5 text-[#0E6B59] absolute" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-[#15201D] font-heading">
            Building your {destination} plan
          </h2>
          {isSlow ? (
            <p className="text-xs font-semibold text-[#8A4307] bg-[#FCEFD9] px-2.5 py-1 rounded-lg animate-fade-in">
              Waking up the planner — about 30 seconds the first time
            </p>
          ) : (
            <p className="text-xs text-[#55625E]">
              Scanning routes & real stay options · under 20s
            </p>
          )}
        </div>

        {/* 4 Plain-Language Progress Lines */}
        <div className="space-y-3.5 text-left pt-2 border-t border-[#E2E6E1]">
          {PROGRESS_LINES.map((line, idx) => {
            const isDone = idx < currentLineIndex;
            const isCurrent = idx === currentLineIndex;

            return (
              <div key={line} className="flex items-center gap-3">
                {isDone ? (
                  <span className="h-5 w-5 rounded-full bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                ) : isCurrent ? (
                  <span className="h-5 w-5 rounded-full bg-[#0E6B59] flex items-center justify-center shrink-0">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse motion-reduce:animate-none" />
                  </span>
                ) : (
                  <span className="h-5 w-5 rounded-full bg-[#E2E6E1] shrink-0" />
                )}

                <span
                  className={`text-xs transition-colors ${
                    isDone || isCurrent ? 'text-[#15201D] font-medium' : 'text-[#55625E]/60'
                  }`}
                >
                  {line}...
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skeleton preview for the plan cards */}
      <div className="p-4 rounded-2xl border border-[#E2E6E1] bg-[#FAFCFA] space-y-3 opacity-70 animate-pulse motion-reduce:animate-none">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-24 bg-[#CBD5E1] rounded" />
          <div className="h-4 w-16 bg-[#CBD5E1] rounded-full" />
        </div>
        <div className="h-28 w-full bg-[#E2E6E1] rounded-xl" />
        <div className="space-y-1.5 pt-1">
          <div className="h-3.5 w-3/4 bg-[#CBD5E1] rounded" />
          <div className="h-3 w-1/2 bg-[#E2E6E1] rounded" />
        </div>
      </div>
    </div>
  );
};
