import React from 'react';
import { ArrowRight, Sparkles, Building2, Car } from 'lucide-react';
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

  // Same origin, dates and group as the plan, so the card total is the plan total
  const routes = getRegionRoutes(cleanRegion, nights, preferences, targetBudget, travellers,
    tripContext.origin || 'Bengaluru (BLR)', tripContext.dates || '14–20 Nov 2026',
    { adults: tripContext.adultsCount || Math.max(1, travellers - (tripContext.childrenCount || 0) - (tripContext.seniorsCount || 0)), children: tripContext.childrenCount || 0, childAges: tripContext.childrenAges || [], seniors: tripContext.seniorsCount || 0 });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6 text-left animate-fade-in-slide">
      {/* Screen Title & Prompt Guidance */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold font-heading text-[#15201D]">
          {conversationalHeader}
        </h1>
        <p className="text-sm text-[#55625E] leading-relaxed max-w-2xl">
          {cleanRegion} is big, so your {nights} nights are split between two places. Pick the one you like — you can change it later.
        </p>
      </div>

      <WhatWeUnderstoodPanel context={tripContext} onEdit={onBack} />

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
                    {route.basesCount} stops
                  </span>
                  {route.isRecommended && (
                    <span className="text-[10px] font-bold text-white bg-[#0E6B59] px-2 py-0.5 rounded-full shadow-2xs">
                      Best fit for you
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
                      <div className="font-semibold text-[#15201D]">Where you sleep</div>
                      <div className="text-[#55625E]">{route.nightsPerBaseText}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Car className="h-4 w-4 text-[#0E6B59] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-[#15201D]">Travel between them</div>
                      <div className="text-[#55625E]">{route.totalTravelHoursText}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price & Select Button */}
              <div className="pt-3 border-t border-[#E2E6E1] space-y-2.5">
                <div>
                  <div className="text-xs text-[#55625E]">Total for {travellers} {travellers === 1 ? 'person' : 'people'} · includes 15% buffer</div>
                  <div className="text-lg font-black text-[#15201D] font-heading">
                    ₹{route.estimatedCostINR.toLocaleString('en-IN')}
                    <span className="text-xs font-normal text-[#55625E]"> · ₹{Math.round(route.estimatedCostINR / travellers).toLocaleString('en-IN')} each</span>
                  </div>
                  {tripContext.budgetTotalINR ? (
                    route.estimatedCostINR <= tripContext.budgetTotalINR ? (
                      <div className="text-xs font-semibold text-[#0E6B59]">Fits your ₹{tripContext.budgetTotalINR.toLocaleString('en-IN')} budget</div>
                    ) : (
                      <div className="text-xs font-semibold text-[#C2410C]">₹{(route.estimatedCostINR - tripContext.budgetTotalINR).toLocaleString('en-IN')} over your ₹{tripContext.budgetTotalINR.toLocaleString('en-IN')} budget</div>
                    )
                  ) : null}
                  <div className="text-[11px] text-[#55625E] mt-0.5">Estimate, not a quote</div>
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
                  <span>Choose {route.title}</span>
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

