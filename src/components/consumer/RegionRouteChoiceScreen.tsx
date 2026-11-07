import React from 'react';
import { MapPin, Clock, ArrowRight, Sparkles, Building2, Car, Compass, Check } from 'lucide-react';
import { TripContext } from '../../services/requirementEngine';
import { RegionRouteOption, getRegionRoutes } from '../../services/regionRoutesService';
import { WhatWeUnderstoodPanel } from './WhatWeUnderstoodPanel';

interface RegionRouteChoiceScreenProps {
  region: string;
  tripContext: TripContext;
  onSelectRoute: (route: RegionRouteOption) => void;
  onBack: () => void;
}

export const RegionRouteChoiceScreen: React.FC<RegionRouteChoiceScreenProps> = ({
  region,
  tripContext,
  onSelectRoute,
  onBack
}) => {
  const cleanRegion = (region || 'Rajasthan').replace(/,\s*India$/i, '').trim();
  const nights = Math.max(2, (tripContext.durationDays || 7) - 1);
  const preferences = tripContext.freeTextPreferences || tripContext.notes.join(', ');
  const targetBudget = tripContext.budgetTotalINR || 90000;
  const travellers = tripContext.totalTravellers || 2;

  const ackParts: string[] = [];
  if (tripContext.durationDays) ackParts.push(`${tripContext.durationDays} days`);
  if (travellers) ackParts.push(`${travellers} of you`);
  if (targetBudget) ackParts.push(`₹${targetBudget.toLocaleString('en-IN')}`);
  const conversationalHeader = ackParts.length >= 2
    ? `Got it — ${ackParts.join(', ')}. Which part of ${cleanRegion}?`
    : `Where in ${cleanRegion}?`;

  const routes = getRegionRoutes(cleanRegion, nights, preferences, targetBudget, travellers);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6 text-left animate-fade-in-slide">
      {/* What We Understood Panel - Always visible so user sees what was understood */}
      <WhatWeUnderstoodPanel
        context={tripContext}
        onEdit={onBack}
        initiallyCollapsed={false}
      />

      {/* Screen Title & Prompt Guidance */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E3F1EC] text-[#0E6B59] text-xs font-bold uppercase tracking-wider">
          <Compass className="h-3.5 w-3.5" />
          <span>Regional Multi-Base Route</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-heading text-[#15201D]">
          {conversationalHeader}
        </h1>
        <p className="text-sm text-[#55625E] leading-relaxed max-w-2xl">
          A state is a journey, not a single hotel. Choose how you want to split your {nights} nights across multiple bases.
        </p>
      </div>

      {/* 2-3 Route Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {routes.map((route) => {
          return (
            <div
              key={route.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 shadow-sm bg-white hover:border-[#0E6B59] hover:shadow-md ${
                route.isRecommended ? 'border-[#0E6B59] ring-2 ring-[#0E6B59]/30 bg-[#FAFCFA]' : 'border-[#E2E6E1]'
              }`}
            >
              <div className="space-y-3">
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <span className="text-[11px] font-bold text-[#0E6B59] bg-[#E3F1EC] px-2.5 py-0.5 rounded-full">
                    {route.basesCount} Bases
                  </span>
                  {route.isRecommended && (
                    <span className="text-[10px] font-bold text-white bg-[#0E6B59] px-2 py-0.5 rounded-full shadow-2xs">
                      Best Match
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold font-heading text-[#15201D] leading-snug">
                  {route.title}
                </h3>

                {/* Match reason tag */}
                {route.matchReason && (
                  <div className="text-xs font-semibold text-[#0E6B59] bg-[#E3F1EC]/60 p-2 rounded-xl flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    <span>{route.matchReason}</span>
                  </div>
                )}

                {/* Tagline */}
                <p className="text-xs text-[#55625E] leading-relaxed">
                  {route.tagline}
                </p>

                {/* Breakdown List: Bases and Travel Hours */}
                <div className="space-y-2 pt-2 border-t border-[#E2E6E1]/70 text-xs">
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-[#0E6B59] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-[#15201D]">Nights per base</div>
                      <div className="text-[#55625E]">{route.nightsPerBaseText}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Car className="h-4 w-4 text-[#0E6B59] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-[#15201D]">Inter-base transit</div>
                      <div className="text-[#55625E]">{route.totalTravelHoursText}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price & Select Button */}
              <div className="pt-3 border-t border-[#E2E6E1] space-y-2.5">
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#55625E]">AI-estimate total</div>
                  <div className="text-base sm:text-lg font-black text-[#15201D] font-heading">
                    ₹{route.estimatedCostINR.toLocaleString('en-IN')}{' '}
                    <span className="text-xs font-normal text-[#55625E]">all-in</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectRoute(route)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] ${
                    route.isRecommended
                      ? 'btn-primary shadow-sm'
                      : 'bg-white border border-[#0E6B59] text-[#0E6B59] hover:bg-[#E3F1EC]'
                  }`}
                >
                  <span>Select this route</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

