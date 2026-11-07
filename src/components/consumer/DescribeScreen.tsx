import React, { useState, useEffect } from 'react';
import { ArrowRight, Clock, Tag, Mic, Square, Compass, Sparkles, Check, GitCompare } from 'lucide-react';
import { useSpeechInput } from '../../hooks/useSpeechInput';
import { suggestAlternative, swapPlaceInText, findKnownUnsupportedPlace, suggestFromTripType, DestinationSuggestion } from '../../services/destinationSuggestions';
import { DESTINATIONS, DestinationCardData } from './WhereShouldWeGo';
import {
  trackLandingView,
  trackCardClick,
  trackChipClick,
  trackInputSubmit,
  trackDemoClick
} from '../../services/telemetry/posthog';

interface DescribeScreenProps {
  /** Resolves to an error message to show, or null/void when planning moved on. */
  onStartPlan: (promptText: string) => Promise<string | null> | void;
  onTryDemo?: () => void;
  onComparePlaces?: (places: string[]) => void;
  isAiAvailable?: boolean;
}

const EXAMPLE_TRIPS = [
  {
    label: 'Family week in Goa · ₹60,000',
    prompt: '7 days in Goa from Bengaluru for me, my wife and our 10-year-old daughter. Budget ₹60,000. Comfortable family-friendly hotel, not too much walking.'
  },
  {
    label: 'Coorg weekend for two · ₹20,000',
    prompt: 'Weekend trip to Coorg for 2 adults from Bengaluru under ₹20,000. Scenic nature stay, relaxed pace.'
  },
  {
    label: 'Kerala with my parents · slow pace',
    prompt: '5-day trip to Munnar and Alleppey with my elderly parents from Kochi. Budget ₹45,000. Slow pace, private car, ground floor rooms.'
  },
  {
    label: 'Mysuru by train · day trip',
    prompt: 'Day trip to Mysuru from Bengaluru by Vande Bharat train for 2 adults. Palace visit, local food, under ₹6,000 budget.'
  }
];

export const DETAILED_DESTINATIONS = [
  'Goa',
  'Coorg',
  'Kerala',
  'Mysuru'
];

export const SUPPORTED_DESTINATIONS = DETAILED_DESTINATIONS;

const NOT_PLACES = new Set([
  'the', 'a', 'an', 'my', 'our', 'weekend', 'week', 'days', 'day', 'budget', 'summer', 'winter', 'monsoon',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec', 'india', 'total', 'peace', 'style'
]);

export const INTERNATIONAL_DESTINATIONS = [
  'paris', 'london', 'dubai', 'tokyo', 'bali', 'rome', 'new york',
  'switzerland', 'maldives', 'amsterdam', 'barcelona', 'bangkok',
  'phuket', 'krabi', 'singapore', 'vietnam', 'hanoi', 'danang', 'da nang'
];

export const UNPARSEABLE_MSG = "I couldn't understand that. Try something like: 3 days in Coorg for 2, budget ₹20,000.";

/** Heuristic for keyboard-mash input such as "asdfgh qwerty". */
export function looksLikeGibberish(text: string): boolean {
  const words = text.toLowerCase().match(/[a-z]+/g) || [];
  if (words.length === 0) return true;
  const bad = words.filter((w) => !/[aeiouy]/.test(w) || /[^aeiouy\s]{5,}/.test(w));
  return bad.length > 0 && bad.length >= Math.ceil(words.length / 2);
}

