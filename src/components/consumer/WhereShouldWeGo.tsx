import React, { useState } from 'react';
import { Compass, ArrowRight, Sparkles } from 'lucide-react';
import { trackCardClick } from '../../services/telemetry/posthog';

interface WhereShouldWeGoProps {
  onSelectSuggestion: (promptText: string) => void;
  isCompact?: boolean;
}

type VibeType = 'All' | 'Beach' | 'Hills' | 'Heritage' | 'Nature';

export interface DestinationCardData {
  name: string;
  vibe: 'Beach' | 'Hills' | 'Heritage' | 'Nature';
  icon: string;
  shortLine: string; // Max 12 words
  baseCostPerDayINR: number;
  imageUrl: string;
  isAiEstimate?: boolean;
}

export const DESTINATIONS: DestinationCardData[] = [
  {
    name: 'Goa',
    vibe: 'Beach',
    icon: '🏖️',
    shortLine: 'Golden beaches, relaxed beach shacks, and scenic coastal dining.',
    baseCostPerDayINR: 4200,
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
    isAiEstimate: true
  },
  {
    name: 'Coorg',
    vibe: 'Hills',
    icon: '⛰️',
    shortLine: 'Misty coffee estates, cool mountain viewpoints, and fresh spice plantations.',
    baseCostPerDayINR: 3500,
    imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80',
    isAiEstimate: true
  },
  {
    name: 'Mysuru',
    vibe: 'Heritage',
    icon: '🏛️',
    shortLine: 'Grand royal palaces, historic silk markets, and traditional South Indian food.',
    baseCostPerDayINR: 2800,
    imageUrl: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80',
    isAiEstimate: true
  },
  {
    name: 'Kerala',
    vibe: 'Nature',
    icon: '🌿',
    shortLine: 'Serene backwaters, slow palm-fringed houseboats, and green tea valleys.',
    baseCostPerDayINR: 4500,
    imageUrl: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80',
    isAiEstimate: true
  },
  {
    name: 'Ooty',
    vibe: 'Hills',
    icon: '🌲',
    shortLine: 'Colonial tea estates, misty lake gardens, and mountain toy trains.',
    baseCostPerDayINR: 3200,
    imageUrl: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=600&q=80',
    isAiEstimate: true
  },
  {
    name: 'Pondicherry',
    vibe: 'Beach',
    icon: '🌊',
    shortLine: 'French colonial quarters, seaside promenade walks, and peaceful boutique cafes.',
    baseCostPerDayINR: 3600,
    imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80',
    isAiEstimate: true
  },
  {
    name: 'Udaipur',
    vibe: 'Heritage',
    icon: '🏰',
    shortLine: 'Royal lakeside palaces, scenic sunset boat cruises, and historic havelis.',
    baseCostPerDayINR: 4200,
    imageUrl: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80',
    isAiEstimate: true
  }
];

