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
  ShieldCheck
} from 'lucide-react';
import { HotelItem, TransferItem } from '../../../types/travelBooking';

interface TrustAndVerificationCardProps {
  hotel: HotelItem;
  transfer?: TransferItem | null;
  trust?: unknown;
}

export const TrustAndVerificationCard: React.FC<TrustAndVerificationCardProps> = ({
  hotel
}) => {
  if (!hotel) return null;

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [isExpanded, setIsExpanded] = useState(false);

  const hotelQuery = `${hotel.name} ${hotel.area || hotel.city || ''}`.trim();
  const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotelQuery)}`;
  const reviewsSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${hotelQuery} reviews`)}`;
  const roomTypesSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${hotelQuery} room types amenities`)}`;
  const cancellationSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${hotelQuery} cancellation policy refund`)}`;

  const checklistItems = [
    {
      id: 'reviews',
      icon: <Search className="h-4 w-4 text-[#0E6B59] shrink-0" />,
      title: 'Read recent Google reviews',
      desc: 'Check reviews from past 3–6 months for cleanliness and noise.',
      actionLabel: 'Search Google reviews',
      url: reviewsSearchUrl
    },
    {
      id: 'maps-pin',
      icon: <MapPin className="h-4 w-4 text-[#0E6B59] shrink-0" />,
      title: 'Check the hotel pin on Google Maps',
      desc: 'Confirm exact road access and walking distance to sights.',
      actionLabel: 'Check Google Maps pin',
      url: mapsSearchUrl
    },
    {
      id: 'room-type',
      icon: <BedDouble className="h-4 w-4 text-[#0E6B59] shrink-0" />,
      title: 'Confirm room type & bedding',
      desc: 'Verify bed configuration and extra bed policies for children.',
      actionLabel: 'Verify room details',
      url: roomTypesSearchUrl
    },
    {
      id: 'cancellation',
      icon: <FileText className="h-4 w-4 text-[#0E6B59] shrink-0" />,
      title: 'Confirm cancellation rules',
      desc: 'Double-check free cancellation cut-offs before booking.',
      actionLabel: 'Check cancellation terms',
      url: cancellationSearchUrl
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
    <div className="card-consumer p-4 sm:p-5 text-left border border-[#E2E6E1] bg-white rounded-2xl shadow-xs space-y-3">
      {/* Collapsed Header / Toggle */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 text-[#0E6B59]" />
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#15201D] font-heading flex items-center gap-2">
              <span>Before you book</span>
              <span className="text-[10px] font-semibold text-[#0E6B59] bg-[#E3F1EC] px-2 py-0.5 rounded-full">
                {checkedCount}/4 verified
              </span>
            </h3>
            <p className="text-xs text-[#55625E]">
              4 quick self-checks before payment on partner sites
            </p>
          </div>
        </div>

        <button
          type="button"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#55625E] hover:text-[#0E6B59]"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse checklist' : 'Expand checklist'}
        >
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>

      {/* 4 Collapsed Tick Items with Icons */}
      <div className={`space-y-2 pt-1 border-t border-[#E2E6E1]/60 ${isExpanded ? 'block' : 'space-y-1.5'}`}>
        {checklistItems.map((item) => {
          const isChecked = Boolean(checkedItems[item.id]);

          return (
            <div
              key={item.id}
              className={`p-2.5 sm:p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                isChecked
                  ? 'bg-[#F4F9F7] border-[#0E6B59]/30 text-[#0E6B59]'
                  : 'bg-[#FAFCFA] border-[#E2E6E1] text-[#15201D] hover:border-[#0E6B59]/40'
              }`}
            >
              {/* Tappable Checkbox + Title */}
              <button
                type="button"
                onClick={() => toggleCheck(item.id)}
                className="flex items-center gap-2.5 text-left flex-1 min-h-[44px] cursor-pointer"
                aria-label={`Toggle check: ${item.title}`}
              >
                <div className="shrink-0 text-[#0E6B59]">
                  {isChecked ? (
                    <CheckSquare className="h-5 w-5 fill-[#E3F1EC] text-[#0E6B59]" />
                  ) : (
                    <Square className="h-5 w-5 text-[#CBD5E1]" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    {item.icon}
                    <span className={isChecked ? 'line-through text-[#55625E]' : 'text-[#15201D]'}>
                      {item.title}
                    </span>
                  </div>
                  {isExpanded && (
                    <p className="text-[11px] text-[#55625E] leading-relaxed pl-5">
                      {item.desc}
                    </p>
                  )}
                </div>
              </button>

              {/* Action Link (New Tab) */}
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] min-w-[44px] px-2.5 py-1 text-xs font-semibold text-[#0E6B59] hover:underline shrink-0 flex items-center justify-center gap-1"
                title={item.actionLabel}
              >
                <span className="hidden sm:inline">{item.actionLabel}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
};