export function detectSupportedDestination(text: string): {
  isSupported: boolean;
  destinationName?: string;
  unsupportedTarget?: string;
  unparseable?: boolean;
} {
  const lower = text.toLowerCase();
  if (/\b(goa|panaji|panjim|calangute|baga|palolem)\b/.test(lower)) return { isSupported: true, destinationName: 'Goa' };
  if (/\b(coorg|kodagu|madikeri)\b/.test(lower)) return { isSupported: true, destinationName: 'Coorg' };
  if (/\b(kerala|munnar|alleppey|alappuzha|kumarakom|thekkady|wayanad|varkala|kovalam|cochin fort|fort kochi)\b/.test(lower)) return { isSupported: true, destinationName: 'Kerala' };
  if (/\b(mysuru|mysore)\b/.test(lower)) return { isSupported: true, destinationName: 'Mysuru' };

  if (looksLikeGibberish(text)) return { isSupported: false, unsupportedTarget: undefined, unparseable: true };

  // International places are unsupported
  for (const place of INTERNATIONAL_DESTINATIONS) {
    if (new RegExp(`\\b${place}\\b`).test(lower)) {
      const cap = place.replace(/\b\w/g, (c) => c.toUpperCase());
      return { isSupported: false, unsupportedTarget: cap };
    }
  }

  // Any other Indian place mentioned is supported for dynamic AI profile planning
  const match = text.match(/(?:trip\s+to|going\s+to|holiday\s+in|vacation\s+in|visit(?:ing)?|travel\s+to|explore|fly\s+to)\s+([A-Za-z]+)/i);
  if (match && match[1] && !NOT_PLACES.has(match[1].toLowerCase())) {
    const cap = match[1].charAt(0).toUpperCase() + match[1].slice(1);
    return { isSupported: true, destinationName: cap };
  }

  const words = text.trim().split(/\s+/);
  if (words.length === 1 && /^[A-Za-z]+$/.test(words[0]) && !NOT_PLACES.has(words[0].toLowerCase())) {
    const cap = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    return { isSupported: true, destinationName: cap };
  }

  return { isSupported: true };
}

