import React from 'react';
import { MapPin, Navigation, ExternalLink, Compass } from 'lucide-react';
import { ActivityDayItem } from '../../../types/travelBooking';

interface UnifiedPlanMapProps {
  destination: string;
  stayArea?: string;
  activePin?: number | null;
  onSelectPin?: (pinNumber: number) => void;
  dayStops?: {
    pinNumber: number;
    title: string;
    timeSlot: string;
    coordinates: { x: number; y: number };
  }[];
  activeDayNumber?: number;
  googleMapsUrl?: string;
  className?: string;
}

export const UnifiedPlanMap: React.FC<UnifiedPlanMapProps> = ({
  destination,
  stayArea,
  activePin = 1,
  onSelectPin,
  dayStops = [
    { pinNumber: 1, title: 'Morning Exploration', timeSlot: '09:30 AM', coordinates: { x: 30, y: 35 } },
    { pinNumber: 2, title: 'Afternoon Highlights', timeSlot: '02:00 PM', coordinates: { x: 68, y: 44 } },
    { pinNumber: 3, title: 'Sunset & Dinner', timeSlot: '06:30 PM', coordinates: { x: 46, y: 76 } }
  ],
  activeDayNumber = 1,
  googleMapsUrl,
  className = ''
}) => {
  const cleanDest = (destination || 'Goa').replace(/,.*$/, '').trim();
  const cleanStay = (stayArea || cleanDest).replace(/,.*$/, '').trim();

  const defaultMapsUrl = googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanStay + ' ' + cleanDest)}`;

  return (
    <div
      id="unified-plan-map-container"
      className={`relative w-full rounded-2xl border border-[#CBD5E1] bg-gradient-to-br from-[#EAF3EF] via-[#F4F9F7] to-[#E3EFEA] overflow-hidden shadow-xs flex flex-col justify-between ${className}`}
    >
      {/* Top Map Bar */}
      <div className="absolute top-2.5 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full shadow-xs border border-[#CBD5E1]/60 pointer-events-auto">
          <Compass className="h-3.5 w-3.5 text-[#0E6B59]" />
          <span className="text-[11px] font-bold text-[#15201D]">{cleanDest} Route Map</span>
          <span className="text-[10px] text-[#55625E]">· Day {activeDayNumber}</span>
        </div>

        <a
          href={defaultMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white/95 hover:bg-white text-[#0E6B59] hover:text-[#0A5546] px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs border border-[#CBD5E1]/60 flex items-center gap-1 pointer-events-auto cursor-pointer transition"
          title="Open Google Maps"
        >
          <span>Map</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* SVG Canvas with Topo Grid & Connecting Route Lines */}
      <div className="relative w-full h-full flex-1 min-h-[200px]">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="unified-map-grid" width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#0E6B59" strokeWidth="0.6" strokeOpacity="0.2" />
            </pattern>
            <marker id="map-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#0E6B59" />
            </marker>
          </defs>
          <rect width="100%" height="100%" fill="url(#unified-map-grid)" />

          {/* Dotted Route Curve from Stop 1 to Stop 2 to Stop 3 */}
          <path
            d="M 30 35 Q 50 32, 68 44 T 46 76"
            fill="none"
            stroke="#0E6B59"
            strokeWidth="2.5"
            strokeDasharray="4 3"
            markerEnd="url(#map-arrow)"
            className="opacity-75"
          />
        </svg>

        {/* Base Stay Marker */}
        <div className="absolute top-12 left-4 z-10">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-white/90 text-[#0E6B59] px-2 py-0.5 rounded-md shadow-xs border border-[#CBD5E1]/70">
            <MapPin className="h-2.5 w-2.5" />
            <span>Stay: {cleanStay}</span>
          </span>
        </div>

        {/* Numbered Pins (Match Cards) */}
        {dayStops.map((stop) => {
          const isSelected = activePin === stop.pinNumber;
          return (
            <div
              key={stop.pinNumber}
              onClick={() => onSelectPin && onSelectPin(stop.pinNumber)}
              style={{ left: `${stop.coordinates.x}%`, top: `${stop.coordinates.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 z-10 flex flex-col items-center ${
                isSelected ? 'scale-125 z-30' : 'hover:scale-110'
              }`}
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

      {/* Bottom Route Indicator */}
      <div className="p-2 bg-white/85 backdrop-blur-xs border-t border-[#CBD5E1]/60 flex items-center justify-between text-[11px] text-[#55625E]">
        <div className="flex items-center gap-1.5 font-medium">
          <Navigation className="h-3 w-3 text-[#0E6B59]" />
          <span>Tapping cards centres map pins</span>
        </div>
        <span className="font-semibold text-[#0E6B59]">~15–20m between stops</span>
      </div>
    </div>
  );
};
