import React, { useState } from 'react';
import {
  Plane,
  Building,
  Train,
  Car,
  FileCheck,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Users,
  Compass,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Download,
  Share2,
  CreditCard,
  Edit3,
  Luggage,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Utensils,
  MapPin,
  Send,
  Zap,
  Tag,
  Info,
  Clock,
  Check,
  Layers,
  Heart
} from 'lucide-react';
import {
  FlightItem,
  HotelItem,
  TransferItem,
  TrainItem,
  DiningItem,
  ActivityDayItem,
  VisaDetails,
  TripPreferences,
  Currency,
  TripScope,
  VerificationCheck
} from '../../types/travelBooking';
import {
  calculateTripFinancials,
  formatINR,
  formatPrice,
  inferTripScope,
  applyConversationalRefinement,
  generateVerificationChecks,
  generateBudgetOptimizationOptions,
  MOCK_FLIGHTS_GOA,
  MOCK_HOTELS_GOA,
  MOCK_TRANSFERS_GOA,
  MOCK_TRAINS_GOA,
  MOCK_DINING_GOA,
  MOCK_DINING_VIETNAM,
  MOCK_DINING_JAPAN,
  MOCK_FLIGHTS_VIETNAM,
  MOCK_HOTELS_VIETNAM,
  MOCK_TRANSFERS_VIETNAM
} from '../../services/travelCatalog';

export type WorkspaceTab =
  | 'itinerary'
  | 'flights'
  | 'hotels'
  | 'transport'
  | 'activities'
  | 'dining'
  | 'map'
  | 'budget'
  | 'visa';

interface TripBuilderDashboardProps {
  preferences: TripPreferences;
  selectedFlight: FlightItem;
  selectedHotel: HotelItem;
  selectedTransfer: TransferItem;
  visaDetails: VisaDetails;
  itinerary: ActivityDayItem[];
  onUpdateItineraryDay: (dayNumber: number, modificationType: 'relaxed' | 'food' | 'budget') => void;
  onChangeFlight: () => void;
  onChangeHotel: () => void;
  onProceedToCheckout: () => void;
  currency: Currency;
  onBudgetIncrease: (newBudget: number) => void;
  onAutoFixBudget: () => void;
  onPreferencesChange?: (prefs: TripPreferences) => void;
}

