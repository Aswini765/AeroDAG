import React, { useState } from 'react';
import {
  Building,
  MapPin,
  Star,
  CheckCircle2,
  Users,
  Coffee,
  Check,
  ArrowRight,
  Filter,
  ShieldCheck
} from 'lucide-react';
import { HotelItem, Currency } from '../../types/travelBooking';
import { MOCK_HOTELS_VIETNAM } from '../../services/travelCatalog';

interface HotelResultsViewProps {
  selectedHotel: HotelItem;
  onSelectHotel: (hotel: HotelItem) => void;
  currency: Currency;
  onContinueToItinerary?: () => void;
}

export const HotelResultsView: React.FC<HotelResultsViewProps> = ({
  selectedHotel,
  onSelectHotel,
  currency,
  onContinueToItinerary
}) => {
  const [filterTag, setFilterTag] = useState<string>('ALL');

  const filteredHotels = filterTag === 'ALL'
    ? MOCK_HOTELS_VIETNAM
    : MOCK_HOTELS_VIETNAM.filter((h) => h.tag === filterTag || (filterTag === 'BREAKFAST' && h.breakfastIncluded));

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Search Header Summary */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Building className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white">
              Stays in Hanoi Old Quarter (Hoan Kiem)
            </h1>
            <p className="text-xs text-slate-400">
              10 Nights &bull; 4 Guests (2 Adults, 2 Children) &bull; Verified Family Suite Bedding
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onContinueToItinerary && (
            <button
              onClick={onContinueToItinerary}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <span>View Full Trip & Itinerary</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 flex items-center gap-1 font-mono text-[11px] uppercase mr-1">
          <Filter className="h-3.5 w-3.5" /> Filter Stays:
        </span>
        {[
          { id: 'ALL', label: 'All Stays (3)' },
          { id: 'Best Match', label: 'Best Match' },
          { id: 'Family-Friendly', label: 'Family-Friendly' },
          { id: 'Luxury Splurge', label: 'Luxury Splurge' }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterTag(f.id)}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              filterTag === f.id
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Hotel Cards List */}
      <div className="space-y-5">
        {filteredHotels.map((hotel) => {
          const isSelected = selectedHotel.id === hotel.id;
          const displayNightlyRate = currency === 'INR' ? `₹${hotel.pricePerNightINR.toLocaleString()}` : `$${hotel.pricePerNightUSD}`;
          const displayTotalPrice = currency === 'INR' ? `₹${hotel.totalPriceINR.toLocaleString()}` : `$${hotel.totalPriceUSD}`;

          return (
            <div
              key={hotel.id}
              className={`rounded-2xl border transition overflow-hidden grid grid-cols-1 md:grid-cols-12 ${
                isSelected
                  ? 'bg-slate-900 border-teal-500/60 shadow-lg shadow-teal-500/10 ring-1 ring-teal-500/40'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Hotel Photo */}
              <div className="md:col-span-4 relative min-h-[190px] md:min-h-full">
                <img
                  src={hotel.imageUrl}
                  alt={hotel.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-md text-[11px] font-mono text-emerald-300 border border-slate-700">
                  {hotel.starRating}★ Hotel
                </div>
                {hotel.tag && (
                  <div className="absolute bottom-3 left-3 bg-teal-600/90 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded shadow">
                    {hotel.tag}
                  </div>
                )}
              </div>

              {/* Hotel Info & Room Details */}
              <div className="md:col-span-8 p-5 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                    <div>
                      <h2 className="text-base font-bold text-white leading-tight">
                        {hotel.name}
                      </h2>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{hotel.area} &bull; {hotel.distanceFromCenter}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <div className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30">
                        {hotel.reviewScore} / 5.0
                      </div>
                      <span className="text-[10px] text-slate-400">({hotel.reviewsCount} reviews)</span>
                    </div>
                  </div>

                  {/* Guaranteed Room Capacity & Bed Layout */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{hotel.roomType}</span>
                      <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> 4 Guests Guaranteed
                      </span>
                    </div>
                    <div className="text-[11px] text-teal-300 font-mono">
                      {hotel.bedConfiguration}
                    </div>
                  </div>

                  {/* Amenities Badges */}
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-300">
                    {hotel.breakfastIncluded && (
                      <span className="px-2 py-0.5 rounded bg-slate-850 border border-slate-800 flex items-center gap-1 text-emerald-300">
                        <Coffee className="h-3 w-3" /> Free Buffet Breakfast for 4
                      </span>
                    )}
                    {hotel.amenities.slice(1, 4).map((a, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-850 border border-slate-800 text-slate-400">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Price & Selection Button */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-bold font-mono text-emerald-400">{displayNightlyRate}</span>
                      <span className="text-xs text-slate-400">/ night</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block font-mono">
                      Total for 10 nights: <strong className="text-white">{displayTotalPrice}</strong> (all taxes included)
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectHotel(hotel)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                      isSelected
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm cursor-default'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="h-4 w-4 text-teal-400" />
                        <span>Selected for Trip</span>
                      </>
                    ) : (
                      <span>Select this Hotel</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
