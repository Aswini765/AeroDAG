import React, { useState } from 'react';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Users,
  Building,
  Plane,
  ArrowRight,
  RotateCcw,
  Check,
  Lock,
  Smartphone,
  AlertCircle
} from 'lucide-react';
import {
  FlightItem,
  HotelItem,
  TransferItem,
  VisaDetails,
  TripPreferences,
  Passenger,
  BookingState,
  ConfirmedBookingRecord,
  Currency
} from '../../types/travelBooking';

interface CheckoutBookingFlowProps {
  preferences: TripPreferences;
  selectedFlight: FlightItem;
  selectedHotel: HotelItem;
  selectedTransfer: TransferItem;
  visaDetails: VisaDetails;
  totalCostINR: number;
  totalCostUSD: number;
  currency: Currency;
  onBookingSuccess: (confirmedRecord: ConfirmedBookingRecord) => void;
  onBackToTrip: () => void;
}

export const CheckoutBookingFlow: React.FC<CheckoutBookingFlowProps> = ({
  preferences,
  selectedFlight,
  selectedHotel,
  selectedTransfer,
  visaDetails,
  totalCostINR,
  totalCostUSD,
  currency,
  onBookingSuccess,
  onBackToTrip
}) => {
  // Booking State Machine tracking
  const [bookingState, setBookingState] = useState<BookingState>('HELD');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');

  // Passenger form
  const [adult1First, setAdult1First] = useState('Rahul');
  const [adult1Last, setAdult1Last] = useState('Sharma');
  const [adult1Email, setAdult1Email] = useState('rahul.sharma@example.com');
  const [adult1Phone, setAdult1Phone] = useState('+91 98765 43210');

  const [adult2First, setAdult2First] = useState('Priya');
  const [adult2Last, setAdult2Last] = useState('Sharma');

  const [child1First, setChild1First] = useState('Aarav');
  const [child1Last, setChild1Last] = useState('Sharma');
  const [child1Age, setChild1Age] = useState(11);

  const [child2First, setChild2First] = useState('Ananya');
  const [child2Last, setChild2Last] = useState('Sharma');
  const [child2Age, setChild2Age] = useState(8);

  const [cardNumber, setCardNumber] = useState('4532 8901 2345 6789');
  const [cardExpiry, setCardExpiry] = useState('11/28');
  const [cardCvv, setCardCvv] = useState('842');
  const [upiId, setUpiId] = useState('rahul.sharma@okaxis');

  const displayTotal = currency === 'INR' ? `₹${totalCostINR.toLocaleString()}` : `$${totalCostUSD.toLocaleString()}`;

  const handleSimulatePayment = () => {
    setBookingState('PAYMENT_PROCESSING');

    setTimeout(() => {
      setBookingState('CONFIRMED');

      const confirmedRecord: ConfirmedBookingRecord = {
        bookingId: `BK-VN-${Math.floor(100000 + Math.random() * 900000)}`,
        pnr: `VN-BLR-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        hotelVoucherId: `HAN-HTL-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'CONFIRMED',
        tripTitle: `10-Day Family Vacation to ${preferences.destination}`,
        destination: preferences.destination,
        origin: preferences.origin,
        travelDates: preferences.targetDates,
        totalPaidINR: totalCostINR,
        totalPaidUSD: totalCostUSD,
        passengers: [
          { type: 'ADULT', title: 'Mr', firstName: adult1First, lastName: adult1Last },
          { type: 'ADULT', title: 'Mrs', firstName: adult2First, lastName: adult2Last },
          { type: 'CHILD', title: 'Mstr', firstName: child1First, lastName: child1Last, age: child1Age },
          { type: 'CHILD', title: 'Miss', firstName: child2First, lastName: child2Last, age: child2Age }
        ],
        selectedFlight,
        selectedHotel,
        selectedTransfer,
        itinerary: [],
        visa: visaDetails
      };

      onBookingSuccess(confirmedRecord);
    }, 1400);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white">Passenger Details & Secure Checkout</h1>
          <p className="text-xs text-slate-400">
            Review traveller names and complete your booking. Inventory is currently held.
          </p>
        </div>

        <button
          onClick={onBackToTrip}
          className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 self-start sm:self-auto"
        >
          &larr; Back to Trip Builder
        </button>
      </div>

      {/* Booking State Machine Tracker */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-2">
          Booking State Machine:
        </span>
        <div className="flex items-center justify-between text-xs font-mono overflow-x-auto pb-1">
          <div className="flex items-center gap-1.5 text-slate-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>1. Searched</span>
          </div>
          <span className="text-slate-600">&rarr;</span>
          <div className="flex items-center gap-1.5 text-slate-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>2. Available</span>
          </div>
          <span className="text-slate-600">&rarr;</span>
          <div className="flex items-center gap-1.5 text-teal-300 font-bold">
            <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
            <span>3. Seats & Suite Held (Active)</span>
          </div>
          <span className="text-slate-600">&rarr;</span>
          <div className={`flex items-center gap-1.5 ${bookingState === 'PAYMENT_PROCESSING' ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
            <span>4. Payment</span>
          </div>
          <span className="text-slate-600">&rarr;</span>
          <div className={`flex items-center gap-1.5 ${bookingState === 'CONFIRMED' ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
            <span>5. Confirmed</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Passenger & Contact Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Passenger Form */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-teal-400" />
              <span>Traveller Information (4 Guests)</span>
            </h2>

            {/* Adult 1 (Lead Traveller) */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                <span>Adult 1 (Lead Passenger)</span>
                <span className="text-teal-400 font-mono text-[11px]">Primary Contact</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">First Name</label>
                  <input
                    type="text"
                    value={adult1First}
                    onChange={(e) => setAdult1First(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Last Name</label>
                  <input
                    type="text"
                    value={adult1Last}
                    onChange={(e) => setAdult1Last(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Email (for E-Tickets & Voucher)</label>
                  <input
                    type="email"
                    value={adult1Email}
                    onChange={(e) => setAdult1Email(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Mobile Phone (with country code)</label>
                  <input
                    type="tel"
                    value={adult1Phone}
                    onChange={(e) => setAdult1Phone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Adult 2 */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
              <span className="text-xs font-semibold text-slate-200 block">Adult 2</span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">First Name</label>
                  <input
                    type="text"
                    value={adult2First}
                    onChange={(e) => setAdult2First(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Last Name</label>
                  <input
                    type="text"
                    value={adult2Last}
                    onChange={(e) => setAdult2Last(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Child 1 & Child 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <span className="text-xs font-semibold text-slate-200 block">Child 1 (Age: {child1Age})</span>
                <div className="space-y-2 text-xs">
                  <input
                    type="text"
                    value={child1First}
                    onChange={(e) => setChild1First(e.target.value)}
                    placeholder="First Name"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                  <input
                    type="text"
                    value={child1Last}
                    onChange={(e) => setChild1Last(e.target.value)}
                    placeholder="Last Name"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <span className="text-xs font-semibold text-slate-200 block">Child 2 (Age: {child2Age})</span>
                <div className="space-y-2 text-xs">
                  <input
                    type="text"
                    value={child2First}
                    onChange={(e) => setChild2First(e.target.value)}
                    placeholder="First Name"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                  <input
                    type="text"
                    value={child2Last}
                    onChange={(e) => setChild2Last(e.target.value)}
                    placeholder="Last Name"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sandbox Payment Card */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-400" />
                <span>Payment Method (Sandbox Test Mode)</span>
              </h2>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                100% Secure Sandbox
              </span>
            </div>

            {/* Payment Method Switcher */}
            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <button
                onClick={() => setPaymentMethod('UPI')}
                className={`p-3 rounded-xl border text-center transition ${
                  paymentMethod === 'UPI'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-white font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                UPI (GPay / PhonePe)
              </button>

              <button
                onClick={() => setPaymentMethod('CARD')}
                className={`p-3 rounded-xl border text-center transition ${
                  paymentMethod === 'CARD'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-white font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Credit / Debit Card
              </button>

              <button
                onClick={() => setPaymentMethod('NETBANKING')}
                className={`p-3 rounded-xl border text-center transition ${
                  paymentMethod === 'NETBANKING'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-white font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                NetBanking
              </button>
            </div>

            {/* Payment Inputs */}
            {paymentMethod === 'UPI' && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <label className="text-[10px] text-slate-400 font-mono">Enter UPI ID / VPA</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                  <button
                    onClick={() => setUpiId('demo.travel@okhdfcbank')}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg transition"
                  >
                    Test Auto-Fill
                  </button>
                </div>
              </div>
            )}

            {paymentMethod === 'CARD' && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono">Valid Thru</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono">CVV</label>
                    <input
                      type="text"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'NETBANKING' && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                Sandbox Simulator: Simulates payment approval via HDFC Bank / ICICI / SBI Gateway.
              </div>
            )}

            <button
              onClick={handleSimulatePayment}
              disabled={bookingState === 'PAYMENT_PROCESSING'}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {bookingState === 'PAYMENT_PROCESSING' ? (
                <>
                  <RotateCcw className="h-4 w-4 animate-spin text-slate-950" />
                  <span>Processing Secure Payment with GDS & CRS...</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Pay {displayTotal} & Confirm All Reservations</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Order Summary Card */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono pb-2 border-b border-slate-800">
              Trip Order Summary
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Flights</span>
                <div className="font-semibold text-white">{selectedFlight.airline}</div>
                <div className="text-[11px] text-slate-400">{selectedFlight.originCode} &rarr; {selectedFlight.destinationCode} (4 Seats)</div>
              </div>

              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Lodging</span>
                <div className="font-semibold text-white">{selectedHotel.name}</div>
                <div className="text-[11px] text-teal-300">{selectedHotel.roomType} (10 Nights)</div>
              </div>

              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Transfer</span>
                <div className="text-slate-300">Private 7-Seater AC Minivan</div>
              </div>

              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Visas</span>
                <div className="text-slate-300">4 &times; Vietnam 30-Day e-Visas</div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Sub-Total:</span>
                <span>{displayTotal}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Convenience Fee:</span>
                <span className="text-emerald-400 font-mono">₹0 (Waived)</span>
              </div>
              <div className="flex justify-between text-white font-bold text-sm pt-2 border-t border-slate-800">
                <span>Total Amount:</span>
                <span className="text-emerald-400 font-mono">{displayTotal}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>AeroDAG Booking Guarantee</span>
              </div>
              <p>Immediate PNR generation, guaranteed adjacent family seats, and hotel voucher delivery.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
