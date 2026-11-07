import React, { useState } from 'react';
import { MapPin, Navigation, ExternalLink, Compass, Layers, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { ActivityDayItem } from '../../../types/travelBooking';

interface DayStop {
  pinNumber: number;
  title: string;
  timeSlot: string;
  coordinates: { x: number; y: number };
}

interface UnifiedPlanMapProps {
  destination: string;
  stayArea?: string;
  activePin?: number | null;
  onSelectPin?: (pinNumber: number) => void;
  dayStops?: DayStop[];
  activeDayNumber?: number;
  googleMapsUrl?: string;
  className?: string;
  itinerary?: ActivityDayItem[];
}

export const UnifiedPlanMap: React.FC<UnifiedPlanMapProps> = ({
  destination,
  stayArea,
  activePin = 1,
  onSelectPin,
  dayStops: customDayStops,
  activeDayNumber = 1,
  googleMapsUrl,
  className = '',
  itinerary
}) => {
  const [activeTab, setActiveTab] = useState<'google' | 'route'>('google');
  const [zoomLevel, setZoomLevel] = useState<number>(14); // 12: city, 14: area, 16: street
  const [selectedPinInternal, setSelectedPinInternal] = useState<number>(activePin ?? 1);

  const cleanDest = (destination || 'Goa').replace(/,.*$/, '').trim();
  const cleanStay = (stayArea || cleanDest).replace(/,.*$/, '').trim();

  // If full itinerary is provided, extract real day stops for the active day
  const effectiveStops: DayStop[] = React.useMemo(() => {
    if (customDayStops && customDayStops.length > 0) {
      return customDayStops;
    }

    if (itinerary && itinerary.length > 0) {
      const dayData = itinerary[Math.min(activeDayNumber - 1, itinerary.length - 1)] || itinerary[0];
      const morningName = (dayData.morning.split(/[.:]/)[0] || 'Morning Highlights').slice(0, 30);
      const afternoonName = (dayData.afternoon.split(/[.:]/)[0] || 'Afternoon Sights').slice(0, 30);
      const eveningName = (dayData.evening.split(/[.:]/)[0] || 'Sunset & Dining').slice(0, 30);

      return [
        { pinNumber: 1, title: morningName, timeSlot: '09:30 AM · Morning', coordinates: { x: 30, y: 35 } },
        { pinNumber: 2, title: afternoonName, timeSlot: '02:00 PM · Afternoon', coordinates: { x: 68, y: 44 } },
        { pinNumber: 3, title: eveningName, timeSlot: '06:30 PM · Evening', coordinates: { x: 46, y: 76 } }
      ];
    }

    return [
      { pinNumber: 1, title: 'Morning Exploration', timeSlot: '09:30 AM · Morning', coordinates: { x: 30, y: 35 } },
      { pinNumber: 2, title: 'Afternoon Highlights', timeSlot: '02:00 PM · Afternoon', coordinates: { x: 68, y: 44 } },
      { pinNumber: 3, title: 'Sunset & Dinner', timeSlot: '06:30 PM · Evening', coordinates: { x: 46, y: 76 } }
    ];
  }, [customDayStops, itinerary, activeDayNumber]);

  // Track active pin
  const currentPin = activePin ?? selectedPinInternal;

  // Compute map center query based on selected pin or stay area
  const activeStop = effectiveStops.find((s) => s.pinNumber === currentPin);
  const activeQuery = currentPin === 0 || !activeStop
    ? `${cleanStay}, ${cleanDest}`
    : `${activeStop.title}, ${cleanStay}, ${cleanDest}`;

  // Google Maps Zero-Key Embed URL
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(activeQuery)}&t=&z=${zoomLevel}&ie=UTF8&iwloc=&output=embed`;

  // External live Google Maps URL
  const defaultMapsUrl = googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeQuery)}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeQuery)}`;

  const handleSelectPin = (pinNum: number) => {
    setSelectedPinInternal(pinNum);
    if (onSelectPin) {
      onSelectPin(pinNum);
    }
  };

  return (
    <div
      id="unified-plan-map-container"
      data-testid="unified-plan-map"
      className={`relative w-full rounded-2xl border border-[#CBD5E1] bg-white overflow-hidden shadow-xs flex flex-col justify-between ${className}`}
    >
      {/* Top Map Bar: Navigation, View Toggle, and Google Maps Launch */}
      <div className="z-20 bg-white/95 backdrop-blur-xs px-3 py-2 border-b border-[#CBD5E1]/60 flex items-center justify-between gap-2">
        {/* Left: Destination & Active Target */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Compass className="h-4 w-4 text-[#0E6B59] shrink-0" />
          <div className="text-left truncate">
            <div className="text-xs font-bold text-[#15201D] truncate flex items-center gap-1">
              <span>{cleanDest}</span>
              <span className="text-[10px] text-[#55625E] font-normal">· Day {activeDayNumber}</span>
            </div>
            <div className="text-[10px] text-[#0E6B59] truncate font-medium">
              📍 {activeStop ? `${activeStop.title} (${activeStop.timeSlot.split('·')[0].trim()})` : `Stay in ${cleanStay}`}
            </div>
          </div>
        </div>

        {/* Center/Right: Tab Switcher & Outbound Google Maps Action */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="inline-flex rounded-lg bg-[#F1F5F9] p-0.5 border border-[#CBD5E1]/60 text-[10px] font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('google')}
              className={`px-2 py-1 rounded-md transition ${
                activeTab === 'google'
                  ? 'bg-white text-[#0E6B59] shadow-2xs font-bold'
                  : 'text-[#55625E] hover:text-[#15201D]'
              }`}
            >
              Google Map
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('route')}
              className={`px-2 py-1 rounded-md transition ${
                activeTab === 'route'
                  ? 'bg-white text-[#0E6B59] shadow-2xs font-bold'
                  : 'text-[#55625E] hover:text-[#15201D]'
              }`}
            >
              Route Stops
            </button>
          </div>

          <a
            href={defaultMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#E3F1EC] hover:bg-[#D5EAE2] text-[#0E6B59] px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-2xs border border-[#0E6B59]/30 flex items-center gap-1 cursor-pointer transition min-h-[30px]"
            title="Open in Google Maps App"
          >
            <span>Open Maps</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Map Content Body */}
      <div className="relative w-full h-full flex-1 min-h-[220px] bg-[#E5E3DF]">
        {activeTab === 'google' ? (
          /* Real Embedded Google Map Iframe */
          <div className="relative w-full h-full">
            <iframe
              src={embedUrl}
              title={`Live Google Map of ${activeQuery}`}
              className="w-full h-full border-0 absolute inset-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />

            {/* Quick Zoom Controls Floating on Map */}
            <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 bg-white/90 backdrop-blur-xs rounded-lg shadow-sm border border-[#CBD5E1] p-0.5">
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.min(prev + 1, 18))}
                className="p-1 text-[#15201D] hover:bg-slate-100 rounded"
                title="Zoom In"
                aria-label="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.max(prev - 1, 11))}
                className="p-1 text-[#15201D] hover:bg-slate-100 rounded"
                title="Zoom Out"
                aria-label="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(14)}
                className="p-1 text-[#55625E] hover:bg-slate-100 rounded"
                title="Reset Zoom"
                aria-label="Reset Zoom"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : (
          /* Route Stops Diagram with Topo Grid & Pins */
          <div className="relative w-full h-full bg-gradient-to-br from-[#EAF3EF] via-[#F4F9F7] to-[#E3EFEA] min-h-[220px]">
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
            <div className="absolute top-4 left-4 z-10">
              <button
                type="button"
                onClick={() => handleSelectPin(0)}
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs border transition ${
                  currentPin === 0
                    ? 'bg-[#0E6B59] text-white border-[#0E6B59]'
                    : 'bg-white/90 text-[#0E6B59] border-[#CBD5E1]/70 hover:bg-white'
                }`}
              >
                <MapPin className="h-2.5 w-2.5" />
                <span>Stay: {cleanStay}</span>
              </button>
            </div>

            {/* Numbered Pins */}
            {effectiveStops.map((stop) => {
              const isSelected = currentPin === stop.pinNumber;
              return (
                <div
                  key={stop.pinNumber}
                  onClick={() => handleSelectPin(stop.pinNumber)}
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
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded mt-0.5 shadow-xs whitespace-nowrap max-w-[120px] truncate ${
                    isSelected ? 'bg-[#0E6B59] text-white' : 'bg-white/90 text-[#15201D]'
                  }`}>
                    {stop.title}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Interactive Bar: Quick Location Chips & Directions */}
      <div className="p-2 bg-white/95 backdrop-blur-xs border-t border-[#CBD5E1]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px] text-[#55625E]">
        {/* Chips to jump and center Google Map */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          <button
            type="button"
            onClick={() => handleSelectPin(0)}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition shrink-0 ${
              currentPin === 0
                ? 'bg-[#0E6B59] text-white font-bold'
                : 'bg-[#F1F5F9] text-[#55625E] hover:bg-[#E2E8F0]'
            }`}
          >
            🏨 Hotel Area
          </button>

          {effectiveStops.map((stop) => (
            <button
              key={stop.pinNumber}
              type="button"
              onClick={() => handleSelectPin(stop.pinNumber)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition shrink-0 flex items-center gap-1 ${
                currentPin === stop.pinNumber
                  ? 'bg-[#0E6B59] text-white font-bold'
                  : 'bg-[#F1F5F9] text-[#55625E] hover:bg-[#E2E8F0]'
              }`}
            >
              <span className="font-bold">#{stop.pinNumber}</span>
              <span className="max-w-[80px] truncate">{stop.title}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          <div className="flex items-center gap-1 text-[10px] text-[#55625E]">
            <Navigation className="h-3 w-3 text-[#0E6B59]" />
            <span>~15–20m between stops</span>
          </div>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-semibold text-[#0E6B59] hover:underline flex items-center gap-0.5"
          >
            <span>Directions</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
