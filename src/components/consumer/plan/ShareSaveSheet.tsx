import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Check, ArrowUpRight, Bookmark } from 'lucide-react';
import { TripPlan, TripPreferences } from '../../../types/travelBooking';
import { computeFullTripCost } from '../../../services/fullTripCostHelper';
import { formatTripShareText, getWhatsAppShareUrl } from '../../../services/shareTripHelper';
import { buildFlightSearchUrl, getStayLegs, buildBusSearchUrl, IRCTC_SEARCH_URL } from '../../../services/bookingLinks';
import { trackShareClicked, trackBookOnClicked } from '../../../services/telemetry/posthog';

interface ShareSaveSheetProps {
  isOpen: boolean;
  onClose: () => void;
  plan: TripPlan;
  preferences: TripPreferences;
  onSaveTrip: () => void;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
}

/**
 * Share, save, book — one screen that shows the same total everywhere:
 * the message your group gets, the card in My trips, and booking links
 * that open with your dates and guests filled in.
 */
export const ShareSaveSheet: React.FC<ShareSaveSheetProps> = ({
  isOpen,
  onClose,
  plan,
  preferences,
  onSaveTrip,
  saveState
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cost = computeFullTripCost(plan, preferences);
  const total = `₹${cost.totalWithBufferINR.toLocaleString('en-IN')}`;
  const each = `₹${cost.perPersonINR.toLocaleString('en-IN')}`;
  const message = formatTripShareText(plan, preferences);
  const whatsappUrl = getWhatsAppShareUrl(plan, preferences);
  const place = plan.destination.replace(/,.*$/, '').trim();
  const party = {
    adults: plan.travellers.adults,
    children: plan.travellers.children,
    childAges: plan.travellers.childAges
  };
  const guestsText = party.children && party.children > 0
    ? `${party.adults} adult${party.adults > 1 ? 's' : ''}, ${party.children} child${party.children > 1 ? 'ren' : ''}`
    : `${party.adults} ${party.adults === 1 ? 'guest' : 'guests'}`;

  const links: { what: string; where: string; url: string; kind: 'flight' | 'hotel' | 'train' }[] = [];
  if (plan.flight) {
    const url = buildFlightSearchUrl(plan.flight.originCode, plan.flight.destinationCode, plan.dates, party, plan.flight.returnFromCode);
    if (url) {
      const back = plan.flight.returnFromCode && plan.flight.returnFromCode !== plan.flight.destinationCode ? plan.flight.returnFromCode : '';
      links.push({
        what: back
          ? `Flights ${plan.flight.originCode} → ${plan.flight.destinationCode}, ${back} → ${plan.flight.originCode}`
          : `Flights ${plan.flight.originCode} → ${plan.flight.destinationCode} · return`,
        where: `MakeMyTrip · ${plan.travellers.total} travellers`,
        url,
        kind: 'flight'
      });
    }
  } else if (plan.selectedTrain) {
    const isBus = plan.selectedTrain.mode === 'bus';
    links.push({
      what: isBus ? `${plan.selectedTrain.trainName} · ${plan.selectedTrain.fromStation} → ${plan.selectedTrain.toStation}` : `Train · ${plan.selectedTrain.trainName}`,
      where: isBus ? `redBus · ${plan.travellers.total} seats, both ways` : 'IRCTC · search with your dates',
      url: isBus ? buildBusSearchUrl(plan.selectedTrain.fromStation, plan.selectedTrain.toStation) : IRCTC_SEARCH_URL,
      kind: 'train'
    });
  }
  getStayLegs(plan, party).forEach((leg) => {
    links.push({
      what: `Stay in ${leg.place}${leg.dateLabel ? ` · ${leg.dateLabel}` : ''}`,
      where: `MakeMyTrip · ${guestsText}`,
      url: leg.url,
      kind: 'hotel'
    });
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      trackShareClicked({ destination: plan.destination, method: 'clipboard' });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-save-title"
      id="share-save-sheet"
      className="fixed inset-0 z-50 bg-black/30 flex sm:items-center sm:justify-center"
      onClick={onClose}
    >
      <div
        className="bg-[#F6F5F0] w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-2xl overflow-y-auto text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-white border-b border-[#E2E6E1]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to plan"
            className="h-11 w-11 rounded-xl flex items-center justify-center text-[#15201D] hover:bg-[#E3F1EC] cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 id="share-save-title" className="text-base font-bold text-[#15201D]">Share, save, book</h2>
        </header>

        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-2.5 rounded-xl bg-[#E3F1EC] px-3 py-2.5 text-[13px] text-[#0A5546]">
            <Check className="h-4 w-4 shrink-0" />
            <span><strong>{total}</strong> — same on the plan, the message and My trips</span>
          </div>

          {/* The message */}
          <section aria-labelledby="share-msg-title" className="space-y-2">
            <h3 id="share-msg-title" className="text-[13px] font-semibold text-[#55625E]">Message your group will see</h3>
            <div className="ml-auto max-w-[320px] rounded-[14px] rounded-br-[4px] bg-white border border-[#E2E6E1] px-3.5 py-3 text-[13px] leading-[19px] text-[#15201D] whitespace-pre-line">
              {message}
            </div>
            <div className="flex gap-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="share-whatsapp-btn"
                onClick={() => trackShareClicked({ destination: plan.destination, method: 'whatsapp' })}
                className="flex-1 h-[46px] rounded-xl bg-[#0E6B59] hover:bg-[#0A5546] text-white text-sm font-semibold flex items-center justify-center"
              >
                Send on WhatsApp
              </a>
              <button
                type="button"
                id="share-copy-btn"
                onClick={handleCopy}
                className="h-[46px] px-4 rounded-xl bg-white border border-[#0E6B59] text-[#0E6B59] text-sm font-semibold cursor-pointer"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </section>

          {/* My trips */}
          <section aria-labelledby="share-saved-title" className="space-y-2">
            <h3 id="share-saved-title" className="text-[13px] font-semibold text-[#55625E]">In My trips</h3>
            <article className="rounded-[14px] bg-white border border-[#E2E6E1] p-3.5 flex items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="text-[15px] font-bold text-[#15201D]">{place} · {plan.dates}</div>
                <div className="text-xs text-[#55625E]">{plan.travellers.total} {plan.travellers.total === 1 ? 'traveller' : 'travellers'}</div>
                {saveState === 'saved' ? (
                  <span className="inline-block text-[11px] font-bold rounded-full px-2 py-0.5 bg-[#E8ECF7] text-[#3B4E8C]">Saved · not booked</span>
                ) : (
                  <button
                    type="button"
                    onClick={onSaveTrip}
                    disabled={saveState === 'saving'}
                    className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-[#0E6B59] text-[13px] font-semibold text-[#0E6B59] bg-white hover:bg-[#E3F1EC] disabled:opacity-60 cursor-pointer"
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? "Couldn't save · Retry" : 'Save to My trips'}
                  </button>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-bold text-[#15201D] tabular-nums">{total}</div>
                {plan.travellers.total > 1 && <div className="text-xs text-[#55625E]">{each} each</div>}
              </div>
            </article>
          </section>

          {/* Booking hand-off */}
          <section aria-labelledby="share-book-title" className="space-y-2">
            <h3 id="share-book-title" className="text-[13px] font-semibold text-[#55625E]">Book where you trust · opens with your dates</h3>
            {links.map((k) => (
              <a
                key={k.what}
                href={k.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackBookOnClicked({ provider: k.kind === 'train' ? (/redbus/.test(k.url) ? 'redBus' : 'IRCTC') : 'MakeMyTrip', itemType: k.kind === 'hotel' ? 'hotel' : 'flight', url: k.url })}
                className="min-h-[52px] rounded-xl bg-white border border-[#E2E6E1] px-3.5 py-2 flex items-center justify-between gap-3 text-[#15201D] hover:border-[#0E6B59]/50"
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{k.what}</span>
                  <span className="text-xs text-[#55625E]">{k.where}</span>
                </span>
                <ArrowUpRight className="h-[18px] w-[18px] text-[#0E6B59] shrink-0" />
              </a>
            ))}
            <p className="text-xs text-[#55625E]">Prices on these sites can differ from our estimate. AeroDAG doesn't take bookings or payments.</p>
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
};
