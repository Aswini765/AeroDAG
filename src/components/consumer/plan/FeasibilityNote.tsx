import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { VerificationCheck } from '../../../types/travelBooking';

interface FeasibilityNoteProps {
  airportSelectionReason?: string;
  verificationChecks: VerificationCheck[];
}

export const FeasibilityNote: React.FC<FeasibilityNoteProps> = ({
  airportSelectionReason,
  verificationChecks
}) => {
  const [isChecklistExpanded, setIsChecklistExpanded] = useState(false);

  const warnings = verificationChecks.filter((c) => c.status === 'warn' || c.status === 'fail');
  const passCount = verificationChecks.filter((c) => c.status === 'pass').length;
  const naCount = verificationChecks.filter((c) => c.status === 'not_applicable').length;

  return (
    <div className="space-y-3 text-left">
      {/* 1. Green Airport Reason Note */}
      {airportSelectionReason && (
        <div className="card-consumer p-4 bg-[#E3F1EC]/70 border-[#0E6B59]/30 text-[#15201D] text-xs sm:text-sm flex items-start gap-3">
          <div className="h-6 w-6 rounded-full bg-[#0E6B59] text-white flex items-center justify-center shrink-0 mt-0.5">
            <MapPin className="h-3.5 w-3.5" />
          </div>
          <div className="space-y-0.5">
            <div className="font-bold text-[#0E6B59] text-xs uppercase tracking-wider">
              Optimal Airport Selection
            </div>
            <div className="text-[#15201D] leading-relaxed">
              {airportSelectionReason}
            </div>
          </div>
        </div>
      )}

      {/* 2. Feasibility Warnings (Amber), only if any exist */}
      {warnings.length > 0 && (
        <div className="card-consumer p-4 bg-[#FCEFD9] border-[#8A4307]/30 text-[#8A4307] space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Feasibility Advisory ({warnings.length})</span>
          </div>
          <div className="space-y-1.5 text-xs">
            {warnings.map((w) => (
              <div key={w.id} className="leading-relaxed">
                <span className="font-semibold">• {w.title}:</span> {w.detail}
                {w.warningFix && (
                  <div className="mt-0.5 pl-3 text-[#15201D]">
                    Suggested fix: {w.warningFix}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Small Expandable Checklist Line */}
      <div className="card-consumer p-3 text-xs flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setIsChecklistExpanded(!isChecklistExpanded)}
          className="flex items-center justify-between w-full text-[#55625E] hover:text-[#15201D] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0E6B59]" />
            <span className="font-medium">
              {passCount} checks passed {naCount > 0 ? `· ${naCount} not applicable` : ''}
              {warnings.length > 0 ? ` · ${warnings.length} advisory` : ''}
            </span>
          </div>

          <div className="flex items-center gap-1 font-semibold text-[#0E6B59]">
            <span>{isChecklistExpanded ? 'Hide' : 'Details'}</span>
            {isChecklistExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </div>
        </button>

        {/* Expanded Checklist Details */}
        {isChecklistExpanded && (
          <div className="pt-2 border-t border-[#E2E6E1] space-y-2 text-[11px] animate-fade-in-slide">
            {verificationChecks.map((chk) => (
              <div key={chk.id} className="flex items-start justify-between gap-2 p-1.5 rounded-lg bg-[#F5F6F3]/60">
                <div className="space-y-0.5">
                  <div className="font-semibold text-[#15201D]">{chk.title}</div>
                  <div className="text-[#55625E]">{chk.detail}</div>
                  {chk.whatWasChecked && (
                    <div className="text-[#55625E]/70 italic">Verified: {chk.whatWasChecked}</div>
                  )}
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] shrink-0 ${
                    chk.status === 'pass'
                      ? 'bg-[#E3F1EC] text-[#0E6B59]'
                      : chk.status === 'not_applicable'
                      ? 'bg-[#E2E6E1] text-[#55625E]'
                      : 'bg-[#FCEFD9] text-[#8A4307]'
                  }`}
                >
                  {chk.status === 'not_applicable' ? 'N/A' : chk.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
