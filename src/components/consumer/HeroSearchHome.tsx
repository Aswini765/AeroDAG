import React, { useState } from 'react';
import {
  Plane,
  Building,
  Sparkles,
  ArrowRight,
  Calendar,
  Users,
  MapPin,
  CheckCircle2,
  Shield,
  Search,
  Compass
} from 'lucide-react';
import { Currency } from '../../types/travelBooking';

interface HeroSearchHomeProps {
  onStartAIPlan: (promptText: string) => void;
  onQuickSearchFlights: () => void;
  onQuickSearchHotels: () => void;
  currency: Currency;
}

const EXAMPLE_PROMPTS = [
  'Plan a 7-day Goa trip from Bengaluru for my family',
  'Plan a 10-day Japan trip for two under ₹2 lakh',
  'Weekend trip from Bengaluru under ₹20,000',
  'Plan a honeymoon in Bali',
  'Road trip through Rajasthan',
  '15 days across Europe using trains'
];

export const HeroSearchHome: React.FC<HeroSearchHomeProps> = ({
  onStartAIPlan,
  onQuickSearchFlights,
  onQuickSearchHotels,
  currency
}) => {
  const [naturalPrompt, setNaturalPrompt] = useState(
    'Plan a 7-day Goa trip from Bengaluru for my family'
  );
  const [isListening, setIsListening] = useState(false);

  const [fromCity, setFromCity] = useState('Bengaluru (BLR)');
  const [toCity, setToCity] = useState('Goa (GOX)');
  const [dates, setDates] = useState('Nov 10 – Nov 17, 2026');
  const [travellers, setTravellers] = useState('4 Travellers (2 Adults, 2 Children)');

  return (
    <div className="space-y-10 pb-12">
      {/* Top Banner / Hero Title */}
      <div className="text-center max-w-3xl mx-auto pt-6 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-teal-400" />
          <span>India-First &bull; International Travel Platform</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
          Where do you <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-sky-300 to-emerald-300">want to go?</span>
        </h1>
        <p className="text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
          Tell AeroDAG what you're imagining. We'll build the trip for you.
        </p>
      </div>

      {/* PROMINENT AI TRIP PLANNER INPUT CARD */}
      <div className="max-w-4xl mx-auto relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-teal-500/30 via-sky-500/30 to-emerald-500/30 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition duration-500" />
        
        <div className="relative rounded-2xl bg-slate-900 border border-slate-700/80 p-6 md:p-8 shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Sparkles className="h-5 w-5 text-slate-950 font-bold" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  Plan your trip with AI
                </h2>
                <p className="text-xs text-slate-400">
                  Tell me where you want to go, when, and your budget. I'll handle the planning.
                </p>
              </div>
            </div>

            <span className="text-[11px] font-mono text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-full self-start sm:self-auto">
              Natural Language Engine
            </span>
          </div>

          {/* Main Natural Language Textarea with Voice & Send */}
          <div className="relative">
            <textarea
              value={naturalPrompt}
              onChange={(e) => setNaturalPrompt(e.target.value)}
              rows={3}
              className="w-full bg-slate-950 border border-slate-700/90 rounded-2xl p-4 pr-14 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition resize-y leading-relaxed"
              placeholder="Tell me about your trip..."
            />

            <button
              type="button"
              onClick={() => {
                setIsListening(!isListening);
                if (!isListening) {
                  setNaturalPrompt('Plan a 10-day Japan trip for two under ₹2 lakh');
                }
              }}
              title={isListening ? 'Stop listening' : 'Voice input'}
              className={`absolute right-3.5 bottom-3.5 p-2 rounded-xl transition cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-teal-300 border border-slate-700'
              }`}
            >
              <Mic className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Click Prompts */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
              Try an example prompt:
            </span>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((promptText, idx) => (
                <button
                  key={idx}
                  onClick={() => setNaturalPrompt(promptText)}
                  className="text-xs text-slate-300 bg-slate-950/80 hover:bg-slate-800 hover:text-white px-3 py-1.5 rounded-xl border border-slate-800 transition text-left flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="text-teal-400">&bull;</span>
                  <span className="truncate max-w-[280px] sm:max-w-none">{promptText}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800/80">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
                Domestic & International
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
                No long forms
              </span>
              <span className="hidden md:flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
                Deterministic budget cap
              </span>
            </div>

            <button
              onClick={() => onStartAIPlan(naturalPrompt)}
              disabled={!naturalPrompt.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-teal-500/25 transition active:scale-95 cursor-pointer disabled:opacity-40"
            >
              <span>Build My Trip</span>
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CLASSIC CONSUMER TRAVEL SEARCH BAR (Normal Travel Search) */}
      <div className="max-w-4xl mx-auto rounded-2xl bg-slate-950 border border-slate-800 p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-4 text-xs font-semibold">
            <button
              onClick={onQuickSearchFlights}
              className="text-white flex items-center gap-1.5 pb-1 border-b-2 border-sky-400 text-sky-300 font-bold"
            >
              <Plane className="h-4 w-4 text-sky-400" />
              <span>Search Flights</span>
            </button>
            <button
              onClick={onQuickSearchHotels}
              className="text-slate-400 hover:text-white flex items-center gap-1.5 pb-1 transition"
            >
              <Building className="h-4 w-4 text-emerald-400" />
              <span>Search Stays & Hotels</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-mono">
            Direct Inventory Search
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 block uppercase font-mono">From</span>
            <input
              type="text"
              value={fromCity}
              onChange={(e) => setFromCity(e.target.value)}
              className="w-full bg-transparent text-white font-semibold focus:outline-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 block uppercase font-mono">To</span>
            <input
              type="text"
              value={toCity}
              onChange={(e) => setToCity(e.target.value)}
              className="w-full bg-transparent text-white font-semibold focus:outline-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 block uppercase font-mono">Dates</span>
            <input
              type="text"
              value={dates}
              onChange={(e) => setDates(e.target.value)}
              className="w-full bg-transparent text-white font-semibold focus:outline-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 block uppercase font-mono">Travellers</span>
            <input
              type="text"
              value={travellers}
              onChange={(e) => setTravellers(e.target.value)}
              className="w-full bg-transparent text-white font-semibold focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={onQuickSearchFlights}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-2 transition"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search Available Inventory</span>
          </button>
        </div>
      </div>

      {/* TRAVEL ASSURANCE & CONSUMER VALUE PROPOSITIONS */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <div className="h-8 w-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
            <Users className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Strict Family Bed Capacity
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Never arrive at a hotel that only booked a single double bed for 4 guests. AeroDAG verifies interconnecting suites and dedicated bed counts before proposing stays.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <Shield className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Zero Hidden Luggage Gotchas
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            We disqualify zero-baggage basic economy fares. Every family recommendation includes 20–23kg checked bags per passenger and adjacent seating.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Budget Guardrail Engine
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Specify your budget in {currency === 'INR' ? '₹ Rupees' : '$ USD'} and AeroDAG dynamically balances flights, lodging, visas, and activities to protect your ceiling.
          </p>
        </div>
      </div>
    </div>
  );
};
