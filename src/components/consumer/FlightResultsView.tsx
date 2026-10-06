import React, { useState } from 'react';
import {
  Plane,
  Clock,
  Luggage,
  CheckCircle2,
  Users,
  ShieldCheck,
  ArrowRight,
  Filter,
  Check
} from 'lucide-react';
import { FlightItem, Currency } from '../../types/travelBooking';
import { MOCK_FLIGHTS_VIETNAM } from '../../services/travelCatalog';

interface FlightResultsViewProps {
  selectedFlight: FlightItem;
  onSelectFlight: (flight: FlightItem) => void;
  currency: Currency;
  onContinueToStays?: () => void;
}

export const FlightResultsView: React.FC<FlightResultsViewProps> = ({
  selectedFlight,
  onSelectFlight,
  currency,
  onContinueToStays
}) => {
  const [filterTag, setFilterTag] = useState<string>('ALL');

  const filteredFlights = filterTag === 'ALL'
    ? MOCK_FLIGHTS_VIETNAM
    : MOCK_FLIGHTS_VIETNAM.filter((f) => f.tag === filterTag);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Search Header Summary */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <Plane className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white">
              Flights from Bengaluru (BLR) to Hanoi (HAN)
            </h1>
            <p className="text-xs text-slate-400">
              Nov 10 – Nov 20, 2026 &bull; 4 Travellers (2 Adults, 2 Children) &bull; Economy Class
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onContinueToStays && (
            <button
              onClick={onContinueToStays}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <span>Continue to Stays</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 flex items-center gap-1 font-mono text-[11px] uppercase mr-1">
          <Filter className="h-3.5 w-3.5" /> Sort & Filter:
        </span>
        {[
          { id: 'ALL', label: 'All Flights (3)' },
          { id: 'Best for Families', label: 'Best for Families' },
          { id: 'Lowest Fare', label: 'Lowest Fare' },
          { id: 'Recommended', label: 'Recommended' }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterTag(f.id)}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              filterTag === f.id
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Flight Cards List */}
      <div className="space-y-4">
        {filteredFlights.map((flight) => {
          const isSelected = selectedFlight.id === flight.id;
          const displayPricePerPerson = currency === 'INR' ? `₹${flight.pricePerPersonINR.toLocaleString()}` : `$${flight.pricePerPersonUSD}`;
          const displayTotalPrice = currency === 'INR' ? `₹${flight.totalPriceINR.toLocaleString()}` : `$${flight.totalPriceUSD}`;

          return (
            <div
              key={flight.id}
              className={`p-5 rounded-2xl border transition relative space-y-4 ${
                isSelected
                  ? 'bg-slate-900 border-teal-500/60 shadow-lg shadow-teal-500/10 ring-1 ring-teal-500/40'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Card Top: Airline & Tag */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-sky-400 font-mono">
                    {flight.airlineCode}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{flight.airline}</span>
                      <span className="text-[11px] font-mono text-slate-400">Flight {flight.flightNumber}</span>
                      {flight.tag && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">
                          {flight.tag}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">{flight.cabinClass}</span>
                  </div>
                </div>

                {/* Price Display */}
                <div className="text-left sm:text-right">
                  <span className="text-lg font-bold font-mono text-emerald-400">{displayPricePerPerson}</span>
                  <span className="text-xs text-slate-400 block">per traveller ({displayTotalPrice} total for 4)</span>
                </div>
              </div>

              {/* Card Mid: Schedule & Timing */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs items-center">
                <div className="space-y-0.5">
                  <span className="text-xs text-slate-400 font-mono">{flight.originCode}</span>
                  <div className="text-base font-bold text-white">{flight.departureTime}</div>
                  <div className="text-[11px] text-slate-300">{flight.originCity}</div>
                </div>

                <div className="text-center space-y-1">
                  <span className="text-[11px] font-mono text-slate-400 flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3" /> {flight.duration}
                  </span>
                  <div className="relative flex items-center justify-center">
                    <div className="h-0.5 w-full bg-slate-700" />
                    <Plane className="h-3.5 w-3.5 text-sky-400 absolute bg-slate-900 px-0.5" />
                  </div>
                  <span className="text-[11px] text-cyan-300 block">{flight.stops}</span>
                </div>

                <div className="sm:text-right space-y-0.5">
                  <span className="text-xs text-slate-400 font-mono">{flight.destinationCode}</span>
                  <div className="text-base font-bold text-white">{flight.arrivalTime}</div>
                  <div className="text-[11px] text-slate-300">{flight.destinationCity}</div>
                </div>
              </div>

              {/* Card Bottom: Amenities & Selection CTA */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3 text-slate-300">
                  <span className="flex items-center gap-1.5 text-sky-300">
                    <Luggage className="h-3.5 w-3.5" />
                    <span>{flight.baggage}</span>
                  </span>

                  {flight.adjacentFamilySeatsGuaranteed && (
                    <span className="flex items-center gap-1 text-teal-300 font-medium">
                      <Users className="h-3.5 w-3.5" />
                      <span>Adjacent family seating block guaranteed</span>
                    </span>
                  )}
                </div>

                <button
                  onClick={() => onSelectFlight(flight)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                    isSelected
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm cursor-default'
                      : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check className="h-4 w-4 text-teal-400" />
                      <span>Selected for Trip</span>
                    </>
                  ) : (
                    <span>Select this Flight</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
