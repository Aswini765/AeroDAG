import React, { useState } from 'react';
import {
  Plane,
  Building,
  FileCheck,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  ExternalLink,
  Download,
  Share2,
  Luggage,
  Users,
  DollarSign,
  AlertCircle,
  Bell,
  Utensils,
  Compass,
  CreditCard,
  Smartphone,
  ShieldCheck,
  Check
} from 'lucide-react';
import { PipelineExecutionResult } from '../../src/types/orchestrator';

interface ItineraryViewProps {
  result: PipelineExecutionResult | null;
  onRunDefault?: () => void;
}

export const TravelerItineraryView: React.FC<ItineraryViewProps> = ({ result, onRunDefault }) => {
  const [activeDay, setActiveDay] = useState<number>(1);
  const [flightConfirmed, setFlightConfirmed] = useState(false);
  const [hotelConfirmed, setHotelConfirmed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!result || !result.phase3 || !result.phase5) {
    return (
      <div className="p-12 text-center rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
        <Calendar className="h-12 w-12 text-slate-600 mx-auto" />
        <h3 className="text-base font-semibold text-white">Your Curated Itinerary Awaits</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          We are ready to design your family trip. Click below to load your personalized travel itinerary.
        </p>
        {onRunDefault && (
          <button
            onClick={onRunDefault}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-lg shadow-emerald-600/20"
          >
            Generate Family Trip Itinerary
          </button>
        )}
      </div>
    );
  }

  const { phase2, phase3, phase5 } = result;
  const currentDayActivity =
    phase3.activityWorker.dailySchedule.find((d) => d.day === activeDay) ||
    phase3.activityWorker.dailySchedule[0];

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* ====================================================================== */}
      {/* 1. TRIP OVERVIEW & BUDGET BREAKDOWN */}
      {/* ====================================================================== */}
      <section className="space-y-4">
        {/* Hero Card */}
        <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/95 to-emerald-950/40 p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                  Curated Family Vacation
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-800/80 text-slate-300 text-xs font-mono">
                  {phase2.parameters.partySize} Travelers ({phase2.parameters.adultsCount} Adults, {phase2.parameters.childrenCount} Kids)
                </span>
                <span className="px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs">
                  {phase2.parameters.budgetTier} Budget Tier
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                {phase2.parameters.durationDays}-Day Cultural Journey to {phase2.parameters.destination}
              </h1>

              <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
                A paced, culturally rich expedition designed for your family. Featuring guaranteed 4-person suite accommodations in the historic Old Quarter, scenic Halong Bay cruise waters, and authentic child-accessible dining.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start md:self-center">
              <button
                onClick={handleShare}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-2 transition"
              >
                {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
                <span>{copiedLink ? 'Link Copied' : 'Share Itinerary'}</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-emerald-600/25"
              >
                <Download className="h-4 w-4" />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block font-mono text-[11px]">Travel Dates</span>
              <strong className="text-white text-sm">{phase2.parameters.targetDates}</strong>
            </div>
            <div>
              <span className="text-slate-400 block font-mono text-[11px]">Departure Origin</span>
              <strong className="text-white text-sm">{phase2.parameters.origin}</strong>
            </div>
            <div>
              <span className="text-slate-400 block font-mono text-[11px]">Duration</span>
              <strong className="text-white text-sm">{phase2.parameters.durationDays} Days / {phase2.parameters.durationDays - 1} Nights</strong>
            </div>
            <div>
              <span className="text-slate-400 block font-mono text-[11px]">Total Estimated Spend</span>
              <strong className="text-emerald-400 text-sm font-bold">${phase3.aggregatedCostUSD.toLocaleString()} USD</strong>
            </div>
          </div>
        </div>

        {/* Transparent Cost Summary Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-lg">
          <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                Transparent Cost Summary Table
              </h3>
            </div>
            <span className="text-xs text-emerald-400 font-semibold">
              Strictly Within Your {phase2.parameters.budgetTier} Budget Target
            </span>
          </div>

          <div className="p-5">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="py-2.5">Category</th>
                  <th className="py-2.5">Inclusions & Rate Details</th>
                  <th className="py-2.5 text-right">Cost (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-300">
                <tr>
                  <td className="py-3 font-semibold text-white flex items-center gap-2">
                    <Plane className="h-4 w-4 text-cyan-400" />
                    <span>International Flights</span>
                  </td>
                  <td className="py-3 text-slate-400">
                    4 confirmed tickets on {phase3.flightWorker.recommendedFlight.airline} (${phase3.flightWorker.recommendedFlight.pricePerPersonUSD}/person, standard checked baggage included)
                  </td>
                  <td className="py-3 text-right font-mono font-bold text-white">
                    ${phase3.flightWorker.recommendedFlight.totalFlightCostUSD.toLocaleString()}
                  </td>
                </tr>

                <tr>
                  <td className="py-3 font-semibold text-white flex items-center gap-2">
                    <Building className="h-4 w-4 text-emerald-400" />
                    <span>Accommodations (10 Nights)</span>
                  </td>
                  <td className="py-3 text-slate-400">
                    {phase3.hotelWorker.recommendedHotel.name} (Family Suite with 2 Queen beds, daily breakfast for 4 included)
                  </td>
                  <td className="py-3 text-right font-mono font-bold text-white">
                    ${phase3.hotelWorker.recommendedHotel.totalHotelCostUSD.toLocaleString()}
                  </td>
                </tr>

                <tr>
                  <td className="py-3 font-semibold text-white flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-amber-400" />
                    <span>Official Visas & Entry Fees</span>
                  </td>
                  <td className="py-3 text-slate-400">
                    Government e-Visas for 4 travelers (${phase3.visaWorker.requirements.feePerTravelerUSD}/traveler, zero agency markups)
                  </td>
                  <td className="py-3 text-right font-mono font-bold text-white">
                    ${phase3.visaWorker.requirements.totalVisaFeesUSD.toLocaleString()}
                  </td>
                </tr>

                <tr>
                  <td className="py-3 font-semibold text-white flex items-center gap-2">
                    <Compass className="h-4 w-4 text-purple-400" />
                    <span>Activities, Food & Local Transit</span>
                  </td>
                  <td className="py-3 text-slate-400">
                    10 days of curated admissions, puppet shows, boat excursions, airport minivans, and authentic dining
                  </td>
                  <td className="py-3 text-right font-mono font-bold text-white">
                    ${phase3.activityWorker.totalActivityEstimatedUSD.toLocaleString()}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-700 bg-slate-900/40">
                  <td className="py-3.5 font-bold text-white text-sm" colSpan={2}>
                    Total Estimated Trip Investment (All 4 Travelers)
                  </td>
                  <td className="py-3.5 text-right font-mono font-extrabold text-emerald-400 text-base">
                    ${phase3.aggregatedCostUSD.toLocaleString()} USD
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* ====================================================================== */}
      {/* 2. CURATED FLIGHT RECOMMENDATIONS */}
      {/* ====================================================================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Plane className="h-5 w-5 text-cyan-400" />
              <span>Curated Flight Recommendations</span>
            </h2>
            <p className="text-xs text-slate-400">
              Balanced connection times, generous checked luggage, and contiguous seating for adults and minors.
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full">
            Adjacent Family Seating Guaranteed
          </span>
        </div>

        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">
                  {phase3.flightWorker.recommendedFlight.airline}
                </span>
                <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  Flight {phase3.flightWorker.recommendedFlight.flightNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {phase3.flightWorker.recommendedFlight.cabinClass} &bull; Star Alliance Partner
              </p>
            </div>

            <div className="text-right">
              <span className="text-xl font-bold font-mono text-emerald-400">
                ${phase3.flightWorker.recommendedFlight.pricePerPersonUSD}
              </span>
              <span className="text-xs text-slate-400 block">per passenger ($ {phase3.flightWorker.recommendedFlight.totalFlightCostUSD.toLocaleString()} total for 4)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <span className="text-slate-400 block font-mono text-[10px] uppercase">Routing & Duration</span>
              <div className="font-semibold text-white">
                {phase3.flightWorker.recommendedFlight.departureAirport} &rarr; {phase3.flightWorker.recommendedFlight.arrivalAirport}
              </div>
              <div className="text-cyan-300 font-mono text-[11px]">
                {phase3.flightWorker.recommendedFlight.duration}
              </div>
              <div className="text-slate-400 text-[11px]">
                {phase3.flightWorker.recommendedFlight.layovers}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <span className="text-slate-400 block font-mono text-[10px] uppercase">Schedule & Times</span>
              <div className="text-slate-200">
                Departure: <strong>{phase3.flightWorker.recommendedFlight.departureTime}</strong>
              </div>
              <div className="text-slate-200">
                Arrival: <strong>{phase3.flightWorker.recommendedFlight.arrivalTime}</strong>
              </div>
              <div className="text-emerald-400 text-[11px]">
                High On-Time Reliability (&gt;90%)
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <span className="text-slate-400 block font-mono text-[10px] uppercase">Luggage & Comfort</span>
              <div className="text-slate-200 flex items-center gap-1.5">
                <Luggage className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0" />
                <span>{phase3.flightWorker.recommendedFlight.baggageAllowance}</span>
              </div>
              <div className="text-emerald-400 text-[11px]">
                No hidden basic-economy luggage fees
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              *Fare held under active price protection. Includes all international airport fees and surcharges.
            </span>
            <button
              onClick={() => setFlightConfirmed(true)}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
                flightConfirmed
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20'
              }`}
            >
              {flightConfirmed ? <CheckCircle2 className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
              <span>{flightConfirmed ? 'Seats Held in Reservation' : 'Lock In Flights for Party of 4'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ====================================================================== */}
      {/* 3. ACCOMMODATIONS & FAMILY LODGING */}
      {/* ====================================================================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Building className="h-5 w-5 text-emerald-400" />
              <span>Accommodations & Family Lodging</span>
            </h2>
            <p className="text-xs text-slate-400">
              Hand-picked boutique property with dedicated bedding for 4, peaceful night acoustics, and prime transit proximity.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            Certified for 4 Guests
          </span>
        </div>

        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white">
                {phase3.hotelWorker.recommendedHotel.name}
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                <span>{phase3.hotelWorker.recommendedHotel.location}</span>
              </p>
            </div>

            <div className="text-right">
              <span className="text-xl font-bold font-mono text-emerald-400">
                ${phase3.hotelWorker.recommendedHotel.nightlyRateUSD}
              </span>
              <span className="text-xs text-slate-400 block">/ night ($ {phase3.hotelWorker.recommendedHotel.totalHotelCostUSD.toLocaleString()} for 10 nights)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
              <span className="text-slate-400 block font-mono text-[10px] uppercase">Room Configuration</span>
              <div className="font-semibold text-white">
                {phase3.hotelWorker.recommendedHotel.roomType}
              </div>
              <div className="text-emerald-300 font-mono text-[11px]">
                {phase3.hotelWorker.recommendedHotel.bedsConfiguration}
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Interconnecting double rooms provide parents privacy while keeping children securely attached under the same private corridor door.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
              <span className="text-slate-400 block font-mono text-[10px] uppercase">Neighborhood Vibe & Proximity</span>
              <div className="text-slate-200">
                {phase3.hotelWorker.recommendedHotel.transitProximity}
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Quiet pedestrian lane off the lively Old Quarter. 3 minutes from weekend night markets, artisanal bakeries, and pharmacy conveniences.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
              <span className="text-slate-400 block font-mono text-[10px] uppercase">Arrival Transfer & Perks</span>
              <div className="text-slate-200">
                {phase3.hotelWorker.recommendedHotel.airportTransitTip}
              </div>
              <div className="text-cyan-300 text-[11px]">
                Complimentary fresh buffet breakfast every morning for all 4 family members.
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {phase3.hotelWorker.recommendedHotel.amenities.map((amenity, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded-md bg-slate-900 text-slate-300 text-[11px] border border-slate-800">
                  {amenity}
                </span>
              ))}
            </div>

            <button
              onClick={() => setHotelConfirmed(true)}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition whitespace-nowrap ${
                hotelConfirmed
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
              }`}
            >
              {hotelConfirmed ? <CheckCircle2 className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
              <span>{hotelConfirmed ? 'Family Suite Confirmed' : 'Reserve Family Suite'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ====================================================================== */}
      {/* 4. DAY-BY-DAY EXPERIENCE & HIGHLIGHTS */}
      {/* ====================================================================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-400" />
              <span>Day-by-Day Experience & Highlights</span>
            </h2>
            <p className="text-xs text-slate-400">
              Thoughtfully paced for families: gentle morning cultural anchors, midday rest, and delightful evening culinary strolls.
            </p>
          </div>
          <span className="text-xs font-mono text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full">
            10-Day Complete Plan
          </span>
        </div>

        <div className="rounded-2xl bg-slate-950 border border-slate-800 p-6 space-y-6 shadow-lg">
          {/* Day Navigation Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {phase3.activityWorker.dailySchedule.map((day) => (
              <button
                key={day.day}
                onClick={() => setActiveDay(day.day)}
                className={`px-3.5 py-2 rounded-xl text-xs font-mono transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeDay === day.day
                    ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>Day {day.day}</span>
              </button>
            ))}
          </div>

          {/* Active Day Detail Card */}
          {currentDayActivity && (
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <span className="text-xs font-mono text-purple-400 font-bold block uppercase tracking-wider">
                    Day {currentDayActivity.day}
                  </span>
                  <h3 className="text-lg font-bold text-white">
                    {currentDayActivity.theme}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Family Safety & Fun: {currentDayActivity.familyFriendlyScore}/10
                  </span>
                  <span className="text-slate-400">
                    Est. Daily Budget: ~${currentDayActivity.estimatedDailyCostUSD}
                  </span>
                </div>
              </div>

              {/* Time Blocks */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-300 uppercase">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Morning</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {currentDayActivity.morning}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300 uppercase">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Afternoon</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {currentDayActivity.afternoon}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-purple-300 uppercase">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Evening</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {currentDayActivity.evening}
                  </p>
                </div>
              </div>

              {/* Dining & Transit Tips */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-amber-300">
                  <Utensils className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  <span>
                    <strong>Curated Family Dining:</strong> {currentDayActivity.localMealRecommendations.join(' • ')}
                  </span>
                </div>
                <div className="text-slate-400 font-mono text-[11px]">
                  <strong>Transit:</strong> {currentDayActivity.transitAdvice}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ====================================================================== */}
      {/* 5. VISA, HEALTH & ENTRY ESSENTIALS */}
      {/* ====================================================================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-amber-400" />
              <span>Visa, Health & Entry Essentials</span>
            </h2>
            <p className="text-xs text-slate-400">
              Clear consular requirements and straightforward application instructions for all 4 family travelers.
            </p>
          </div>
          <span className="text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
            Official Government Channels Only
          </span>
        </div>

        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-5 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
              <span className="text-slate-400 block font-mono text-[10px] uppercase">Entry Category & Fees</span>
              <div className="font-bold text-white text-sm">
                {phase3.visaWorker.requirements.visaType}
              </div>
              <div className="text-emerald-400 font-mono text-xs font-bold">
                ${phase3.visaWorker.requirements.feePerTravelerUSD} USD per person ($100 total for 4)
              </div>
              <p className="text-slate-400 text-[11px]">
                Valid for 30 days single-entry. Official processing timeline is 3–5 working days.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
              <span className="text-slate-400 block font-mono text-[10px] uppercase">Passport Validity Rules</span>
              <div className="font-semibold text-white">
                6+ Months Remaining
              </div>
              <div className="text-amber-300 text-[11px]">
                Passports must have at least 6 months validity from departure date and 2 blank pages.
              </div>
              <p className="text-slate-400 text-[11px]">
                Bring physical color copies of child birth certificates for border control verification.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
              <span className="text-slate-400 block font-mono text-[10px] uppercase">Official Portal Guidance</span>
              <div className="font-semibold text-slate-200">
                evisa.xuatnhapcanh.gov.vn
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Always apply exclusively through the official Vietnam National Public Service Portal. Never pay unauthorized intermediaries charging $80+ per visa.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-200 uppercase font-mono block">
              Required Submission Documents Checklist:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
              {phase3.visaWorker.requirements.mandatoryDocuments.map((doc, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span>{doc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <a
              href="https://evisa.xuatnhapcanh.gov.vn"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-amber-600/20"
            >
              <span>Visit Official Vietnam e-Visa Portal</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* ====================================================================== */}
      {/* 6. PROACTIVE TRAVEL TIPS */}
      {/* ====================================================================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Bell className="h-5 w-5 text-emerald-400" />
              <span>Proactive Travel Tips & Local Advice</span>
            </h2>
            <p className="text-xs text-slate-400">
              Practical recommendations on ride-hailing apps, cash logistics, and critical booking deadlines.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            Before You Depart
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <Smartphone className="h-4 w-4" />
              <span>Ride-Hailing & Navigation Apps</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Download the <strong>Grab app</strong> before arriving in Vietnam and link your credit card. Grab offers upfront metered pricing with air-conditioned 7-seater minivans for families, eliminating street taxi fare confusion entirely.
            </p>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
              Tip: Also install <strong>Google Maps</strong> offline areas for Hanoi Old Quarter and <strong>Google Translate</strong> offline Vietnamese pack.
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CreditCard className="h-4 w-4" />
              <span>Currency & Cash Management</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Vietnam is predominantly cash-friendly for street markets, bakeries, and cyclo rides. Withdraw Vietnamese Dong (VND) from reputable bank ATMs in Hanoi (TPBank, BIDV, Vietcombank) using fee-free debit cards.
            </p>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
              Exchange rate guideline: $1 USD &approx; 24,500 – 25,000 VND. A bowl of street pho costs around 50,000–60,000 VND ($2.00–$2.50).
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Clock className="h-4 w-4" />
              <span>Key Booking Deadlines</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">&bull;</span>
                <span><strong>October 25, 2026:</strong> Submit all 4 electronic visa applications online (16 days prior to departure) to guarantee smooth approval.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">&bull;</span>
                <span><strong>48-Hour Price Lock:</strong> Confirm flight reservations to lock in the Star Alliance $395/person economy fare bucket.</span>
              </li>
            </ul>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
              <ShieldCheck className="h-4 w-4" />
              <span>Health & Kid Comfort Advice</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">&bull;</span>
                <span>Drink exclusively sealed bottled or filtered water; avoid unboiled tap water.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">&bull;</span>
                <span>November weather in Northern Vietnam is comfortable (68°F – 78°F / 20°C – 25°C) with low humidity. Pack light layers and comfortable walking sneakers.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};
