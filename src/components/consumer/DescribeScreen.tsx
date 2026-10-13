import React, { useState } from 'react';
import { ArrowRight, DollarSign, Clock, Tag, Mic, Square } from 'lucide-react';
import { useSpeechInput } from '../../hooks/useSpeechInput';
import { suggestAlternative, swapPlaceInText, findKnownUnsupportedPlace, suggestFromTripType, DestinationSuggestion } from '../../services/destinationSuggestions';

interface DescribeScreenProps {
  /** Resolves to an error message to show, or null/void when planning moved on. */
  onStartPlan: (promptText: string) => Promise<string | null> | void;
  onTryDemo?: () => void;
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

export const SUPPORTED_DESTINATIONS = ['Goa', 'Coorg', 'Kerala', 'Mysuru'];

const NOT_PLACES = new Set([
  'the', 'a', 'an', 'my', 'our', 'weekend', 'week', 'days', 'day', 'budget', 'summer', 'winter', 'monsoon',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec', 'india', 'total', 'peace', 'style'
]);

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

  if (looksLikeGibberish(text)) return { isSupported: false, unparseable: true };

  // Well-known places we don't plan yet (Ooty, Jaipur, Pondicherry…)
  const known = findKnownUnsupportedPlace(text);
  if (known) return { isSupported: false, unsupportedTarget: known };

