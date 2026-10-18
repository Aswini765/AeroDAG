import React from 'react';
import { X, ExternalLink, MessageSquare, Heart } from 'lucide-react';

interface PrototypeUsabilitySurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrototypeUsabilitySurveyModal: React.FC<PrototypeUsabilitySurveyModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#15201D]/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="survey-modal-title"
    >
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E6E1] shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-in text-left">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#E2E6E1] flex items-center justify-between bg-[#F8FAF9]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E3F1EC] text-[#0E6B59] uppercase tracking-wider">
                Feedback
              </span>
              <span className="text-xs text-[#55625E]">· Quick Survey</span>
            </div>
            <h2 id="survey-modal-title" className="text-xl sm:text-2xl font-bold text-[#15201D] font-heading">
              Give Feedback
            </h2>
            <p className="text-xs sm:text-sm text-[#55625E]">
              Share your thoughts, suggestions, or issues to help improve AeroDAG.
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
        <div className="p-6 space-y-6 text-center">
          <div className="h-14 w-14 mx-auto rounded-full bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center">
            <MessageSquare className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-[#15201D] font-heading">
              We'd love your thoughts!
            </h3>
            <p className="text-xs sm:text-sm text-[#55625E] max-w-sm mx-auto leading-relaxed">
              We collect traveler feedback directly through our Google Form so every suggestion is reviewed and addressed.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="YOUR_FORM_LINK"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full sm:w-auto min-h-[44px] py-2.5 px-6 inline-flex items-center justify-center gap-2 text-sm font-bold shadow-xs"
            >
              <span>Open Feedback Form</span>
              <ExternalLink className="h-4 w-4" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="btn-ghost w-full sm:w-auto min-h-[44px] text-xs py-2 px-4"
            >
              Maybe later
            </button>
          </div>

          <div className="pt-4 border-t border-[#E2E6E1] text-[11px] text-[#55625E] flex items-center justify-center gap-1.5">
            <Heart className="h-3.5 w-3.5 text-[#0E6B59] fill-[#0E6B59]" />
            <span>Thank you for helping us make India travel easier.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
