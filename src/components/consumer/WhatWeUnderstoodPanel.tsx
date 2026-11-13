import React from 'react';
import { Check, Edit3 } from 'lucide-react';
import { TripContext } from '../../services/requirementEngine';

interface WhatWeUnderstoodPanelProps {
  context: TripContext;
  onEdit?: () => void;
  /** Kept for compatibility — the panel is always a short one-line summary now. */
  initiallyCollapsed?: boolean;
  className?: string;
}

/**
 * One short, honest summary of what we read from the user's words.
 * Things the user said are plain; things we guessed are marked "guessed"
 * so nothing is hidden.
 */
export const WhatWeUnderstoodPanel: React.FC<WhatWeUnderstoodPanelProps> = ({
  context,
  onEdit,
  className = ''
}) => {
  const src = context.fieldSources || {};
  const isBasicMode = context.parseMode === 'basic';
  const guessed = (key: string) => src[key] !== 'stated';

  const cleanDest = (context.destination || '').replace(/,\s*India$/i, '').trim();
  const originClean = (context.origin || '').replace(/\s*\([^)]*\)/, '').trim();
  const travellers = context.totalTravellers || 2;
  const children = context.childrenCount || 0;
  const travellersText = `${travellers} ${travellers === 1 ? 'person' : 'people'}${
    children > 0 ? ` (${children} child${children > 1 ? 'ren' : ''})` : ''
  }`;
  const preferencesText = context.freeTextPreferences ||
    context.dietaryPreference ||
    (context.notes.length > 0 ? context.notes.join(', ') : null);

  const items: { key: string; label: string; value: string }[] = [];
  if (cleanDest) items.push({ key: 'destination', label: 'Where', value: cleanDest });
  items.push({ key: 'dates', label: 'When', value: context.dates || `${context.durationDays || 3} days` });
  items.push({ key: 'travellers', label: 'Who', value: travellersText });
  if (originClean) items.push({ key: 'origin', label: 'From', value: originClean });
  if (context.budgetTotalINR) items.push({ key: 'budget', label: 'Budget', value: `₹${context.budgetTotalINR.toLocaleString('en-IN')}` });
  if (preferencesText) items.push({ key: 'preferences', label: 'Wants', value: preferencesText });

  const anyGuessed = items.some(i => guessed(i.key));

  return (
    <div
      id="what-we-understood-panel"
      className={`rounded-2xl border border-[#E2E6E1] bg-white p-3 sm:p-4 text-left ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-sm font-bold text-[#15201D] flex items-center gap-1.5">
          <Check className="h-4 w-4 text-[#0E6B59] stroke-[3]" />
          What we understood
        </span>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-xs font-semibold text-[#0E6B59] hover:underline flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[#E3F1EC]/60 cursor-pointer min-h-[32px]"
          >
            <Edit3 className="h-3 w-3" />
            <span>Change</span>
          </button>
        )}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {items.map(item => (
          <React.Fragment key={item.key}>
            <dt className="text-[#55625E]">{item.label}</dt>
            <dd className="text-[#15201D] font-semibold">
              {item.value}
              {guessed(item.key) && (
                <span className="ml-1.5 text-[11px] font-medium text-[#8A4307] bg-[#FCEFD9] px-1.5 py-0.5 rounded">
                  guessed
                </span>
              )}
            </dd>
          </React.Fragment>
        ))}
      </dl>

      {(anyGuessed || isBasicMode) && (
        <p id={isBasicMode ? 'basic-mode-badge' : undefined} className="mt-2 text-xs text-[#55625E]">
          {anyGuessed && 'We filled in the "guessed" items — change them if they’re wrong. '}
          {isBasicMode && 'Read with simple rules (AI was not used).'}
        </p>
      )}
    </div>
  );
};
