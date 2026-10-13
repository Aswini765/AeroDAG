import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentLineIndex((prev) => (prev < PROGRESS_LINES.length - 1 ? prev + 1 : prev));
    }, 450);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="max-w-md mx-auto my-16 px-4 animate-fade-in-slide">
      <div className="card-consumer p-8 text-center space-y-6">
        {/* Spinner */}
        <div className="h-12 w-12 mx-auto rounded-full border-3 border-[#E2E6E1] border-t-[#0E6B59] animate-spin" />

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-[#15201D] font-heading">
            Building your {destination} plan
          </h2>
          <p className="text-xs text-[#55625E]">
            Usually takes under 20 seconds
          </p>
        </div>

        {/* 4 Plain-Language Progress Lines */}
        <div className="space-y-3 text-left pt-2 border-t border-[#E2E6E1]">
          {PROGRESS_LINES.map((line, idx) => {
            const isDone = idx < currentLineIndex;
            const isCurrent = idx === currentLineIndex;

            return (
              <div key={line} className="flex items-center gap-3">
                {isDone ? (
                  <span className="h-4.5 w-4.5 rounded-full bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                ) : isCurrent ? (
                  <span className="h-4.5 w-4.5 rounded-full bg-[#0E6B59] flex items-center justify-center shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  </span>
                ) : (
                  <span className="h-4.5 w-4.5 rounded-full bg-[#E2E6E1] shrink-0" />
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
    </div>
  );
};
