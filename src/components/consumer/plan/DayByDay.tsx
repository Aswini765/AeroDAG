import React, { useState } from 'react';
import {
  Footprints,
  Clock,
  Car,
  Sparkles,
  Navigation,
  ExternalLink,
  MapPin,
  ArrowUpDown,
  Trash2,
  Star
} from 'lucide-react';
import { ActivityDayItem } from '../../../types/travelBooking';

interface DayByDayProps {
  itinerary: ActivityDayItem[];
  destination?: string;
  stayArea?: string;
  onAdjustDay?: (dayNumber: number, type: 'relaxed' | 'food' | 'budget') => void;
  onCardFocus?: (pinNumber: number) => void;
}

const STOP_PHOTOS = {
  morning: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80',
  afternoon: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80',
  evening: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80'
};

export const DayByDay: React.FC<DayByDayProps> = ({
  itinerary,
  destination,
  stayArea,
  onAdjustDay,
  onCardFocus
}) => {
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [activeStopId, setActiveStopId] = useState<string>('morning');
  const [removedStops, setRemovedStops] = useState<Record<string, boolean>>({});

  if (!itinerary || itinerary.length === 0) {
    return null;
  }

  const currentDay = itinerary[activeDayIdx] || itinerary[0];
  const cleanDestination = (destination || 'Goa').replace(/,.*$/, '').trim();
  const cleanStay = (stayArea || cleanDestination).replace(/,.*$/, '').trim();

  // Extract ordered stops for this day
  const rawMorningStop = {
    id: 'morning',
    pinNumber: 1,
    timeSlot: 'Morning',
    name: (currentDay.morning.split(/[.:]/)[0] || 'Morning Discovery').slice(0, 32),
    description: currentDay.morning,
    rating: 4.6,
    costINR: Math.round((currentDay.estimatedCostINR || 1200) * 0.35),
    travelTimeToNext: currentDay.stopDriveTimes?.[0]?.note || '15 min drive · 4.2 km',
    coordinates: { x: 30, y: 32 },
    photoUrl: STOP_PHOTOS.morning
  };

  const rawAfternoonStop = {
    id: 'afternoon',
    pinNumber: 2,
    timeSlot: 'Afternoon',
    name: (currentDay.afternoon.split(/[.:]/)[0] || 'Afternoon Highlights').slice(0, 32),
    description: currentDay.afternoon,
    rating: 4.5,
    costINR: Math.round((currentDay.estimatedCostINR || 1200) * 0.40),
    travelTimeToNext: currentDay.stopDriveTimes?.[1]?.note || '20 min drive · 6.5 km',
    coordinates: { x: 70, y: 45 },
    photoUrl: STOP_PHOTOS.afternoon
  };

  const rawEveningStop = {
    id: 'evening',
    pinNumber: 3,
    timeSlot: 'Evening',
    name: (currentDay.evening.split(/[.:]/)[0] || 'Sunset & Dinner').slice(0, 32),
    description: currentDay.evening,
    rating: 4.7,
    costINR: Math.round((currentDay.estimatedCostINR || 1200) * 0.25),
    travelTimeToNext: `15 min drive back to ${cleanStay}`,
    coordinates: { x: 45, y: 78 },
    photoUrl: STOP_PHOTOS.evening
  };

  const [order, setOrder] = useState<('morning' | 'afternoon' | 'evening')[]>(['morning', 'afternoon', 'evening']);

  const allStops = order.map((key, idx) => {
    const raw = key === 'morning' ? rawMorningStop : key === 'afternoon' ? rawAfternoonStop : rawEveningStop;
    return { ...raw, pinNumber: idx + 1 };
  });

  const activeStops = allStops.filter((s) => !removedStops[`${currentDay.day}-${s.id}`]);
  const activeStop = activeStops.find((s) => s.id === activeStopId) || activeStops[0] || allStops[0];

  const handleSwap = (idx1: number, idx2: number) => {
    if (idx1 < 0 || idx2 < 0 || idx1 >= order.length || idx2 >= order.length) return;
    const nextOrder = [...order];
    const temp = nextOrder[idx1];
    nextOrder[idx1] = nextOrder[idx2];
    nextOrder[idx2] = temp;
    setOrder(nextOrder);
  };

  const handleRemove = (stopId: string) => {
    setRemovedStops((prev) => ({
      ...prev,
      [`${currentDay.day}-${stopId}`]: true
    }));
  };

  // Build multi-stop Google Maps directions URL for turn-by-turn navigation
  const originQuery = encodeURIComponent(`${cleanStay} ${cleanDestination}`);
  const stop1Query = encodeURIComponent(`${rawMorningStop.description.slice(0, 35).replace(/[.,]/g, '')} ${cleanDestination}`);
  const stop2Query = encodeURIComponent(`${rawAfternoonStop.description.slice(0, 35).replace(/[.,]/g, '')} ${cleanDestination}`);
  const stop3Query = encodeURIComponent(`${rawEveningStop.description.slice(0, 35).replace(/[.,]/g, '')} ${cleanDestination}`);
  const googleMapsRouteUrl = `https://www.google.com/maps/dir/?api=1&origin=${originQuery}&destination=${stop3Query}&waypoints=${stop1Query}%7C${stop2Query}&travelmode=driving`;

  return (
    <div
      id="day-by-day-card"
      data-testid="day-by-day-card"
      className="card-consumer p-4 sm:p-5 space-y-4 text-left border border-[#E2E6E1] bg-white rounded-2xl shadow-xs"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E2E6E1]">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#15201D] font-heading">
            Day by day Plan & Route Map
          </h2>
          <div className="text-xs text-[#55625E]">
            Ordered stops with travel time between each. Feeds into food & transit budget.
          </div>
        </div>

        {/* Walking level badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F6F3] border border-[#E2E6E1] text-xs font-semibold text-[#15201D]">
            <Footprints className="h-3.5 w-3.5 text-[#0E6B59]" />
            <span className="capitalize">{currentDay.walkingLevel || 'Light'} walking</span>
          </div>
        </div>
      </div>

      {/* Day Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {itinerary.map((dayItem, idx) => {
          const isActive = idx === activeDayIdx;
          return (
            <button
              key={dayItem.day}
              type="button"
              onClick={() => {
                setActiveDayIdx(idx);
                setActiveStopId('morning');
              }}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-[#0E6B59] text-white shadow-xs'
                  : 'bg-[#F5F6F3] text-[#55625E] hover:text-[#15201D] hover:bg-[#E2E6E1]'
              }`}
            >
              Day {dayItem.day}
            </button>
          );
        })}
      </div>

      {/* Day Overview Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-[#F6F8F6] border border-[#0E6B59]/20">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[#15201D] font-heading">
            Day {currentDay.day} · {(currentDay.title || '').replace(/^Day\s*\d+\s*[:·\-–—]\s*/i, '').trim()}
          </h3>
          {currentDay.dateStr && !/^day\s*\d+$/i.test(currentDay.dateStr.trim()) && (
            <div className="text-xs font-semibold text-[#0E6B59]">
              {currentDay.dateStr}
            </div>
          )}
        </div>
        <div className="text-left sm:text-right">
          <div className="text-[10px] text-[#55625E]">Estimated Day Cost</div>
          <div className="text-xs sm:text-sm font-extrabold text-[#0E6B59]">
            ₹{(currentDay.estimatedCostINR || 1200).toLocaleString('en-IN')}{' '}
            <span className="text-[10px] font-normal text-[#55625E]">· feeds into food & transit budget</span>
          </div>
        </div>
      </div>

      {/* Day Map Canvas with Numbered Pins */}
      <div className="relative w-full h-44 sm:h-52 bg-gradient-to-br from-[#EAF3EF] via-[#F4F9F7] to-[#E3EFEA] rounded-xl border border-[#CBD5E1] overflow-hidden select-none flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="day-route-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#0E6B59" strokeWidth="0.6" strokeOpacity="0.25" />
            </pattern>
            <marker id="route-arrow-pt" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#0E6B59" />
            </marker>
          </defs>
          <rect width="100%" height="100%" fill="url(#day-route-grid)" />
          <path
            d="M 30 32 Q 50 30, 70 45 T 45 78"
            fill="none"
            stroke="#0E6B59"
            strokeWidth="2.5"
            strokeDasharray="4 3"
            markerEnd="url(#route-arrow-pt)"
            className="opacity-80"
          />
        </svg>

        <div className="absolute top-2 left-3 text-[10px] font-bold text-[#0E6B59] bg-white/90 px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          <span>Base: {cleanStay}</span>
        </div>

        {/* Numbered Pins */}
        {activeStops.map((stop) => {
          const isSelected = stop.id === activeStopId;
          return (
            <div
              key={stop.id}
              onClick={() => {
                setActiveStopId(stop.id);
                if (onCardFocus) onCardFocus(stop.pinNumber);
              }}
              style={{ left: `${stop.coordinates.x}%`, top: `${stop.coordinates.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 z-10 flex flex-col items-center ${
                isSelected ? 'scale-125 z-20' : 'hover:scale-110'
              }`}
              title={`${stop.name} · ${stop.timeSlot}`}
            >
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center font-black text-xs shadow-md transition-all ${
                  isSelected
                    ? 'bg-[#0E6B59] text-white ring-4 ring-[#0E6B59]/30 ring-offset-2'
                    : 'bg-white text-[#0E6B59] border-2 border-[#0E6B59]'
                }`}
              >
                {stop.pinNumber}
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded mt-0.5 shadow-xs whitespace-nowrap ${
                isSelected ? 'bg-[#0E6B59] text-white' : 'bg-white/90 text-[#15201D]'
              }`}>
                {stop.timeSlot}
              </span>
            </div>
          );
        })}
      </div>

      {/* 3 COMPACT CARDS (Morning, Afternoon, Evening) */}
      <div className="space-y-3">
        {activeStops.map((stop, idx) => {
          const isSelected = stop.id === activeStopId;
          return (
            <div
              key={stop.id}
              onClick={() => {
                setActiveStopId(stop.id);
                if (onCardFocus) onCardFocus(stop.pinNumber);
              }}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                isSelected
                  ? 'border-[#0E6B59] bg-[#F4F9F7] ring-1 ring-[#0E6B59] shadow-xs'
                  : 'border-[#E2E6E1] bg-white hover:border-[#0E6B59]/40 hover:bg-[#FAFCFA]'
              }`}
            >
              {/* Left: Photo + Name + Rating */}
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16 rounded-xl bg-[#E2E6E1] overflow-hidden shrink-0">
                  <img
                    src={stop.photoUrl}
                    alt={stop.name}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 text-[8px] font-bold px-1 rounded bg-white/90 text-[#15201D]">
                    Sample
                  </span>
                  <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-[#0E6B59] text-white font-bold text-[10px] flex items-center justify-center">
                    {stop.pinNumber}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0E6B59] bg-[#E3F1EC] px-1.5 py-0.2 rounded">
                      {stop.timeSlot}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-[#15201D]">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span>{stop.rating}★</span>
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm font-bold text-[#15201D] line-clamp-1">
                    {stop.name}
                  </div>

                  {/* Travel time to next stop */}
                  <div className="flex items-center gap-1 text-[11px] text-[#55625E]">
                    <Car className="h-3 w-3 text-[#0E6B59] shrink-0" />
                    <span>travelTimeToNext: <strong>{stop.travelTimeToNext}</strong></span>
                  </div>
                </div>
              </div>

              {/* Right: Cost + Swap & Remove Buttons (>= 44px tap targets) */}
              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E2E6E1]/60">
                <div className="text-left sm:text-right">
                  <div className="text-[10px] text-[#55625E]">Cost</div>
                  <div className="text-xs font-black text-[#0E6B59]">
                    ₹{stop.costINR.toLocaleString('en-IN')}{' '}
                    <span className="text-[10px] font-normal text-[#55625E]">· est</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Swap Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const targetIdx = idx === activeStops.length - 1 ? 0 : idx + 1;
                      handleSwap(idx, targetIdx);
                    }}
                    className="min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-white hover:border-[#0E6B59] hover:bg-[#E3F1EC] text-[#15201D] text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    title="Swap with next stop"
                    aria-label="Swap order"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5 text-[#0E6B59]" />
                    <span className="hidden sm:inline">Swap</span>
                  </button>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(stop.id);
                    }}
                    className="min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-white hover:border-[#DC2626] hover:bg-[#FEE2E2] text-[#DC2626] text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    title="Remove stop"
                    aria-label="Remove stop"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-[#DC2626]" />
                    <span className="hidden sm:inline">Remove</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SINGLE "OPEN IN GOOGLE MAPS" BUTTON */}
      <div className="pt-2 border-t border-[#E2E6E1]/70">
        <a
          href={googleMapsRouteUrl}
          target="_blank"
          rel="noopener noreferrer"
          id="open-day-route-in-google-maps"
          className="btn-primary min-h-[44px] w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-all hover:shadow-md cursor-pointer"
          title="Open Day route in Google Maps"
        >
          <Navigation className="h-4 w-4" />
          <span>Open Day {currentDay.day} Route in Google Maps</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
};
