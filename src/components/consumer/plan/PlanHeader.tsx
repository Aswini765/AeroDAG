import React, { useState } from 'react';
import { Bookmark, ArrowRight, ExternalLink, Share2, Check, MessageCircle } from 'lucide-react';
import { TripPlan, TripPreferences } from '../../../types/travelBooking';
import { shareTripPlan, getWhatsAppShareUrl } from '../../../services/shareTripHelper';

interface PlanHeaderProps {
  plan: TripPlan;
  preferences: TripPreferences;
  onSaveTrip: () => void;
  onProceedToReview: () => void;
  isSaved?: boolean;
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
}

export const PlanHeader: React.FC<PlanHeaderProps> = ({
  plan,
  preferences,
  onSaveTrip,
  onProceedToReview,
  isSaved = false,
  saveState
}) => {
  const state = saveState || (isSaved ? 'saved' : 'idle');
  const saveLabel =
    state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : state === 'error' ? "Couldn't save · Retry" : 'Save trip';
  const cleanCity = (plan.destination || 'Goa').replace(/,\s*India$/i, '').split(',')[0].trim();
  const areaName = plan.hotelZone || plan.hotel?.area || '';

  // B7: Trusted booking URLs (city only, zero PII)
  const isTrainTrip = Boolean(plan.selectedTrain && !plan.flight);
  const primaryBookingUrl = isTrainTrip ? 'https://www.irctc.co.in' : 'https://www.makemytrip.com';
  const primaryBookingLabel = isTrainTrip ? 'Book on IRCTC' : 'Book on MakeMyTrip';
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${areaName} ${cleanCity}`)}`;

  // B5: Share state
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared'>('idle');

  const handleShareClick = async () => {
    const res = await shareTripPlan(plan, preferences);
    if (res.method === 'clipboard') {
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2500);
    } else if (res.method === 'whatsapp') {
      window.open(getWhatsAppShareUrl(plan, preferences), '_blank', 'noopener,noreferrer');
    } else if (res.method === 'native' && res.success) {
      setShareStatus('shared');
      setTimeout(() => setShareStatus('idle'), 2500);
    }
  };

  const whatsappUrl = getWhatsAppShareUrl(plan, preferences);

  return (
    <div className="space-y-4 mb-6 text-left">
      {/* Demo-mode banner, restyled neutral */}
      <div className="card-consumer p-3 sm:px-4 bg-[#F5F6F3] border-[#E2E6E1] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#55625E]">
        <div className="flex items-center gap-2">
          <span className="font-semibold px-2 py-0.5 rounded-full bg-[#E2E6E1] text-[#15201D] text-[11px]">
            RESEARCH & DECIDE
          </span>
          <span>Sample prices · Real total cost preview · Book directly on trusted sites</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0E6B59] hover:underline inline-flex items-center gap-1 font-medium"
          >
            <span>Explore on Google Maps</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pt-1">
        <div className="space-y-1.5 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#0E6B59]">
            Draft plan
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#15201D] font-heading">
            {plan.durationDays} days in {cleanCity}
          </h1>

          {areaName && areaName.toLowerCase() !== cleanCity.toLowerCase() && (
            <div className="text-xs sm:text-sm font-semibold text-[#0E6B59]">
              Staying in {areaName}
            </div>
          )}

          <div className="text-xs sm:text-sm text-[#55625E] flex flex-wrap items-center gap-2">
            <span>{plan.dates}</span>
            <span>·</span>
            <span>{plan.travellers.total} traveller{plan.travellers.total === 1 ? '' : 's'}</span>
            <span>·</span>
            <span>from {plan.origin.replace(/\s*\([^)]*\)/, '')}</span>
            <span>·</span>
            <span className="capitalize">{preferences.travelStyle || 'Relaxed'} pace</span>
          </div>
        </div>

        {/* Action Buttons: Primary Book on Trusted Sites + Share + Save + Try Demo */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 w-full lg:w-auto shrink-0">
          {/* B5: Share with family/friends */}
          <button
            type="button"
            onClick={handleShareClick}
            className="btn-secondary w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-bold text-[#15201D]"
            title="Share trip summary with family or friends"
          >
            {shareStatus === 'copied' ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#0E6B59]" />
                <span className="text-[#0E6B59]">Copied to clipboard!</span>
              </>
            ) : shareStatus === 'shared' ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#0E6B59]" />
                <span className="text-[#0E6B59]">Shared!</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 text-[#0E6B59]" />
                <span>Share with family</span>
              </>
            )}
          </button>

          {/* WhatsApp quick share link */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-bold text-[#128C7E] border-[#128C7E]/30 hover:border-[#128C7E]"
            title="Share directly via WhatsApp"
          >
            <MessageCircle className="h-3.5 w-3.5 text-[#128C7E]" />
            <span>WhatsApp</span>
          </a>

          {/* Save Draft */}
          <button
            type="button"
            onClick={onSaveTrip}
            className={`btn-ghost w-full sm:w-auto min-h-[44px] ${state === 'error' ? 'text-[#8A4307]' : ''}`}
            aria-label="Save trip draft"
            aria-live="polite"
            disabled={state === 'saving' || state === 'saved'}
            id="save-trip-btn"
            data-state={state}
          >
            <Bookmark className={`h-4 w-4 ${state === 'saved' ? 'text-[#0E6B59] fill-[#0E6B59]' : ''}`} />
            <span>{saveLabel}</span>
          </button>

          {/* B7: Primary Action -> Book on Trusted Sites (IRCTC / MakeMyTrip) in new tab */}
          <a
            href={primaryBookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            id="book-on-trusted-site-btn"
            className="btn-primary w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-sm"
          >
            <span>{primaryBookingLabel}</span>
            <ExternalLink className="h-4 w-4" />
          </a>

          {/* B7: Secondary Demo Booking */}
          <button
            type="button"
            onClick={onProceedToReview}
            id="review-and-book-btn"
            className="btn-secondary w-full sm:w-auto min-h-[44px] text-xs font-semibold text-[#55625E] hover:text-[#15201D]"
            aria-label="Try demo booking"
          >
            <span>Try demo booking</span>
          </button>
        </div>
      </div>
    </div>
  );
};
