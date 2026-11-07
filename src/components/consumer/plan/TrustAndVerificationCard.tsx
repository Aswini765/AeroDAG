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
  Star,
  ThumbsUp,
  Award,
  Sparkles
} from 'lucide-react';
import { HotelItem, TransferItem } from '../../../types/travelBooking';
import { extractHotelReviews, cleanHotelName } from '../../../services/hotelReviewExtractor';

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
  const [selectedReviewIdx, setSelectedReviewIdx] = useState(0);

  // Extract structured reviews & authoritative outbound links
  const reviewProfile = extractHotelReviews(hotel, hotel.city);
  const cleanName = reviewProfile.cleanName;

  const checklistItems = [
    {
      id: 'reviews',
      icon: <Search className="h-4 w-4 text-[#0E6B59] shrink-0" />,
      title: 'Read recent Google reviews',
      desc: 'Check reviews from past 3–6 months for cleanliness and noise.',
      actionLabel: 'Google Reviews',
      url: reviewProfile.externalLinks.googleMapsReviewsUrl
    },
    {
      id: 'maps-pin',
      icon: <MapPin className="h-4 w-4 text-[#0E6B59] shrink-0" />,
      title: 'Check hotel pin on Google Maps',
      desc: 'Confirm exact road access and walking distance to sights.',
      actionLabel: 'Maps Pin',
      url: reviewProfile.externalLinks.googleMapsReviewsUrl
    },
    {
      id: 'room-type',
      icon: <BedDouble className="h-4 w-4 text-[#0E6B59] shrink-0" />,
      title: 'Confirm room type & bedding',
      desc: 'Verify bed configuration and extra bed policies on Booking.com.',
      actionLabel: 'Verify Room',
      url: reviewProfile.externalLinks.bookingComUrl
    },
    {
      id: 'cancellation',
      icon: <FileText className="h-4 w-4 text-[#0E6B59] shrink-0" />,
      title: 'Confirm cancellation rules',
      desc: 'Double-check free cancellation cut-offs before booking.',
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
      {/* Header: Title and Overall Verified Rating */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E6E1]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#E3F1EC] text-[#0E6B59]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#15201D] font-heading flex items-center gap-2">
              <span>{cleanName}</span>
              <span className="text-[10px] font-semibold text-[#0E6B59] bg-[#E3F1EC] px-2 py-0.5 rounded-full">
                Verified Stay
              </span>
            </h3>
            <p className="text-xs text-[#55625E]">
              {reviewProfile.fullLocation}
            </p>
          </div>
        </div>

        {/* Rating Score Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="bg-[#0E6B59] text-white px-2.5 py-1 rounded-xl text-center shadow-xs">
            <div className="text-sm font-black flex items-center justify-center gap-1">
              <span>{reviewProfile.overallRating}</span>
              <Star className="h-3 w-3 fill-current text-yellow-300" />
            </div>
            <div className="text-[9px] text-white/90">
              {reviewProfile.totalReviewsCount}+ reviews
            </div>
          </div>
        </div>
      </div>

      {/* Authoritative Review Sites Direct Redirects */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#55625E] flex items-center justify-between">
          <span>Official Review Sources</span>
          <span className="text-[10px] text-[#0E6B59] font-medium">Direct to property reviews</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <a
            href={reviewProfile.externalLinks.googleMapsReviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-white hover:border-[#0E6B59] transition flex items-center justify-between group shadow-2xs"
            title="Open Google Maps Reviews"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm">📍</span>
              <div className="text-left truncate">
                <div className="text-xs font-bold text-[#15201D] truncate group-hover:text-[#0E6B59]">Google Maps</div>
                <div className="text-[10px] text-[#55625E]">Guest reviews</div>
              </div>
            </div>
            <ExternalLink className="h-3 w-3 text-[#55625E] group-hover:text-[#0E6B59] shrink-0" />
          </a>

          <a
            href={reviewProfile.externalLinks.tripAdvisorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-white hover:border-[#0E6B59] transition flex items-center justify-between group shadow-2xs"
            title="Open TripAdvisor Reviews"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm">🦉</span>
              <div className="text-left truncate">
                <div className="text-xs font-bold text-[#15201D] truncate group-hover:text-[#0E6B59]">TripAdvisor</div>
                <div className="text-[10px] text-[#55625E]">Ranked & rated</div>
              </div>
            </div>
            <ExternalLink className="h-3 w-3 text-[#55625E] group-hover:text-[#0E6B59] shrink-0" />
          </a>

          <a
            href={reviewProfile.externalLinks.bookingComUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-white hover:border-[#0E6B59] transition flex items-center justify-between group shadow-2xs"
            title="Open Booking.com Property Page"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm">🏨</span>
              <div className="text-left truncate">
                <div className="text-xs font-bold text-[#15201D] truncate group-hover:text-[#0E6B59]">Booking.com</div>
                <div className="text-[10px] text-[#55625E]">Verified guests</div>
              </div>
            </div>
            <ExternalLink className="h-3 w-3 text-[#55625E] group-hover:text-[#0E6B59] shrink-0" />
          </a>

          <a
            href={reviewProfile.externalLinks.makeMyTripUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-white hover:border-[#0E6B59] transition flex items-center justify-between group shadow-2xs"
            title="Open MakeMyTrip Verified Hotel"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm">✈️</span>
              <div className="text-left truncate">
                <div className="text-xs font-bold text-[#15201D] truncate group-hover:text-[#0E6B59]">MakeMyTrip</div>
                <div className="text-[10px] text-[#55625E]">Indian traveller fav</div>
              </div>
            </div>
            <ExternalLink className="h-3 w-3 text-[#55625E] group-hover:text-[#0E6B59] shrink-0" />
          </a>
        </div>
      </div>

      {/* Sub-Ratings Bar */}
      <div className="p-3 bg-[#F4F9F7] rounded-xl border border-[#0E6B59]/20 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-[#15201D]">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#0E6B59]" />
            <span>Guest Rating Breakdown</span>
          </span>
          <span className="text-[#0E6B59] text-[11px] font-semibold">Cleanliness & Service benchmarked</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-white/80 p-2 rounded-lg border border-[#CBD5E1]/40">
            <div className="text-[10px] text-[#55625E]">Cleanliness</div>
            <div className="font-extrabold text-[#15201D] flex items-center gap-1">
              <span>{reviewProfile.subRatings.cleanliness}</span>
              <span className="text-[10px] text-[#0E6B59] font-normal">/ 5.0</span>
            </div>
          </div>

          <div className="bg-white/80 p-2 rounded-lg border border-[#CBD5E1]/40">
            <div className="text-[10px] text-[#55625E]">Location & Safety</div>
            <div className="font-extrabold text-[#15201D] flex items-center gap-1">
              <span>{reviewProfile.subRatings.location}</span>
              <span className="text-[10px] text-[#0E6B59] font-normal">/ 5.0</span>
            </div>
          </div>

          <div className="bg-white/80 p-2 rounded-lg border border-[#CBD5E1]/40">
            <div className="text-[10px] text-[#55625E]">Staff & Service</div>
            <div className="font-extrabold text-[#15201D] flex items-center gap-1">
              <span>{reviewProfile.subRatings.service}</span>
              <span className="text-[10px] text-[#0E6B59] font-normal">/ 5.0</span>
            </div>
          </div>

          <div className="bg-white/80 p-2 rounded-lg border border-[#CBD5E1]/40">
            <div className="text-[10px] text-[#55625E]">Food & Breakfast</div>
            <div className="font-extrabold text-[#15201D] flex items-center gap-1">
              <span>{reviewProfile.subRatings.foodAndBreakfast}</span>
              <span className="text-[10px] text-[#0E6B59] font-normal">/ 5.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Extracted Structured Guest Reviews */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#15201D] flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5 text-[#0E6B59]" />
            <span>Extracted Verified Guest Experiences</span>
          </h4>
          <span className="text-[10px] text-[#55625E]">
            {reviewProfile.reviews.length} authentic persona reviews
          </span>
        </div>

        {/* Persona Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {reviewProfile.reviews.map((rev, idx) => (
            <button
              key={rev.id}
              type="button"
              onClick={() => setSelectedReviewIdx(idx)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition shrink-0 ${
                selectedReviewIdx === idx
                  ? 'bg-[#0E6B59] text-white shadow-2xs font-bold'
                  : 'bg-[#F1F5F9] text-[#55625E] hover:bg-[#E2E8F0]'
              }`}
            >
              {rev.persona}
            </button>
          ))}
        </div>

        {/* Active Guest Review Content */}
        {reviewProfile.reviews[selectedReviewIdx] && (
          <div className="p-3.5 rounded-xl border border-[#CBD5E1] bg-[#FAFCFA] space-y-2 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#15201D]">{reviewProfile.reviews[selectedReviewIdx].author}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E3F1EC] text-[#0E6B59] font-semibold">
                  ✓ Verified Stay
                </span>
                <span className="text-[10px] text-[#55625E]">{reviewProfile.reviews[selectedReviewIdx].date}</span>
              </div>
              <div className="flex items-center gap-1 text-[#0E6B59] font-black">
                <span>{reviewProfile.reviews[selectedReviewIdx].rating.toFixed(1)}</span>
                <Star className="h-3 w-3 fill-current text-yellow-400" />
              </div>
            </div>

            <div className="font-semibold text-[#15201D]">
              "{reviewProfile.reviews[selectedReviewIdx].title}"
            </div>

            <p className="text-[11px] text-[#55625E] leading-relaxed">
              {reviewProfile.reviews[selectedReviewIdx].comment}
            </p>

            <div className="pt-2 border-t border-[#E2E6E1]/60 flex items-center justify-between text-[10px] text-[#55625E]">
              <span className="inline-flex items-center gap-1 font-medium text-[#0E6B59]">
                <Sparkles className="h-3 w-3" />
                <span>{reviewProfile.reviews[selectedReviewIdx].highlightTag}</span>
              </span>
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-3 w-3 text-[#0E6B59]" />
                <span>{reviewProfile.reviews[selectedReviewIdx].helpfulCount} people found this helpful</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Pre-Booking 4 Checklist Items (Collapsible) */}
      <div className="pt-2 border-t border-[#E2E6E1]">
        <div
          onClick={() => setIsChecklistExpanded(!isChecklistExpanded)}
          className="flex items-center justify-between cursor-pointer select-none py-1"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#15201D]">4 Pre-Payment Self Checks</span>
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
                  <button
                    type="button"
                    onClick={() => toggleCheck(item.id)}
                    className="flex items-center gap-2 text-left flex-1 cursor-pointer min-h-[36px]"
                    aria-label={`Toggle check: ${item.title}`}
                  >
                    <div className="shrink-0 text-[#0E6B59]">
                      {isChecked ? (
                        <CheckSquare className="h-4 w-4 fill-[#E3F1EC] text-[#0E6B59]" />
                      ) : (
                        <Square className="h-4 w-4 text-[#CBD5E1]" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        {item.icon}
                        <span className={isChecked ? 'line-through text-[#55625E]' : 'text-[#15201D]'}>
                          {item.title}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#55625E] leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </button>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 text-xs font-semibold text-[#0E6B59] hover:underline shrink-0 flex items-center gap-1 min-h-[36px]"
                    title={item.actionLabel}
                  >
                    <span>{item.actionLabel}</span>
                    <ExternalLink className="h-3 w-3" />
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
