import React, { useState } from 'react';
import { Compass, Sparkles, ArrowRight, Sun, Mountain, Landmark, Trees } from 'lucide-react';

interface WhereShouldWeGoProps {
  onSelectSuggestion: (promptText: string) => void;
}

type VibeType = 'All' | 'Beach' | 'Hills' | 'Heritage' | 'Nature';

interface DestinationCardData {
  name: string;
  vibe: 'Beach' | 'Hills' | 'Heritage' | 'Nature';
  icon: string;
  reason: string;
  baseCostPerDayINR: number;
  isAiEstimate?: boolean;
}

const DESTINATIONS: DestinationCardData[] = [
  {
    name: 'Goa',
    vibe: 'Beach',
    icon: '🏖️',
    reason: 'beaches, seafood and an easy, relaxed pace',
    baseCostPerDayINR: 4200
  },
  {
    name: 'Coorg',
    vibe: 'Hills',
    icon: '⛰️',
    reason: 'misty hills, coffee estates and cool weather',
    baseCostPerDayINR: 3500
  },
  {
    name: 'Mysuru',
    vibe: 'Heritage',
    icon: '🏛️',
    reason: 'palaces, heritage and great local food',
    baseCostPerDayINR: 2800
  },
  {
    name: 'Kerala',
    vibe: 'Nature',
    icon: '🌿',
    reason: 'backwaters, wildlife and green, slow-paced nature',
    baseCostPerDayINR: 4500
  },
  {
    name: 'Ooty',
    vibe: 'Hills',
    icon: '🌲',
    reason: 'colonial charm, tea gardens and Nilgiri mountain railway',
    baseCostPerDayINR: 3200,
    isAiEstimate: true
  },
  {
    name: 'Pondicherry',
    vibe: 'Beach',
    icon: '🌊',
    reason: 'French colonial quarters, promenade and coastal cafes',
    baseCostPerDayINR: 3600,
    isAiEstimate: true
  },
  {
    name: 'Udaipur',
    vibe: 'Heritage',
    icon: '🏰',
    reason: 'city of lakes, royal palaces and sunset boat rides',
    baseCostPerDayINR: 4200,
    isAiEstimate: true
  }
];

export const WhereShouldWeGo: React.FC<WhereShouldWeGoProps> = ({ onSelectSuggestion }) => {
  const [selectedVibe, setSelectedVibe] = useState<VibeType>('All');
  const [selectedDays, setSelectedDays] = useState<number>(4);
  const [selectedTier, setSelectedTier] = useState<'Budget' | 'Balanced' | 'Comfort'>('Balanced');

  const tierMultiplier = selectedTier === 'Budget' ? 0.8 : selectedTier === 'Comfort' ? 1.4 : 1.0;

  const filteredDestinations = selectedVibe === 'All'
    ? DESTINATIONS
    : DESTINATIONS.filter((d) => d.vibe === selectedVibe);

  const handleCardClick = (dest: DestinationCardData) => {
    const roughPerPerson = Math.round(dest.baseCostPerDayINR * selectedDays * tierMultiplier / 1000) * 1000;
    const totalBudget = roughPerPerson * 2;
    const prompt = `${selectedDays} days in ${dest.name} for 2 adults under budget ₹${totalBudget.toLocaleString('en-IN')}. ${dest.reason}.`;
    onSelectSuggestion(prompt);
  };

  return (
    <div className="card-consumer p-5 sm:p-6 text-left border border-[#E2E6E1] bg-white rounded-2xl shadow-xs space-y-4 mb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E2E6E1]">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-[#0E6B59]" />
            <h2 className="text-base sm:text-lg font-bold text-[#15201D] font-heading">
              Where should we go?
            </h2>
          </div>
          <p className="text-xs text-[#55625E] mt-0.5">
            Not sure where to head? Pick a vibe, duration and budget to explore destinations across India.
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
          <span className="text-xs font-semibold text-[#55625E] block">Trip Vibe:</span>
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
            <span className="text-xs font-semibold text-[#55625E] block">Duration:</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { days: 3, label: '3 days (Weekend)' },
                { days: 5, label: '5 days (Short)' },
                { days: 7, label: '7 days (Week)' }
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
            <span className="text-xs font-semibold text-[#55625E] block">Budget Comfort:</span>
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

      {/* Suggested Destination Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
        {filteredDestinations.map((dest) => {
          const roughPerPerson = Math.round(dest.baseCostPerDayINR * selectedDays * tierMultiplier / 1000) * 1000;
          return (
            <div
              key={dest.name}
              onClick={() => handleCardClick(dest)}
              className="p-4 rounded-xl border border-[#E2E6E1] bg-[#F9FAF9] hover:border-[#0E6B59] hover:bg-white hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl">{dest.icon}</span>
                    <span className="text-base font-bold text-[#15201D] font-heading">{dest.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {dest.isAiEstimate && (
                      <span className="text-[10px] font-bold text-[#0E6B59] bg-[#EFF8F5] border border-[#0E6B59]/30 px-1.5 py-0.5 rounded-full">
                        AI estimate
                      </span>
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0E6B59] bg-[#E3F1EC] px-2 py-0.5 rounded-full">
                      {dest.vibe}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[#55625E] leading-relaxed">
                  {dest.reason}
                </p>
              </div>

              <div className="pt-2 border-t border-[#E2E6E1]/60 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-[#55625E]">Rough estimate</div>
                  <div className="text-xs font-extrabold text-[#15201D]">
                    ~₹{roughPerPerson.toLocaleString('en-IN')}<span className="font-normal text-[10px] text-[#55625E]">/person</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardClick(dest);
                  }}
                  className="min-h-[44px] px-3 py-1.5 rounded-lg bg-[#0E6B59] text-white text-xs font-bold hover:bg-[#0A5546] transition flex items-center gap-1 shadow-xs"
                >
                  <span>Plan</span>
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
