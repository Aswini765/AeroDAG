import React from 'react';
import { X, Plane, Building, MapPin, Utensils, Check, Train } from 'lucide-react';
import { FlightItem, HotelItem, DiningItem, TrainItem } from '../../../types/travelBooking';

interface MoreOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: 'flights' | 'hotels' | 'dining' | 'map';
  availableFlights?: FlightItem[];
  availableHotels?: HotelItem[];
  availableTrains?: TrainItem[];
  diningSuggestions?: DiningItem[];
  selectedFlightId?: string;
  selectedHotelId?: string;
  onSelectFlight?: (f: FlightItem) => void;
  onSelectHotel?: (h: HotelItem) => void;
}

export const MoreOptionsModal: React.FC<MoreOptionsModalProps> = ({
  isOpen,
  onClose,
  activeView,
  availableFlights = [],
  availableHotels = [],
  availableTrains = [],
  diningSuggestions = [],
  selectedFlightId,
  selectedHotelId,
  onSelectFlight,
  onSelectHotel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="card-consumer max-w-2xl w-full max-h-[85vh] flex flex-col bg-[#FFFFFF] shadow-2xl animate-fade-in-slide overflow-hidden text-left">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2E6E1] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activeView === 'flights' && <Plane className="h-5 w-5 text-[#0E6B59]" />}
            {activeView === 'hotels' && <Building className="h-5 w-5 text-[#0E6B59]" />}
            {activeView === 'dining' && <Utensils className="h-5 w-5 text-[#0E6B59]" />}
            {activeView === 'map' && <MapPin className="h-5 w-5 text-[#0E6B59]" />}

            <h3 className="text-base sm:text-lg font-bold text-[#15201D] font-heading">
              {activeView === 'flights' && 'Alternative Flights'}
              {activeView === 'hotels' && 'Alternative Stays'}
              {activeView === 'dining' && 'Curated Dining Suggestions'}
              {activeView === 'map' && 'Destination Route Overview'}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#55625E] hover:text-[#15201D] hover:bg-[#F5F6F3] cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3">
          {/* Flights list */}
          {activeView === 'flights' && (
            <div className="space-y-4">
              <div className="space-y-3">
                {availableFlights.map((fl) => {
                  const isSelected = fl.id === selectedFlightId;
                  return (
                    <div
                      key={fl.id}
                      className={`card-consumer p-4 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                        isSelected ? 'border-[#0E6B59] bg-[#E3F1EC]/20' : 'hover:border-[#0E6B59]/40'
                      }`}
                      onClick={() => {
                        if (onSelectFlight) onSelectFlight(fl);
                        onClose();
                      }}
                    >
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-[#15201D]">
                          {fl.airline} ({fl.flightNumber})
                        </div>
                        <div className="text-xs text-[#55625E]">
                          {fl.originCode} → {fl.destinationCode} · {fl.departureTime} – {fl.arrivalTime} ({fl.duration})
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-[#15201D]">
                          ₹{(fl.totalPriceINR || 19200).toLocaleString('en-IN')}
                        </div>
                        {isSelected ? (
                          <span className="text-[11px] font-bold text-[#0E6B59]">Selected</span>
                        ) : (
                          <span className="text-[11px] text-[#0E6B59] hover:underline">Choose</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Train / Rail Alternative Section */}
              <div className="pt-3 border-t border-[#E2E6E1] space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#55625E]">
                  <Train className="h-3.5 w-3.5 text-[#0E6B59]" />
                  <span>Rail & Train Options</span>
                </div>
                {availableTrains && availableTrains.length > 0 ? (
                  availableTrains.map((tr) => (
                    <div key={tr.id} className="card-consumer p-3.5 flex items-center justify-between gap-3 bg-[#F5F6F3]/60">
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-[#15201D]">{tr.trainName} ({tr.trainNumber})</div>
                        <div className="text-xs text-[#55625E]">{tr.fromStation} → {tr.toStation} · {tr.selectedClass} Class ({tr.duration})</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-[#15201D]">₹{tr.totalPriceINR.toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl bg-[#F5F6F3] text-xs text-[#55625E] font-medium text-center">
                    Train options not available in demo data
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hotels list */}
          {activeView === 'hotels' && (
            <div className="space-y-3">
              {availableHotels.map((ht) => {
                const isSelected = ht.id === selectedHotelId;
                return (
                  <div
                    key={ht.id}
                    className={`card-consumer p-4 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isSelected ? 'border-[#0E6B59] bg-[#E3F1EC]/20' : 'hover:border-[#0E6B59]/40'
                    }`}
                    onClick={() => {
                      if (onSelectHotel) onSelectHotel(ht);
                      onClose();
                    }}
                  >
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold text-[#15201D]">
                        {ht.name}
                      </div>
                      <div className="text-xs text-[#55625E]">
                        {ht.area} · {ht.starRating}★ · {ht.roomType}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-[#15201D]">
                        ₹{ht.pricePerNightINR.toLocaleString('en-IN')}/night
                      </div>
                      {isSelected ? (
                        <span className="text-[11px] font-bold text-[#0E6B59]">Selected</span>
                      ) : (
                        <span className="text-[11px] text-[#0E6B59] hover:underline">Choose</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Dining Suggestions */}
          {activeView === 'dining' && (
            <div className="space-y-3">
              {diningSuggestions.length > 0 ? (
                diningSuggestions.map((d) => (
                  <div key={d.id} className="card-consumer p-4 space-y-1">
                    <div className="flex justify-between items-start">
                      <div className="text-sm font-bold text-[#15201D]">{d.name}</div>
                      <span className="text-xs font-semibold text-[#0E6B59]">₹{d.priceForTwoINR} for two</span>
                    </div>
                    <div className="text-xs text-[#55625E]">{d.cuisine} · {d.area} · Rating: {d.rating}★</div>
                    <div className="text-[11px] text-[#55625E]/80">Must try: {d.recommendedDishes.join(', ')}</div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-[#55625E] py-4 text-center">
                  Curated local cuisine dining stops are integrated directly inside your daily itinerary timeline.
                </div>
              )}
            </div>
          )}

          {/* Map overview */}
          {activeView === 'map' && (
            <div className="p-4 text-center space-y-2">
              <div className="text-sm font-semibold text-[#15201D]">
                Point-to-Point Route Connections
              </div>
              <p className="text-xs text-[#55625E]">
                All daily transit legs are mapped with point-to-point road drive times. Average daily travel remains under 90 minutes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