export const WhereShouldWeGo: React.FC<WhereShouldWeGoProps> = ({ onSelectSuggestion, isCompact = false }) => {
  const [selectedVibe, setSelectedVibe] = useState<VibeType>('All');
  const [selectedDays, setSelectedDays] = useState<number>(4);
  const [selectedTier, setSelectedTier] = useState<'Budget' | 'Balanced' | 'Comfort'>('Balanced');

  const tierMultiplier = selectedTier === 'Budget' ? 0.8 : selectedTier === 'Comfort' ? 1.4 : 1.0;

  const filteredDestinations = selectedVibe === 'All'
    ? DESTINATIONS
    : DESTINATIONS.filter((d) => d.vibe === selectedVibe);

  const handleCardClick = (dest: DestinationCardData) => {
    const roughPerPerson = Math.round(dest.baseCostPerDayINR * selectedDays * tierMultiplier / 1000) * 1000;
    trackCardClick({
      destination: dest.name,
      days: selectedDays,
      pricePerPerson: roughPerPerson,
      vibe: dest.vibe
    });
    const prompt = `${selectedDays} days in ${dest.name}`;
    onSelectSuggestion(prompt);
  };

  return (
    <section aria-labelledby="trip-finder-heading" className="card-consumer p-4 sm:p-6 text-left border border-[#E2E6E1] bg-white rounded-2xl shadow-xs space-y-4 mb-10">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E2E6E1]">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-[#0E6B59]" />
            <h2 id="trip-finder-heading" className="text-base sm:text-lg font-bold text-[#15201D] font-heading">
              Where should we go?
            </h2>
          </div>
          <p className="text-xs text-[#55625E] mt-0.5">
            Quick trip finder: pick a vibe and duration to scan destinations.
          </p>
        </div>
        <span className="text-[11px] font-semibold text-[#0E6B59] bg-[#E3F1EC] px-2.5 py-1 rounded-full self-start sm:self-auto">
          Trip Finder
        </span>
      </div>

      {/* Filter Controls Row */}
      <div className="space-y-3 pt-1">
        {/* Vibe Chips */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-[#55625E] block">Trip Vibe</span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'All', label: 'All Vibes', icon: '✨' },
              { id: 'Beach', label: 'Beach', icon: '🏖️' },
              { id: 'Hills', label: 'Hills', icon: '⛰️' },
              { id: 'Heritage', label: 'Heritage', icon: '🏛️' },
              { id: 'Nature', label: 'Nature', icon: '🌿' }
            ].map((vibe) => (
              <button
                key={vibe.id}
                type="button"
                onClick={() => setSelectedVibe(vibe.id as VibeType)}
                className={`pill-chip text-xs transition border flex items-center gap-1.5 min-h-[44px] px-3.5 ${
                  selectedVibe === vibe.id
                    ? 'bg-[#0E6B59] text-white border-[#0E6B59] font-bold shadow-xs'
                    : 'bg-white text-[#15201D] border-[#E2E6E1] hover:border-[#0E6B59]/40 hover:bg-[#E3F1EC]/40'
                }`}
              >
                <span>{vibe.icon}</span>
                <span>{vibe.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Days & Budget Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Days */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-[#55625E] block">Duration</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { days: 3, label: '3 days' },
                { days: 5, label: '5 days' },
                { days: 7, label: '7 days' }
              ].map((d) => (
                <button
                  key={d.days}
                  type="button"
                  onClick={() => setSelectedDays(d.days)}
                  className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-semibold border transition text-center ${
                    selectedDays === d.days
                      ? 'border-[#0E6B59] bg-[#E3F1EC] text-[#0E6B59] font-bold'
                      : 'border-[#E2E6E1] bg-white text-[#55625E] hover:border-[#0E6B59]/40'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Budget Tier */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-[#55625E] block">Comfort</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Budget', label: 'Budget' },
                { id: 'Balanced', label: 'Balanced' },
                { id: 'Comfort', label: 'Comfort' }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTier(t.id as any)}
                  className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-semibold border transition text-center ${
                    selectedTier === t.id
                      ? 'border-[#0E6B59] bg-[#E3F1EC] text-[#0E6B59] font-bold'
                      : 'border-[#E2E6E1] bg-white text-[#55625E] hover:border-[#0E6B59]/40'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Row of Photo Cards */}
      <div className="pt-2">
        <div className="flex gap-3.5 overflow-x-auto pb-3 pt-1 -mx-2 px-2 sm:mx-0 sm:px-0 snap-x snap-mandatory scrollbar-thin">
          {filteredDestinations.map((dest) => {
            const roughPerPerson = Math.round(dest.baseCostPerDayINR * selectedDays * tierMultiplier / 1000) * 1000;
            return (
              <div
                key={dest.name}
                onClick={() => handleCardClick(dest)}
                className="min-w-[260px] max-w-[280px] sm:min-w-[270px] snap-center rounded-2xl border border-[#E2E6E1] bg-[#FAFCFA] hover:border-[#0E6B59] hover:bg-white hover:shadow-md transition-all cursor-pointer flex flex-col justify-between overflow-hidden group"
              >
                {/* Photo Header */}
                <div className="relative h-36 w-full bg-[#E2E6E1] overflow-hidden">
                  <img
                    src={dest.imageUrl}
                    alt={dest.name}
                    loading="lazy"
                    onError={(e) => {
                      // Fallback to neutral placeholder labeled Sample
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0E6B59] bg-white/95 backdrop-blur-xs px-2.5 py-0.5 rounded-full shadow-xs">
                      {dest.vibe}
                    </span>
                  </div>
                  <div className="absolute bottom-2.5 right-2.5">
                    <span className="text-[10px] font-semibold text-[#15201D] bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-md shadow-xs">
                      Sample
                    </span>
                  </div>
                </div>

                {/* Body: Name + Max 12 Words Description */}
                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">{dest.icon}</span>
                        <h3 className="text-base font-bold text-[#15201D] font-heading">
                          {dest.name}
                        </h3>
                      </div>
                    </div>
                    {/* Max 12 words description */}
                    <p className="text-xs text-[#55625E] leading-relaxed mt-1">
                      {dest.shortLine}
                    </p>
                  </div>

                  {/* Price Row & Plan Button (>= 44px tap target) */}
                  <div className="pt-2.5 border-t border-[#E2E6E1]/70 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-bold text-[#15201D] leading-tight">
                        ~₹{roughPerPerson.toLocaleString('en-IN')} per person for {selectedDays} days
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCardClick(dest);
                      }}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0E6B59] text-white text-xs font-bold hover:bg-[#0A5546] transition flex items-center gap-1 shadow-xs cursor-pointer shrink-0"
                    >
                      <span>Plan</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section Legend: Show AI estimate once per section */}
      <div className="pt-1 text-[11px] text-[#55625E] flex items-center gap-1.5 border-t border-[#E2E6E1]/60">
        <Sparkles className="h-3.5 w-3.5 text-[#0E6B59] shrink-0" />
        <span>Prices shown are AI estimates for {selectedDays} days · Confirmed fares and stays are checked before booking.</span>
      </div>
    </section>
  );
};
