import React, { useState } from 'react';
import {
  Database,
  Lock,
  HardDrive,
  Network,
  Bell,
  CheckCircle2,
  Calendar,
  CreditCard,
  Plane,
  Building,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  Share2,
  Download
} from 'lucide-react';
import {
  Phase5PostProcessing,
  Phase3WorkersOutput,
  IntentParameters
} from '../../src/types/orchestrator';

interface Phase5Props {
  phase5: Phase5PostProcessing;
  phase3: Phase3WorkersOutput;
  intent: IntentParameters;
  onBookFlightCTA?: () => void;
  onBookHotelCTA?: () => void;
}

export const Phase5PostProcessingView: React.FC<Phase5Props> = ({
  phase5,
  phase3,
  intent,
  onBookFlightCTA,
  onBookHotelCTA
}) => {
  const [flightBooked, setFlightBooked] = useState(false);
  const [hotelBooked, setHotelBooked] = useState(false);
  const [activeNudgeCategory, setActiveNudgeCategory] = useState<string>('ALL');

  const filteredNudges = activeNudgeCategory === 'ALL'
    ? phase5.proactiveNudges
    : phase5.proactiveNudges.filter(n => n.category === activeNudgeCategory);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">
                Phase 5: Post-Processing & State Persistence
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                STATE SYNCHRONIZED
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Post-PII safety scrub, Redis short-term session caching, Graph DB long-term persistence, and Celery/Temporal nudge engine.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
            Itinerary ID: <strong className="text-cyan-400">{phase5.statePersistence.shortTermMemory.itineraryId}</strong>
          </div>
        </div>
      </div>

      {/* Safety Scrub & Dual Memory Persistence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sub-Card 1: Safety Scrub Certified */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-white">Post-PII Safety Scrub</h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              CERTIFIED
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800/80">
              <span>Internal Directives Scrubbed</span>
              <span className="text-emerald-400 font-mono text-[10px]">100% Filtered</span>
            </div>
            <div className="flex items-center justify-between text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800/80">
              <span>Token Leakage Prevention</span>
              <span className="text-emerald-400 font-mono text-[10px]">Zero Exposure</span>
            </div>
            <div className="flex items-center justify-between text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800/80">
              <span>Presidio Redaction Verification</span>
              <span className="text-emerald-400 font-mono text-[10px]">Enforced</span>
            </div>
          </div>
        </div>

        {/* Sub-Card 2: Short-Term Memory (Redis) */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-cyan-400" />
              <h3 className="text-xs font-semibold text-white">Short-Term Memory (Redis)</h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              TTL: 86,400s
            </span>
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            <div className="p-2 rounded bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300">
              <div className="text-[10px] text-slate-400">Cache Key:</div>
              <div className="text-cyan-300 truncate">{phase5.statePersistence.shortTermMemory.redisKey}</div>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/80 border border-slate-800 text-[10px] text-slate-300">
              <span>Session Tokens:</span>
              <span className="text-slate-200">
                In: {phase5.statePersistence.shortTermMemory.tokenMetrics.inputTokens} | Out: {phase5.statePersistence.shortTermMemory.tokenMetrics.outputTokens}
              </span>
            </div>
          </div>
        </div>

        {/* Sub-Card 3: Long-Term Memory (Vector & Graph DB) */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-purple-400" />
              <h3 className="text-xs font-semibold text-white">Long-Term Memory (Graph DB)</h3>
            </div>
            <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              Vector: 1536-dim
            </span>
          </div>

          <div className="space-y-1 max-h-24 overflow-y-auto text-[10px] font-mono bg-slate-950/80 p-2 rounded border border-slate-800">
            {phase5.statePersistence.longTermMemory.graphDbTriples.map((t, idx) => (
              <div key={idx} className="text-slate-300 truncate">
                <span className="text-cyan-400">({t.subject})</span>
                <span className="text-slate-500"> -[{t.predicate}]-&gt; </span>
                <span className="text-emerald-300">"{t.object}"</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Proactive Push/Nudge Engine (Celery/Temporal APIs) */}
      <div className="rounded-xl bg-slate-950 border border-slate-800 p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">
                Proactive Push / Nudge Engine (Celery / Temporal Background Workers)
              </h3>
              <p className="text-xs text-slate-400">
                Scheduled automated alerts triggered prior to travel dates to prevent visa penalties and fare escalations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono">
            <button
              onClick={() => setActiveNudgeCategory('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] ${
                activeNudgeCategory === 'ALL' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({phase5.proactiveNudges.length})
            </button>
            <button
              onClick={() => setActiveNudgeCategory('VISA_DEADLINE')}
              className={`px-2.5 py-1 rounded-md text-[11px] ${
                activeNudgeCategory === 'VISA_DEADLINE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Visa
            </button>
            <button
              onClick={() => setActiveNudgeCategory('PRICE_LOCK')}
              className={`px-2.5 py-1 rounded-md text-[11px] ${
                activeNudgeCategory === 'PRICE_LOCK' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Price Lock
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredNudges.map((nudge) => (
            <div
              key={nudge.id}
              className={`p-3.5 rounded-xl border space-y-2 flex flex-col justify-between ${
                nudge.urgency === 'HIGH'
                  ? 'bg-amber-950/20 border-amber-500/30'
                  : 'bg-slate-900/50 border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    {nudge.title}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    nudge.urgency === 'HIGH'
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/20 font-bold'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {nudge.triggerTime}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {nudge.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400">
                  Worker: Celery Task #{nudge.id}
                </span>
                <button className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition">
                  <span>{nudge.actionText}</span>
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Rich Itinerary & Booking API CTAs */}
      <div className="rounded-xl bg-slate-950 border border-slate-800 p-5 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">
              Confirmed Travel Itinerary & Interactive Booking CTAs
            </h3>
            <p className="text-xs text-slate-400">
              Verified inventory and live reservation actions for all {intent.partySize} travelers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const data = JSON.stringify({ intent, phase3, phase5 }, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `AeroDAG_Itinerary_${intent.destination.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
                a.click();
              }}
              className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 flex items-center gap-1.5 transition font-mono"
            >
              <Download className="h-3.5 w-3.5" />
              Export JSON
            </button>
          </div>
        </div>

        {/* Interactive Booking Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Flight Booking CTA */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plane className="h-5 w-5 text-cyan-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">Commercial Airline PNR</h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {phase3.flightWorker.recommendedFlight.airline}
                  </span>
                </div>
              </div>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                ${phase3.flightWorker.recommendedFlight.totalFlightCostUSD.toLocaleString()} USD
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Routing:</span>
                <span className="font-semibold">{phase3.flightWorker.recommendedFlight.departureAirport} &rarr; {phase3.flightWorker.recommendedFlight.arrivalAirport}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Tickets:</span>
                <span>{phase3.flightWorker.recommendedFlight.ticketCount} Guaranteed Seats ({intent.adultsCount} Adults, {intent.childrenCount} Minors)</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Baggage:</span>
                <span className="text-cyan-300 font-mono">Included 23kg Checked</span>
              </div>
            </div>

            <button
              onClick={() => {
                setFlightBooked(true);
                if (onBookFlightCTA) onBookFlightCTA();
              }}
              disabled={flightBooked}
              className={`w-full py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                flightBooked
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20'
              }`}
            >
              {flightBooked ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Flight PNR Locked & Confirmed</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  <span>Lock In Airline Seats with GDS API</span>
                </>
              )}
            </button>
          </div>

          {/* Card 2: Hotel Booking CTA */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-emerald-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">Lodging Reservation</h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {phase3.hotelWorker.recommendedHotel.name}
                  </span>
                </div>
              </div>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                ${phase3.hotelWorker.recommendedHotel.totalHotelCostUSD.toLocaleString()} USD
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Room Type:</span>
                <span className="font-semibold">{phase3.hotelWorker.recommendedHotel.roomType}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Bed Configuration:</span>
                <span className="text-emerald-300">{phase3.hotelWorker.recommendedHotel.bedsConfiguration}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Duration:</span>
                <span>{phase3.hotelWorker.recommendedHotel.totalNights} Nights with Breakfast for {intent.partySize}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setHotelBooked(true);
                if (onBookHotelCTA) onBookHotelCTA();
              }}
              disabled={hotelBooked}
              className={`w-full py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                hotelBooked
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
              }`}
            >
              {hotelBooked ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Hotel Reservation Confirmed</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  <span>Reserve Family Suite via CRS API</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Aggregate Pricing Table Breakdown */}
        <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
            <span className="text-xs font-mono font-semibold text-slate-300 uppercase">
              Financial Breakdown & Total Expenditure Table
            </span>
            <span className="text-xs font-mono text-emerald-400">
              Budget Status: Aligned with {intent.budgetTier} Tier
            </span>
          </div>

          <div className="p-4">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[10px] text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2">Line Item Component</th>
                  <th className="py-2">Calculation Basis</th>
                  <th className="py-2 text-right">Sub-Total (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr>
                  <td className="py-2.5 flex items-center gap-2">
                    <Plane className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Commercial Airfare ({phase3.flightWorker.recommendedFlight.airline})</span>
                  </td>
                  <td className="py-2.5 text-slate-400">
                    ${phase3.flightWorker.recommendedFlight.pricePerPersonUSD} &times; {intent.partySize} travelers
                  </td>
                  <td className="py-2.5 text-right font-bold text-white">
                    ${phase3.flightWorker.recommendedFlight.totalFlightCostUSD.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 flex items-center gap-2">
                    <Building className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Lodging ({phase3.hotelWorker.recommendedHotel.name})</span>
                  </td>
                  <td className="py-2.5 text-slate-400">
                    ${phase3.hotelWorker.recommendedHotel.nightlyRateUSD}/night &times; {phase3.hotelWorker.recommendedHotel.totalNights} nights
                  </td>
                  <td className="py-2.5 text-right font-bold text-white">
                    ${phase3.hotelWorker.recommendedHotel.totalHotelCostUSD.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-amber-400" />
                    <span>Official Consular Entry Fees</span>
                  </td>
                  <td className="py-2.5 text-slate-400">
                    ${phase3.visaWorker.requirements.feePerTravelerUSD} &times; {intent.partySize} applicants
                  </td>
                  <td className="py-2.5 text-right font-bold text-white">
                    ${phase3.visaWorker.requirements.totalVisaFeesUSD.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-purple-400" />
                    <span>Estimated Local Activities, Food & Transit</span>
                  </td>
                  <td className="py-2.5 text-slate-400">
                    {phase3.activityWorker.dailySchedule.length} days curated local experiences
                  </td>
                  <td className="py-2.5 text-right font-bold text-white">
                    ${phase3.activityWorker.totalActivityEstimatedUSD.toLocaleString()}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-700 text-sm">
                  <td className="py-3 font-bold text-white" colSpan={2}>
                    Total Estimated Package Investment
                  </td>
                  <td className="py-3 text-right font-bold text-emerald-400 text-base">
                    ${phase3.aggregatedCostUSD.toLocaleString()} USD
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
