import React, { useMemo, useState } from 'react';
import { Navigation, ExternalLink, BedDouble } from 'lucide-react';
import { ActivityDayItem } from '../../../types/travelBooking';
import { mapStopsForDay, dayRouteUrl, dayEmbedUrl, MapStop } from '../../../services/itineraryText';
import { PlacePhoto } from './PlacePhoto';

interface UnifiedPlanMapProps {
  destination: string;
  stayArea?: string;
  itinerary?: ActivityDayItem[];
  className?: string;
  /** kept for compatibility with older callers */
  activePin?: number | null;
  onSelectPin?: (pinNumber: number) => void;
  /** Follow the day picked in "Day by day" (index into itinerary) */
  dayIndex?: number;
  onDayChange?: (index: number) => void;
}

/** Google's supported Maps Embed API key (no charge for embeds). Optional. */
const EMBED_KEY: string = (() => {
  try { return String((import.meta as any).env?.VITE_GOOGLE_MAPS_EMBED_KEY || '').trim(); } catch { return ''; }
})();

/**
 * "Map of your days": where you stay, and the real places of each day.
 * Pick a day, tap a stop to see it on the map, or open the whole day's route in Google Maps.
 * Stops are place names taken from the day plan — never sentences, never invented times.
 */
export const UnifiedPlanMap: React.FC<UnifiedPlanMapProps> = ({
  destination,
  stayArea,
  itinerary = [],
  className = '',
  dayIndex,
  onDayChange
}) => {
  const where = (destination || '').replace(/,.*$/, '').trim();
  const stay = (stayArea || where).replace(/,.*$/, '').trim();

  const days = useMemo(
    () => itinerary.map((d) => ({ day: d.day, stops: mapStopsForDay(d, destination) })),
    [itinerary, destination]
  );
  const firstDayWithStops = Math.max(0, days.findIndex((d) => d.stops.length > 0));
  const [ownIdx, setOwnIdx] = useState(firstDayWithStops);
  const dayIdx = typeof dayIndex === 'number' && dayIndex >= 0 && dayIndex < days.length ? dayIndex : ownIdx;
  const pickDay = (i: number) => { setOwnIdx(i); onDayChange?.(i); setFocus(null); };
  const [focus, setFocus] = useState<MapStop | null>(null);

  const current = days[dayIdx] || { day: 1, stops: [] as MapStop[] };
  const embedUrl = dayEmbedUrl(current.stops, destination, stayArea || stay, focus, EMBED_KEY);
  const routeUrl = dayRouteUrl(current.stops, destination, stayArea || stay);

  return (
    <section
      id="plan-map"
      aria-labelledby="plan-map-title"
      className="bg-white text-left space-y-3"
    >
      <div className="px-1">
        <h3 id="plan-map-title" className="text-sm font-bold text-[#15201D]">Map of your days</h3>
        <p className="text-xs text-[#55625E]">
          {EMBED_KEY
            ? <>Day {current.day}'s drive from your stay in {stay} through each place. Tap a place to zoom in.</>
            : <>Tap a place to see it on the map. For the whole day's route, use the button below.</>}
        </p>
      </div>

      {days.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Pick a day">
          {days.map((d, i) => (
            <button
              key={d.day}
              type="button"
              role="tab"
              aria-selected={i === dayIdx}
              onClick={() => pickDay(i)}
              className={`h-9 px-3 rounded-lg text-xs font-bold shrink-0 cursor-pointer ${i === dayIdx ? 'bg-[#0E6B59] text-white' : 'bg-[#F5F6F3] text-[#55625E]'}`}
            >
              Day {d.day}
            </button>
          ))}
        </div>
      )}

      <div className={`relative rounded-xl overflow-hidden border border-[#E2E6E1] bg-[#EEF1EC] ${className}`}>
        <iframe
          key={embedUrl}
          src={embedUrl}
          title={`Map: ${focus ? focus.name : `Day ${current.day} from your stay in ${stay}`}`}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <ol className="space-y-2">
        <li>
          <button
            type="button"
            onClick={() => setFocus(null)}
            className={`w-full flex items-center gap-3 rounded-xl border p-2 text-left cursor-pointer ${focus === null ? 'border-[#0E6B59] bg-[#F4F9F7]' : 'border-[#E2E6E1] bg-white'}`}
          >
            <span className="h-12 w-12 rounded-lg bg-[#E3F1EC] flex items-center justify-center shrink-0">
              <BedDouble className="h-5 w-5 text-[#0E6B59]" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-[#15201D]">Your stay · {stay}</span>
              <span className="block text-xs text-[#55625E]">Start and end of each day</span>
            </span>
          </button>
        </li>
        {current.stops.map((s, i) => (
          <li key={s.name}>
            <button
              type="button"
              onClick={() => setFocus(s)}
              className={`w-full flex items-center gap-3 rounded-xl border p-2 text-left cursor-pointer ${focus?.name === s.name ? 'border-[#0E6B59] bg-[#F4F9F7]' : 'border-[#E2E6E1] bg-white'}`}
            >
              <span className="relative h-12 w-12 rounded-lg overflow-hidden shrink-0 bg-[#EEF1EC] flex items-center justify-center">
                <span className="text-xs font-bold text-[#0E6B59]">{i + 1}</span>
                <PlacePhoto place={s.name} destination={where} className="absolute inset-0" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#15201D]">{i + 1}. {s.name}</span>
                <span className="block text-xs text-[#55625E]">Day {current.day} · show on map</span>
              </span>
            </button>
          </li>
        ))}
        {current.stops.length === 0 && (
          <li className="text-xs text-[#55625E] px-1">Day {current.day} is a travel or rest day — no sightseeing stops.</li>
        )}
      </ol>

      <a
        href={routeUrl}
        target="_blank"
        rel="noopener noreferrer"
        id="open-map-day-route"
        className="min-h-[44px] w-full rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border border-[#0E6B59] text-[#0E6B59] bg-white hover:bg-[#E3F1EC]"
      >
        <Navigation className="h-4 w-4" />
        {current.stops.length > 0 ? `Open Day ${current.day} route in Google Maps (${current.stops.length} stop${current.stops.length > 1 ? 's' : ''})` : `Open ${where} in Google Maps`}
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </section>
  );
};
