import React from 'react';
import { Bookmark, ArrowRight, Sparkles } from 'lucide-react';
import { TripPlan, TripPreferences } from '../../../types/travelBooking';

interface PlanHeaderProps {
  plan: TripPlan;
  preferences: TripPreferences;
  onSaveTrip: () => void;
  onProceedToReview: () => void;
  isSaved?: boolean;
}

export const PlanHeader: React.FC<PlanHeaderProps> = ({
  plan,
  preferences,
  onSaveTrip,
  onProceedToReview,
  isSaved = false
}) => {
  const areaName = plan.hotelZone || (plan.hotel.area.toLowerCase().includes('south') ? 'South Goa' : plan.hotel.area || 'Goa');

  return (
    <div className="space-y-4 mb-6 text-left">
      {/* Demo-mode banner, restyled neutral */}
      <div className="card-consumer p-3 sm:px-4 bg-[#F5F6F3] border-[#E2E6E1] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#55625E]">
        <div className="flex items-center gap-2">
          <span className="font-semibold px-2 py-0.5 rounded-full bg-[#E2E6E1] text-[#15201D] text-[11px]">
            DEMO MODE
          </span>
          <span>Sample catalog options · Simulated booking checkout</span>
        </div>
        <span className="text-[#4A5753] hidden sm:inline">
          Live inventory disabled
        </span>
      </div>

      {/* Main Header Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-1">
        <div className="space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#0E6B59]">
            Draft plan · domestic
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#15201D] font-heading">
            {plan.durationDays} days in {areaName}
          </h1>

          <div className="text-xs sm:text-sm text-[#55625E] flex flex-wrap items-center gap-2">
            <span>{plan.dates}</span>
            <span>·</span>
            <span>{plan.travellers.total} traveller{plan.travellers.total === 1 ? '' : 's'}</span>
            <span>·</span>
            <span>from {plan.origin.replace(/\s*\([^)]*\)/, '')}</span>
            <span>·</span>
            <span className="capitalize">{preferences.travelStyle || 'Relaxed'} pace</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onSaveTrip}
            className="btn-ghost"
            aria-label="Save trip draft"
          >
            <Bookmark className={`h-4 w-4 ${isSaved ? 'text-[#0E6B59] fill-[#0E6B59]' : ''}`} />
            <span>{isSaved ? 'Saved' : 'Save trip'}</span>
          </button>

          <button
            type="button"
            onClick={onProceedToReview}
            id="review-and-book-btn"
            className="btn-primary"
            aria-label="Review & book"
          >
            <span>Review & book</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
