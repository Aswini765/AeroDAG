import React from 'react';
import {
  Calendar,
  Sparkles,
  Users,
  Compass,
  Sun,
  ShieldAlert,
  MapPin
} from 'lucide-react';
import { SeasonalRecommendation } from '../../../types/travelBooking';

interface SeasonalAndPersonaCardProps {
  recommendation?: SeasonalRecommendation;
  destination: string;
}

export const SeasonalAndPersonaCard: React.FC<SeasonalAndPersonaCardProps> = ({
  recommendation,
  destination
}) => {
  if (!recommendation) return null;

  return (
    <div className="card-consumer p-5 sm:p-6 space-y-4 text-left border-[#E2E6E1]">
      <div className="flex items-center justify-between pb-3 border-b border-[#E2E6E1]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E3F1EC] text-[#0E6B59] uppercase tracking-wider">
              Seasonal & Contextual Intelligence
            </span>
            <span className="text-xs text-[#55625E]">· When & Where to Stay</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#15201D] font-heading">
            Best Experiences & Destination Sub-Zones
          </h3>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#0E6B59] font-semibold bg-[#E3F1EC]/60 px-2.5 py-1 rounded-full">
          <Sun className="h-3.5 w-3.5 text-[#0E6B59]" />
          <span>{recommendation.bestTiming.split('(')[0]}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Peak Experience / Best Timing */}
        <div className="p-4 rounded-xl bg-[#F8FAF9] border border-[#E2E6E1] space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#15201D]">
            <Sparkles className="h-4 w-4 text-[#0E6B59] shrink-0" />
            <span>Peak Experience Timing</span>
          </div>
          <p className="text-xs text-[#55625E] leading-relaxed">
            {recommendation.peakExperience}
          </p>
          <div className="pt-2 border-t border-[#E2E6E1] text-[11px] text-[#55625E] flex items-center justify-between">
            <span>Crowd Index:</span>
            <span className="font-semibold text-[#15201D]">{recommendation.crowdLevel}</span>
          </div>
        </div>

        {/* Persona Sub-Zone Differentiation */}
        <div className="p-4 rounded-xl bg-[#F8FAF9] border border-[#E2E6E1] space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#15201D]">
            <MapPin className="h-4 w-4 text-[#0E6B59] shrink-0" />
            <span>Destination Sub-Zone Selection</span>
          </div>
          <p className="text-xs text-[#55625E] leading-relaxed">
            {recommendation.personaSubzoneNote}
          </p>
          <div className="pt-2 border-t border-[#E2E6E1] text-[11px] text-[#55625E] flex items-center justify-between">
            <span>Weather Profile:</span>
            <span className="font-semibold text-[#15201D]">{recommendation.weatherNote}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
