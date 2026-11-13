import React, { useState } from 'react';
import { Car, Navigation, ExternalLink, Footprints, Utensils } from 'lucide-react';
import { ActivityDayItem } from '../../../types/travelBooking';
import { cleanDayText, mapStopsForDay, dayRouteUrl } from '../../../services/itineraryText';
import { PlacePhoto } from './PlacePhoto';

interface DayByDayProps {
  itinerary: ActivityDayItem[];
  destination?: string;
  stayArea?: string;
  onAdjustDay?: (dayNumber: number, type: 'relaxed' | 'food' | 'budget') => void;
  onCardFocus?: (pinNumber: number) => void;
  /** Tell the map which day is showing (index into itinerary) */
  onDayChange?: (index: number) => void;
}

/**
 * Day by day — a plain timeline. No made-up per-stop prices or fake maps:
 * money lives in the cost breakdown above; travel times only appear when we
 * actually have them.
 */
export const DayByDay: React.FC<DayByDayProps> = ({
  itinerary,
  destination,
  stayArea,
  onCardFocus,
  onDayChange
}) => {
  const [activeDayIdx, setActiveDayIdxRaw] = useState(0);
  const setActiveDayIdx = (i: number) => { setActiveDayIdxRaw(i); onDayChange?.(i); };
  const [showAllDays, setShowAllDays] = useState(false);

  if (!itinerary || itinerary.length === 0) {
    return null;
  }

  const currentDay = itinerary[activeDayIdx] || itinerary[0];
  const cleanDestination = (destination || '').replace(/,.*$/, '').trim();
  const cleanStay = (stayArea || cleanDestination).replace(/,.*$/, '').trim();

  const stops = [
    { id: 'morning', timeSlot: 'Morning', description: cleanDayText(currentDay.morning), travelTimeToNext: currentDay.stopDriveTimes?.[0]?.note },
    { id: 'afternoon', timeSlot: 'Afternoon', description: cleanDayText(currentDay.afternoon), travelTimeToNext: currentDay.stopDriveTimes?.[1]?.note },
    { id: 'evening', timeSlot: 'Evening', description: cleanDayText(currentDay.evening), travelTimeToNext: undefined as string | undefined }
  ]
    .filter((s) => (s.description || '').trim().length > 0)
    .map((s, idx) => ({ ...s, pinNumber: idx + 1 }));

  // Google Maps directions through the day's real places (names, not sentences)
  const dayStops = mapStopsForDay(currentDay, destination || cleanDestination);
  const googleMapsRouteUrl = dayRouteUrl(dayStops, destination || cleanDestination, stayArea || cleanStay);

  const dayTitle = (currentDay.title || '').replace(/^Day\s*\d+\s*[:·\-–—]\s*/i, '').trim();
  const showDate = currentDay.dateStr && !/^day\s*\d+$/i.test(currentDay.dateStr.trim());

  // Compact first: Day 1 as a short list, then "See days 2–N"
  if (!showAllDays) {
    const day1 = itinerary[0];
    const day1Title = (day1.title || '').replace(/^Day\s*\d+\s*[:·\-–—]\s*/i, '').trim();
    const day1Items = [day1.morning, day1.afternoon, day1.evening].map(cleanDayText).filter((t) => t.length > 0);
    return (
      <section
        id="day-by-day-card"
        data-testid="day-by-day-card"
        aria-labelledby="day-by-day-title"
        className="rounded-[14px] bg-white border border-[#E2E6E1] p-3.5 space-y-2.5 text-left"
      >
        <h2 id="day-by-day-title" className="text-[15px] font-bold text-[#15201D]">
          Day 1{day1Title ? ` · ${day1Title}` : ''}
        </h2>
        <ul className="list-disc pl-[18px] text-sm leading-[21px] text-[#15201D] space-y-1">
          {day1Items.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
        {(() => {
          const stops1 = mapStopsForDay(day1, destination || '');
          const where = (destination || '').replace(/,.*$/, '').trim();
          return stops1.length > 0 ? (
            <>
              <div className="flex gap-2 overflow-x-auto scrollbar-none">
                {stops1.map((st) => (
                  <PlacePhoto key={st.name} place={st.name} destination={where} label={st.name} showCredit className="h-24 w-40 shrink-0 rounded-xl" />
                ))}
              </div>
              <a
                href={dayRouteUrl(stops1, destination || '', stayArea)}
                target="_blank"
                rel="noopener noreferrer"
                id="open-day-route-in-google-maps"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0E6B59] hover:underline"
              >
                <Navigation className="h-3.5 w-3.5" />
                Open Day 1 in Google Maps ({stops1.map((x) => x.name).join(' → ')})
              </a>
            </>
          ) : null;
        })()}
        <p className="text-xs text-[#55625E]">Tickets, food and local cabs are already in the total above.</p>
        {itinerary.length > 1 && (
          <button
            type="button"
            onClick={() => { setShowAllDays(true); setActiveDayIdx(1); }}
            className="h-10 px-3 rounded-[10px] border border-[#D5D3CA] bg-white text-[13px] font-semibold text-[#0E6B59] hover:bg-[#E3F1EC] cursor-pointer"
          >
            {itinerary.length === 2 ? "See day 2" : `See days 2–${itinerary.length}`}
          </button>
        )}
      </section>
    );
  }

  return (
    <div
      id="day-by-day-card"
      data-testid="day-by-day-card"
      className="card-consumer p-4 sm:p-5 space-y-4 text-left border border-[#E2E6E1] bg-white rounded-2xl shadow-xs"
    >
      <div>
        <h2 className="text-base sm:text-lg font-bold text-[#15201D] font-heading">Day by day</h2>
        <p className="text-xs text-[#55625E]">
          What you’ll do each day. The cost of tickets, food and local cabs is already in the total above.
        </p>
      </div>

      {/* Day tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" role="tablist">
        {itinerary.map((dayItem, idx) => {
          const isActive = idx === activeDayIdx;
          return (
            <button
              key={dayItem.day}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveDayIdx(idx)}
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

      {/* Day heading */}
      <div>
        <h3 className="text-sm sm:text-base font-bold text-[#15201D] font-heading">
          Day {currentDay.day}{dayTitle ? ` · ${dayTitle}` : ''}
        </h3>
        <div className="text-xs text-[#55625E] flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
          {showDate && <span className="font-semibold text-[#0E6B59]">{currentDay.dateStr}</span>}
          {currentDay.walkingLevel && (
            <span className="inline-flex items-center gap-1">
              <Footprints className="h-3.5 w-3.5 text-[#0E6B59]" />
              <span className="capitalize">{currentDay.walkingLevel} walking</span>
            </span>
          )}
        </div>
        {currentDay.walkingFlag && (
          <p className="text-xs text-[#8A4307] mt-1">{currentDay.walkingFlag}</p>
        )}
      </div>

      {/* Timeline */}
      <ol className="relative border-l-2 border-[#E2E6E1] ml-3 space-y-4">
        {stops.map((stop) => (
          <li
            key={stop.id}
            className="pl-5 relative"
            onClick={() => onCardFocus && onCardFocus(stop.pinNumber)}
          >
            <span className="absolute -left-[13px] top-0 h-6 w-6 rounded-full bg-[#0E6B59] text-white text-[11px] font-bold flex items-center justify-center">
              {stop.pinNumber}
            </span>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#0E6B59]">{stop.timeSlot}</div>
            <p className="text-sm text-[#15201D] leading-relaxed">{stop.description}</p>
            {stop.travelTimeToNext && (
              <div className="flex items-center gap-1 text-xs text-[#55625E] mt-1">
                <Car className="h-3.5 w-3.5 text-[#0E6B59] shrink-0" />
                <span>Then: {stop.travelTimeToNext}</span>
              </div>
            )}
          </li>
        ))}
      </ol>

      {currentDay.localDining && currentDay.localDining.length > 0 && (
        <div className="text-xs text-[#55625E] flex items-start gap-1.5">
          <Utensils className="h-3.5 w-3.5 text-[#0E6B59] shrink-0 mt-0.5" />
          <span><strong className="text-[#15201D]">Where to eat:</strong> {currentDay.localDining.slice(0, 3).join(' · ')}</span>
        </div>
      )}

      {currentDay.dayNote && (
        <p className="text-xs text-[#9A4A00] bg-[#FFF8EC] rounded-lg px-2.5 py-1.5">Good to know: {currentDay.dayNote}</p>
      )}

      {dayStops.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {dayStops.map((st) => (
            <PlacePhoto key={st.name} place={st.name} destination={cleanDestination} label={st.name} showCredit className="h-24 w-40 shrink-0 rounded-xl" />
          ))}
        </div>
      )}

      <a
        href={googleMapsRouteUrl}
        target="_blank"
        rel="noopener noreferrer"
        id="open-day-route-in-google-maps"
        className="min-h-[44px] w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border border-[#0E6B59] text-[#0E6B59] bg-white hover:bg-[#E3F1EC] transition cursor-pointer"
        title="Open this day's route in Google Maps"
      >
        <Navigation className="h-4 w-4" />
        <span>{dayStops.length > 0 ? `Open Day ${currentDay.day} in Google Maps (${dayStops.length} stop${dayStops.length > 1 ? 's' : ''})` : `Open ${cleanDestination} in Google Maps`}</span>
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
};
