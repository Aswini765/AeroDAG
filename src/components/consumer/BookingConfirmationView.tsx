import React from 'react';
import {
  CheckCircle2,
  Plane,
  Building,
  Car,
  Download,
  Share2,
  Calendar,
  Users,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { ConfirmedBookingRecord, Currency } from '../../types/travelBooking';

interface BookingConfirmationViewProps {
  confirmedBooking: ConfirmedBookingRecord;
  currency: Currency;
  onGoToMyTrips: () => void;
  onOpenTripAssistant: () => void;
}

export const BookingConfirmationView: React.FC<BookingConfirmationViewProps> = ({
  confirmedBooking,
  currency,
  onGoToMyTrips,
  onOpenTripAssistant
}) => {
  const displayTotal =
    currency === 'INR'
      ? `₹${confirmedBooking.totalPaidINR.toLocaleString()}`
      : `$${confirmedBooking.totalPaidUSD.toLocaleString()}`;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 pt-2">
      {/* Success Hero Card */}
      <div className="rounded-3xl border border-teal-500/40 bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/40 p-8 text-center space-y-4 shadow-2xl relative overflow-hidden">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="h-9 w-9 text-emerald-400" />
        </div>

        <div>
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest font-bold">
            Booking Confirmed & Guaranteed
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Pack your bags, your family vacation is locked in!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-lg mx-auto">
            Your flight PNR, interconnecting suite voucher, and private airport transfer have been confirmed. E-tickets have been dispatched to your email.
          </p>
        </div>

        {/* References Strip */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-4 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            Booking ID: <strong className="text-white">{confirmedBooking.bookingId}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            Flight PNR: <strong className="text-teal-400">{confirmedBooking.pnr}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            Hotel Voucher: <strong className="text-emerald-400">{confirmedBooking.hotelVoucherId}</strong>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-600/20"
          >
            <Download className="h-4 w-4" />
            <span>Download PDF Ticket & Voucher</span>
          </button>

          <button
            onClick={onGoToMyTrips}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-2 transition"
          >
            <span>View in My Trips</span>
          </button>

          <button
            onClick={onOpenTripAssistant}
            className="px-4 py-2.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 font-semibold text-xs flex items-center gap-2 transition"
          >
            <Sparkles className="h-4 w-4 text-teal-400" />
            <span>Ask Post-Booking Assistant</span>
          </button>
        </div>
      </div>

      {/* Confirmation Details Summary */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-xl">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono pb-2 border-b border-slate-800">
          Confirmed Inclusions Summary
        </h2>

        {/* Flights */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white flex items-center gap-2">
              <Plane className="h-4 w-4 text-sky-400" />
              <span>{confirmedBooking.selectedFlight.airline} (Flight {confirmedBooking.selectedFlight.flightNumber})</span>
            </span>
            <span className="text-teal-400 font-mono font-bold">4 Seats Confirmed</span>
          </div>
          <div className="text-slate-400">
            {confirmedBooking.selectedFlight.originCity} &rarr; {confirmedBooking.selectedFlight.destinationCity} &bull; Adjacent family seats 24A-24B & 25A-25B
          </div>
        </div>

        {/* Hotel */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white flex items-center gap-2">
              <Building className="h-4 w-4 text-emerald-400" />
              <span>{confirmedBooking.selectedHotel.name} (10 Nights)</span>
            </span>
            <span className="text-emerald-400 font-mono font-bold">Suite Voucher Active</span>
          </div>
          <div className="text-slate-400">
            {confirmedBooking.selectedHotel.roomType} &bull; {confirmedBooking.selectedHotel.bedConfiguration} &bull; Daily Breakfast for 4 included
          </div>
        </div>

        {/* Transfer */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white flex items-center gap-2">
              <Car className="h-4 w-4 text-amber-400" />
              <span>Private 7-Seater AC Minivan Airport Transfer</span>
            </span>
            <span className="text-amber-400 font-mono font-bold">Driver Assigned</span>
          </div>
          <div className="text-slate-400">
            Noi Bai Airport (HAN) pickup with driver holding name board
          </div>
        </div>

        {/* Total Paid */}
        <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
          <span className="text-slate-400">Total Paid (Inclusive of all taxes):</span>
          <span className="text-lg font-bold font-mono text-emerald-400">{displayTotal}</span>
        </div>
      </div>
    </div>
  );
};
