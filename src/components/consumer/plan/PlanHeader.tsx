import React, { useState } from 'react';
import { Bookmark, ExternalLink, Share2, Check, ArrowLeft } from 'lucide-react';
import { TripPlan, TripPreferences } from '../../../types/travelBooking';
import { buildHotelSearchUrl, getStayLegs } from '../../../services/bookingLinks';
import { ShareSaveSheet } from './ShareSaveSheet';
import { trackBookOnClicked } from '../../../services/telemetry/posthog';

interface PlanHeaderProps {
  plan: TripPlan;
  preferences: TripPreferences;
  onSaveTrip: () => void;
  onProceedToReview: () => void;
  isSaved?: boolean;
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
  /** Back / Edit: go back and change what the plan is built on */
  onBack?: () => void;
  /** false until travel and stay are chosen: then the button points to step 1 instead of booking */
  bookingReady?: boolean;
}

export const PlanHeader: React.FC<PlanHeaderProps> = ({
  plan,
  preferences,
  onSaveTrip,
  onProceedToReview,
  isSaved = false,
  saveState,
  onBack,
  bookingReady = true
}) => {
  const state = saveState || (isSaved ? 'saved' : 'idle');
  const saveLabel =
    state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : state === 'error' ? "Couldn't save · Retry" : 'Save';
  const cleanCity = (plan.destination || 'Goa').replace(/,\s*India$/i, '').split(',')[0].trim();
  const areaName = plan.hotelZone || plan.hotel?.area || '';

  // B7: Trusted booking URLs (search params included, zero PII)
  // The stay is the main booking; it opens MakeMyTrip with place, dates and guests filled in.
  // Multi-stop trips: open the first stop (e.g. Manali), not the state name
  const bookPlace = plan.stays?.[0]?.baseName || cleanCity;
  const primaryBookingUrl = buildHotelSearchUrl(bookPlace, plan.dates, {
    adults: plan.travellers.adults,
    children: plan.travellers.children,
    childAges: plan.travellers.childAges
  });

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isProceedingReview, setIsProceedingReview] = useState(false);

  const handleProceedReview = () => {
    if (isProceedingReview) return;
    setIsProceedingReview(true);
    onProceedToReview();
    setTimeout(() => setIsProceedingReview(false), 1500);
  };

  const party = {
    adults: plan.travellers.adults,
    children: plan.travellers.children,
    childAges: plan.travellers.childAges
  };
  const legs = getStayLegs(plan, party);
  const firstLeg = legs[0];
  const bookUrl = firstLeg?.url || primaryBookingUrl;
  const bookLabel = firstLeg?.dateLabel
    ? `Book on MakeMyTrip · ${firstLeg.place}, ${firstLeg.dateLabel}`
    : `Book on MakeMyTrip · ${bookPlace}`;

  // Subtitle: "Munnar 2N + Alleppey 2N · 20–24 Nov" or "Madikeri · 20–23 Nov 2026"
  const stopsText = plan.stays && plan.stays.length > 1
    ? plan.stays.map((st) => `${st.baseName} ${st.nights}N`).join(' + ')
    : (areaName && areaName.toLowerCase() !== cleanCity.toLowerCase() ? areaName : '');
  const children = plan.travellers.children || 0;
  const whoText = children > 0
    ? `${plan.travellers.adults} adult${plan.travellers.adults > 1 ? 's' : ''} + ${children} child${children > 1 ? 'ren' : ''} (${plan.travellers.total})`
    : `${plan.travellers.total} ${plan.travellers.total === 1 ? 'person' : 'people'}`;
  const prefText = (preferences.dietaryOrNotes || '').trim();

  return (
    <div className="text-left space-y-3">
      {/* Title row */}
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="h-11 w-11 rounded-xl flex items-center justify-center text-[#15201D] hover:bg-[#E3F1EC] cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl font-bold text-[#15201D] font-heading">
            {plan.durationDays} {plan.durationDays === 1 ? 'day' : 'days'} in {cleanCity}
          </h1>
          <div className="text-xs text-[#55625E]">
            {stopsText ? `${stopsText} · ` : ''}{plan.dates}
          </div>
        </div>
      </div>

      {/* What the plan is built on, with one Edit */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="bg-white border border-[#E2E6E1] rounded-full px-2.5 py-1">{whoText}</span>
        <span className="bg-white border border-[#E2E6E1] rounded-full px-2.5 py-1">From {plan.origin.replace(/\s*\([^)]*\)/, '')}</span>
        {prefText && <span className="bg-white border border-[#E2E6E1] rounded-full px-2.5 py-1 max-w-[220px] truncate">{prefText}</span>}
        {onBack && (
          <button type="button" onClick={onBack} className="rounded-full px-2.5 py-1 font-semibold text-[#0E6B59] hover:underline cursor-pointer">
            Edit
          </button>
        )}
      </div>

      {/* Action bar: fixed at the bottom on phones, inline on larger screens */}
      <div
        id="plan-action-bar"
        className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#E2E6E1] px-4 pt-3 pb-4 sm:static sm:z-auto sm:bg-transparent sm:border-0 sm:p-0"
      >
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2 sm:order-2">
            <button
              type="button"
              id="share-trip-btn"
              onClick={() => setIsShareOpen(true)}
              className="flex-1 sm:flex-none h-[46px] px-4 rounded-xl border border-[#0E6B59] bg-white text-[#0E6B59] text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Share2 className="h-4 w-4" />
              Share with group
            </button>
            <button
              type="button"
              onClick={onSaveTrip}
              className={`flex-1 sm:flex-none h-[46px] px-4 rounded-xl border border-[#0E6B59] bg-white text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${state === 'error' ? 'text-[#8A4307]' : 'text-[#0E6B59]'}`}
              aria-label="Save trip"
              aria-live="polite"
              disabled={state === 'saving' || state === 'saved'}
              id="save-trip-btn"
              data-state={state}
            >
              {state === 'saved' ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              <span>{saveLabel}</span>
            </button>
          </div>
          {!bookingReady ? (
          <a
            href="#step-travel"
            id="start-steps-btn"
            className="sm:order-1 sm:flex-1 h-12 px-4 rounded-xl bg-[#0E6B59] hover:bg-[#0A5546] text-white text-[15px] font-semibold flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span className="truncate">Choose travel and stay below, then book ↓</span>
          </a>
          ) : (
          <a
            href={bookUrl}
            target="_blank"
            rel="noopener noreferrer"
            id="book-on-trusted-site-btn"
            onClick={() => trackBookOnClicked({ provider: 'MakeMyTrip', itemType: 'hotel', url: bookUrl })}
            className="sm:order-1 sm:flex-1 h-12 px-4 rounded-xl bg-[#0E6B59] hover:bg-[#0A5546] text-white text-[15px] font-semibold flex items-center justify-center gap-1.5 shadow-sm"
            title="Opens MakeMyTrip with your place, dates and guests filled in"
          >
            <span className="truncate">{bookLabel}</span>
            <ExternalLink className="h-4 w-4 shrink-0" />
          </a>
          )}
        </div>
      </div>

      {/* Portfolio demo checkout, kept out of the main actions */}
      <button
        type="button"
        onClick={handleProceedReview}
        disabled={isProceedingReview}
        id="review-and-book-btn"
        className="text-[11px] text-[#55625E] underline underline-offset-2 hover:text-[#15201D] disabled:opacity-50"
        aria-label="Try the booking demo"
      >
        {isProceedingReview ? 'Opening demo…' : 'Try the booking demo (no payment)'}
      </button>

      <ShareSaveSheet
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        plan={plan}
        preferences={preferences}
        onSaveTrip={onSaveTrip}
        saveState={state}
      />
    </div>
  );
};
