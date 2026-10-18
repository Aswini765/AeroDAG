import React from 'react';
import { MapPin, Utensils, ShoppingBag, PlusCircle, Compass, ExternalLink } from 'lucide-react';

interface NearbyAmenitiesCardProps {
  stayArea: string;
  destination: string;
  hotelName?: string;
  isVegetarian?: boolean;
  tripNeeds?: string[];
}

export const NearbyAmenitiesCard: React.FC<NearbyAmenitiesCardProps> = ({
  stayArea,
  destination,
  hotelName,
  isVegetarian = false,
  tripNeeds = []
}) => {
  const wantsVeg = isVegetarian || tripNeeds.includes('Vegetarian food nearby');
  const hasKids = tripNeeds.includes('Travelling with kids');
  const hasElderly = tripNeeds.includes('Elderly / less walking');

  const cleanDestination = (destination || 'Goa').replace(/,.*$/, '').trim();
  const cleanArea = (stayArea || cleanDestination).replace(/,.*$/, '').trim();
  const mapsSearchQuery = encodeURIComponent(`${cleanArea} ${cleanDestination}`);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsSearchQuery}`;

  return (
    <div className="card-consumer p-4 sm:p-5 space-y-4 text-left border border-[#E2E6E1] bg-white rounded-2xl shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E2E6E1]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#0E6B59]" />
            <h3 className="text-sm sm:text-base font-bold text-[#15201D] font-heading">
              What’s Near Your Stay ({cleanArea})
            </h3>
          </div>
          <p className="text-xs text-[#55625E]">
            Walking distances and neighborhood conveniences around {hotelName || 'your accommodation'}.
          </p>
        </div>
        <span className="text-[10px] font-semibold text-[#55625E] bg-[#F0F4F2] px-2.5 py-1 rounded-full self-start sm:self-auto">
          Sample · check on Google Maps
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Dining */}
        <div className="p-3 rounded-xl border border-[#E2E6E1] bg-[#F9FAF9] space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-[#15201D]">
            <Utensils className="h-3.5 w-3.5 text-[#0E6B59]" />
            <span>Restaurants & Dining</span>
            {wantsVeg && (
              <span className="text-[10px] bg-[#E3F1EC] text-[#0A5546] font-semibold px-1.5 py-0.2 rounded">
                Pure Veg
              </span>
            )}
          </div>
          <div className="space-y-1.5 text-[11px] text-[#55625E]">
            {wantsVeg ? (
              <>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-[#15201D]">Anand Pure Veg & South Indian</span>
                  <span className="text-[#0E6B59] font-medium shrink-0">300m · 4 min walk</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-[#15201D]">Shree Krishna Sagar Thali</span>
                  <span className="text-[#0E6B59] font-medium shrink-0">650m · 8 min walk</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-[#15201D]">Local Coastal & Family Bistro</span>
                  <span className="text-[#0E6B59] font-medium shrink-0">350m · 5 min walk</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-[#15201D]">Navtara Pure Veg & Indian</span>
                  <span className="text-[#0E6B59] font-medium shrink-0">700m · 9 min walk</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Supermarket */}
        <div className="p-3 rounded-xl border border-[#E2E6E1] bg-[#F9FAF9] space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-[#15201D]">
            <ShoppingBag className="h-3.5 w-3.5 text-[#0E6B59]" />
            <span>Supermarket & Essentials</span>
            {hasKids && (
              <span className="text-[10px] bg-[#E3F1EC] text-[#0A5546] font-semibold px-1.5 py-0.2 rounded">
                Kid supplies
              </span>
            )}
          </div>
          <div className="space-y-1.5 text-[11px] text-[#55625E]">
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-[#15201D]">Neighborhood Daily Market (Fruits, Milk, Snacks)</span>
              <span className="text-[#0E6B59] font-medium shrink-0">250m · 3 min walk</span>
            </div>
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-[#15201D]">Reliance Smart / Local Supermarket</span>
              <span className="text-[#0E6B59] font-medium shrink-0">600m · 7 min walk</span>
            </div>
          </div>
        </div>

        {/* Pharmacy & Hospital */}
        <div className="p-3 rounded-xl border border-[#E2E6E1] bg-[#F9FAF9] space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-[#15201D]">
            <PlusCircle className="h-3.5 w-3.5 text-[#0E6B59]" />
            <span>Pharmacy & Medical</span>
            {hasElderly && (
              <span className="text-[10px] bg-[#E3F1EC] text-[#0A5546] font-semibold px-1.5 py-0.2 rounded">
                Easy access
              </span>
            )}
          </div>
          <div className="space-y-1.5 text-[11px] text-[#55625E]">
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-[#15201D]">24x7 Apollo / MedPlus Chemist</span>
              <span className="text-[#0E6B59] font-medium shrink-0">450m · 6 min walk</span>
            </div>
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-[#15201D]">District Care Hospital / Clinic</span>
              <span className="text-[#0E6B59] font-medium shrink-0">1.8 km · 6 min drive</span>
            </div>
          </div>
        </div>

        {/* Sights */}
        <div className="p-3 rounded-xl border border-[#E2E6E1] bg-[#F9FAF9] space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-[#15201D]">
            <Compass className="h-3.5 w-3.5 text-[#0E6B59]" />
            <span>Main Sights & Promenade</span>
          </div>
          <div className="space-y-1.5 text-[11px] text-[#55625E]">
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-[#15201D]">Beach / Promenade / Main Square</span>
              <span className="text-[#0E6B59] font-medium shrink-0">800m · 10 min walk</span>
            </div>
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-[#15201D]">Historic Fort / Estate Viewpoint</span>
              <span className="text-[#0E6B59] font-medium shrink-0">2.5 km · 8 min auto</span>
            </div>
          </div>
        </div>
      </div>

      {/* External Map Action */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-[11px] text-[#55625E]">
          Distances are estimated from central {cleanArea}. Check exact real-time walking routes.
        </span>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary min-h-[44px] w-full sm:w-auto px-4 py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5 text-[#0E6B59] border-[#0E6B59]/30 hover:border-[#0E6B59]"
        >
          <span>Open in Google Maps</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
};
