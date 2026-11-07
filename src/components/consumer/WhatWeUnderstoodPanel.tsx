import React, { useState } from 'react';
import { Check, Edit3, ChevronDown, ChevronUp, Sparkles, AlertCircle } from 'lucide-react';
import { TripContext } from '../../services/requirementEngine';

interface WhatWeUnderstoodPanelProps {
  context: TripContext;
  onEdit?: () => void;
  initiallyCollapsed?: boolean;
  className?: string;
}

export const WhatWeUnderstoodPanel: React.FC<WhatWeUnderstoodPanelProps> = ({
  context,
  onEdit,
  initiallyCollapsed = true,
  className = ''
}) => {
  const [isCollapsed, setIsCollapsed] = useState(initiallyCollapsed);
  const src = context.fieldSources || {};
  const isBasicMode = context.parseMode === 'basic';

  const cleanDest = (context.destination || '').replace(/,\s*India$/i, '').trim();
  const originClean = (context.origin || '').replace(/\s*\([^)]*\)/, '').trim();

  const getTag = (key: string): 'stated' | 'assumed' => {
    return src[key] === 'stated' ? 'stated' : 'assumed';
  };

  const renderTagBadge = (tag: 'stated' | 'assumed') => (
    <span
      className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
        tag === 'stated'
          ? 'bg-[#E3F1EC] text-[#0E6B59]'
          : 'bg-[#F1F5F9] text-[#475569]'
      }`}
    >
      {tag}
    </span>
  );

  const travellersText = `${context.totalTravellers || 2} traveller${(context.totalTravellers || 2) > 1 ? 's' : ''}${
    (context.childrenCount || 0) > 0 ? ` (inc. ${context.childrenCount} child)` : ''
  }`;

  const budgetText = context.budgetTotalINR
    ? `₹${context.budgetTotalINR.toLocaleString('en-IN')}`
    : '₹60,000';

  const preferencesText = context.freeTextPreferences ||
    (context.dietaryPreference ? context.dietaryPreference : null) ||
    (context.notes.length > 0 ? context.notes.join(', ') : null);

  return (
    <div
      id="what-we-understood-panel"
      className={`rounded-2xl border border-[#E2E6E1] bg-[#F9FAF8] transition-all overflow-hidden shadow-2xs text-left ${className}`}
    >
      {/* Top Bar Header */}
      <div className="p-3 sm:px-4 flex items-center justify-between gap-2 border-b border-[#E2E6E1]/70 bg-white">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-[#15201D] font-heading flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-[#0E6B59] stroke-[3]" />
            <span>What we understood</span>
          </span>

          {/* Mode Tag: Basic mode or AI mode */}
          {isBasicMode ? (
            <span
              id="basic-mode-badge"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FCEFD9] text-[#8A4307] border border-[#8A4307]/30"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#8A4307]" />
              Basic mode
            </span>
          ) : (
            <span
              id="ai-mode-badge"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#E3F1EC] text-[#0E6B59] border border-[#0E6B59]/30"
            >
              <Sparkles className="h-3 w-3 text-[#0E6B59]" />
              AI parsed
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="text-xs font-semibold text-[#0E6B59] hover:underline flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[#E3F1EC]/60 cursor-pointer"
            >
              <Edit3 className="h-3 w-3" />
              <span>Edit</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md text-[#55625E] hover:text-[#15201D] hover:bg-[#E2E6E1]/50 cursor-pointer"
            aria-label={isCollapsed ? 'Expand what we understood' : 'Collapse what we understood'}
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Collapsed Compact View */}
      {isCollapsed ? (
        <div className="px-3 sm:px-4 py-2.5 flex flex-wrap items-center gap-2 text-xs text-[#15201D]">
          <span className="inline-flex items-center gap-1">
            <span className="text-[#55625E]">Destination:</span>
            <strong>{cleanDest}</strong>
            {renderTagBadge(getTag('destination'))}
          </span>
          <span className="text-[#CBD5E1]">·</span>

          {context.dates && (
            <>
              <span className="inline-flex items-center gap-1">
                <span className="text-[#55625E]">Dates:</span>
                <strong>{context.dates}</strong>
                {renderTagBadge(getTag('dates'))}
              </span>
              <span className="text-[#CBD5E1]">·</span>
            </>
          )}

          <span className="inline-flex items-center gap-1">
            <span className="text-[#55625E]">Travellers:</span>
            <strong>{travellersText}</strong>
            {renderTagBadge(getTag('travellers'))}
          </span>
          <span className="text-[#CBD5E1]">·</span>

          {originClean && (
            <>
              <span className="inline-flex items-center gap-1">
                <span className="text-[#55625E]">From:</span>
                <strong>{originClean}</strong>
                {renderTagBadge(getTag('origin'))}
              </span>
              <span className="text-[#CBD5E1]">·</span>
            </>
          )}

          <span className="inline-flex items-center gap-1">
            <span className="text-[#55625E]">Budget:</span>
            <strong>{budgetText}</strong>
            {renderTagBadge(getTag('budget'))}
          </span>

          {preferencesText && (
            <>
              <span className="text-[#CBD5E1]">·</span>
              <span className="inline-flex items-center gap-1">
                <span className="text-[#55625E]">Preferences:</span>
                <strong className="text-[#0E6B59]">{preferencesText}</strong>
                {renderTagBadge(getTag('preferences'))}
              </span>
            </>
          )}
        </div>
      ) : (
        /* Expanded Grid View */
        <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs bg-[#F9FAF8]">
          <div className="p-2.5 rounded-xl bg-white border border-[#E2E6E1] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#55625E]">Destination</span>
              {renderTagBadge(getTag('destination'))}
            </div>
            <div className="font-bold text-[#15201D] text-sm">{cleanDest || 'Not specified'}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-[#E2E6E1] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#55625E]">Travel Dates</span>
              {renderTagBadge(getTag('dates'))}
            </div>
            <div className="font-bold text-[#15201D] text-sm">{context.dates || `${context.durationDays || 3} days`}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-[#E2E6E1] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#55625E]">Travellers</span>
              {renderTagBadge(getTag('travellers'))}
            </div>
            <div className="font-bold text-[#15201D] text-sm">{travellersText}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-[#E2E6E1] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#55625E]">Origin</span>
              {renderTagBadge(getTag('origin'))}
            </div>
            <div className="font-bold text-[#15201D] text-sm">{originClean || 'Bengaluru (BLR)'}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-[#E2E6E1] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#55625E]">Total Target Budget</span>
              {renderTagBadge(getTag('budget'))}
            </div>
            <div className="font-bold text-[#15201D] text-sm">{budgetText}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-[#E2E6E1] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#55625E]">Pace & Style</span>
              {renderTagBadge(getTag('pace'))}
            </div>
            <div className="font-bold text-[#15201D] text-sm">{context.travelStyle || 'Balanced'} pace</div>
          </div>

          {preferencesText && (
            <div className="sm:col-span-2 md:col-span-3 p-2.5 rounded-xl bg-white border border-[#0E6B59]/30 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#0E6B59] font-bold">Preferences & Notes</span>
                {renderTagBadge(getTag('preferences'))}
              </div>
              <div className="font-semibold text-[#15201D]">{preferencesText}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

