import React from 'react';

export type SourceTagKind = 'live' | 'estimate' | 'sample' | 'reserved' | 'stated' | 'assumed' | 'needed' | 'simulated';

export interface SourceTagProps {
  kind: SourceTagKind;
  label?: string;
  retrievedAt?: string;
  className?: string;
}

const KIND_CONFIG: Record<
  SourceTagKind,
  { label: string; textColor: string; bgColor: string; borderColor: string }
> = {
  live: {
    label: 'Live',
    textColor: '#0A5546',
    bgColor: '#E3F1EC',
    borderColor: 'rgba(10, 85, 70, 0.2)'
  },
  stated: {
    label: 'Stated',
    textColor: '#0A5546',
    bgColor: '#E3F1EC',
    borderColor: 'rgba(10, 85, 70, 0.2)'
  },
  estimate: {
    label: 'Estimate',
    textColor: '#8A4307',
    bgColor: '#FCEFD9',
    borderColor: 'rgba(138, 67, 7, 0.2)'
  },
  assumed: {
    label: 'Assumed',
    textColor: '#8A4307',
    bgColor: '#FCEFD9',
    borderColor: 'rgba(138, 67, 7, 0.2)'
  },
  needed: {
    label: 'Needed',
    textColor: '#8A4307',
    bgColor: '#FCEFD9',
    borderColor: 'rgba(138, 67, 7, 0.2)'
  },
  reserved: {
    label: 'Reserved',
    textColor: '#1E4F8A',
    bgColor: '#E4EDF8',
    borderColor: 'rgba(30, 79, 138, 0.2)'
  },
  simulated: {
    label: 'Demo',
    textColor: '#1E4F8A',
    bgColor: '#E4EDF8',
    borderColor: 'rgba(30, 79, 138, 0.2)'
  },
  sample: {
    label: 'Sample',
    textColor: '#4B5563',
    bgColor: '#EEF0EE',
    borderColor: 'rgba(75, 85, 99, 0.2)'
  }
};

export const SourceTag: React.FC<SourceTagProps> = ({
  kind,
  label,
  retrievedAt,
  className = ''
}) => {
  const config = KIND_CONFIG[kind] || KIND_CONFIG.sample;
  const displayLabel = label || config.label;

  let tooltip: string | undefined = undefined;
  if (kind === 'live') {
    tooltip = retrievedAt ? `Fetched ${retrievedAt}` : 'Fetched live from provider';
  } else if (kind === 'estimate' || kind === 'assumed') {
    tooltip = 'Estimated based on planning parameters';
  } else if (kind === 'reserved') {
    tooltip = 'Reserved contingency buffer';
  } else if (kind === 'sample') {
    tooltip = 'Catalog sample pricing (not live provider quote)';
  }

  return (
    <span
      title={tooltip}
      className={`source-tag inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium leading-tight border transition-colors select-none ${className}`}
      style={{
        color: config.textColor,
        backgroundColor: config.bgColor,
        borderColor: config.borderColor
      }}
    >
      {displayLabel}
    </span>
  );
};
