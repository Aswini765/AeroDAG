import React, { useState } from 'react';
import {
  Plane,
  Train,
  Car,
  Bus,
  Sparkles,
  Compass
} from 'lucide-react';
import { RouteDiscoveryComparison } from '../../../types/travelBooking';

interface RouteTradeOffComparisonProps {
  comparison?: RouteDiscoveryComparison;
  selectedMode?: string;
  onSelectMode?: (mode: string) => void;
}

export const RouteTradeOffComparison: React.FC<RouteTradeOffComparisonProps> = ({
  comparison,
  selectedMode = 'Flight',
  onSelectMode
}) => {
  if (!comparison || !comparison.options || comparison.options.length === 0) {
    return null;
  }

  const [activeMode, setActiveMode] = useState<string>(selectedMode || comparison.recommendedMode || 'Flight');

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'Flight':
        return <Plane className="h-4 w-4" />;
      case 'Train':
        return <Train className="h-4 w-4" />;
      case 'Road':
        return <Car className="h-4 w-4" />;
      case 'Bus':
        return <Bus className="h-4 w-4" />;
      default:
        return <Compass className="h-4 w-4" />;
    }
  };

  const handleSelect = (mode: string) => {
    setActiveMode(mode);
    if (onSelectMode) {
      onSelectMode(mode);
    }
  };

  return (
    <div className="card-consumer p-5 sm:p-6 space-y-5 text-left border-[#E2E6E1] bg-gradient-to-b from-[#FFFFFF] to-[#F8FAF9]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E6E1]">
        <h3 className="text-lg font-bold text-[#15201D] font-heading">
          How to get there
        </h3>

        <div className="text-xs text-[#55625E]">
          Recommended: <strong className="text-[#0E6B59] font-bold">{comparison.recommendedMode}</strong>
        </div>
      </div>

      {/* Sensory & Scenic Highlights Banner */}
      {comparison.sensoryHighlights && comparison.sensoryHighlights.length > 0 && (
        <div className="p-3.5 rounded-xl bg-[#E3F1EC]/50 border border-[#0E6B59]/20 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0E6B59]">
            <Sparkles className="h-4 w-4 shrink-0 text-[#0E6B59]" />
            <span>On the way</span>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[#15201D]">
            {comparison.sensoryHighlights.map((hl, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0E6B59] mt-1.5 shrink-0" />
                <span className="leading-snug">{hl}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {comparison.options.map((opt) => {
          const isSelected = activeMode.toLowerCase() === opt.mode.toLowerCase();
          return (
            <div
              key={opt.mode}
              onClick={() => handleSelect(opt.mode)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                isSelected
                  ? 'border-[#0E6B59] bg-[#FFFFFF] shadow-sm ring-1 ring-[#0E6B59]'
                  : 'border-[#E2E6E1] bg-[#FFFFFF]/70 hover:border-[#7CC4B3]'
              }`}
            >
              <div className="space-y-2">
                {/* Header row with Icon and Price */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${
                      isSelected ? 'bg-[#0E6B59] text-white' : 'bg-[#F0F2EE] text-[#55625E]'
                    }`}>
                      {getModeIcon(opt.mode)}
                    </div>
                    <span className="font-bold text-sm text-[#15201D] font-heading">
                      {opt.mode}
                    </span>
                  </div>

                  {opt.isRecommended && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E3F1EC] text-[#0E6B59]">
                      Fastest
                    </span>
                  )}
                </div>

                {/* Duration & Time Saved */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-[#15201D] font-heading">
                      {opt.duration}
                    </span>
                    <span className="text-xs font-bold text-[#55625E]">
                      ₹{opt.costINR.toLocaleString('en-IN')} total
                    </span>
                  </div>
                  {opt.timeSavedText && (
                    <div className="text-[11px] font-medium text-[#0A5546]">
                      {opt.timeSavedText}
                    </div>
                  )}
                </div>

                {/* Scenic Score & Highlight */}
                <div className="pt-2 border-t border-[#E2E6E1] space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#55625E]">Scenic:</span>
                    <span className="font-bold text-[#15201D]">
                      {opt.scenicScore}/10 ★
                    </span>
                  </div>
                  <p className="text-xs text-[#55625E] leading-relaxed">
                    {opt.scenicHighlight}
                  </p>
                </div>
              </div>

              {/* Trade-off summary */}
              <div className="pt-2 border-t border-[#E2E6E1]/70 text-[11px] text-[#55625E] italic">
                {opt.tradeOffNote}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
