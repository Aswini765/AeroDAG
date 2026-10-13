import React, { useState } from 'react';
import { Footprints, Clock, Car, Sparkles } from 'lucide-react';
import { ActivityDayItem } from '../../../types/travelBooking';

interface DayByDayProps {
  itinerary: ActivityDayItem[];
  onAdjustDay?: (dayNumber: number, type: 'relaxed' | 'food' | 'budget') => void;
}

export const DayByDay: React.FC<DayByDayProps> = ({ itinerary, onAdjustDay }) => {
  const [activeDayIdx, setActiveDayIdx] = useState(0);

  if (!itinerary || itinerary.length === 0) {
    return null;
  }

  const currentDay = itinerary[activeDayIdx] || itinerary[0];

  return (
    <div className="card-consumer p-5 sm:p-6 space-y-5 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E6E1]">
        <div>
          <h2 className="text-lg font-bold text-[#15201D] font-heading">
            Day by day
          </h2>
          <div className="text-xs text-[#55625E]">
            Curated daily pacing & excursion timeline
          </div>
        </div>

        {/* Walking Level Badge */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F6F3] border border-[#E2E6E1] text-xs font-semibold text-[#15201D]">
            <Footprints className="h-3.5 w-3.5 text-[#0E6B59]" />
            <span className="capitalize">{currentDay.walkingLevel || 'Light'} walking</span>
          </div>
          {currentDay.walkingFlag && (
            <span className="text-[11px] font-semibold text-[#8A4307] bg-[#FCEFD9] px-2 py-0.5 rounded-full">
              {currentDay.walkingFlag}
            </span>
          )}
        </div>
      </div>

      {/* Day Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {itinerary.map((dayItem, idx) => {
          const isActive = idx === activeDayIdx;
          return (
            <button
              key={dayItem.day}
              type="button"
              onClick={() => setActiveDayIdx(idx)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-[#0E6B59] text-white shadow-sm'
                  : 'bg-[#F5F6F3] text-[#55625E] hover:text-[#15201D] hover:bg-[#E2E6E1]'
              }`}
            >
              Day {dayItem.day}
            </button>
          );
        })}
      </div>

      {/* Day Title & Theme */}
      <div className="space-y-1">
        <div className="text-xs font-bold uppercase tracking-wider text-[#0E6B59]">
          Day {currentDay.day} · {currentDay.dateStr || `Day ${currentDay.day}`}
        </div>
        <h3 className="text-base font-bold text-[#15201D] font-heading">
          {currentDay.title}
        </h3>
        <p className="text-xs text-[#55625E]">
          {currentDay.theme}
        </p>
      </div>

      {/* Timeline List: (Time · What · Note with drive time) */}
      <div className="space-y-3.5 pt-2 border-t border-[#E2E6E1]">
        {/* Morning */}
        <div className="flex items-start gap-3">
          <div className="h-7 w-7 rounded-full bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
            09:30
          </div>
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-[#15201D]">Morning Exploration</div>
            <div className="text-xs text-[#55625E] leading-relaxed">
              {currentDay.morning}
            </div>
            {currentDay.stopDriveTimes && currentDay.stopDriveTimes[0] && (
              <div className="text-[11px] text-[#0E6B59] flex items-center gap-1 mt-0.5">
                <Car className="h-3 w-3" />
                <span>{currentDay.stopDriveTimes[0].note}</span>
              </div>
            )}
          </div>
        </div>

        {/* Afternoon */}
        <div className="flex items-start gap-3">
          <div className="h-7 w-7 rounded-full bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
            14:00
          </div>
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-[#15201D]">Afternoon Pacing</div>
            <div className="text-xs text-[#55625E] leading-relaxed">
              {currentDay.afternoon}
            </div>
            {currentDay.stopDriveTimes && currentDay.stopDriveTimes[1] && (
              <div className="text-[11px] text-[#0E6B59] flex items-center gap-1 mt-0.5">
                <Car className="h-3 w-3" />
                <span>{currentDay.stopDriveTimes[1].note}</span>
              </div>
            )}
          </div>
        </div>

        {/* Evening */}
        <div className="flex items-start gap-3">
          <div className="h-7 w-7 rounded-full bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
            18:30
          </div>
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-[#15201D]">Sunset & Dining</div>
            <div className="text-xs text-[#55625E] leading-relaxed">
              {currentDay.evening}
            </div>
          </div>
        </div>
      </div>

      {/* "Adjust this day" chips */}
      {onAdjustDay && (
        <div className="pt-3 border-t border-[#E2E6E1] space-y-2">
          <div className="text-xs font-medium text-[#55625E]">
            Adjust this day:
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onAdjustDay(currentDay.day, 'relaxed')}
              className="pill-chip text-xs"
            >
              More relaxed
            </button>
            <button
              type="button"
              onClick={() => onAdjustDay(currentDay.day, 'food')}
              className="pill-chip text-xs"
            >
              Add food stop
            </button>
            <button
              type="button"
              onClick={() => onAdjustDay(currentDay.day, 'budget')}
              className="pill-chip text-xs"
            >
              Budget-friendly
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
