import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  MapPin,
  ExternalLink,
  Search,
  BedDouble,
  FileText,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Utensils
} from 'lucide-react';
import { HotelItem, TransferItem } from '../../../types/travelBooking';
import { extractHotelReviews } from '../../../services/hotelReviewExtractor';

interface TrustAndVerificationCardProps {
  hotel: HotelItem;
  transfer?: TransferItem | null;
  trust?: unknown;
}

export const TrustAndVerificationCard: React.FC<TrustAndVerificationCardProps> = ({
  hotel,
  transfer
}) => {
  if (!hotel) return null;

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [isChecklistExpanded, setIsChecklistExpanded] = useState(false);

  // Extract authoritative outbound review links
  const reviewProfile = extractHotelReviews(hotel, hotel.city);
  const cleanName = reviewProfile.cleanName;

  // The 4 pre-booking checks (ground-floor rooms, cancellation, breakfast, family bed capacity)
  const checklistItems = [
    {
      id: 'bed-capacity',
      icon: <BedDouble className="h-4 w-4 text-[#0E6B59] shrink-0" />,
      title: 'Confirm room type & family bed capacity',
      desc: 'Verify king bed + extra rollaway or twin bedding policy before booking.',
      actionLabel: 'Verify Room',
      url: reviewProfile.externalLinks.bookingComUrl
    },
    {
      id: 'ground-floor',
      icon: <MapPin className="h-4 w-4 text-[#0E6B59] shrink-0" />,
      title: 'Confirm ground-floor or lift access',
      desc: 'Ensure step-free access for elders, prams or heavy luggage.',
      actionLabel: 'Maps & Access',
      url: reviewProfile.externalLinks.googleMapsReviewsUrl
    },
    {
      id: 'breakfast',
      icon: <Utensils className="h-4 w-4 text-[#0E6B59] shrink-0" />,
      title: 'Confirm breakfast inclusion',
      desc: 'Check if daily morning breakfast is included in room tariff.',
      actionLabel: 'Hotel Details',
      url: reviewProfile.externalLinks.makeMyTripUrl
    },
    {
      id: 'cancellation',
      icon: <FileText className="h-4 w-4 text-[#0E6B59] shrink-0" />,
      title: 'Confirm cancellation rules',
      desc: 'Double-check free cancellation cut-offs and refund terms.',
      actionLabel: 'TripAdvisor Check',
      url: reviewProfile.externalLinks.tripAdvisorUrl
    }
  ];

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div
      id="trust-and-verification-card"
      data-testid="trust-and-verification-card"
      className="card-consumer p-4 sm:p-5 text-left border border-[#E2E6E1] bg-white rounded-2xl shadow-xs space-y-4"
    >
      {/* Header: Hotel details */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E6E1]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#E3F1EC] text-[#0E6B59]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#15201D] font-heading flex items-center gap-2">
              <span>{cleanName}</span>
            </h3>
            <p className="text-xs text-[#55625E]">
              {reviewProfile.fullLocation}
            </p>
          </div>
        </div>
      </div>

      {/* Section: Read real reviews (4 Outbound search links) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#15201D] flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-[#0E6B59]" />
            <span>Read real reviews</span>
          </h4>
          <span className="text-[11px] text-[#55625E]">
            Opens live external reviews in new tab
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <a
            href={reviewProfile.externalLinks.googleMapsReviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-white hover:border-[#0E6B59] transition flex items-center justify-between group shadow-2xs cursor-pointer min-h-[44px]"
            title="Read Google Maps Reviews"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-base">📍</span>
              <div className="text-left truncate">
                <div className="text-xs font-bold text-[#15201D] truncate group-hover:text-[#0E6B59]">Google Maps</div>
                <div className="text-[10px] text-[#55625E]">Guest reviews</div>
              </div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-[#55625E] group-hover:text-[#0E6B59] shrink-0" />
          </a>

          <a
            href={reviewProfile.externalLinks.tripAdvisorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-white hover:border-[#0E6B59] transition flex items-center justify-between group shadow-2xs cursor-pointer min-h-[44px]"
            title="Read TripAdvisor Reviews"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-base">🦉</span>
              <div className="text-left truncate">
                <div className="text-xs font-bold text-[#15201D] truncate group-hover:text-[#0E6B59]">TripAdvisor</div>
                <div className="text-[10px] text-[#55625E]">Ranked & rated</div>
              </div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-[#55625E] group-hover:text-[#0E6B59] shrink-0" />
          </a>

          <a
            href={reviewProfile.externalLinks.bookingComUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-white hover:border-[#0E6B59] transition flex items-center justify-between group shadow-2xs cursor-pointer min-h-[44px]"
            title="Read Booking.com Reviews"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-base">🏨</span>
              <div className="text-left truncate">
                <div className="text-xs font-bold text-[#15201D] truncate group-hover:text-[#0E6B59]">Booking.com</div>
                <div className="text-[10px] text-[#55625E]">Guest reviews</div>
              </div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-[#55625E] group-hover:text-[#0E6B59] shrink-0" />
          </a>

          <a
            href={reviewProfile.externalLinks.makeMyTripUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-white hover:border-[#0E6B59] transition flex items-center justify-between group shadow-2xs cursor-pointer min-h-[44px]"
            title="Read MakeMyTrip Reviews"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-base">✈️</span>
              <div className="text-left truncate">
                <div className="text-xs font-bold text-[#15201D] truncate group-hover:text-[#0E6B59]">MakeMyTrip</div>
                <div className="text-[10px] text-[#55625E]">Traveller ratings</div>
              </div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-[#55625E] group-hover:text-[#0E6B59] shrink-0" />
          </a>
        </div>
      </div>

      {/* Pre-Booking 4 Checklist Items (Collapsible) */}
      <div className="pt-2 border-t border-[#E2E6E1]">
        <div
          onClick={() => setIsChecklistExpanded(!isChecklistExpanded)}
          className="flex items-center justify-between cursor-pointer select-none py-1"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#15201D]">4 Pre-Booking Checks</span>
            <span className="text-[10px] font-semibold text-[#0E6B59] bg-[#E3F1EC] px-2 py-0.5 rounded-full">
              {checkedCount}/4 verified
            </span>
          </div>
          <button
            type="button"
            className="text-[#55625E] hover:text-[#0E6B59] text-xs font-semibold flex items-center gap-1"
            aria-expanded={isChecklistExpanded}
            aria-label={isChecklistExpanded ? 'Hide checklist' : 'Show checklist'}
          >
            <span>{isChecklistExpanded ? 'Hide' : 'Checklist'}</span>
            {isChecklistExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {isChecklistExpanded && (
          <div className="space-y-1.5 pt-2 animate-fade-in">
            {checklistItems.map((item) => {
              const isChecked = Boolean(checkedItems[item.id]);

              return (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isChecked
                      ? 'bg-[#F4F9F7] border-[#0E6B59]/30 text-[#0E6B59]'
                      : 'bg-[#FAFCFA] border-[#E2E6E1] text-[#15201D] hover:border-[#0E6B59]/40'
                  }`}
                >
                  <div
                    onClick={() => toggleCheck(item.id)}
                    className="flex items-center gap-2.5 flex-1 cursor-pointer select-none"
                  >
                    <button
                      type="button"
                      className="text-[#0E6B59] focus:outline-hidden"
                      aria-label={`Toggle check for ${item.title}`}
                    >
                      {isChecked ? (
                        <CheckSquare className="h-4 w-4 stroke-[2.5]" />
                      ) : (
                        <Square className="h-4 w-4 text-[#CBD5E1]" />
                      )}
                    </button>
                    <div>
                      <div className={`text-xs font-bold ${isChecked ? 'line-through text-[#55625E]' : ''}`}>
                        {item.title}
                      </div>
                      <div className="text-[10px] text-[#55625E]">
                        {item.desc}
                      </div>
                    </div>
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-[#0E6B59] bg-[#E3F1EC] hover:bg-[#0E6B59] hover:text-white px-2 py-1 rounded-md transition flex items-center gap-1 shrink-0"
                  >
                    <span>{item.actionLabel}</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
