import React, { useState } from 'react';
import { MapPin, Navigation, Utensils, ShoppingBag, PlusCircle, Star, ExternalLink, Sparkles, Building2 } from 'lucide-react';
import { getStayAreasForDestination, StayAreaInfo } from '../../../services/stayAreasData';

interface StayAreaMapCardProps {
  destination: string;
  tripNeeds?: string[];
  currentStayArea?: string;
  onSelectArea?: (areaName: string) => void;
  onPinHover?: (pinId: number) => void;
}

export const StayAreaMapCard: React.FC<StayAreaMapCardProps> = ({
  destination,
  tripNeeds = [],
  currentStayArea,
  onSelectArea,
  onPinHover
}) => {
  const wantsMedical = tripNeeds.includes('Medical care nearby');
  const allAreas = getStayAreasForDestination(destination);

  // If user selected "Medical care nearby", sort stay areas by hospital distance ascending
  const stayAreas = wantsMedical
    ? [...allAreas].sort((a, b) => a.medicalDistanceKm - b.medicalDistanceKm)
    : allAreas;

  const [selectedAreaId, setSelectedAreaId] = useState<string>(
    stayAreas.find((a) => (currentStayArea || '').toLowerCase().includes(a.name.toLowerCase()))?.id || stayAreas[0]?.id || ''
  );

  const activeArea = stayAreas.find((a) => a.id === selectedAreaId) || stayAreas[0];
  const cleanDestination = (destination || 'Goa').replace(/,.*$/, '').trim();

  return (
    <div
      id="stay-area-map-card"
      data-testid="stay-area-map-card"
      className="card-consumer p-4 sm:p-5 space-y-4 text-left border border-[#E2E6E1] bg-white rounded-2xl shadow-xs"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-[#E2E6E1]">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#0E6B59]" />
            <h3 className="text-sm sm:text-base font-bold text-[#15201D] font-heading">
              Stay Neighborhoods in {cleanDestination}
            </h3>
          </div>
          <p className="text-xs text-[#55625E] mt-0.5">
            2–3 areas compared by price, distance to sights and amenities.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {wantsMedical && (
            <span className="text-[10px] font-bold text-[#0A5546] bg-[#E3F1EC] border border-[#0E6B59]/30 px-2 py-0.5 rounded-full">
              Hospital priority
            </span>
          )}
          <span className="text-[10px] font-semibold text-[#55625E] bg-[#F5F6F3] px-2 py-0.5 rounded-full">
            AI estimate
          </span>
        </div>
      </div>

      {/* Interactive Map Preview with Numbered Pins */}
      <div className="relative w-full h-44 sm:h-52 bg-gradient-to-br from-[#EAF3EF] via-[#F4F9F7] to-[#E3EFEA] rounded-xl border border-[#CBD5E1] overflow-hidden flex items-center justify-center select-none">
        <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-stay-areas" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0E6B59" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-stay-areas)" />
        </svg>

        <div className="absolute top-2 left-3 text-[10px] font-bold text-[#0E6B59]/70 uppercase tracking-widest pointer-events-none">
          {cleanDestination} Stay Pins
        </div>

        {/* Numbered Pins matching cards */}
        {stayAreas.map((area) => {
          const isSelected = area.id === activeArea?.id;
          return (
            <div
              key={area.id}
              onClick={() => {
                setSelectedAreaId(area.id);
                if (onSelectArea) onSelectArea(area.name);
              }}
              onMouseEnter={() => onPinHover && onPinHover(area.pinNumber)}
              style={{ left: `${area.coordinates.x}%`, top: `${area.coordinates.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 z-10 flex flex-col items-center ${
                isSelected ? 'scale-110 z-20' : 'hover:scale-105'
              }`}
              title={`${area.name} — ${area.priceRangePerNightINR}`}
            >
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md transition-all ${
                  isSelected
                    ? 'bg-[#0E6B59] text-white ring-2 ring-white ring-offset-1'
                    : 'bg-white text-[#15201D] border border-[#CBD5E1]'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white/20 text-center leading-4 font-black">
                  {area.pinNumber}
                </span>
                <span>{area.name.split('/')[0].trim()}</span>
              </div>
              <span className="text-[9px] font-extrabold text-[#0E6B59] bg-white/95 px-1.5 py-0.2 rounded shadow-xs mt-0.5">
                {area.priceRangePerNightINR.split('–')[0].trim()}
              </span>
            </div>
          );
        })}
      </div>

      {/* 2-3 Stay Area Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stayAreas.map((area) => {
          const isSelected = area.id === activeArea?.id;
          const reviewsUrl = `https://www.google.com/search?q=${encodeURIComponent(area.name + ' ' + cleanDestination + ' reviews')}`;

          return (
            <div
              key={area.id}
              onClick={() => {
                setSelectedAreaId(area.id);
                if (onSelectArea) onSelectArea(area.name);
              }}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                isSelected
                  ? 'border-[#0E6B59] bg-[#F4F9F7] ring-1 ring-[#0E6B59] shadow-xs'
                  : 'border-[#E2E6E1] bg-white hover:border-[#0E6B59]/40'
              }`}
            >
              {/* Area Header */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0E6B59] bg-[#E3F1EC] px-2 py-0.5 rounded-full">
                    Pin {area.pinNumber} · {area.areaTypeLabel}
                  </span>
                  {wantsMedical && area.medicalDistanceKm <= 2.0 && (
                    <span className="text-[9px] font-bold text-[#0A5546] bg-[#D1FAE5] px-1.5 py-0.2 rounded">
                      Near Hospital
                    </span>
                  )}
                </div>

                <div className="text-sm font-bold text-[#15201D]">
                  {area.name}
                </div>

                <div className="text-xs font-black text-[#0E6B59]">
                  {area.priceRangePerNightINR} <span className="text-[10px] font-normal text-[#55625E]">/ night (estimate)</span>
                </div>
              </div>

              {/* Compact Chip Row: Food, Supermarket, Pharmacy distance */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-white border border-[#CBD5E1] text-[#15201D]">
                  <span>🍽️</span>
                  <span>{area.nearbyFoodSummary.split('·')[0].trim()}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-white border border-[#CBD5E1] text-[#15201D]">
                  <span>🛒</span>
                  <span>{area.nearbySupermarket.split('·')[0].trim()}</span>
                </span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                  wantsMedical ? 'bg-[#E3F1EC] border-[#0E6B59]/30 text-[#0A5546] font-bold' : 'bg-white border-[#CBD5E1] text-[#15201D]'
                }`}>
                  <span>💊</span>
                  <span>{area.nearbyMedical.split('·')[0].trim()}</span>
                </span>
              </div>

              {/* Tapping Rating Opens Google Reviews in New Tab */}
              <div className="pt-2 border-t border-[#E2E6E1]/70 flex items-center justify-between gap-2">
                <a
                  href={reviewsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-bold text-[#0E6B59] hover:underline flex items-center gap-1 min-h-[44px] py-1 cursor-pointer"
                  title="Open real reviews on Google in a new tab"
                >
                  <span>Read real reviews on Google</span>
                  <ExternalLink className="h-3 w-3" />
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedAreaId(area.id);
                    if (onSelectArea) onSelectArea(area.name);
                  }}
                  className={`min-h-[44px] px-3 py-1 rounded-lg text-xs font-bold transition ${
                    isSelected ? 'bg-[#0E6B59] text-white' : 'text-[#0E6B59] hover:bg-[#E3F1EC]'
                  }`}
                >
                  {isSelected ? 'Selected' : 'Pick Area'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
