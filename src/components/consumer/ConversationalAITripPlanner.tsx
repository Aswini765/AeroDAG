import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Plane,
  Building,
  Users,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Luggage,
  ShieldCheck,
  Compass,
  Zap,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { TripPreferences, Currency, TripPlan } from '../../types/travelBooking';
import {
  RequirementEngine,
  TripContext,
  EngineQuestion,
  ChatMessage,
  RequirementEntity
} from '../../services/requirementEngine';
import { processTravelChat } from '../../services/aiTripService';
import { inferTripScope } from '../../services/travelCatalog';
import { TripPlanningEngine } from '../../services/tripPlanningEngine';
import { SourceTag } from './SourceTag';

interface ConversationalAITripPlannerProps {
  initialPrompt?: string;
  onPreferencesFinalized: (prefs: TripPreferences, tripPlan?: TripPlan) => void;
  currency: Currency;
  onBackToHome: () => void;
}

const BENCHMARK_EXAMPLES = [
  {
    title: 'Plan a 7-day Goa trip from Bengaluru for my family',
    scope: 'Domestic India',
    prompt:
      'Plan a 7-day Goa trip from Bengaluru for me, my wife and our 10-year-old daughter. Budget ₹60,000. We prefer comfortable family-friendly hotels and don\'t want too much walking.'
  },
  {
    title: 'Plan a 10-day family trip to Vietnam in November from Bengaluru',
    scope: 'International',
    prompt: 'Plan a 10-day family trip to Vietnam in November from Bengaluru.'
  },
  {
    title: 'Singapore trip for 5 days under ₹80,000',
    scope: 'International',
    prompt: 'I want to go to Singapore with my wife for 5 days under ₹80,000.'
  },
  {
    title: 'Comfortable 8-day trip to Thailand for 5',
    scope: 'International',
    prompt:
      'We are 2 adults, 2 kids aged 8 and 11, and my elderly mother. We want a comfortable 8-day trip to Thailand.'
  },
  {
    title: 'Weekend getaway from Bengaluru under ₹20,000',
    scope: 'Domestic India',
    prompt: 'Weekend trip from Bengaluru under ₹20,000'
  }
];

