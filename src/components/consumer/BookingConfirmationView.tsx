import React from 'react';
import {
  Check,
  Download,
  Plane,
  Building,
  Car,
  Compass
} from 'lucide-react';
import { ConfirmedBookingRecord, Currency } from '../../types/travelBooking';
import { TripSummary } from '../../services/tripSummaryHelper';

interface BookingConfirmationViewProps {
  confirmedBooking: ConfirmedBookingRecord;
  currency: Currency;
  onGoToMyTrips: () => void;
  onOpenTripAssistant?: () => void;
  onPlanAnotherTrip?: () => void;
  tripSummary?: TripSummary | null;
}

export const BookingConfirmationView: React.FC<BookingConfirmationViewProps> = ({
  confirmedBooking,
  currency,
  onGoToMyTrips,
  onPlanAnotherTrip,
  tripSummary
}) => {
  const destination = confirmedBooking?.destination || 'your destination';
  const rawPnr = confirmedBooking?.pnr || confirmedBooking?.bookingId || 'AD-GOA-7821';
  const tripId = rawPnr.startsWith('AD-')
    ? `${rawPnr.replace(' (sandbox)', '')} (demo)`
    : `AD-${rawPnr.replace(/\D/g, '').slice(-4) || '0000'} (demo)`;

  const handleDownloadItinerary = () => {
    window.print();
  };

  const hotel = confirmedBooking.selectedHotel;
  const flight = confirmedBooking.selectedFlight;
  const transfer = confirmedBooking.selectedTransfer;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8 animate-fade-in-slide">
      {/* Print only banner for downloaded itinerary */}
      <div className="hidden print:block text-center font-mono text-xs text-[#55625E] pb-2 border-b border-[#E2E6E1]">
        Demo booking — not a ticket • AeroDAG demo
      </div>

      {/* 1. Centered Confirmation Card */}
      <div className="card-consumer p-8 sm:p-10 text-center space-y-6 shadow-sm">
        {/* Check Icon */}
        <div className="h-16 w-16 mx-auto rounded-full bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center">
          <Check className="h-8 w-8 stroke-[3]" />
        </div>

        {/* Amber Pill */}
        <div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FCEFD9] text-[#8A4307]">
            DEMO BOOKING · NO PAYMENT TAKEN
          </span>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#15201D] font-heading mt-3">
            Practice booking done — nothing was booked
          </h1>

          <p className="text-xs sm:text-sm text-[#55625E] max-w-lg mx-auto mt-2 leading-relaxed">
            This was practice: no tickets were issued and nothing was charged. To book your {destination} trip for real, go back to your plan and tap “Book on MakeMyTrip” — it opens MakeMyTrip with your dates filled in.
          </p>
        </div>

        {/* Trip ID */}
        <div className="p-3 rounded-xl bg-[#F5F6F3] border border-[#E2E6E1] text-xs font-semibold text-[#15201D] inline-block">
          Practice ID: {tripId}
        </div>

        {/* Trip Total & Per Person Cost */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto p-4 rounded-2xl bg-[#F5F6F3] border border-[#E2E6E1] text-left">
          <div>
            <div className="text-xs font-medium text-[#55625E]">Total, same as your plan (includes 15% buffer)</div>
            <div className="text-xl font-extrabold text-[#15201D] font-heading">
              ₹{(confirmedBooking.totalPaidINR || 0).toLocaleString('en-IN')}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-[#55625E]">
              Per person ({Math.max(1, confirmedBooking.passengers?.length || 2)} traveller{Math.max(1, confirmedBooking.passengers?.length || 2) > 1 ? 's' : ''})
            </div>
            <div className="text-xl font-extrabold text-[#0E6B59] font-heading">
              ₹{Math.round((confirmedBooking.totalPaidINR || 0) / Math.max(1, confirmedBooking.passengers?.length || 2)).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2 w-full">
          <button
            type="button"
            id="view-in-my-trips-btn"
            onClick={onGoToMyTrips}
            className="btn-primary w-full sm:w-auto min-h-[44px]"
          >
            <span>View in My Trips</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadItinerary}
            className="btn-ghost w-full sm:w-auto min-h-[44px]"
          >
            <Download className="h-4 w-4" />
            <span>Download itinerary</span>
          </button>

          <button
            type="button"
            onClick={onPlanAnotherTrip || onGoToMyTrips}
            className="btn-ghost w-full sm:w-auto min-h-[44px]"
          >
            <span>Plan another trip</span>
          </button>
        </div>
      </div>

      {/* 2. "What's in this trip" List with gray "Demo" pills */}
      <div className="card-consumer p-6 sm:p-8 space-y-4 text-left">
        <h2 className="text-base font-bold text-[#15201D] font-heading pb-2 border-b border-[#E2E6E1]">
          What's in this trip
        </h2>

        <div className="space-y-3 text-sm">
          {/* Flight */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#F5F6F3]/60 border border-[#E2E6E1]">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center shrink-0">
                {flight ? <Plane className="h-4 w-4" /> : <Car className="h-4 w-4" />}
              </div>
              <div>
                <div className="font-bold text-[#15201D]">
                  {flight
                    ? `${flight.airline} (${flight.flightNumber})`
                    : confirmedBooking.selectedTrain
                    ? `${confirmedBooking.selectedTrain.trainName || 'Train'}${confirmedBooking.selectedTrain.trainNumber ? ` (${confirmedBooking.selectedTrain.trainNumber})` : ''}`
                    : 'By road'}
                </div>
                <div className="text-xs text-[#55625E]">
                  {confirmedBooking.origin} → {destination}{flight?.destinationCode ? ` (${flight.destinationCode})` : ''}
                </div>
              </div>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-[#E2E6E1] text-[#55625E] shrink-0">
              Not booked
            </span>
          </div>

          {/* Stay */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#F5F6F3]/60 border border-[#E2E6E1]">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center shrink-0">
                <Building className="h-4 w-4" />
              </div>
              <div>
                <div className="font-bold text-[#15201D]">
                  {hotel ? hotel.name : 'Your stay'}
                </div>
                <div className="text-xs text-[#55625E]">
                  {hotel ? hotel.area : destination} · {confirmedBooking.travelDates}
                </div>
              </div>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-[#E2E6E1] text-[#55625E] shrink-0">
              Not booked
            </span>
          </div>

          {/* Transfers */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#F5F6F3]/60 border border-[#E2E6E1]">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center shrink-0">
                <Car className="h-4 w-4" />
              </div>
              <div>
                <div className="font-bold text-[#15201D]">
                  {transfer ? transfer.title : 'Local transfers'}
                </div>
                {(() => {
                  const sub = flight ? 'Airport cab, both ways' : `Round-trip cab from ${confirmedBooking.origin.replace(/\s*\(.*\)/, '').trim()}`;
                  return transfer && transfer.title === sub ? null : <div className="text-xs text-[#55625E]">{sub}</div>;
                })()}
              </div>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-[#E2E6E1] text-[#55625E] shrink-0">
              Not booked
            </span>
          </div>

          {/* Activities */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#F5F6F3]/60 border border-[#E2E6E1]">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center shrink-0">
                <Compass className="h-4 w-4" />
              </div>
              <div>
                <div className="font-bold text-[#15201D]">
                  Your day-by-day plan
                </div>
                <div className="text-xs text-[#55625E]">
                  Activities and food stops from your plan
                </div>
              </div>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-[#E2E6E1] text-[#55625E] shrink-0">
              Not booked
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
