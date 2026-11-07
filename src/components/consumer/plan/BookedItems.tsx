import React from 'react';
import { Plane, Building, Car, ChevronRight, ExternalLink } from 'lucide-react';
import { FlightItem, HotelItem, TransferItem } from '../../../types/travelBooking';
import { SourceTag } from '../SourceTag';
import { trackBookOnClicked } from '../../../services/telemetry/posthog';

interface BookedItemsProps {
  flight: FlightItem | null;
  hotel: HotelItem;
  transfer: TransferItem;
  nightsCount: number;
  isAiEstimated?: boolean;
  stays?: Array<{ baseName: string; nights: number; hotel: HotelItem }>;
  interCityTravel?: TransferItem;
  onOpenFlightsModal?: () => void;
  onOpenStaysModal?: () => void;
}

export const BookedItems: React.FC<BookedItemsProps> = ({
  flight,
  hotel,
  transfer,
  nightsCount,
  isAiEstimated = false,
  stays,
  interCityTravel,
  onOpenFlightsModal,
  onOpenStaysModal
}) => {
  const hasMultipleStays = Array.isArray(stays) && stays.length > 1;

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
                <SourceTag kind={isAiEstimated ? 'estimate' : 'sample'} label={isAiEstimated ? 'AI estimate' : 'sample'} />
              </div>
              <div className="text-sm font-bold text-[#15201D]">
                {isAiEstimated
                  ? `Morning non-stop flight ${flight.originCode} → ${flight.destinationCode}, ~₹${(flight.totalPriceINR || 7000).toLocaleString('en-IN')}`
                  : `${flight.airline}${flight.flightNumber ? ` (${flight.flightNumber})` : ''} · ${flight.originCode} → ${flight.destinationCode}`}
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
            <div className="flex flex-col sm:items-end gap-1.5">
              <div className="flex items-center gap-2">
                <a
                  href={`https://www.makemytrip.com/flights/?itinerary=${flight.originCode || 'BLR'}-${flight.destinationCode || 'GOI'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackBookOnClicked({ provider: 'MakeMyTrip', itemType: 'flight', url: `https://www.makemytrip.com/flights/?itinerary=${flight.originCode || 'BLR'}-${flight.destinationCode || 'GOI'}` })}
                  className="text-xs text-[#0E6B59] font-bold hover:underline inline-flex items-center gap-1 min-h-[32px] sm:min-h-0 bg-[#E3F1EC]/50 px-2 py-0.5 rounded-md"
                >
                  <span>Book on MakeMyTrip</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href="https://www.google.com/travel/flights"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackBookOnClicked({ provider: 'Google Flights', itemType: 'flight', url: 'https://www.google.com/travel/flights' })}
                  className="text-xs text-[#55625E] font-medium hover:underline inline-flex items-center gap-1"
                >
                  <span>Google Flights</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
              {onOpenFlightsModal && (
                <button
                  type="button"
                  onClick={onOpenFlightsModal}
                  className="text-xs text-[#55625E] hover:text-[#15201D] font-medium hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>See other flights</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card-consumer p-4 transition-all hover:border-[#0E6B59]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center shrink-0 mt-0.5">
              <Car className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#55625E]">
                  Road Travel
                </span>
                <SourceTag kind={isAiEstimated ? 'estimate' : 'sample'} label={isAiEstimated ? 'AI estimate' : 'sample'} />
                <span className="text-[10px] font-bold text-[#0E6B59] bg-[#E3F1EC] px-2 py-0.5 rounded-full">
                  Scenic Road Route
                </span>
              </div>
              <div className="text-sm font-bold text-[#15201D]">
                {transfer.title || 'Private AC Outstation Cab (round-trip)'}
              </div>
              <div className="text-xs text-[#55625E]">
                {transfer.description || 'Chauffeured private round-trip cab for highway transit and local exploration'}
              </div>
              <div className="text-[11px] text-[#0E6B59] font-medium">
                Scenic Ghat Corridor · Hand-curated forest mist highway views
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E2E6E1]">
            <div className="text-sm font-bold text-[#15201D]">
              ₹{(transfer.priceINR || 5500).toLocaleString('en-IN')}
            </div>
            <a
              href="https://www.makemytrip.com/cabs/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackBookOnClicked({ provider: 'MakeMyTrip', itemType: 'cab', url: 'https://www.makemytrip.com/cabs/' })}
              className="text-xs text-[#0E6B59] font-bold hover:underline inline-flex items-center gap-1 min-h-[32px] sm:min-h-0 bg-[#E3F1EC]/50 px-2 py-0.5 rounded-md"
            >
              <span>Book Cab on MakeMyTrip</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* 2. Stay Cards: One per base for multi-base, or single stay */}
      {hasMultipleStays ? (
        stays!.map((s, idx) => (
          <div key={idx} className="card-consumer p-4 transition-all hover:border-[#0E6B59]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center shrink-0 mt-0.5">
                <Building className="h-4.5 w-4.5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#55625E]">
                    Stay · Base {idx + 1} ({s.baseName})
                  </span>
                  <SourceTag kind={isAiEstimated ? 'estimate' : 'sample'} label={isAiEstimated ? 'AI estimate' : 'sample'} />
                </div>
                <div className="text-sm font-bold text-[#15201D]">
                  {isAiEstimated
                    ? `${s.hotel.starRating}★ hotel in ${s.hotel.area || s.baseName}, ~₹${s.hotel.pricePerNightINR.toLocaleString('en-IN')}/night`
                    : s.hotel.name}
                </div>
                <div className="text-xs text-[#55625E]">
                  {s.hotel.area || s.baseName} · {s.nights} nights (₹{s.hotel.pricePerNightINR.toLocaleString('en-IN')}/night)
                </div>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E2E6E1]">
              <div className="text-sm font-bold text-[#15201D]">
                ₹{((s.hotel.totalPriceINR || s.hotel.pricePerNightINR * s.nights)).toLocaleString('en-IN')}
              </div>
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(s.baseName + ' ' + (s.hotel.area || '') + ' verified hotel booking')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackBookOnClicked({ provider: 'Google Search', itemType: 'stay', url: `https://www.google.com/search?q=${encodeURIComponent(s.baseName + ' hotel booking')}` })}
                className="text-xs text-[#0E6B59] font-bold hover:underline inline-flex items-center gap-1 min-h-[32px] sm:min-h-0 bg-[#E3F1EC]/50 px-2 py-0.5 rounded-md"
              >
                <span>View Stays in {s.baseName}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        ))
      ) : (
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
                <SourceTag kind={isAiEstimated ? 'estimate' : 'sample'} label={isAiEstimated ? 'AI estimate' : 'sample'} />
              </div>
              <div className="text-sm font-bold text-[#15201D]">
                {isAiEstimated
                  ? `${hotel.starRating}★ hotel in ${hotel.area || hotel.city}, ~₹${hotel.pricePerNightINR.toLocaleString('en-IN')}/night`
                  : hotel.name}
              </div>
              <div className="text-xs text-[#55625E]">
                {hotel.area}{!isAiEstimated ? ` · ${hotel.starRating}★` : ''} · {nightsCount} nights (₹{hotel.pricePerNightINR.toLocaleString('en-IN')}/night)
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E2E6E1]">
            <div className="text-sm font-bold text-[#15201D]">
              ₹{(hotel.totalPriceINR || hotel.pricePerNightINR * nightsCount).toLocaleString('en-IN')}
            </div>
            <div className="flex flex-col sm:items-end gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`https://www.makemytrip.com/hotels/hotel-listing/?city=${encodeURIComponent(hotel.city || hotel.area || 'Goa')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackBookOnClicked({ provider: 'MakeMyTrip', itemType: 'hotel', url: `https://www.makemytrip.com/hotels/hotel-listing/?city=${encodeURIComponent(hotel.city || hotel.area || 'Goa')}` })}
                  className="text-xs text-[#0E6B59] font-bold hover:underline inline-flex items-center gap-1 min-h-[32px] sm:min-h-0 bg-[#E3F1EC]/50 px-2 py-0.5 rounded-md"
                >
                  <span>Book on MakeMyTrip</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(hotel.name + ' ' + (hotel.area || '') + ' official site booking')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackBookOnClicked({ provider: 'Official Hotel Site', itemType: 'hotel', url: `https://www.google.com/search?q=${encodeURIComponent(hotel.name)}` })}
                  className="text-xs text-[#55625E] font-medium hover:underline inline-flex items-center gap-1"
                  title="Book directly on hotel's official website"
                >
                  <span>Hotel Site</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
              {onOpenStaysModal && (
                <button
                  type="button"
                  onClick={onOpenStaysModal}
                  className="text-xs text-[#55625E] hover:text-[#15201D] font-medium hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>See other stays</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inter-city Travel Line (Prompt 3 rule for multi-base trips) */}
      {(interCityTravel || (hasMultipleStays && stays!.length > 1)) && (
        <div className="card-consumer p-4 transition-all hover:border-[#0E6B59]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center shrink-0 mt-0.5">
              <Car className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#55625E]">
                  Inter-city Travel
                </span>
                <SourceTag kind={isAiEstimated ? 'estimate' : 'sample'} label={isAiEstimated ? 'AI estimate' : 'sample'} />
              </div>
              <div className="text-sm font-bold text-[#15201D]">
                {interCityTravel?.title || `Private AC Cab (${stays!.map((s) => s.baseName).join(' ↔ ')})`}
              </div>
              <div className="text-xs text-[#55625E]">
                {interCityTravel?.description || `Dedicated chauffeured inter-base transfers connecting all ${stays!.length} bases`}
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E2E6E1]">
            <div className="text-sm font-bold text-[#15201D]">
              ₹{(interCityTravel?.priceINR || 6500).toLocaleString('en-IN')}
            </div>
            <a
              href="https://www.makemytrip.com/cabs/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackBookOnClicked({ provider: 'MakeMyTrip', itemType: 'cab', url: 'https://www.makemytrip.com/cabs/' })}
              className="text-xs text-[#0E6B59] font-bold hover:underline inline-flex items-center gap-1 min-h-[32px] sm:min-h-0 bg-[#E3F1EC]/50 px-2 py-0.5 rounded-md"
            >
              <span>Book Cab on MakeMyTrip</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

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
                <SourceTag kind={isAiEstimated ? 'estimate' : 'sample'} label={isAiEstimated ? 'AI estimate' : 'sample'} />
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
            <a
              href="https://www.makemytrip.com/cabs/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackBookOnClicked({ provider: 'MakeMyTrip', itemType: 'cab', url: 'https://www.makemytrip.com/cabs/' })}
              className="text-xs text-[#0E6B59] font-bold hover:underline inline-flex items-center gap-1 min-h-[32px] sm:min-h-0 bg-[#E3F1EC]/50 px-2 py-0.5 rounded-md"
            >
              <span>Book Cab</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* Direct Outbound Booking Guarantee Note */}
      <div className="p-2.5 rounded-xl bg-[#F6F8F6] border border-[#E2E6E1] text-[11px] text-[#55625E] flex items-center justify-between gap-2">
        <span>
          <strong>Direct Outbound Links:</strong> Book directly with official travel providers (MakeMyTrip, IRCTC, hotel official portals). No checkout or payment handling on AeroDAG.
        </span>
        <a
          href="https://www.irctc.co.in/nget/train-search"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-[#0E6B59] hover:underline shrink-0 inline-flex items-center gap-1"
        >
          <span>IRCTC Trains</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
};