export const ConversationalAITripPlanner: React.FC<ConversationalAITripPlannerProps> = ({
  initialPrompt = '',
  onPreferencesFinalized,
  currency,
  onBackToHome
}) => {
  // Authoritative Single Trip Context
  const [tripContext, setTripContext] = useState<TripContext>(() => {
    return RequirementEngine.createEmptyContext();
  });

  const [hasStartedConversation, setHasStartedConversation] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<EngineQuestion | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isReadyToPlan, setIsReadyToPlan] = useState(false);
  const [isBuildingTransition, setIsBuildingTransition] = useState(false);
  const [planningStep, setPlanningStep] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // If initialPrompt was provided from Home Page, kick off conversation automatically
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim().length > 0 && !hasStartedConversation) {
      handleUserSubmit(initialPrompt.trim());
    }
  }, [initialPrompt]);

  /**
   * Main Conversational Interaction Handler
   * Works for free text input, quick chips, and parameter updates.
   */
  const handleUserSubmit = async (userText: string) => {
    if (!userText.trim()) return;

    setHasStartedConversation(true);
    setInputText('');

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: 'Just now'
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const aiResponse = await processTravelChat({
        userMessage: userText,
        tripContext,
        conversationHistory: messages
      });

      // Update the authoritative Trip Context
      const updatedContext: TripContext = {
        ...tripContext,
        ...aiResponse.extractedRequirements
      };

      // Re-evaluate scope
      if (updatedContext.destination) {
        updatedContext.scope = inferTripScope(updatedContext.origin || '', updatedContext.destination);
      }

      setTripContext(updatedContext);
      setIsReadyToPlan(aiResponse.readyToPlan);
      setActiveQuestion(aiResponse.nextQuestion as any);

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: aiResponse.message,
        timestamp: 'Just now',
        suggestedOptions: aiResponse.nextQuestion?.quickOptions,
        isCompletionAction: aiResponse.readyToPlan
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      // Clean fallback if anything unexpected happens
      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: "I've noted that! Could you tell me a little more about your travel dates or preferences?",
        timestamp: 'Just now'
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  /**
   * Transition to Stage 3 (Trip Builder & Review Dashboard)
   * Progressive friendly loading steps (Requirement 16)
   */
  const handleProceedToTripReview = async () => {
    setIsBuildingTransition(true);
    setPlanningStep(0);

    const stepTimer1 = setTimeout(() => setPlanningStep(1), 300); // Finding suitable options...
    const stepTimer2 = setTimeout(() => setPlanningStep(2), 650); // Building your itinerary...
    const stepTimer3 = setTimeout(() => setPlanningStep(3), 1000); // Checking your budget...
    const stepTimer4 = setTimeout(() => setPlanningStep(4), 1350); // Preparing your trip...

    try {
      const tripPlan = await TripPlanningEngine.generateTripPlan(tripContext);

      setTimeout(() => {
        const tripScope = tripPlan.scope;

        const finalized: TripPreferences = {
          destination: tripPlan.destination,
          origin: tripPlan.origin,
          targetDates: tripPlan.dates,
          durationDays: tripPlan.durationDays,
          partySize: tripPlan.travellers.total,
          adultsCount: tripPlan.travellers.adults,
          childrenCount: tripPlan.travellers.children,
          childrenAges: tripPlan.travellers.childAges,
          budgetTotalINR: tripPlan.budget.targetINR,
          budgetTotalUSD: Math.round(tripPlan.budget.targetINR / 84),
          budgetTier: (tripContext.budgetTier === 'Budget' ? 'Frugal' : (tripContext.budgetTier || 'Frugal')) as any,
          travelStyle: (tripContext.travelStyle === 'Comfortable' ? 'Balanced' : (tripContext.travelStyle || 'Balanced')) as any,
          priority: (tripContext.partyType === 'family' ? 'Family Friendly' : 'Lowest Price') as any,
          accommodationPreference: (tripContext.accommodationPreference as any) || 'Connecting Family Suite',
          dietaryOrNotes: tripContext.notes.join('; ') || 'Adjacent seating request and family room capacity',
          scope: tripScope,
          transportMode: tripContext.transportMode || undefined,
          dietaryPreference: tripContext.dietaryPreference || undefined,
          selectedTrain: tripPlan.selectedTrain
        };

        onPreferencesFinalized(finalized, tripPlan);
      }, 1600);
    } catch (e) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      clearTimeout(stepTimer4);
      setIsBuildingTransition(false);
    }
  };

  const entityClassification: RequirementEntity[] = RequirementEngine.evaluateRequirementClassification(tripContext);

  // If transition animation is running (Requirement 16)
  if (isBuildingTransition) {
    const loadingSteps = [
      'Understanding your trip...',
      'Finding suitable options...',
      'Building your itinerary...',
      'Checking your budget...',
      'Preparing your trip...'
    ];

    return (
      <div className="max-w-xl mx-auto p-10 md:p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-2xl my-8">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-teal-500/20 border-t-teal-400 animate-spin" />
          <div className="absolute inset-2 rounded-full bg-slate-950 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-teal-400 animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">
            {loadingSteps[planningStep] || 'Preparing your trip...'}
          </h2>
          <p className="text-xs text-slate-400">
            Crafting your personalized journey for {tripContext.destination || 'your destination'}.
          </p>
        </div>

        <div className="space-y-2.5 text-xs text-left max-w-sm mx-auto font-mono">
          {loadingSteps.map((stepText, idx) => {
            const isCompleted = planningStep > idx;
            const isCurrent = planningStep === idx;
            return (
              <div
                key={idx}
                className={`flex items-center gap-2.5 p-2 rounded-xl transition ${
                  isCompleted
                    ? 'text-teal-300 bg-teal-500/10 border border-teal-500/20'
                    : isCurrent
                    ? 'text-amber-300 bg-amber-500/10 border border-amber-500/20'
                    : 'text-slate-600 bg-slate-950/40'
                }`}
              >
                <CheckCircle2
                  className={`h-4 w-4 ${
                    isCompleted
                      ? 'text-teal-400'
                      : isCurrent
                      ? 'text-amber-400 animate-pulse'
                      : 'text-slate-700'
                  }`}
                />
                <span className={isCurrent ? 'font-bold' : ''}>{stepText}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-teal-400" />
              <span>AeroDAG AI Travel Consultant</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Describe your journey naturally. We extract requirements and ask only high-value missing details.
          </p>
        </div>

        <button
          onClick={onBackToHome}
          className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 self-start sm:self-auto hover:bg-slate-900 transition"
        >
          &larr; Back to Home
        </button>
      </div>

      {/* Main Grid: Chat Thread (8 cols) & Live Trip Summary (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: CHAT INTERACTION */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 md:p-6 shadow-xl flex flex-col justify-between min-h-[560px]">
            {/* Quick Benchmark Prompt Suggestions (if conversation not started) */}
            {!hasStartedConversation && (
              <div className="space-y-4 mb-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-teal-400 font-bold block">
                    Try a natural-language request:
                  </span>
                  <div className="grid grid-cols-1 gap-2 pt-1">
                    {BENCHMARK_EXAMPLES.map((ex, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleUserSubmit(ex.prompt)}
                        className="text-left p-3 rounded-xl bg-slate-900 hover:bg-slate-850 hover:border-teal-500/40 border border-slate-800 text-xs transition group cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-slate-300 group-hover:text-white font-medium">
                          <span>"{ex.prompt}"</span>
                          <span className="text-[10px] font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded shrink-0 ml-2">
                            {ex.scope}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Conversation Messages Thread */}
            <div className="space-y-4 overflow-y-auto max-h-[460px] pr-1 flex-1">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-teal-600 text-slate-950 font-medium rounded-tr-none shadow-md shadow-teal-600/10'
                        : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none space-y-3 shadow-md'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {/* Quick-Reply Option Buttons */}
                    {msg.suggestedOptions && msg.suggestedOptions.length > 0 && !isReadyToPlan && (
                      <div className="pt-2 flex flex-wrap gap-2">
                        {msg.suggestedOptions.map((opt, oIdx) => (
                          <button
                            key={oIdx}
                            onClick={() => handleUserSubmit(typeof opt.value === 'string' ? opt.value : opt.label)}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-teal-500/20 text-slate-300 hover:text-teal-300 border border-slate-800 hover:border-teal-500/40 text-xs font-semibold transition active:scale-95 cursor-pointer"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Prominent Completion CTA Button inside chat */}
                    {msg.isCompletionAction && (
                      <div className="pt-3 border-t border-slate-800/80">
                        <button
                          onClick={handleProceedToTripReview}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-teal-500/25 transition active:scale-95 cursor-pointer"
                        >
                          <span>Build My Trip</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* AI Typing Indicator */}
              {isTyping && (
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono p-2">
                  <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
                  <span>AeroDAG Consultant is thinking...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="pt-3 border-t border-slate-800 space-y-2 mt-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && inputText.trim() && handleUserSubmit(inputText.trim())}
                  placeholder={
                    isReadyToPlan
                      ? "Make any changes (e.g. 'Change budget to 1.5 lakh') or click Build My Trip..."
                      : activeQuestion
                      ? `Type your reply or click a suggested option above...`
                      : `Type your travel plan...`
                  }
                  className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                />
                <button
                  onClick={() => inputText.trim() && handleUserSubmit(inputText.trim())}
                  disabled={!inputText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  <span>Send</span>
                </button>
              </div>

              {/* Ready to Plan bottom action */}
              {isReadyToPlan && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 text-xs text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Sufficient parameters gathered. Ready to plan your trip!</span>
                  </div>
                  <button
                    onClick={handleProceedToTripReview}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-md shadow-emerald-500/20"
                  >
                    <span>Build My Trip</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: WHAT WE UNDERSTOOD (Section 3 Requirement) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-teal-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  What we understood
                </h3>
              </div>
              <span className="text-[10px] font-mono text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                {tripContext.scope === 'domestic' ? '🇮🇳 Domestic' : tripContext.scope === 'international' ? '✈️ International' : 'Domestic'}
              </span>
            </div>

            {/* Classified Requirements: Stated vs Assumed vs Needed */}
            <div className="space-y-2.5 text-xs">
              {entityClassification.map((ent) => (
                <div
                  key={ent.key}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 font-mono text-[11px]">{ent.label}</span>
                    <div className="flex items-center gap-1.5">
                      {ent.userFacingTag === 'stated' && (
                        <SourceTag kind="stated" label="stated" />
                      )}
                      {ent.userFacingTag === 'assumed' && (
                        <SourceTag kind="assumed" label="assumed" />
                      )}
                      {ent.userFacingTag === 'needed' && (
                        <span className="px-1.5 py-0.5 rounded font-mono text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          Needed
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-white text-xs">{ent.displayValue}</strong>
                    {ent.isEditable && (
                      <span className="text-[10px] text-teal-400/80 hover:text-teal-300 cursor-pointer font-mono">
                        edit
                      </span>
                    )}
                  </div>
                  {ent.assumedDescription && (
                    <p className="text-[10px] text-slate-500 italic leading-snug">
                      {ent.assumedDescription}
                    </p>
                  )}
                </div>
              ))}

              {/* Domestic Trip Regulatory Note */}
              {tripContext.scope === 'domestic' && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                  Domestic trip — no passport or visa details needed.
                </div>
              )}
            </div>

            {/* Direct Proceed Button if ready */}
            {isReadyToPlan && (
              <button
                onClick={handleProceedToTripReview}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-teal-500/25 transition active:scale-95 cursor-pointer"
              >
                <span>Build My Trip</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
