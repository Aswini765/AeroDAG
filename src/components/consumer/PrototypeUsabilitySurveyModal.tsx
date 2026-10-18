import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  HelpCircle,
  MapPin,
  Calendar,
  Wallet,
  Compass,
  Sparkles,
  Loader2,
  Check
} from 'lucide-react';

interface PrototypeUsabilitySurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrototypeUsabilitySurveyModal: React.FC<PrototypeUsabilitySurveyModalProps> = ({
  isOpen,
  onClose
}) => {
  // Survey Form States
  // Multi-select for "How do you usually plan your trip?" (Google Maps is an explicit option)
  const [planningMethods, setPlanningMethods] = useState<string[]>([
    'Google Maps (Saved spots, route discovery & reviews)'
  ]);

  // Multi-select for pain points (budget, finding common dates, comparing flights, etc.)
  const [painPoints, setPainPoints] = useState<string[]>([
    'Staying strictly within budget without sneaky hidden charges',
    'Finding common dates that work across everyone in the group',
    'Comparing flights, trains, and cabs across 15+ browser tabs'
  ]);

  // Multi-select for how users choose travel dates
  const [dateSelectionMethods, setDateSelectionMethods] = useState<string[]>([
    'Clustering around long weekends & public holidays'
  ]);

  // Travel persona & style
  const [travelPersona, setTravelPersona] = useState<string>('family');
  const [travelStyle, setTravelStyle] = useState<string>('balanced');
  const [additionalComments, setAdditionalComments] = useState<string>('');

  // Submission & Loading / Confirmation states (from Nani Srinivas's feedback)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const PLANNING_METHOD_OPTIONS = [
    {
      id: 'google-maps',
      label: 'Google Maps (Saved spots, route discovery & reviews)',
      highlight: true
    },
    {
      id: 'instagram-youtube',
      label: 'Instagram Reels, TikTok & YouTube travel vlogs'
    },
    {
      id: 'ota-platforms',
      label: 'OTA Platforms (MakeMyTrip, Booking.com, Agoda, Skyscanner)'
    },
    {
      id: 'friends-family',
      label: 'Word of mouth (Recommendations from friends & family)'
    },
    {
      id: 'travel-agent',
      label: 'Traditional travel agent or pre-packaged group tours'
    },
    {
      id: 'spreadsheets-chats',
      label: 'Custom Google Spreadsheets & chaotic WhatsApp groups'
    }
  ];

  const PAIN_POINT_OPTIONS = [
    {
      id: 'budget-surprises',
      label: 'Staying strictly within budget without sneaky hidden charges'
    },
    {
      id: 'common-dates',
      label: 'Finding common dates that work across everyone in the group'
    },
    {
      id: 'comparing-flights',
      label: 'Comparing flights, trains, and cabs across 15+ browser tabs'
    },
    {
      id: 'misleading-photos',
      label: 'Misleading hotel photos and unconfirmed room capacity / layout'
    },
    {
      id: 'operator-fraud',
      label: 'Uncertain bus seat types (booking sleeper but getting seating) & driver safety'
    },
    {
      id: 'local-transport',
      label: 'Hidden on-ground transport costs (remote airport cabs, daily driver batta)'
    }
  ];

  const DATE_SELECTION_OPTIONS = [
    {
      id: 'long-weekends',
      label: 'Clustering around long weekends & public holidays'
    },
    {
      id: 'school-vacations',
      label: 'School vacations and children exam timetables'
    },
    {
      id: 'flight-dips',
      label: 'Watching for sudden flight fare dips & flash sales'
    },
    {
      id: 'seasonal-peaks',
      label: 'Optimal seasonal weather & peak experiences (e.g. Araku clouds, snow)'
    },
    {
      id: 'work-leave',
      label: 'Aligning mutual work leave approvals across colleagues/friends'
    }
  ];

  const toggleSelection = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    value: string
  ) => {
    if (list.includes(value)) {
      setList(list.filter((item) => item !== value));
    } else {
      setList([...list, value]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Persist survey answers in localStorage for prototype analytics
    try {
      const surveyPayload = {
        submittedAt: new Date().toISOString(),
        planningMethods,
        painPoints,
        dateSelectionMethods,
        travelPersona,
        travelStyle,
        additionalComments
      };
      const existing = JSON.parse(localStorage.getItem('aerodag_usability_surveys') || '[]');
      existing.push(surveyPayload);
      localStorage.setItem('aerodag_usability_surveys', JSON.stringify(existing));
    } catch {
      // safe fallback
    }

    // Realistic loader & confirmation state
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#15201D]/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="survey-modal-title"
    >
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E6E1] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-left">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#E2E6E1] flex items-center justify-between bg-[#F8FAF9]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E3F1EC] text-[#0E6B59] uppercase tracking-wider">
                User Research Survey
              </span>
              <span className="text-xs text-[#55625E]">· 2 mins</span>
            </div>
            <h2 id="survey-modal-title" className="text-xl sm:text-2xl font-bold text-[#15201D] font-heading">
              Help Shape AeroDAG
            </h2>
            <p className="text-xs sm:text-sm text-[#55625E]">
              Feedback incorporated from traveler research sessions (Shwetha & Nani Srinivas).
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#55625E] hover:text-[#15201D] hover:bg-[#E2E6E1]/50 transition cursor-pointer"
            aria-label="Close survey"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {isSubmitted ? (
            <div className="text-center py-10 space-y-4 animate-fade-in">
              <div className="h-16 w-16 mx-auto rounded-full bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center shadow-inner">
                <Check className="h-8 w-8 stroke-[2.5]" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-2xl font-bold text-[#15201D] font-heading">
                  Thank you for your feedback!
                </h3>
                <p className="text-sm text-[#55625E] max-w-md mx-auto">
                  Your preferences (including multi-select pain points and Google Maps integration) directly inform our dynamic planning engine.
                </p>
              </div>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-primary py-2.5 px-6 text-sm font-semibold"
                >
                  Return to trip planner
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Question 1: How do you usually plan your trip? (Multi-select Checkboxes) */}
              <div className="space-y-2.5">
                <label className="block text-sm font-bold text-[#15201D]">
                  1. How do you usually plan your trip?
                  <span className="block text-xs font-normal text-[#55625E] mt-0.5">
                    Select all options that apply to your process.
                  </span>
                </label>

                <div className="space-y-2">
                  {PLANNING_METHOD_OPTIONS.map((opt) => {
                    const isChecked = planningMethods.includes(opt.label);
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition text-xs sm:text-sm ${
                          isChecked
                            ? 'bg-[#E3F1EC]/40 border-[#0E6B59] text-[#15201D]'
                            : 'bg-[#FFFFFF] border-[#E2E6E1] text-[#55625E] hover:border-[#7CC4B3]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          name="planning-methods"
                          value={opt.label}
                          checked={isChecked}
                          onChange={() => toggleSelection(planningMethods, setPlanningMethods, opt.label)}
                          className="mt-0.5 h-4 w-4 rounded text-[#0E6B59] focus:ring-[#7CC4B3] border-[#CBD5E1]"
                        />
                        <div className="flex-1">
                          <span className={isChecked ? 'font-semibold text-[#15201D]' : ''}>
                            {opt.label}
                          </span>
                          {opt.highlight && (
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-[#0E6B59] text-white">
                              Direct Support
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Question 2: Pain Points (Multi-select Checkboxes) */}
              <div className="space-y-2.5 pt-4 border-t border-[#E2E6E1]">
                <label className="block text-sm font-bold text-[#15201D]">
                  2. What are your biggest pain points when planning travel?
                  <span className="block text-xs font-normal text-[#55625E] mt-0.5">
                    Select all that you struggle with (budget, common dates, comparing flights, etc.).
                  </span>
                </label>

                <div className="space-y-2">
                  {PAIN_POINT_OPTIONS.map((opt) => {
                    const isChecked = painPoints.includes(opt.label);
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition text-xs sm:text-sm ${
                          isChecked
                            ? 'bg-[#E3F1EC]/40 border-[#0E6B59] text-[#15201D]'
                            : 'bg-[#FFFFFF] border-[#E2E6E1] text-[#55625E] hover:border-[#7CC4B3]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          name="pain-points"
                          value={opt.label}
                          checked={isChecked}
                          onChange={() => toggleSelection(painPoints, setPainPoints, opt.label)}
                          className="mt-0.5 h-4 w-4 rounded text-[#0E6B59] focus:ring-[#7CC4B3] border-[#CBD5E1]"
                        />
                        <span className={isChecked ? 'font-semibold text-[#15201D]' : ''}>
                          {opt.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Question 3: How do users choose travel dates? (Multi-select Checkboxes) */}
              <div className="space-y-2.5 pt-4 border-t border-[#E2E6E1]">
                <label className="block text-sm font-bold text-[#15201D]">
                  3. How do you and your group usually choose travel dates?
                  <span className="block text-xs font-normal text-[#55625E] mt-0.5">
                    Select all triggers that help lock in dates.
                  </span>
                </label>

                <div className="space-y-2">
                  {DATE_SELECTION_OPTIONS.map((opt) => {
                    const isChecked = dateSelectionMethods.includes(opt.label);
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition text-xs sm:text-sm ${
                          isChecked
                            ? 'bg-[#E3F1EC]/40 border-[#0E6B59] text-[#15201D]'
                            : 'bg-[#FFFFFF] border-[#E2E6E1] text-[#55625E] hover:border-[#7CC4B3]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          name="date-methods"
                          value={opt.label}
                          checked={isChecked}
                          onChange={() => toggleSelection(dateSelectionMethods, setDateSelectionMethods, opt.label)}
                          className="mt-0.5 h-4 w-4 rounded text-[#0E6B59] focus:ring-[#7CC4B3] border-[#CBD5E1]"
                        />
                        <span className={isChecked ? 'font-semibold text-[#15201D]' : ''}>
                          {opt.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Question 4: Primary Persona & Travel Style */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#E2E6E1]">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#55625E]">
                    Travel Persona
                  </label>
                  <select
                    value={travelPersona}
                    onChange={(e) => setTravelPersona(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#E2E6E1] rounded-xl px-3 py-2 text-sm text-[#15201D] focus:ring-2 focus:ring-[#7CC4B3] focus:outline-none"
                  >
                    <option value="family">Family (with kids/elders)</option>
                    <option value="couple">Couple (relaxation & romance)</option>
                    <option value="friends">Friends / Bachelors (nightlife & adventure)</option>
                    <option value="solo">Solo Traveler (culture & discovery)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#55625E]">
                    Preferred Style
                  </label>
                  <select
                    value={travelStyle}
                    onChange={(e) => setTravelStyle(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#E2E6E1] rounded-xl px-3 py-2 text-sm text-[#15201D] focus:ring-2 focus:ring-[#7CC4B3] focus:outline-none"
                  >
                    <option value="relaxed">Relaxed (nature, resort stays, low walking)</option>
                    <option value="balanced">Balanced (1-2 key spots/day, good food)</option>
                    <option value="packed">Packed Sightseeing (maximize spots covered)</option>
                  </select>
                </div>
              </div>

              {/* Additional Comments */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#55625E]">
                  Any other feature or usability suggestion?
                </label>
                <textarea
                  rows={2}
                  value={additionalComments}
                  onChange={(e) => setAdditionalComments(e.target.value)}
                  placeholder="e.g. Include scenic train highlights, warnings for remote airport taxis, etc."
                  className="w-full bg-[#FFFFFF] border border-[#E2E6E1] rounded-xl px-3.5 py-2 text-sm text-[#15201D] focus:ring-2 focus:ring-[#7CC4B3] focus:outline-none"
                />
              </div>

              {/* Submit Button with Loading State */}
              <div className="pt-4 border-t border-[#E2E6E1] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-ghost py-2.5 px-4 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary py-2.5 px-6 text-sm font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Submitting feedback…</span>
                    </>
                  ) : (
                    <span>Submit Usability Feedback</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
