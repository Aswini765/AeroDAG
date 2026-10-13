import React from 'react';
import { Plane, Building, Car, ChevronRight } from 'lucide-react';
import { FlightItem, HotelItem, TransferItem } from '../../../types/travelBooking';
import { SourceTag } from '../SourceTag';

interface BookedItemsProps {
  flight: FlightItem | null;
  hotel: HotelItem;
  transfer: TransferItem;
  nightsCount: number;
  onOpenFlightsModal?: () => void;
  onOpenStaysModal?: () => void;
}

export const BookedItems: React.FC<BookedItemsProps> = ({
  flight,
  hotel,
  transfer,
  nightsCount,
  onOpenFlightsModal,
  onOpenStaysModal
}) => {
  return (
    <div className="space-y-3 text-left">
      {/* 1. Flights Card (or Road Travel for non-airport destinations) */}
      {flight ? (
        <div className="card-consumer p-4 transition-all hover:border-[#0E6B59]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center shrink-0 mt-0.5">
              <Plane className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#55625E]">
                  Flight
                </span>
                <SourceTag kind="sample" label="sample" />
              </div>
              <div className="text-sm font-bold text-[#15201D]">
                {flight.airline} ({flight.flightNumber}) · {flight.originCode} → {flight.destinationCode}
              </div>
              <div className="text-xs text-[#55625E]">
                {flight.departureTime} – {flight.arrivalTime} · Non-stop ({flight.duration})
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E2E6E1]">
            <div className="text-sm font-bold text-[#15201D]">
              ₹{(flight.totalPriceINR || 19200).toLocaleString('en-IN')}
            </div>
            {onOpenFlightsModal && (
              <button
                type="button"
                onClick={onOpenFlightsModal}
                className="text-xs text-[#0E6B59] font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>See other flights</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="card-consumer p-4 transition-all hover:border-[#0E6B59]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center shrink-0 mt-0.5">
              <Car className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#55625E]">
                  Road Travel
                </span>
                <SourceTag kind="sample" label="sample" />
              </div>
              <div className="text-sm font-bold text-[#15201D]">
                {transfer.title || 'Private AC Outstation Cab (round-trip)'}
              </div>
              <div className="text-xs text-[#55625E]">
                {transfer.description || 'Chauffeured private round-trip cab for highway transit and local exploration'}
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E2E6E1]">
            <div className="text-sm font-bold text-[#15201D]">
              ₹{(transfer.priceINR || 5500).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      )}

      {/* 2. Stay Card */}
      <div className="card-consumer p-4 transition-all hover:border-[#0E6B59]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center shrink-0 mt-0.5">
            <Building className="h-4.5 w-4.5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#55625E]">
                Stay
              </span>
              <SourceTag kind="sample" label="sample" />
            </div>
            <div className="text-sm font-bold text-[#15201D]">
              {hotel.name}
            </div>
            <div className="text-xs text-[#55625E]">
              {hotel.area} · {hotel.starRating}★ · {nightsCount} nights (₹{hotel.pricePerNightINR.toLocaleString('en-IN')}/night)
            </div>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E2E6E1]">
          <div className="text-sm font-bold text-[#15201D]">
            ₹{(hotel.totalPriceINR || hotel.pricePerNightINR * nightsCount).toLocaleString('en-IN')}
          </div>
          {onOpenStaysModal && (
            <button
              type="button"
              onClick={onOpenStaysModal}
              className="text-xs text-[#0E6B59] font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>See other stays</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Transfers Card (only if flight is present, to avoid duplicating road transfer) */}
      {flight && (
        <div className="card-consumer p-4 transition-all hover:border-[#0E6B59]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center shrink-0 mt-0.5">
              <Car className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#55625E]">
                  Transfers
                </span>
                <SourceTag kind="sample" label="sample" />
              </div>
              <div className="text-sm font-bold text-[#15201D]">
                {transfer.title || 'Toyota Innova Crysta 7-Seater AC'}
              </div>
              <div className="text-xs text-[#55625E]">
                Private airport pickup & dropoff · {transfer.duration || '45 mins'} direct drive
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E2E6E1]">
            <div className="text-sm font-bold text-[#15201D]">
              ₹{(transfer.priceINR || 4800).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
