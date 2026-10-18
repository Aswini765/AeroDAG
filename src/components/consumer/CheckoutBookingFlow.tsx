import React, { useState, useRef } from 'react';
import {
  Users,
  Info,
  ArrowLeft,
  Check,
  Loader2,
  ShieldCheck,
  CheckCircle2
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
import {
  getTripSummary,
  TripSummary,
  generateSandboxBookingId,
  deriveDestinationCode
} from '../../services/tripSummaryHelper';
import { SourceTag } from './SourceTag';

export interface TravellerFormItem {
  id: string;
  type: 'ADULT' | 'CHILD' | 'SENIOR';
  title: string;
  firstName: string;
  lastName: string;
  age?: number;
  email?: string;
  phone?: string;
  label: string;
}

interface CheckoutBookingFlowProps {
  preferences: TripPreferences;
  selectedFlight?: FlightItem | null;
  selectedHotel?: HotelItem | null;
  selectedTransfer?: TransferItem | null;
  visaDetails?: VisaDetails | null;
  totalCostINR?: number;
  totalCostUSD?: number;
  currency: Currency;
  /** contactEmail = lead traveller's email, used only to offer "see this trip on any device" */
  onBookingSuccess: (confirmedRecord: ConfirmedBookingRecord, contactEmail?: string) => void;
  onBackToTrip: () => void;
  tripSummary?: TripSummary | null;
}

export const CheckoutBookingFlow: React.FC<CheckoutBookingFlowProps> = ({
  preferences,
  selectedFlight,
  selectedHotel,
  selectedTransfer,
  visaDetails,
  totalCostINR,
  currency,
  onBookingSuccess,
  onBackToTrip,
  tripSummary: propSummary
}) => {
  // Authoritative Trip Summary (Single Source of Truth)
  const summary =
    propSummary ||
    getTripSummary({
      preferences,
      flight: selectedFlight,
      hotel: selectedHotel,
      transfer: selectedTransfer,
      visa: visaDetails
    });

  // Dynamic Passenger Form State derived strictly from summary / preferences
  const [passengers, setPassengers] = useState<TravellerFormItem[]>(() => {
    const list: TravellerFormItem[] = [];
    const adults = summary?.travellers.adults ?? preferences.adultsCount ?? 2;
    const children = summary?.travellers.children ?? preferences.childrenAges ?? [];
    const seniors = summary?.travellers.seniors ?? 0;

    for (let i = 0; i < adults; i++) {
      list.push({
        id: `pax-adult-${i + 1}`,
        type: 'ADULT',
        title: i === 0 ? 'Mr' : 'Ms',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        label: i === 0 ? 'Lead Traveller' : `Adult ${i + 1}`
      });
    }

    for (let i = 0; i < children.length; i++) {
      const age = children[i];
      list.push({
        id: `pax-child-${i + 1}`,
        type: 'CHILD',
        title: 'Mstr',
        firstName: '',
        lastName: '',
        age: age,
        label: `Child ${i + 1} (Age ${age})`
      });
    }

    for (let i = 0; i < seniors; i++) {
      list.push({
        id: `pax-senior-${i + 1}`,
        type: 'SENIOR',
        title: 'Mr',
        firstName: '',
        lastName: '',
        label: `Senior ${i + 1}`
      });
    }

    return list;
  });

  const [isUsingTestData, setIsUsingTestData] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const markTouched = (fieldKey: string) => {
    setTouchedFields((prev) => ({ ...prev, [fieldKey]: true }));
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneDigits = (p: string) => (p || '').replace(/\D/g, '');

  const isPaxValid = (pax: TravellerFormItem, isLead: boolean) => {
    if (!pax.firstName.trim() || !pax.lastName.trim()) return false;
    if (isLead) {
      if (!emailRegex.test((pax.email || '').trim())) return false;
      if (phoneDigits(pax.phone || '').length < 10) return false;
    }
    return true;
  };

  const isFormValid = passengers.length > 0 && passengers.every((p, idx) => isPaxValid(p, idx === 0));

  const handleFillTestDetails = () => {
    setIsUsingTestData(true);
    setTouchedFields({});
    setPassengers((prev) =>
      prev.map((p, idx) => ({
        ...p,
        firstName: idx === 0 ? 'Alex' : idx === 1 ? 'Sam' : 'Jordan',
        lastName: 'Taylor',
        email: idx === 0 ? 'alex.taylor@example.com' : '',
        phone: idx === 0 ? '+91 98765 43210' : ''
      }))
    );
  };

  const handleUpdatePassenger = (id: string, field: keyof TravellerFormItem, value: any) => {
    setPassengers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const finalTotalINR = summary?.totalINR ?? totalCostINR ?? 0;
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStep, setPaymentStep] = useState<number>(0);

  const handleSimulatePayment = () => {
    if (isSubmittingRef.current || !isFormValid) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setPaymentStep(1);

    // Timed step feedback: Nani Srinivas usability fix
    setTimeout(() => {
      setPaymentStep(2);
    }, 400);

    setTimeout(() => {
      setPaymentStep(3);
    }, 800);

    setTimeout(() => {
      const destCode = summary?.destinationCode || deriveDestinationCode(preferences.destination);
      const bookingId = `${generateSandboxBookingId(destCode)} (demo)`;
      const pnrNum = Math.floor(1000 + Math.random() * 9000);
      const voucherNum = Math.floor(1000 + Math.random() * 9000);

      const passengersList: Passenger[] = passengers.map((p) => ({
        type: p.type,
        title: p.title as any,
        firstName: p.firstName.trim() || `Guest`,
        lastName: p.lastName.trim() || 'Traveller',
        age: p.age
      }));

      const confirmedRecord: ConfirmedBookingRecord = {
        bookingId,
        pnr: `AD-${destCode}-${pnrNum}`,
        hotelVoucherId: `HTL-${destCode}-${voucherNum} (demo)`,
        createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'SIMULATED',
        tripTitle: `${summary?.durationDays || preferences.durationDays}-Day Trip to ${summary?.destination || preferences.destination}`,
        destination: summary?.destination || preferences.destination,
        origin: summary?.origin || preferences.origin,
        travelDates: summary?.dates || preferences.targetDates,
        totalPaidINR: finalTotalINR,
        totalPaidUSD: Math.round(finalTotalINR / 84),
        budgetTotalINR: preferences.budgetTotalINR || 60000,
        remainingBudgetINR: Math.max(0, (preferences.budgetTotalINR || 60000) - finalTotalINR),
        passengers: passengersList,
        selectedFlight: summary?.flight || selectedFlight || null,
        selectedHotel: summary?.hotel || selectedHotel || null,
        selectedTransfer: summary?.transfer || selectedTransfer || null,
        itinerary: summary?.itinerary || [],
        visa: null,
        scope: 'domestic'
      };

      onBookingSuccess(confirmedRecord, (passengers[0]?.email || '').trim() || undefined);
      setIsSubmitting(false);
    }, 1300);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-fade-in-slide text-left">
      {/* Top Bar: Back to Plan button */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={onBackToTrip}
          className="btn-ghost text-xs sm:text-sm py-2 px-3.5 inline-flex items-center gap-1.5 cursor-pointer"
          aria-label="Back to plan"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to plan</span>
        </button>

        <span className="text-xs font-semibold uppercase tracking-wider text-[#0E6B59]">
          Step 3 of 4 · Review details
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: TRAVELLER FIELDSETS (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#15201D] font-heading">
                Traveller Details
              </h1>
              <p className="text-xs sm:text-sm text-[#55625E]">
                Names must match government-issued photo IDs (Aadhaar or Voter ID).
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isUsingTestData && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E3F1EC] text-[#0E6B59]">
                  Test data
                </span>
              )}
              <button
                type="button"
                onClick={handleFillTestDetails}
                className="btn-ghost py-1.5 px-3 text-xs"
              >
                Fill test details
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {passengers.map((pax, idx) => {
              const isLead = idx === 0;

              return (
                <fieldset
                  key={pax.id}
                  className="card-consumer p-5 space-y-3.5 border-[#E2E6E1]"
                >
                  <legend className="px-2 font-bold text-sm text-[#15201D] font-heading">
                    {pax.label}
                  </legend>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* First Name */}
                    <div className="space-y-1">
                      <label
                        htmlFor={`input-fn-${pax.id}`}
                        className="block text-xs font-semibold text-[#55625E]"
                      >
                        First Name <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        id={`input-fn-${pax.id}`}
                        type="text"
                        value={pax.firstName}
                        onChange={(e) => handleUpdatePassenger(pax.id, 'firstName', e.target.value)}
                        onBlur={() => markTouched(`fn-${pax.id}`)}
                        placeholder="e.g. Aswin"
                        className={`w-full bg-[#FFFFFF] border rounded-xl px-3.5 py-2.5 text-sm text-[#15201D] focus:ring-2 focus:ring-[#7CC4B3] focus:outline-none ${
                          (touchedFields[`fn-${pax.id}`] || isSubmitting) && !pax.firstName.trim() ? 'border-[#DC2626]' : 'border-[#E2E6E1]'
                        }`}
                      />
                      {(touchedFields[`fn-${pax.id}`] || isSubmitting) && !pax.firstName.trim() && (
                        <span id={`error-fn-${pax.id}`} data-testid={`error-fn-${pax.id}`} role="alert" className="text-xs text-[#DC2626] font-medium block">
                          First name is required
                        </span>
                      )}
                    </div>

                    {/* Last Name */}
                    <div className="space-y-1">
                      <label
                        htmlFor={`input-ln-${pax.id}`}
                        className="block text-xs font-semibold text-[#55625E]"
                      >
                        Last Name <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        id={`input-ln-${pax.id}`}
                        type="text"
                        value={pax.lastName}
                        onChange={(e) => handleUpdatePassenger(pax.id, 'lastName', e.target.value)}
                        onBlur={() => markTouched(`ln-${pax.id}`)}
                        placeholder="e.g. Kumar"
                        className={`w-full bg-[#FFFFFF] border rounded-xl px-3.5 py-2.5 text-sm text-[#15201D] focus:ring-2 focus:ring-[#7CC4B3] focus:outline-none ${
                          (touchedFields[`ln-${pax.id}`] || isSubmitting) && !pax.lastName.trim() ? 'border-[#DC2626]' : 'border-[#E2E6E1]'
                        }`}
                      />
                      {(touchedFields[`ln-${pax.id}`] || isSubmitting) && !pax.lastName.trim() && (
                        <span id={`error-ln-${pax.id}`} data-testid={`error-ln-${pax.id}`} role="alert" className="text-xs text-[#DC2626] font-medium block">
                          Last name is required
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Lead Traveller Contacts */}
                  {isLead && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E2E6E1]">
                      <div className="space-y-1">
                        <label
                          htmlFor={`input-email-${pax.id}`}
                          className="block text-xs font-semibold text-[#55625E]"
                        >
                          Email Address <span className="text-[#DC2626]">*</span>
                        </label>
                        <input
                          id={`input-email-${pax.id}`}
                          type="email"
                          value={pax.email || ''}
                          onChange={(e) => handleUpdatePassenger(pax.id, 'email', e.target.value)}
                          onBlur={() => markTouched(`email-${pax.id}`)}
                          placeholder="aswin@example.com"
                          className={`w-full bg-[#FFFFFF] border rounded-xl px-3.5 py-2.5 text-sm text-[#15201D] focus:ring-2 focus:ring-[#7CC4B3] focus:outline-none ${
                            (touchedFields[`email-${pax.id}`] || isSubmitting) && !emailRegex.test((pax.email || '').trim()) ? 'border-[#DC2626]' : 'border-[#E2E6E1]'
                          }`}
                        />
                        {(touchedFields[`email-${pax.id}`] || isSubmitting) && !emailRegex.test((pax.email || '').trim()) && (
                          <span id={`error-email-${pax.id}`} data-testid={`error-email-${pax.id}`} role="alert" className="text-xs text-[#DC2626] font-medium block">
                            Valid email is required for the lead traveller
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label
                          htmlFor={`input-mobile-${pax.id}`}
                          className="block text-xs font-semibold text-[#55625E]"
                        >
                          Mobile Number <span className="text-[#DC2626]">*</span>
                        </label>
                        <input
                          id={`input-mobile-${pax.id}`}
                          type="tel"
                          value={pax.phone || ''}
                          onChange={(e) => handleUpdatePassenger(pax.id, 'phone', e.target.value)}
                          onBlur={() => markTouched(`phone-${pax.id}`)}
                          placeholder="+91 98765 43210"
                          className={`w-full bg-[#FFFFFF] border rounded-xl px-3.5 py-2.5 text-sm text-[#15201D] focus:ring-2 focus:ring-[#7CC4B3] focus:outline-none ${
                            (touchedFields[`phone-${pax.id}`] || isSubmitting) && phoneDigits(pax.phone || '').length < 10 ? 'border-[#DC2626]' : 'border-[#E2E6E1]'
                          }`}
                        />
                        {(touchedFields[`phone-${pax.id}`] || isSubmitting) && phoneDigits(pax.phone || '').length < 10 && (
                          <span id={`error-phone-${pax.id}`} data-testid={`error-phone-${pax.id}`} role="alert" className="text-xs text-[#DC2626] font-medium block">
                            Valid 10-digit phone number is required
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Child Age indicator */}
                  {pax.type === 'CHILD' && pax.age !== undefined && (
                    <div className="text-xs text-[#55625E] italic">
                      Child age: {pax.age} years (qualifies for discounted activities and food pricing)
                    </div>
                  )}
                </fieldset>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: ORDER SUMMARY (5 cols) */}
        <div className="lg:col-span-5 space-y-5 sticky top-24">
          <div className="card-consumer p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-[#15201D] font-heading pb-2 border-b border-[#E2E6E1]">
              Order Summary
            </h2>

            {/* Line items identical to plan */}
            <div className="space-y-2.5">
              {summary?.lineItems.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                  <div className="truncate text-[#55625E]">
                    <span className="font-semibold text-[#15201D]">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-bold text-[#15201D]">
                      ₹{item.amountINR.toLocaleString('en-IN')}
                    </span>
                    <SourceTag kind={item.source} label={item.sourceLabel || item.source} />
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="pt-3 border-t border-[#E2E6E1] flex items-baseline justify-between">
              <span className="text-sm font-bold text-[#15201D]">Grand Total</span>
              <span className="text-2xl font-black text-[#15201D] font-heading">
                ₹{finalTotalINR.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Cancellation terms */}
            <div className="text-[11px] text-[#55625E] leading-relaxed pt-2 border-t border-[#E2E6E1]">
              <span className="font-semibold text-[#15201D]">Cancellation policy (Sample):</span> Free cancellation up to 48 hours prior to departure for hotel and private transfers. Airline fees apply for flight schedule alterations.
            </div>

            {/* Amber Demo Notice */}
            <div className="p-3 rounded-xl bg-[#FCEFD9] border border-[#8A4307]/30 text-xs text-[#8A4307] flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Demo booking. No tickets are issued and no money is charged.</span>
            </div>

            {/* Security Notice */}
            <div className="text-[11px] text-[#55625E]">
              We never ask for your UPI PIN or payment credentials.
            </div>

            {/* Full-width demo booking button */}
            <button
              type="button"
              id="run-simulated-booking-btn"
              data-testid="run-simulated-booking-btn"
              onClick={handleSimulatePayment}
              disabled={isSubmitting || !isFormValid}
              className="btn-primary w-full text-sm font-bold py-3 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Booking (demo)…</span>
                </>
              ) : (
                <span>Book now (demo — no payment)</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Staged Payment Loading & Confirmation Modal (Nani Srinivas feedback) */}
      {isSubmitting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#15201D]/70 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Processing your booking"
        >
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E6E1] shadow-2xl max-w-md w-full p-6 text-center space-y-6">
            <div className="h-14 w-14 mx-auto rounded-full bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center shadow-inner">
              {paymentStep >= 3 ? (
                <CheckCircle2 className="h-8 w-8 text-[#0E6B59] animate-bounce" />
              ) : (
                <Loader2 className="h-8 w-8 text-[#0E6B59] animate-spin" />
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-[#15201D] font-heading">
                {paymentStep >= 3 ? 'Payment Confirmed!' : 'Processing Your Booking'}
              </h3>
              <p className="text-xs text-[#55625E]">
                Simulating instant transaction & inventory verification
              </p>
            </div>

            <div className="space-y-3 text-left pt-2 border-t border-[#E2E6E1] text-xs">
              <div className="flex items-center gap-3">
                <span className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                  paymentStep >= 1 ? 'bg-[#E3F1EC] text-[#0E6B59]' : 'bg-[#F0F2EE] text-[#55625E]'
                }`}>
                  {paymentStep >= 2 ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <Loader2 className="h-3 w-3 animate-spin" />}
                </span>
                <span className={paymentStep >= 1 ? 'font-semibold text-[#15201D]' : 'text-[#55625E]'}>
                  Locking hotel room & flight inventory
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                  paymentStep >= 2 ? 'bg-[#E3F1EC] text-[#0E6B59]' : 'bg-[#F0F2EE] text-[#55625E]'
                }`}>
                  {paymentStep >= 3 ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : paymentStep >= 2 ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="h-2 w-2 rounded-full bg-[#CBD5E1]" />}
                </span>
                <span className={paymentStep >= 2 ? 'font-semibold text-[#15201D]' : 'text-[#55625E]'}>
                  Authorizing demo payment (Zero charge)
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                  paymentStep >= 3 ? 'bg-[#E3F1EC] text-[#0E6B59]' : 'bg-[#F0F2EE] text-[#55625E]'
                }`}>
                  {paymentStep >= 3 ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <span className="h-2 w-2 rounded-full bg-[#CBD5E1]" />}
                </span>
                <span className={paymentStep >= 3 ? 'font-semibold text-[#0E6B59]' : 'text-[#55625E]'}>
                  Generating confirmed PNR & trip record
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