  // "trip to X", "holiday in X", "visit X"
  const match = text.match(/(?:trip\s+to|going\s+to|holiday\s+in|vacation\s+in|visit(?:ing)?|travel\s+to|explore|fly\s+to)\s+([A-Za-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (match && match[1] && !NOT_PLACES.has(match[1].split(/\s+/)[0].toLowerCase())) {
    const cap = match[1].charAt(0).toUpperCase() + match[1].slice(1);
    return { isSupported: false, unsupportedTarget: cap };
  }

  // Well-known places we don't cover yet (destinations only; origins like Delhi are fine)
  const knownElsewhere = [
    'paris', 'london', 'dubai', 'tokyo', 'singapore', 'bali', 'bangkok', 'phuket', 'rome', 'new york',
    'switzerland', 'maldives', 'amsterdam', 'barcelona', 'manali', 'jaipur', 'shimla', 'ladakh', 'ooty', 'rishikesh'
  ];
  for (const place of knownElsewhere) {
    if (new RegExp(`\\b${place}\\b`).test(lower)) {
      const cap = place.replace(/\b\w/g, (c) => c.toUpperCase());
      return { isSupported: false, unsupportedTarget: cap };
    }
  }

  // A single plain word is most likely a place name
  const words = text.trim().split(/\s+/);
  if (words.length === 1 && /^[A-Za-z]+$/.test(words[0]) && !NOT_PLACES.has(words[0].toLowerCase())) {
    const cap = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    return { isSupported: false, unsupportedTarget: cap };
  }

  return { isSupported: false, unparseable: true };
}

export const DescribeScreen: React.FC<DescribeScreenProps> = ({
  onStartPlan,
  onTryDemo,
  isAiAvailable = false
}) => {
  const [inputText, setInputText] = useState('');
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

  const UNPARSEABLE_MSG = 'We couldn\'t understand that. Try something like "5 days in Goa for 2, ₹40,000".';

  const unsupportedError = (place: string) => {
    const suggestion = suggestAlternative(place);
    return {
      text: suggestion
        ? `We can't plan ${place} yet. ${suggestion.destination} is the closest match: ${suggestion.reason}.`
        : `We can't plan ${place} yet. AeroDAG currently covers: ${SUPPORTED_DESTINATIONS.join(', ')}.`,
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
    if (!check.isSupported && check.unsupportedTarget) {
      setErrorMessage(unsupportedError(check.unsupportedTarget));
      return;
    }
    // No place named but a kind of trip is: offer the best-fitting destination instead of an error.
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
    // Keyboard mash is rejected locally; other unclear text goes to the AI when it is available.
    if (!check.isSupported && (looksLikeGibberish(trimmed) || !isAiAvailable)) {
      setErrorMessage({ text: UNPARSEABLE_MSG, showChips: true });
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
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

  /** Swap the unsupported place for a covered one and plan straight away, keeping dates, people and budget. */
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

  const handleDemoClick = () => {
    if (onTryDemo) {
      onTryDemo();
    } else {
      onStartPlan('7 days in Goa from Bengaluru for me, my wife and our 10-year-old daughter. Budget ₹60,000. 14–20 Nov 2026. Comfortable family-friendly hotel, not too much walking.');
    }
  };

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

        {/* Voice input status */}
        {isListening && (
          <div
            id="voice-listening-status"
            role="status"
            aria-live="polite"
            className="mt-2 flex items-start gap-2 text-sm text-[#0E6B59]"
          >
            <span className="mt-1.5 w-2 h-2 rounded-full bg-[#C2410C] animate-pulse shrink-0" aria-hidden="true" />
            <span>
              <span className="font-semibold">Listening…</span>{' '}
              <span className="text-[#55625E] italic">
                {speech.interimText || 'Say where, how long, who is going and your budget.'}
              </span>
            </span>
          </div>
        )}
        {speech.errorText && !isListening && (
          <div
            id="voice-input-error"
            role="alert"
            className="mt-2 text-xs text-[#8A4307] bg-[#FCEFD9] rounded-lg px-3 py-2 flex items-center justify-between gap-2"
          >
            <span>{speech.errorText}</span>
            <button type="button" onClick={speech.clearError} className="font-semibold underline shrink-0">
              Dismiss
            </button>
          </div>
        )}

        {/* Inline Error Callout if unsupported or empty */}
        {errorMessage && (
          <div
            id={errorMessage.showChips ? 'unsupported-destination-error' : 'empty-submit-error'}
            data-testid={errorMessage.showChips ? 'unsupported-destination-error' : 'empty-submit-error'}
            role="alert"
            className="mt-3 p-3.5 rounded-xl bg-[#FCEFD9] border border-[#8A4307]/30 text-xs text-[#8A4307] space-y-2 text-left"
          >
            <div className="font-semibold text-[#8A4307]">
              {errorMessage.text}
            </div>
            {errorMessage.suggestion && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
                <button
                  type="button"
                  id="plan-suggested-destination"
                  onClick={() => planInstead(errorMessage.suggestion!.destination)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#0E6B59] text-white text-xs font-semibold px-3.5 py-2 hover:bg-[#0B5547] focus-visible:ring-2 focus-visible:ring-[#0E6B59] focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  {errorMessage.place ? `Plan ${errorMessage.suggestion.destination} instead` : `Plan it in ${errorMessage.suggestion.destination}`}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <span className="text-[11px] text-[#8A4307]/80">Your dates, travellers and budget stay the same.</span>
              </div>
            )}
            {errorMessage.showChips && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] text-[#8A4307]/80">{errorMessage.suggestion ? 'Or:' : errorMessage.place ? 'Plan one of these instead:' : 'Explore:'}</span>
                {SUPPORTED_DESTINATIONS.map((dest) => (
                  <button
                    key={dest}
                    type="button"
                    onClick={() => handleSelectChip(dest)}
                    className="pill-chip text-xs bg-white text-[#0E6B59] hover:bg-[#E3F1EC] border border-[#0E6B59]/30"
                  >
                    {dest}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-[#E2E6E1] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-[#55625E]">
            <span id="covered-destinations-note">Now planning <strong className="font-semibold text-[#15201D]">Goa · Coorg · Kerala · Mysuru</strong> · prices in INR</span>
            {!isAiAvailable && (
              <span id="ai-basic-mode-note" className="inline-flex items-center gap-1.5 text-[#8A4307] bg-[#FCEFD9] px-2 py-0.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8A4307]" />
                AI parsing unavailable — using basic mode
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
          {speech.isSupported && (
            <button
              type="button"
              id="voice-input-button"
              onClick={speech.toggle}
              disabled={isSubmitting}
              aria-pressed={isListening}
              aria-label={isListening ? 'Stop voice input' : 'Speak your trip instead of typing'}
              title={isListening ? 'Stop listening' : 'Speak your trip'}
              className={`shrink-0 inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full border text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#0E6B59] focus-visible:outline-none ${
                isListening
                  ? 'bg-[#C2410C] border-[#C2410C] text-white hover:bg-[#9A3412]'
                  : 'bg-white border-[#0E6B59]/40 text-[#0E6B59] hover:bg-[#E3F1EC]'
              }`}
            >
              {isListening ? <Square className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
              <span>{isListening ? 'Stop' : 'Speak'}</span>
            </button>
          )}
          <button
            type="submit"
            className="btn-primary flex-1 sm:flex-none disabled:opacity-70 disabled:cursor-wait"
            aria-label="Plan my trip"
            aria-busy={isSubmitting}
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? 'Understanding your trip…' : 'Plan my trip'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          </div>
        </div>
      </form>

      {/* Example Chips */}
      <div className="text-center space-y-3 mb-12 md:mb-16">
        <div className="text-xs font-medium text-[#55625E]">
          Or start from an example
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {EXAMPLE_TRIPS.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => handleSelectExample(ex.prompt)}
              className="pill-chip"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {/* Three Trust Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Card 1 */}
        <div className="card-consumer p-5 text-left space-y-2">
          <div className="h-8 w-8 rounded-lg bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center">
            <span className="font-bold text-base leading-none">₹</span>
          </div>
          <h2 className="text-base font-bold text-[#15201D] font-heading">
            Budget first
          </h2>
          <p className="text-sm text-[#55625E] leading-normal">
            Plans fit your total. Upgrades are your choice.
          </p>
        </div>

        {/* Card 2 */}
        <div className="card-consumer p-5 text-left space-y-2">
          <div className="h-8 w-8 rounded-lg bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center">
            <Clock className="h-4 w-4" />
          </div>
          <h2 className="text-base font-bold text-[#15201D] font-heading">
            Real travel times
          </h2>
          <p className="text-sm text-[#55625E] leading-normal">
            No 2-hour drives hidden after a flight.
          </p>
        </div>

        {/* Card 3 */}
        <div className="card-consumer p-5 text-left space-y-2">
          <div className="h-8 w-8 rounded-lg bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center">
            <Tag className="h-4 w-4" />
          </div>
          <h2 className="text-base font-bold text-[#15201D] font-heading">
            Every price labelled
          </h2>
          <p className="text-sm text-[#55625E] leading-normal">
            Live, estimate or sample — always visible.
          </p>
        </div>
      </div>
    </div>
  );
};