export const TripBuilderDashboard: React.FC<TripBuilderDashboardProps> = ({
  preferences: initialPreferences,
  selectedFlight: initialFlight,
  selectedHotel: initialHotel,
  selectedTransfer: initialTransfer,
  visaDetails,
  itinerary: initialItinerary,
  onUpdateItineraryDay,
  onChangeFlight,
  onChangeHotel,
  onProceedToCheckout,
  currency,
  onBudgetIncrease,
  onAutoFixBudget
}) => {
  // Live Workspace State with Conversational Refinement
  const [preferences, setPreferences] = useState<TripPreferences>(initialPreferences);
  const [flight, setFlight] = useState<FlightItem>(initialFlight);
  const [hotel, setHotel] = useState<HotelItem>(initialHotel);
  const [transfer, setTransfer] = useState<TransferItem>(initialTransfer);
  const [itinerary, setItinerary] = useState<ActivityDayItem[]>(initialItinerary);
  const [selectedTrain, setSelectedTrain] = useState<TrainItem | undefined>(MOCK_TRAINS_GOA[0]);
  const [transportMode, setTransportMode] = useState<'flight' | 'train'>(
    preferences.transportMode === 'Train' ? 'train' : 'flight'
  );

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('itinerary');
  const [activeDayNumber, setActiveDayNumber] = useState<number>(1);
  const [refinementInput, setRefinementInput] = useState('');
  const [refinementToast, setRefinementToast] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Inferred trip scope: domestic vs international
  const scope: TripScope = preferences.scope || inferTripScope(preferences.origin, preferences.destination);
  const isDomestic = scope === 'domestic';

  // Financial calculations
  const financials = calculateTripFinancials(
    flight,
    hotel,
    transfer,
    visaDetails,
    itinerary,
    preferences.budgetTotalINR
  );

  const currentDay = itinerary.find((d) => d.day === activeDayNumber) || itinerary[0];

  // Dynamic verification checks
  const verificationChecks = generateVerificationChecks(
    flight,
    hotel,
    visaDetails,
    financials,
    preferences.partySize,
    scope
  );
  const allVerifiedPass = verificationChecks.every((c) => c.status === 'PASS');

  // Budget Optimization options
  const budgetOptimizationOptions = generateBudgetOptimizationOptions(
    financials,
    isDomestic ? MOCK_HOTELS_GOA : MOCK_HOTELS_VIETNAM,
    isDomestic ? MOCK_FLIGHTS_GOA : MOCK_FLIGHTS_VIETNAM
  );

  // Dining list tailored to destination & dietary preferences
  const diningList: DiningItem[] = isDomestic
    ? MOCK_DINING_GOA
    : preferences.destination.toLowerCase().includes('japan')
    ? MOCK_DINING_JAPAN
    : MOCK_DINING_VIETNAM;

  // Handle Conversational Refinement prompt
  const handleRefineTrip = (promptText: string) => {
    if (!promptText.trim()) return;
    setIsRefining(true);

    setTimeout(() => {
      const result = applyConversationalRefinement(
        promptText,
        preferences,
        flight,
        hotel,
        transfer,
        itinerary,
        isDomestic ? MOCK_HOTELS_GOA : MOCK_HOTELS_VIETNAM,
        isDomestic ? MOCK_FLIGHTS_GOA : MOCK_FLIGHTS_VIETNAM,
        isDomestic ? MOCK_TRAINS_GOA : undefined
      );

      setPreferences(result.updatedPreferences);
      setFlight(result.updatedFlight);
      setHotel(result.updatedHotel);
      setTransfer(result.updatedTransfer);
      setItinerary(result.updatedItinerary);
      if (result.updatedTrain) {
        setSelectedTrain(result.updatedTrain);
        setTransportMode('train');
      }

      setRefinementToast(result.actionSummary);
      setIsRefining(false);
      setRefinementInput('');

      setTimeout(() => setRefinementToast(null), 6000);
    }, 400);
  };

  const handleModifyDay = (dayNum: number, type: 'relaxed' | 'food' | 'budget') => {
    onUpdateItineraryDay(dayNum, type);
    const updated = itinerary.map((d) => {
      if (d.day !== dayNum) return d;
      if (type === 'relaxed') {
        return {
          ...d,
          afternoon: `${d.afternoon} [Relaxed gentle pacing & shaded rest downtime]`,
          familyFriendlyScore: 10
        };
      } else if (type === 'food') {
        return {
          ...d,
          evening: `${d.evening} [Added an authentic local street food & sweet dessert tasting]`,
          localDining: [...d.localDining, 'Specialty regional tasting experience']
        };
      } else {
        return {
          ...d,
          afternoon: 'Free self-guided scenic walking tour through gardens and historic promenades.',
          estimatedCostINR: Math.max(200, d.estimatedCostINR - 500)
        };
      }
    });
    setItinerary(updated);
    setRefinementToast(`Day ${dayNum} updated: Adjusted for ${type === 'relaxed' ? 'gentler pacing' : type === 'food' ? 'food tasting' : 'zero-cost activities'}.`);
    setTimeout(() => setRefinementToast(null), 3500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* 1. TOP TRIP WORKSPACE HEADER */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                isDomestic
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-teal-500/15 text-teal-300 border-teal-500/30'
              }`}>
                <span>{isDomestic ? '🇮🇳 Domestic Travel within India' : '✈️ International Outbound Travel'}</span>
              </span>

              <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-mono">
                {preferences.partySize} Guests ({preferences.adultsCount} Adults, {preferences.childrenCount} Minors)
              </span>

              <span className="px-3 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 text-xs font-mono">
                Origin: {preferences.origin}
              </span>

              {/* Automated Verification Status Badge (Section 30) */}
              <button
                onClick={() => setShowVerificationModal(true)}
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                  allVerifiedPass
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Verification: {allVerifiedPass ? 'PASS (5/5 Checked)' : 'NEEDS REVIEW'}</span>
              </button>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {preferences.durationDays}-Day Journey to {preferences.destination}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              {preferences.targetDates} &bull; {preferences.origin} &rarr; {preferences.destination} &bull; {preferences.travelStyle} Pace &bull; {preferences.accommodationPreference}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={onProceedToCheckout}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-teal-500/25 transition active:scale-95 cursor-pointer"
            >
              <span>Review & Book Trip</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Deterministic Budget Bar */}
        <div className={`mt-6 p-4 rounded-2xl border transition ${
          financials.isOverBudget
            ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
            : 'bg-slate-950/80 border-slate-800 text-slate-300'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <DollarSign className={`h-5 w-5 ${financials.isOverBudget ? 'text-rose-400' : 'text-emerald-400'}`} />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider font-mono">
                  Deterministic Budget Tracker:
                </span>
                <div className="text-sm font-semibold text-white">
                  Target Budget: <span className="font-mono">{formatPrice(preferences.budgetTotalINR, currency)}</span> &bull; Current Estimate: <span className={`font-mono font-bold ${financials.isOverBudget ? 'text-rose-400' : 'text-emerald-400'}`}>{formatPrice(financials.totalCalculatedCostINR, currency)}</span>
                </div>
              </div>
            </div>

            <div className="font-mono">
              {financials.isOverBudget ? (
                <span className="text-xs font-bold text-rose-400 bg-rose-500/15 px-3 py-1 rounded-full border border-rose-500/30">
                  {formatPrice(financials.overBudgetAmountINR, currency)} Over Target
                </span>
              ) : (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30">
                  {formatPrice(financials.remainingBudgetINR, currency)} Remaining Buffer
                </span>
              )}
            </div>
          </div>

          {/* Over-budget alerts & 1-click self-correction */}
          {financials.isOverBudget && (
            <div className="mt-3 pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-rose-300">
                <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                <span>Selection exceeds budget target by {formatPrice(financials.overBudgetAmountINR, currency)}.</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onAutoFixBudget}
                  className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold transition text-xs cursor-pointer"
                >
                  Apply 1-Click Budget Fix
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. DOCKED CONVERSATIONAL REFINEMENT ASSISTANT (Section 13) */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Conversational Refinement Assistant
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Modify any aspect without restarting
          </span>
        </div>

        {/* Natural Language Refinement Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={refinementInput}
            onChange={(e) => setRefinementInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRefineTrip(refinementInput)}
            placeholder="Type any request, e.g. 'Make it cheaper', 'We don't want too much walking', 'Can we take trains instead?'..."
            className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
          />
          <button
            onClick={() => handleRefineTrip(refinementInput)}
            disabled={!refinementInput.trim() || isRefining}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-40"
          >
            {isRefining ? <Sparkles className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            <span>Refine</span>
          </button>
        </div>

        {/* Quick Refinement Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-[10px] text-slate-500 uppercase font-mono font-bold mr-1">Suggestions:</span>
          {[
            'Make it cheaper',
            'We don\'t want too much walking',
            'Can we take trains instead?',
            'Add vegetarian dining',
            'Give me a luxury hotel',
            'Add more nature'
          ].map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleRefineTrip(chip)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-teal-300 border border-slate-800 text-[11px] transition cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Refinement Toast / Action Feedback */}
        {refinementToast && (
          <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs flex items-center justify-between gap-3 font-mono animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-teal-400 flex-shrink-0" />
              <span>{refinementToast}</span>
            </div>
            <button
              onClick={() => setRefinementToast(null)}
              className="text-slate-400 hover:text-white text-[11px]"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* 3. WORKSPACE NAVIGATION TABS (Section 14) */}
      <div className="border-b border-slate-800 flex overflow-x-auto gap-2 text-xs font-semibold pb-1 scrollbar-none">
        {[
          { id: 'itinerary', label: 'Itinerary', icon: Calendar },
          { id: 'flights', label: isDomestic ? 'Flights & Trains' : 'Flights', icon: Plane },
          { id: 'hotels', label: 'Hotels', icon: Building },
          { id: 'transport', label: 'Transport', icon: Car },
          { id: 'activities', label: 'Activities', icon: Compass },
          { id: 'dining', label: 'Dining', icon: Utensils },
          { id: 'map', label: 'Route Map', icon: MapPin },
          { id: 'budget', label: 'Budget Engine', icon: DollarSign },
          { id: 'visa', label: isDomestic ? 'Domestic ID & Transit' : 'Visa & Entry', icon: FileCheck }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as WorkspaceTab)}
              className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer flex-shrink-0 ${
                isActive
                  ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. WORKSPACE TAB CONTENTS */}

      {/* TAB 1: ITINERARY */}
      {activeTab === 'itinerary' && (
        <div className="space-y-6">
          {/* Day Selector Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {itinerary.map((d) => (
              <button
                key={d.day}
                onClick={() => setActiveDayNumber(d.day)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  activeDayNumber === d.day
                    ? 'bg-teal-600 text-slate-950 font-bold shadow-md shadow-teal-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Day {d.day}
              </button>
            ))}
          </div>

          {/* Current Day Schedule Card */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <span className="text-[11px] font-mono text-teal-400 uppercase font-bold block">
                  {currentDay.dateStr} &bull; {currentDay.theme}
                </span>
                <h3 className="text-lg font-bold text-white">{currentDay.title}</h3>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 font-mono">
                  Family Score: {currentDay.familyFriendlyScore}/10
                </span>
                <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono font-bold">
                  Est. Cost: {formatPrice(currentDay.estimatedCostINR, currency)}
                </span>
              </div>
            </div>

            {/* Time Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-sky-400 uppercase flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Morning
                </span>
                <p className="text-slate-300 leading-relaxed">{currentDay.morning}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Afternoon
                </span>
                <p className="text-slate-300 leading-relaxed">{currentDay.afternoon}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-purple-400 uppercase flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Evening
                </span>
                <p className="text-slate-300 leading-relaxed">{currentDay.evening}</p>
              </div>
            </div>

            {/* Dining & Transit Tip */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-300">
                <Utensils className="h-4 w-4 text-amber-400 flex-shrink-0" />
                <span>Recommended Dining: {currentDay.localDining.join(' • ')}</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">
                Transit: {currentDay.transitTip}
              </span>
            </div>

            {/* Day Actions */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 font-mono text-[11px]">Quick adjustments for Day {currentDay.day}:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleModifyDay(currentDay.day, 'relaxed')}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
                >
                  Make it more relaxed
                </button>
                <button
                  onClick={() => handleModifyDay(currentDay.day, 'food')}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
                >
                  Add more food experiences
                </button>
                <button
                  onClick={() => handleModifyDay(currentDay.day, 'budget')}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
                >
                  Optimize for zero-cost activities
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FLIGHTS & TRAINS */}
      {activeTab === 'flights' && (
        <div className="space-y-6">
          {/* Domestic Indian Transport Mode Switcher (Flights vs Vande Bharat) */}
          {isDomestic && (
            <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 w-fit">
              <button
                onClick={() => setTransportMode('flight')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  transportMode === 'flight'
                    ? 'bg-teal-600 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Plane className="h-4 w-4" />
                <span>Selected Flight</span>
              </button>
              <button
                onClick={() => setTransportMode('train')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  transportMode === 'train'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Train className="h-4 w-4" />
                <span>Indian Railways (Vande Bharat Express)</span>
              </button>
            </div>
          )}

          {transportMode === 'flight' ? (
            /* FLIGHT CARD */
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                    <Plane className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{flight.airline} ({flight.flightNumber})</h3>
                    <p className="text-xs text-slate-400">{flight.cabinClass} &bull; {flight.stops}</p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-lg font-black text-emerald-400 font-mono">
                    {formatPrice(flight.totalPriceINR, currency)}
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Total for {preferences.partySize} travellers
                  </span>
                </div>
              </div>

              {/* Schedule row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs items-center p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-base font-bold text-white font-mono">{flight.departureTime}</div>
                  <div className="text-slate-400">{flight.originCity} ({flight.originCode})</div>
                </div>

                <div className="text-center space-y-1">
                  <span className="text-[11px] text-slate-400 font-mono">{flight.duration}</span>
                  <div className="w-full h-0.5 bg-slate-700 relative">
                    <Plane className="h-3 w-3 text-teal-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <span className="text-[10px] text-teal-300 font-mono">{flight.stops}</span>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-base font-bold text-white font-mono">{flight.arrivalTime}</div>
                  <div className="text-slate-400">{flight.destinationCity} ({flight.destinationCode})</div>
                </div>
              </div>

              {/* Perks and luggage */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Luggage className="h-4 w-4 text-teal-400" />
                  <span>{flight.baggage}</span>
                </div>
                {flight.adjacentFamilySeatsGuaranteed && (
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Adjacent Family Seats Guaranteed
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* INDIAN RAILWAYS TRAIN CARD (Vande Bharat / Rajdhani) */
            selectedTrain && (
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                      <Train className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {selectedTrain.trainName} ({selectedTrain.trainNumber})
                      </h3>
                      <p className="text-xs text-slate-400">
                        Indian Railways &bull; {selectedTrain.selectedClass} Class &bull; {selectedTrain.foodIncluded ? 'Hot Meals Included' : 'Standard'}
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-lg font-black text-emerald-400 font-mono">
                      {formatPrice(selectedTrain.totalPriceINR, currency)}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Total for {preferences.partySize} passengers ({selectedTrain.selectedClass})
                    </span>
                  </div>
                </div>

                {/* Train Schedule */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs items-center p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <div className="text-base font-bold text-white font-mono">{selectedTrain.departureTime}</div>
                    <div className="text-slate-400">{selectedTrain.fromStation}</div>
                  </div>

                  <div className="text-center space-y-1">
                    <span className="text-[11px] text-slate-400 font-mono">{selectedTrain.duration}</span>
                    <div className="w-full h-0.5 bg-amber-500/50 relative">
                      <Train className="h-3 w-3 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <span className="text-[10px] text-amber-300 font-mono">High-Speed Rail</span>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-base font-bold text-white font-mono">{selectedTrain.arrivalTime}</div>
                    <div className="text-slate-400">{selectedTrain.toStation}</div>
                  </div>
                </div>

                {/* Available Classes Selector */}
                <div className="space-y-2">
                  <span className="text-xs text-slate-400 font-mono">Select Travel Class:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedTrain.classes.map((cls) => (
                      <button
                        key={cls.code}
                        onClick={() => {
                          const updated = {
                            ...selectedTrain,
                            selectedClass: cls.code,
                            pricePerPersonINR: cls.fareINR,
                            totalPriceINR: cls.fareINR * preferences.partySize
                          };
                          setSelectedTrain(updated);
                        }}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          selectedTrain.selectedClass === cls.code
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-bold text-xs">{cls.code} &bull; {cls.name}</div>
                        <div className="text-white font-mono font-bold mt-1">{formatPrice(cls.fareINR, currency)}/person</div>
                        <div className="text-[10px] text-emerald-400 mt-0.5">{cls.availability}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* TAB 3: HOTELS */}
      {activeTab === 'hotels' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs font-mono text-teal-400 uppercase font-bold block">
                  {hotel.tag || 'Recommended Stay'} &bull; {hotel.starRating}-Star Hotel
                </span>
                <h3 className="text-lg font-bold text-white">{hotel.name}</h3>
                <p className="text-xs text-slate-400">{hotel.area}, {hotel.city} &bull; {hotel.distanceFromCenter}</p>
              </div>

              <div className="text-left sm:text-right">
                <div className="text-lg font-black text-emerald-400 font-mono">
                  {formatPrice(hotel.totalPriceINR, currency)}
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {formatPrice(hotel.pricePerNightINR, currency)}/night &bull; Total for {preferences.durationDays} nights
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5 h-48 rounded-xl overflow-hidden relative">
                <img src={hotel.imageUrl} alt={hotel.name} className="h-full w-full object-cover" />
                <div className="absolute top-2 left-2 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-md text-amber-300 font-bold text-xs">
                  ★ {hotel.reviewScore} ({hotel.reviewsCount} reviews)
                </div>
              </div>

              <div className="md:col-span-7 space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-mono text-[10px] uppercase">Verified Family Bed Configuration:</span>
                  <div className="font-bold text-white text-sm">{hotel.roomType}</div>
                  <div className="text-emerald-400 font-semibold">{hotel.bedConfiguration}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  {hotel.amenities.map((am, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-teal-400 flex-shrink-0" />
                      <span className="truncate">{am}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TRANSPORT */}
      {activeTab === 'transport' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">{transfer.title}</h3>
              <p className="text-xs text-slate-400">{transfer.vehicleType} &bull; Luggage capacity: {transfer.luggageCapacity} bags</p>
            </div>
            <div className="text-lg font-black text-emerald-400 font-mono">
              {formatPrice(transfer.priceINR, currency)}
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{transfer.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 uppercase block text-[10px]">Pickup Location</span>
              <strong className="text-white">{transfer.pickupLocation}</strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 uppercase block text-[10px]">Drop Location</span>
              <strong className="text-white">{transfer.dropLocation}</strong>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ACTIVITIES */}
      {activeTab === 'activities' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {itinerary.slice(0, 6).map((act) => (
              <div key={act.day} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-teal-400 font-bold">{act.dateStr}</span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">{formatPrice(act.estimatedCostINR, currency)}</span>
                </div>
                <h4 className="text-sm font-bold text-white">{act.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{act.morning}</p>
                <div className="text-[11px] text-slate-400 font-mono pt-1">
                  Family Suitability: {act.familyFriendlyScore}/10 &bull; {act.transitTip}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: DINING */}
      {activeTab === 'dining' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
            <span className="text-slate-400 font-mono">
              Curated dining recommendations matching {preferences.destination}:
            </span>
            {preferences.dietaryPreference && (
              <span className="px-2.5 py-1 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 font-mono font-bold">
                Filter: {preferences.dietaryPreference}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {diningList.map((din) => (
              <div key={din.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{din.name}</h4>
                      {din.isPureVeg && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Pure Veg
                        </span>
                      )}
                      {din.isJainFriendly && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Jain Satvik
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{din.cuisine} &bull; {din.area}</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {formatPrice(din.priceForTwoINR, currency)} for 2
                  </span>
                </div>

                <div className="text-xs text-slate-300">
                  <span className="text-slate-400 font-mono text-[10px] uppercase block">Recommended Specialties:</span>
                  <div className="text-slate-200 mt-0.5">{din.recommendedDishes.join(', ')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: MAP */}
      {activeTab === 'map' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">Interactive Travel Route & Waypoints</h3>
              <p className="text-xs text-slate-400">
                Visual connection from {preferences.origin} to {preferences.destination} and internal hubs.
              </p>
            </div>
            <span className="text-xs font-mono text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded border border-teal-500/20">
              Multi-City Route
            </span>
          </div>

          {/* Graphical Node Route Diagram */}
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
              <div className="text-center p-3 rounded-xl bg-slate-900 border border-slate-800 w-full sm:w-48">
                <MapPin className="h-4 w-4 text-sky-400 mx-auto mb-1" />
                <span className="text-slate-400 block text-[10px]">ORIGIN</span>
                <strong className="text-white text-sm">{preferences.origin}</strong>
              </div>

              <div className="flex flex-col items-center text-teal-400">
                <span className="text-[10px] mb-1">
                  {transportMode === 'train' ? 'Train Transit (Vande Bharat)' : 'Flight Route'}
                </span>
                <div className="w-24 sm:w-32 h-0.5 bg-teal-500/50 relative">
                  {transportMode === 'train' ? (
                    <Train className="h-3.5 w-3.5 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  ) : (
                    <Plane className="h-3.5 w-3.5 text-teal-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>

              <div className="text-center p-3 rounded-xl bg-slate-900 border border-teal-500/30 w-full sm:w-48">
                <MapPin className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
                <span className="text-slate-400 block text-[10px]">DESTINATION</span>
                <strong className="text-white text-sm">{preferences.destination}</strong>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
              <strong>Local Itinerary Waypoints:</strong> All stays, dining venues, and daily excursion spots are mapped within a 25-minute radius of your central resort, ensuring minimal transit exhaustion for children and seniors.
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: BUDGET ENGINE (Section 23 & 24) */}
      {activeTab === 'budget' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">Budget Breakdown & Financial Audit</h3>
              <p className="text-xs text-slate-400">
                Transparent itemized accounting across flights, accommodation, local transit, visas and activities.
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
              Deterministic Math
            </span>
          </div>

          {/* Breakdown Table */}
          <div className="rounded-xl overflow-hidden border border-slate-800 text-xs">
            <table className="w-full text-left font-mono">
              <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Expense Category</th>
                  <th className="p-3">Selection Details</th>
                  <th className="p-3 text-right">Cost (INR)</th>
                  <th className="p-3 text-right">Cost ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                <tr>
                  <td className="p-3 font-bold text-white">{transportMode === 'train' ? 'Train Travel' : 'Flights'}</td>
                  <td className="p-3 text-slate-400">{transportMode === 'train' ? selectedTrain?.trainName : `${flight.airline} (${flight.flightNumber})`}</td>
                  <td className="p-3 text-right">{formatINR(transportMode === 'train' ? (selectedTrain?.totalPriceINR || 0) : flight.totalPriceINR)}</td>
                  <td className="p-3 text-right">{formatPrice(transportMode === 'train' ? (selectedTrain?.totalPriceINR || 0) : flight.totalPriceINR, currency)}</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-white">Accommodations</td>
                  <td className="p-3 text-slate-400">{hotel.name} ({preferences.durationDays} nights)</td>
                  <td className="p-3 text-right">{formatINR(hotel.totalPriceINR)}</td>
                  <td className="p-3 text-right">{formatPrice(hotel.totalPriceINR, currency)}</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-white">Transfers & Cabs</td>
                  <td className="p-3 text-slate-400">{transfer.title}</td>
                  <td className="p-3 text-right">{formatINR(transfer.priceINR)}</td>
                  <td className="p-3 text-right">{formatPrice(transfer.priceINR, currency)}</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-white">{isDomestic ? 'Domestic ID / Clearance' : 'Visa & Border Entry'}</td>
                  <td className="p-3 text-slate-400">{isDomestic ? 'Aadhaar / Photo ID verified' : visaDetails.visaType}</td>
                  <td className="p-3 text-right">{formatINR(isDomestic ? 0 : visaDetails.totalFeeINR)}</td>
                  <td className="p-3 text-right">{formatPrice(isDomestic ? 0 : visaDetails.totalFeeINR, currency)}</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-white">Activities & Food</td>
                  <td className="p-3 text-slate-400">Paced daily itinerary & dining ({itinerary.length} days)</td>
                  <td className="p-3 text-right">{formatINR(financials.activitiesAndFoodCostINR)}</td>
                  <td className="p-3 text-right">{formatPrice(financials.activitiesAndFoodCostINR, currency)}</td>
                </tr>
                <tr className="bg-slate-950/80 font-bold text-white text-sm">
                  <td className="p-3" colSpan={2}>TOTAL PACKAGE ESTIMATE</td>
                  <td className="p-3 text-right text-emerald-400">{formatINR(financials.totalCalculatedCostINR)}</td>
                  <td className="p-3 text-right text-emerald-400">{formatPrice(financials.totalCalculatedCostINR, currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 24: Budget Optimization Engine */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                AeroDAG Budget Optimization Engine (Section 24)
              </h4>
            </div>

            <p className="text-xs text-slate-300">
              Need to fine-tune your spending? Choose from 3 non-destructive ways to bring costs down:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {budgetOptimizationOptions.map((opt) => (
                <div key={opt.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 flex flex-col justify-between">
                  <div>
                    <strong className="text-white block font-semibold">{opt.title}</strong>
                    <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">{opt.description}</p>
                  </div>
                  <button
                    onClick={() => handleRefineTrip(opt.title)}
                    className="w-full py-2 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold transition cursor-pointer"
                  >
                    {opt.actionLabel}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: VISA / ENTRY */}
      {activeTab === 'visa' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">
                {isDomestic ? 'Domestic India Identity & Entry Protocols' : `${visaDetails.country} Visa & Border Clearance`}
              </h3>
              <p className="text-xs text-slate-400">
                {isDomestic
                  ? 'Travel within India: No visa or foreign currency exchange required.'
                  : 'Authoritative consular entry requirements for your Indian passport cohort.'}
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
              {isDomestic ? 'Domestic ID Rule' : 'Official Portal'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <span className="text-slate-400 block font-mono text-[10px] uppercase">Requirement Type</span>
              <div className="font-bold text-white">{visaDetails.visaType}</div>
              <div className="text-emerald-400 font-mono font-bold">
                Fee: {isDomestic ? '₹0 (Free)' : `${formatPrice(visaDetails.feePerPersonINR, currency)} per person`}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <span className="text-slate-400 block font-mono text-[10px] uppercase">Processing Time</span>
              <div className="font-semibold text-white">{visaDetails.processingTime}</div>
              <p className="text-slate-400 text-[11px]">
                {isDomestic ? 'Zero waiting time. Valid anytime.' : 'Apply 2-3 weeks prior to departure.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <span className="text-slate-400 block font-mono text-[10px] uppercase">Mandatory Identification</span>
              <div className="font-semibold text-white">{isDomestic ? 'Government Photo ID' : 'Passport (6+ Months)'}</div>
              <p className="text-slate-400 text-[11px]">{visaDetails.passportValidityRequired}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <span className="font-bold text-white font-mono uppercase block">Required Documentation Checklist:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
              {visaDetails.requiredDocuments.map((doc, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-400 flex-shrink-0" />
                  <span>{doc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <a
              href={visaDetails.officialSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2 transition"
            >
              <span>{isDomestic ? 'Ministry of Home Affairs Guidelines' : 'Visit Official National eVisa Portal'}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* 5. BOTTOM CHECKOUT & BOOKING BAR */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <span className="text-xs text-slate-400 block font-mono">
            Ready to confirm your trip?
          </span>
          <div className="text-sm font-semibold text-white">
            Total Package: <strong className="text-emerald-400 font-mono text-base">{formatPrice(financials.totalCalculatedCostINR, currency)}</strong> (Travel, {preferences.durationDays}-Night Stays, Transfers & Activities)
          </div>
        </div>

        <button
          onClick={onProceedToCheckout}
          className="px-7 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-teal-500/25 transition active:scale-95 cursor-pointer"
        >
          <span>Proceed to Passenger Details & Booking</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* 6. MODAL: SYSTEM VERIFICATION AUDIT (Section 30) */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">Trip Verification Checklist</h3>
              </div>
              <button
                onClick={() => setShowVerificationModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Deterministic verification performed before presenting booking availability:
            </p>

            <div className="space-y-3">
              {verificationChecks.map((chk) => (
                <div key={chk.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <strong className="text-white font-semibold">{chk.title}</strong>
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                      chk.status === 'PASS'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {chk.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{chk.detail}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowVerificationModal(false)}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
