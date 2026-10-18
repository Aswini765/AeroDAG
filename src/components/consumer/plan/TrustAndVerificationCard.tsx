import React from 'react';
import {
  CheckSquare,
  MapPin,
  ExternalLink,
  Search,
  BedDouble,
  FileText
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

  const hotelQuery = `${hotel.name} ${hotel.area || hotel.city || ''}`.trim();
  const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotelQuery)}`;
  const reviewsSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${hotelQuery} reviews`)}`;
  const roomTypesSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${hotelQuery} room types amenities`)}`;
  const cancellationSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${hotelQuery} cancellation policy refund`)}`;

  const checklistItems = [
    {
      id: 'reviews',
      icon: <Search className="h-4 w-4 text-[#0E6B59] shrink-0 mt-0.5" />,
      title: 'Read recent Google reviews',
      desc: 'Check reviews from the last 3–6 months for cleanliness, hot water, and noise levels.',
      actionLabel: 'Search reviews on Google',
      url: reviewsSearchUrl
    },
    {
      id: 'maps-pin',
      icon: <MapPin className="h-4 w-4 text-[#0E6B59] shrink-0 mt-0.5" />,
      title: 'Check the hotel pin on Google Maps',
      desc: 'Confirm the exact road access, neighborhood, and walking distance to sights.',
      actionLabel: 'Open in Google Maps',
      url: mapsSearchUrl
    },
    {
      id: 'room-type',
      icon: <BedDouble className="h-4 w-4 text-[#0E6B59] shrink-0 mt-0.5" />,
      title: 'Confirm the room type',
      desc: 'Verify bed configuration, extra bed policies for children, and elevator access on your booking site.',
      actionLabel: 'Search room details',
      url: roomTypesSearchUrl
    },
    {
      id: 'cancellation',
      icon: <FileText className="h-4 w-4 text-[#0E6B59] shrink-0 mt-0.5" />,
      title: 'Confirm cancellation rules',
      desc: 'Double-check free cancellation cut-off dates and payment terms before booking.',
      actionLabel: 'Search cancellation rules',
      url: cancellationSearchUrl
    }
  ];

  return (
    <div className="card-consumer p-5 sm:p-6 space-y-4 text-left border-[#E2E6E1] bg-white rounded-2xl shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E6E1]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E3F1EC] text-[#0E6B59] uppercase tracking-wider">
              Booking Advice
            </span>
            <span className="text-xs text-[#55625E]">· Honest checklist</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#15201D] font-heading">
            Before you book, check
          </h3>
        </div>
        <span className="text-xs text-[#55625E]">
          Self-check before making payment
        </span>
      </div>

      {/* Checklist Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {checklistItems.map((item) => (
          <div
            key={item.id}
            className="p-3.5 rounded-xl border border-[#E2E6E1] bg-[#F9FAF9] flex flex-col justify-between space-y-2.5"
          >
            <div className="space-y-1">
              <div className="flex items-start gap-2">
                {item.icon}
                <div className="font-bold text-xs text-[#15201D] leading-tight">
                  {item.title}
                </div>
              </div>
              <p className="text-[11px] text-[#55625E] leading-relaxed pl-6">
                {item.desc}
              </p>
            </div>

            <div className="pl-6 pt-1">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0E6B59] hover:underline"
              >
                <span>{item.actionLabel}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
