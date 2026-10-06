import React, { useState } from 'react';
import {
  Cpu,
  Plane,
  Building,
  FileText,
  Compass,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Clock,
  Sparkles,
  Luggage,
  ShieldCheck,
  Utensils
} from 'lucide-react';
import { Phase3WorkersOutput } from '../../src/types/orchestrator';

interface Phase3Props {
  phase3: Phase3WorkersOutput;
}

export const Phase3PuppeteerWorkersView: React.FC<Phase3Props> = ({ phase3 }) => {
  const [activeWorkerTab, setActiveWorkerTab] = useState<'flight' | 'hotel' | 'visa' | 'activity'>('flight');
  const [activeDirectiveTab, setActiveDirectiveTab] = useState<'flight' | 'hotel' | 'visa' | 'activity'>('flight');
  const [showFullDirective, setShowFullDirective] = useState(true);
  const [copiedDirective, setCopiedDirective] = useState(false);

  const handleCopyDirective = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDirective(true);
    setTimeout(() => setCopiedDirective(false), 2000);
  };

  const getDirectiveText = () => {
    switch (activeDirectiveTab) {
      case 'flight':
        return phase3.expandedDirectives.flightAgentDirective;
      case 'hotel':
        return phase3.expandedDirectives.hotelTransitDirective;
      case 'visa':
        return phase3.expandedDirectives.visaDocsDirective;
      case 'activity':
        return phase3.expandedDirectives.activityItineraryDirective;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Puppeteer Overview Banner */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">
                Phase 3: Central Orchestrator & Supervisor ("The Puppeteer")
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                DAG PARALLEL DISPATCH
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              1-to-50 line system prompt expansion and downward parallel dispatch to 4 Domain SME Worker Nodes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
            Parallel Group: <strong className="text-emerald-400">4 Workers Concurrent</strong>
          </div>
        </div>
      </div>

      {/* SECTION 3.1: 1-Line to 50-Line Expanded System Prompt Directives */}
      <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-mono font-semibold text-slate-200 uppercase tracking-wider">
              Output: Expanded System Prompt Directives (The Puppeteer's Instructions)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFullDirective(!showFullDirective)}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-800/60 hover:bg-slate-800 flex items-center gap-1 transition"
            >
              {showFullDirective ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showFullDirective ? 'Collapse Directives' : 'Expand Directives'}
            </button>
            <button
              onClick={() => handleCopyDirective(getDirectiveText())}
              className="text-xs text-cyan-400 hover:text-cyan-300 px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 flex items-center gap-1 transition"
            >
              {copiedDirective ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copiedDirective ? 'Copied Directive' : 'Copy Directive'}
            </button>
          </div>
        </div>

        {/* Worker Directive Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/40 px-3 overflow-x-auto">
          <button
            onClick={() => setActiveDirectiveTab('flight')}
            className={`px-3.5 py-2 text-xs font-mono font-medium border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeDirectiveTab === 'flight'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plane className="h-3.5 w-3.5" />
            1. Flight Agent Directive (GDS/Baggage/Pacing)
          </button>
          <button
            onClick={() => setActiveDirectiveTab('hotel')}
            className={`px-3.5 py-2 text-xs font-mono font-medium border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeDirectiveTab === 'hotel'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building className="h-3.5 w-3.5" />
            2. Hotel & Transit Directive (Party Size Bed Layout)
          </button>
          <button
            onClick={() => setActiveDirectiveTab('visa')}
            className={`px-3.5 py-2 text-xs font-mono font-medium border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeDirectiveTab === 'visa'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            3. Visa & Docs Directive (Consular RAG Rules)
          </button>
          <button
            onClick={() => setActiveDirectiveTab('activity')}
            className={`px-3.5 py-2 text-xs font-mono font-medium border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeDirectiveTab === 'activity'
                ? 'border-purple-400 text-purple-300 bg-purple-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            4. Activity & Dining Directive (Family Pacing)
          </button>
        </div>

        {/* Directive Code Block */}
        {showFullDirective && (
          <div className="p-4 bg-slate-950 font-mono text-xs leading-relaxed text-slate-300 overflow-x-auto whitespace-pre-wrap selection:bg-cyan-500/30">
            {getDirectiveText()}
          </div>
        )}
      </div>

      {/* SECTION 3.2: Parallel Domain Worker Agents (SMEs) Execution Outputs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              Domain-Specific Worker Agents (SMEs) - Parallel Execution
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulated GDS, Hotel CRS, Consular RAG, and Local Scheduler responses returned from parallel execution.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Total Package: <strong className="text-emerald-400 text-sm">${phase3.aggregatedCostUSD.toLocaleString()} USD</strong>
          </span>
        </div>

        {/* Worker Tab Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <button
            onClick={() => setActiveWorkerTab('flight')}
            className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
              activeWorkerTab === 'flight'
                ? 'bg-cyan-950/40 border-cyan-500/50 text-white shadow-md shadow-cyan-500/10'
                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Plane className="h-4 w-4 text-cyan-400" />
              <div>
                <div className="text-xs font-semibold text-slate-200">Worker 1: Flight Agent</div>
                <div className="text-[10px] font-mono text-slate-400">GDS / Amadeus Feed</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">
              ${phase3.flightWorker.recommendedFlight.totalFlightCostUSD.toLocaleString()}
            </span>
          </button>

          <button
            onClick={() => setActiveWorkerTab('hotel')}
            className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
              activeWorkerTab === 'hotel'
                ? 'bg-emerald-950/40 border-emerald-500/50 text-white shadow-md shadow-emerald-500/10'
                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Building className="h-4 w-4 text-emerald-400" />
              <div>
                <div className="text-xs font-semibold text-slate-200">Worker 2: Hotel & Transit</div>
                <div className="text-[10px] font-mono text-slate-400">CRS / Bed Config</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">
              ${phase3.hotelWorker.recommendedHotel.totalHotelCostUSD.toLocaleString()}
            </span>
          </button>

          <button
            onClick={() => setActiveWorkerTab('visa')}
            className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
              activeWorkerTab === 'visa'
                ? 'bg-amber-950/40 border-amber-500/50 text-white shadow-md shadow-amber-500/10'
                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText className="h-4 w-4 text-amber-400" />
              <div>
                <div className="text-xs font-semibold text-slate-200">Worker 3: Visa & Docs</div>
                <div className="text-[10px] font-mono text-slate-400">IATA Timatic RAG</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-amber-400 font-bold">
              ${phase3.visaWorker.requirements.totalVisaFeesUSD.toLocaleString()}
            </span>
          </button>

          <button
            onClick={() => setActiveWorkerTab('activity')}
            className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
              activeWorkerTab === 'activity'
                ? 'bg-purple-950/40 border-purple-500/50 text-white shadow-md shadow-purple-500/10'
                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Compass className="h-4 w-4 text-purple-400" />
              <div>
                <div className="text-xs font-semibold text-slate-200">Worker 4: Activity & Meals</div>
                <div className="text-[10px] font-mono text-slate-400">Pacing & Diners</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-purple-400 font-bold">
              ${phase3.activityWorker.totalActivityEstimatedUSD.toLocaleString()}
            </span>
          </button>
        </div>

        {/* Worker Output Card */}
        <div className="rounded-xl bg-slate-950 border border-slate-800 p-5 shadow-xl">
          {/* Worker 1: Flight Output */}
          {activeWorkerTab === 'flight' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-cyan-400" />
                  <span className="font-semibold text-white text-sm">
                    Carrier Option: {phase3.flightWorker.recommendedFlight.airline}
                  </span>
                  <span className="text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded">
                    Flight {phase3.flightWorker.recommendedFlight.flightNumber}
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  GDS Feed: {phase3.flightWorker.gdsSource} ({phase3.flightWorker.executionTimeMs}ms)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 block">Routing & Pacing</span>
                  <div className="text-xs font-bold text-white">
                    {phase3.flightWorker.recommendedFlight.departureAirport} &rarr; {phase3.flightWorker.recommendedFlight.arrivalAirport}
                  </div>
                  <div className="text-[11px] text-cyan-300 font-mono">
                    {phase3.flightWorker.recommendedFlight.duration}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {phase3.flightWorker.recommendedFlight.layovers}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 block">Ticket Breakdown</span>
                  <div className="text-xs font-bold text-white">
                    ${phase3.flightWorker.recommendedFlight.pricePerPersonUSD} / traveler
                  </div>
                  <div className="text-[11px] text-emerald-400 font-mono font-bold">
                    Total: ${phase3.flightWorker.recommendedFlight.totalFlightCostUSD.toLocaleString()} USD ({phase3.flightWorker.recommendedFlight.ticketCount} seats)
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Class: {phase3.flightWorker.recommendedFlight.cabinClass}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 block flex items-center gap-1">
                    <Luggage className="h-3 w-3 text-cyan-400" />
                    Baggage & Seating Policy
                  </span>
                  <div className="text-[11px] text-slate-200">
                    {phase3.flightWorker.recommendedFlight.baggageAllowance}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono">
                    Adjacent family seat blocks reserved (2+2 configuration)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Worker 2: Hotel & Transit Output */}
          {activeWorkerTab === 'hotel' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-emerald-400" />
                  <span className="font-semibold text-white text-sm">
                    {phase3.hotelWorker.recommendedHotel.name}
                  </span>
                  <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                    Certified Capacity: {phase3.hotelWorker.recommendedHotel.capacityGuaranteed} Guests
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Execution Latency: {phase3.hotelWorker.executionTimeMs}ms
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 block">Room Layout for Party Size</span>
                  <div className="text-xs font-bold text-white">
                    {phase3.hotelWorker.recommendedHotel.roomType}
                  </div>
                  <div className="text-[11px] text-emerald-400 font-mono">
                    {phase3.hotelWorker.recommendedHotel.bedsConfiguration}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Location: {phase3.hotelWorker.recommendedHotel.location}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 block">Nightly & Total Rates</span>
                  <div className="text-xs font-bold text-white">
                    ${phase3.hotelWorker.recommendedHotel.nightlyRateUSD} / night (taxes included)
                  </div>
                  <div className="text-[11px] text-emerald-400 font-mono font-bold">
                    Total: ${phase3.hotelWorker.recommendedHotel.totalHotelCostUSD.toLocaleString()} USD ({phase3.hotelWorker.recommendedHotel.totalNights} nights)
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Transit: {phase3.hotelWorker.recommendedHotel.transitProximity}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 block">Airport Transit Tip</span>
                  <div className="text-[11px] text-slate-200">
                    {phase3.hotelWorker.recommendedHotel.airportTransitTip}
                  </div>
                  <div className="text-[10px] text-cyan-400 font-mono">
                    Amenities: {phase3.hotelWorker.recommendedHotel.amenities.slice(0, 3).join(', ')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Worker 3: Visa & Docs Output */}
          {activeWorkerTab === 'visa' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-amber-400" />
                  <span className="font-semibold text-white text-sm">
                    {phase3.visaWorker.requirements.visaType}
                  </span>
                  <span className="text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
                    Status: {phase3.visaWorker.requirements.status}
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  RAG Knowledge: {phase3.visaWorker.ragKnowledgeSource}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 block">Processing & Fees</span>
                  <div className="text-xs font-bold text-white">
                    Fee: ${phase3.visaWorker.requirements.feePerTravelerUSD} per traveler
                  </div>
                  <div className="text-[11px] text-amber-400 font-mono font-bold">
                    Total Entry Fees: ${phase3.visaWorker.requirements.totalVisaFeesUSD} USD
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Timeline: {phase3.visaWorker.requirements.processingTimeDays}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 block">Passport Bounds</span>
                  <div className="text-[11px] text-slate-200">
                    {phase3.visaWorker.requirements.passportValidityRequired}
                  </div>
                  <div className="text-[10px] text-amber-300 font-mono">
                    Warning: Blank stamp pages required for immigration stamping
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 block">Consular Compliance Advisory</span>
                  <div className="text-[11px] text-slate-300">
                    {phase3.visaWorker.requirements.consularNotes}
                  </div>
                </div>
              </div>

              {/* Mandatory Checklist */}
              <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800">
                <span className="text-[11px] font-mono text-slate-300 font-semibold block mb-2">
                  Mandatory Submission Documents (All Travelers):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {phase3.visaWorker.requirements.mandatoryDocuments.map((doc, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-slate-300">
                      <ShieldCheck className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                      <span>{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Worker 4: Activity & Itinerary Output */}
          {activeWorkerTab === 'activity' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Compass className="h-5 w-5 text-purple-400" />
                  <span className="font-semibold text-white text-sm">
                    Curated Schedule & Local Dining Highlights
                  </span>
                  <span className="text-xs font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded">
                    {phase3.activityWorker.dailySchedule.length} Days Mapped
                  </span>
                </div>
                <span className="text-xs font-mono text-purple-400 font-bold">
                  Est. Daily Experiences Total: ${phase3.activityWorker.totalActivityEstimatedUSD} USD
                </span>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {phase3.activityWorker.dailySchedule.map((day) => (
                  <div key={day.day} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded bg-purple-500/20 text-purple-300 font-mono text-xs flex items-center justify-center font-bold">
                          D{day.day}
                        </span>
                        <span className="text-xs font-bold text-white">{day.theme}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Family Score: {day.familyFriendlyScore}/10
                        </span>
                        <span className="text-slate-400 font-semibold">
                          ~${day.estimatedDailyCostUSD}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-300">
                      <div className="bg-slate-950/50 p-2 rounded border border-slate-800/80">
                        <strong className="text-[10px] font-mono text-slate-400 block">Morning:</strong>
                        <span>{day.morning}</span>
                      </div>
                      <div className="bg-slate-950/50 p-2 rounded border border-slate-800/80">
                        <strong className="text-[10px] font-mono text-slate-400 block">Afternoon:</strong>
                        <span>{day.afternoon}</span>
                      </div>
                      <div className="bg-slate-950/50 p-2 rounded border border-slate-800/80">
                        <strong className="text-[10px] font-mono text-slate-400 block">Evening:</strong>
                        <span>{day.evening}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400 border-t border-slate-800/60">
                      <div className="flex items-center gap-1.5 text-amber-300">
                        <Utensils className="h-3 w-3 text-amber-400" />
                        <span>Dining: {day.localMealRecommendations.join(' • ')}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        Transit: {day.transitAdvice}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