export const DescribeScreen: React.FC<DescribeScreenProps> = ({
  onStartPlan,
  onTryDemo,
  onComparePlaces,
  isAiAvailable = false
}) => {
  const isOldVersion = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('v') === 'old';

  const [inputText, setInputText] = useState('');
  const [activeQuickCategory, setActiveQuickCategory] = useState<string | null>(null);
  const [selectedVibe, setSelectedVibe] = useState<'All' | 'Beach' | 'Hills' | 'Heritage' | 'Nature'>('All');
  const [compareSelected, setCompareSelected] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<{
    text: string;
    showChips: boolean;
    place?: string;
    suggestion?: DestinationSuggestion | null;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const speech = useSpeechInput({
    onFinalText: (text) => {
      setInputText((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
      setErrorMessage(null);
    }
  });
  const isListening = speech.status === 'listening';

  useEffect(() => {
    trackLandingView({ page_version: isOldVersion ? 'v_old' : 'v_new' });
  }, [isOldVersion]);

  const unsupportedError = (place: string) => {
    const suggestion = suggestAlternative(place);
    let text = '';
    if (suggestion) {
      if (suggestion.destination === 'Goa') {
        text = `AeroDAG plans trips within India. For beaches like ${place}, try Goa, Gokarna or the Andamans.`;
      } else if (suggestion.destination === 'Coorg') {
        text = `AeroDAG plans trips within India. For hills like ${place}, try Coorg, Ooty or Munnar.`;
      } else if (suggestion.destination === 'Mysuru') {
        text = `AeroDAG plans trips within India. For heritage and palaces like ${place}, try Mysuru, Udaipur or Jaipur.`;
      } else {
        text = `AeroDAG plans trips within India. For nature like ${place}, try Kerala, Wayanad or Kabini.`;
      }
    } else {
      text = `AeroDAG plans trips within India. Try popular destinations like Goa, Coorg, Kerala, or Mysuru.`;
    }
    return {
      text,
      showChips: true,
      place,
      suggestion
    };
  };

  const handleSubmit = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    if (isListening) speech.stop();
    const trimmed = (overrideText ?? inputText).trim();
    if (!trimmed) {
      setErrorMessage({ text: 'Describe your trip to get started.', showChips: false });
      return;
    }

    const check = detectSupportedDestination(trimmed);
    if (check.unparseable || looksLikeGibberish(trimmed)) {
      setErrorMessage({ text: UNPARSEABLE_MSG, showChips: true });
      return;
    }
    if (!check.isSupported && check.unsupportedTarget) {
      setErrorMessage(unsupportedError(check.unsupportedTarget));
      return;
    }
    if (!check.isSupported) {
      const byType = suggestFromTripType(trimmed);
      if (byType) {
        setErrorMessage({
          text: `Sounds like ${byType.tripType}. ${byType.destination} fits best: ${byType.reason}.`,
          showChips: true,
          suggestion: byType
        });
        return;
      }
    }
    if (!check.isSupported && (looksLikeGibberish(trimmed) || !isAiAvailable)) {
      setErrorMessage({ text: UNPARSEABLE_MSG, showChips: true });
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    trackInputSubmit({ promptLength: trimmed.length, hasVoice: isListening });
    try {
      const result = await onStartPlan(trimmed);
      if (typeof result === 'string' && result) {
        const unsupported = result.match(/^We can't plan (.+?) yet\./);
        setErrorMessage(unsupported ? unsupportedError(unsupported[1]) : { text: result, showChips: !/passed|calendar|end date|60 days/.test(result) });
      }
    } catch {
      setErrorMessage({ text: 'Something went wrong while reading your trip. Please try again.', showChips: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  const planInstead = (dest: string) => {
    const place = errorMessage?.place;
    const next = place ? swapPlaceInText(inputText, place, dest) : `${inputText.trim().replace(/[.\s]+$/, '')} in ${dest}`;
    setInputText(next);
    setErrorMessage(null);
    void handleSubmit(undefined, next);
  };

  const handleSelectExample = (prompt: string) => {
    setInputText(prompt);
    setErrorMessage(null);
  };

  const handleSelectChip = (dest: string) => {
    if (errorMessage?.place || errorMessage?.suggestion) {
      planInstead(dest);
      return;
    }
    const ex = EXAMPLE_TRIPS.find((t) => t.prompt.toLowerCase().includes(dest.toLowerCase()));
    if (ex) {
      setInputText(ex.prompt);
    } else {
      setInputText(`Trip to ${dest} from Bengaluru under ₹40,000 budget.`);
    }
    setErrorMessage(null);
  };

  const demoLockRef = React.useRef(false);
  const handleDemoClick = () => {
    if (demoLockRef.current || isSubmitting) return;
    demoLockRef.current = true;
    setIsSubmitting(true);
    trackDemoClick({ destination: 'Goa' });
    trackInputSubmit({ promptLength: 150, hasVoice: false, destinationMentioned: 'Goa' });
    if (onTryDemo) {
      onTryDemo();
    } else {
      onStartPlan('7 days in Goa from Bengaluru for me, my wife and our 10-year-old daughter. Budget ₹60,000. 14–20 Nov 2026. Comfortable family-friendly hotel, not too much walking.');
    }
    setTimeout(() => {
      demoLockRef.current = false;
      setIsSubmitting(false);
    }, 1500);
  };

  const handleVibeClick = (vibeId: 'All' | 'Beach' | 'Hills' | 'Heritage' | 'Nature', label: string) => {
    setSelectedVibe(vibeId);
    trackChipClick({ chipId: vibeId, label });
  };

  const toggleCompare = (destName: string) => {
    setCompareSelected((prev) => {
      if (prev.includes(destName)) {
        return prev.filter((d) => d !== destName);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), destName];
      }
      return [...prev, destName];
    });
  };

  const handleTriggerCompare = () => {
    if (compareSelected.length >= 2 && onComparePlaces) {
      onComparePlaces(compareSelected);
    }
  };

  const filteredCards = selectedVibe === 'All'
    ? DESTINATIONS
    : DESTINATIONS.filter((d) => d.vibe === selectedVibe);

  // ==========================================
  // OLD VERSION LAYOUT (Reachable via /?v=old)
  // ==========================================
  if (isOldVersion) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-14 animate-fade-in-slide">
        {/* Headings */}
        <div className="text-center space-y-3 mb-8 md:mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#15201D] font-heading">
            Plan a trip you can actually take.
          </h1>
          <p className="text-base sm:text-lg text-[#55625E] max-w-2xl mx-auto">
            Describe it like you'd tell a friend. We'll ask only what changes the plan — and keep it inside your budget.
          </p>
          <div className="pt-1 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleDemoClick}
              id="try-the-demo-link"
              aria-label="Try the demo trip to Goa"
              className="text-sm font-semibold text-[#0E6B59] hover:underline cursor-pointer inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#0E6B59] rounded px-1.5 py-0.5"
            >
              <span>✨ Try the demo</span>
            </button>
          </div>
        </div>

        {/* Main Textarea Card */}
        <form onSubmit={handleSubmit} className="card-consumer p-5 sm:p-6 mb-8 transition-shadow hover:shadow-md">
          <div className="space-y-2">
            <label htmlFor="trip-description-input" className="block text-xs font-semibold uppercase tracking-wider text-[#55625E]">
              Your trip
            </label>
            <textarea
              id="trip-description-input"
              rows={4}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="7 days in Goa from Bengaluru for me, my wife and our 10-year-old daughter. Budget ₹60,000. Comfortable family-friendly hotel, not too much walking."
              className="w-full bg-transparent border-0 resize-none text-[#15201D] placeholder-[#55625E]/60 text-base sm:text-lg focus:ring-0 focus:outline-none p-1 font-sans leading-relaxed"
            />
          </div>

          <div className="mt-4 pt-4 border-t border-[#E2E6E1] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-xs text-[#55625E]">
              Plan any trip in India · detailed guides for Goa, Coorg, Kerala, Mysuru · prices in INR
            </div>
            <button
              type="submit"
              className="btn-primary w-full sm:w-auto min-h-[44px]"
              disabled={isSubmitting}
            >
              <span>{isSubmitting ? 'Understanding…' : 'Plan my trip'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* Three Trust Cards (prompt 5 updated copy) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-12">
          <div className="card-consumer p-5 text-left space-y-2">
            <h2 className="text-base font-bold text-[#15201D] font-heading">Budget first</h2>
            <p className="text-sm text-[#55625E]">
              Budget first — we tell you if it fits, and what to change if it doesn't.
            </p>
          </div>
          <div className="card-consumer p-5 text-left space-y-2">
            <h2 className="text-base font-bold text-[#15201D] font-heading">Real travel times</h2>
            <p className="text-sm text-[#55625E]">No hidden 2-hour drives after a flight.</p>
          </div>
          <div className="card-consumer p-5 text-left space-y-2">
            <h2 className="text-base font-bold text-[#15201D] font-heading">Every price labelled</h2>
            <p className="text-sm text-[#55625E]">Sample, estimate or AI estimate — always visible.</p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // MODERN FIRST VIEW (Designer Feedback — Prompt 6)
  // No scroll on desktop; at 375px phone, input + at least 2 cards visible
  // ==========================================
  const selectedDays = 4;

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2 sm:py-4 animate-fade-in-slide">
      {/* Short Catchier Line replacing "Where should we go?" */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-1.5">
          <Compass className="h-4 w-4 text-[#0E6B59] shrink-0" />
          <span className="text-xs sm:text-sm font-bold text-[#15201D] font-heading">
            Pick a vibe or describe your trip
          </span>
        </div>

        {compareSelected.length >= 2 && (
          <button
            type="button"
            onClick={handleTriggerCompare}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0E6B59] text-white text-xs font-bold hover:bg-[#0A5546] shadow-sm transition animate-bounce cursor-pointer"
          >
            <GitCompare className="h-3.5 w-3.5" />
            <span>Compare {compareSelected.length} places →</span>
          </button>
        )}
      </div>

      {/* 1. Vibe Chips Row (Top of First View) */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        {[
          { id: 'All', label: 'All Vibes', icon: '✨' },
          { id: 'Beach', label: 'Beach', icon: '🏖️' },
          { id: 'Hills', label: 'Hills', icon: '⛰️' },
          { id: 'Heritage', label: 'Heritage', icon: '🏛️' },
          { id: 'Nature', label: 'Nature', icon: '🌿' }
        ].map((vibe) => (
          <button
            key={vibe.id}
            type="button"
            onClick={() => handleVibeClick(vibe.id as any, vibe.label)}
            className={`min-h-[36px] px-3 py-1.5 rounded-full text-xs font-semibold border transition flex items-center gap-1 cursor-pointer ${
              selectedVibe === vibe.id
                ? 'bg-[#0E6B59] text-white border-[#0E6B59] font-bold shadow-xs'
                : 'bg-white text-[#15201D] border-[#E2E6E1] hover:border-[#0E6B59]/40 hover:bg-[#E3F1EC]/30'
            }`}
          >
            <span>{vibe.icon}</span>
            <span>{vibe.label}</span>
          </button>
        ))}
      </div>

      {/* 2. Sleek Overlay-Style Input Box (Only as tall as placeholder needs, no wasted space) */}
      <form
        onSubmit={handleSubmit}
        className="card-consumer p-2.5 sm:p-3 mb-3 bg-white/95 backdrop-blur-xs border border-[#CBD5E1]/80 rounded-xl shadow-xs transition-shadow hover:shadow-md"
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1">
            <textarea
              id="trip-description-input"
              rows={1}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="e.g. 4 days in Coorg for 2 adults under ₹25,000, or: Coorg or Ooty by train"
              className="w-full bg-transparent border-0 resize-none text-[#15201D] placeholder-[#55625E]/60 text-xs sm:text-sm focus:ring-0 focus:outline-none p-1 font-sans leading-normal"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
            {speech.isSupported && (
              <button
                type="button"
                id="voice-input-button"
                onClick={speech.toggle}
                disabled={isSubmitting}
                aria-pressed={isListening}
                aria-label={isListening ? 'Stop voice input' : 'Speak your trip'}
                title={isListening ? 'Stop listening' : 'Speak your trip'}
                className={`min-h-[38px] h-9 px-3 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                  isListening
                    ? 'bg-[#C2410C] border-[#C2410C] text-white'
                    : 'bg-white border-[#CBD5E1] text-[#0E6B59] hover:bg-[#E3F1EC]'
                }`}
              >
                {isListening ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{isListening ? 'Stop' : 'Speak'}</span>
              </button>
            )}

            {/* Third button: Outline style, labelled "Demo" */}
            <button
              type="button"
              onClick={handleDemoClick}
              disabled={isSubmitting}
              id="demo-button"
              aria-label="Try Goa demo plan"
              className="min-h-[38px] h-9 px-3 rounded-lg border border-[#0E6B59] bg-white text-[#0E6B59] hover:bg-[#E3F1EC] text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#0E6B59]" />
              <span>Demo</span>
            </button>

            {/* Primary Plan Button */}
            <button
              type="submit"
              className="btn-primary min-h-[38px] h-9 px-4 rounded-lg text-xs font-bold disabled:opacity-70 disabled:cursor-wait flex items-center gap-1 shrink-0"
              aria-label="Plan my trip"
              aria-busy={isSubmitting}
              disabled={isSubmitting}
            >
              <span>{isSubmitting ? 'Understanding…' : 'Plan'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Voice status & errors if present */}
        {isListening && (
          <div id="voice-listening-status" role="status" aria-live="polite" className="mt-1.5 flex items-center gap-1.5 text-xs text-[#0E6B59]">
            <span className="w-2 h-2 rounded-full bg-[#C2410C] animate-pulse" />
            <span>Listening… {speech.interimText || 'Say where, days, travellers, budget'}</span>
          </div>
        )}

        {errorMessage && (
          <div
            id={errorMessage.showChips ? 'unsupported-destination-error' : 'empty-submit-error'}
            role="alert"
            className="mt-2 p-2.5 rounded-lg bg-[#FCEFD9] border border-[#8A4307]/30 text-xs text-[#8A4307] space-y-1 text-left"
          >
            <div className="font-semibold">{errorMessage.text}</div>
            {errorMessage.suggestion && (
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => planInstead(errorMessage.suggestion!.destination)}
                  className="inline-flex items-center gap-1 rounded-full bg-[#0E6B59] text-white text-[11px] font-semibold px-2.5 py-1 hover:bg-[#0B5547]"
                >
                  <span>Plan {errorMessage.suggestion.destination} instead</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </form>

      {/* 3. Destination Cards (Goa, Coorg, Mysuru, Kerala…) */}
      {/* At 375px phone screen width, 2 cards of 155px width sit side by side above the fold */}
      <section aria-labelledby="top-cards-heading" className="mb-4">
        <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0 snap-x snap-mandatory scrollbar-thin">
          {filteredCards.map((dest) => {
            const roughPerPerson = Math.round(dest.baseCostPerDayINR * selectedDays / 1000) * 1000;
            const isChecked = compareSelected.includes(dest.name);

            return (
              <div
                key={dest.name}
                onClick={() => {
                  trackCardClick({ destination: dest.name, days: selectedDays, pricePerPerson: roughPerPerson, vibe: dest.vibe });
                  void handleSubmit(undefined, `${selectedDays} days in ${dest.name} for 2 adults under budget ₹${(roughPerPerson * 2).toLocaleString('en-IN')}. ${dest.shortLine}`);
                }}
                className={`w-[155px] sm:w-[195px] shrink-0 snap-center rounded-xl border bg-white transition-all cursor-pointer flex flex-col justify-between overflow-hidden group ${
                  isChecked ? 'border-[#0E6B59] ring-2 ring-[#0E6B59]/20 shadow-md' : 'border-[#E2E6E1] hover:border-[#0E6B59] hover:shadow-md'
                }`}
              >
                {/* Image + Vibe Badge + Compare Checkbox */}
                <div className="relative h-20 sm:h-26 w-full bg-[#E2E6E1] overflow-hidden">
                  <img
                    src={dest.imageUrl}
                    alt={dest.name}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-1.5 left-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#0E6B59] bg-white/95 px-2 py-0.5 rounded-full shadow-xs">
                      {dest.vibe}
                    </span>
                  </div>

                  {/* Prompt 8: Compare Checkbox */}
                  <label
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute top-1.5 right-1.5 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold shadow-xs cursor-pointer ${
                      isChecked ? 'bg-[#0E6B59] text-white' : 'bg-white/95 text-[#15201D]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCompare(dest.name)}
                      className="rounded text-[#0E6B59] focus:ring-0 h-3 w-3 cursor-pointer"
                    />
                    <span>Compare</span>
                  </label>
                </div>

                {/* Card Content: Name, exact "~₹X per person · N days", Plan Button */}
                <div className="p-2.5 space-y-1.5 flex-1 flex flex-col justify-between text-left">
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm">{dest.icon}</span>
                      <h3 className="text-xs sm:text-sm font-bold text-[#15201D] font-heading truncate">
                        {dest.name}
                      </h3>
                    </div>
                    {/* Prompt 6 exact format: "~₹X per person · N days" */}
                    <div className="text-[10px] sm:text-[11px] font-bold text-[#15201D] mt-0.5">
                      ~₹{roughPerPerson.toLocaleString('en-IN')} per person · {selectedDays} days
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      trackCardClick({ destination: dest.name, days: selectedDays, pricePerPerson: roughPerPerson, vibe: dest.vibe });
                      void handleSubmit(undefined, `${selectedDays} days in ${dest.name} for 2 adults under budget ₹${(roughPerPerson * 2).toLocaleString('en-IN')}. ${dest.shortLine}`);
                    }}
                    className="w-full min-h-[44px] px-2.5 py-1.5 rounded-lg bg-[#0E6B59] text-white text-xs font-bold hover:bg-[#0A5546] transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                  >
                    <span>Plan</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Example Trips */}
      <div className="text-center space-y-1.5 mb-6">
        <div className="text-[11px] font-medium text-[#55625E]">Or start from an example</div>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {EXAMPLE_TRIPS.map((ex) => (
            <button key={ex.label} type="button" onClick={() => handleSelectExample(ex.prompt)} className="pill-chip text-xs">
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Icon Strip in Footer (NOT cards, so they don't look clickable) */}
      <footer className="mt-8 pt-4 border-t border-[#E2E6E1]/70 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#55625E]">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[#0E6B59]">₹</span>
          <span><strong>Budget first</strong> — we tell you if it fits, and what to change if it doesn't.</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-[#0E6B59]" />
          <span><strong>Real travel times</strong> — no hidden 2-hour drives after a flight.</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 text-[#0E6B59]" />
          <span><strong>Every price labelled</strong> — Sample, estimate or AI estimate.</span>
        </div>
      </footer>
    </div>
  );
};
