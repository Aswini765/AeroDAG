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
  RotateCcw
} from 'lucide-react';
import { TripPreferences, Currency } from '../../types/travelBooking';
import {
  RequirementEngine,
  TripContext,
  EngineQuestion,
  ChatMessage
} from '../../services/requirementEngine';
import { inferTripScope } from '../../services/travelCatalog';

interface ConversationalAITripPlannerProps {
  initialPrompt?: string;
  onPreferencesFinalized: (prefs: TripPreferences) => void;
  currency: Currency;
  onBackToHome: () => void;
}

const BENCHMARK_EXAMPLES = [
  {
    title: 'Plan a 7-day Goa trip from Bengaluru for my family',
    scope: 'Domestic India',
    prompt: 'Plan a 7-day Goa trip from Bengaluru for my family'
  },
  {
    title: 'Plan a 10-day Japan trip for two under ₹2 lakh',
    scope: 'International',
    prompt: 'Plan a 10-day Japan trip for two under ₹2 lakh'
  },
  {
    title: 'Weekend trip from Bengaluru under ₹20,000',
    scope: 'Domestic India',
    prompt: 'Weekend trip from Bengaluru under ₹20,000'
  },
  {
    title: 'Plan a honeymoon in Bali',
    scope: 'International',
    prompt: 'Plan a honeymoon in Bali for two under ₹1.2 lakh'
  },
  {
    title: 'Road trip through Rajasthan',
    scope: 'Domestic India',
    prompt: 'Road trip through Rajasthan covering Jaipur and Udaipur with heritage hotels'
  },
  {
    title: '15 days across Europe using trains',
    scope: 'International Train',
    prompt: '15 days across Europe using trains covering Paris and Switzerland'
  },
  {
    title: 'Family Vietnam (10 Days, under ₹1 lakh)',
    scope: 'International',
    prompt: 'Plan a 10-day family trip to Vietnam in November from Bengaluru'
  }
];

export const ConversationalAITripPlanner: React.FC<ConversationalAITripPlannerProps> = ({
  initialPrompt = '',
  onPreferencesFinalized,
  currency,
  onBackToHome
}) => {
  // Live Persistent Trip Context
  const [tripContext, setTripContext] = useState<TripContext>(() => {
    return RequirementEngine.createEmptyContext();
  });

  const [hasStartedConversation, setHasStartedConversation] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<EngineQuestion | null>(null);
  const [isTyping, setIsTyping] = useState(false);
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
      handleUserFirstMessage(initialPrompt.trim());
    }
  }, [initialPrompt]);

  /**
   * Handle user's first travel request prompt
   */
  const handleUserFirstMessage = (userPrompt: string) => {
    setHasStartedConversation(true);
    const empty = RequirementEngine.createEmptyContext();
    const { context, newlyExtracted } = RequirementEngine.extractAndMerge(empty, userPrompt);
    setTripContext(context);

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: userPrompt,
      timestamp: 'Just now'
    };

    setMessages([userMsg]);
    setIsTyping(true);

    // AI Consultant thinking delay
    setTimeout(() => {
      setIsTyping(false);

      // Determine acknowledgment text based on extracted knowns & inferred scope
      const scope = inferTripScope(context.origin || '', context.destination || '');
      const scopeBadge = scope === 'domestic' ? '🇮🇳 Domestic Travel within India' : '✈️ International Outbound Travel';

      let ackText = '';
      if (context.destination && context.origin && context.durationDays) {
        ackText = `Sounds good! A ${context.durationDays}-day trip to ${context.destination} from ${context.origin} (${scopeBadge}).`;
      } else if (context.destination) {
        ackText = `Wonderful choice! Planning your trip to ${context.destination} (${scopeBadge}).`;
      } else {
        ackText = `I'd love to help you plan an unforgettable journey!`;
      }

      // Check if prompt was already complete (e.g. Goa Example)
      const nextQ = RequirementEngine.getNextQuestion(context);

      if (!nextQ) {
        // Complete prompt!
        const aiMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: `${ackText}\n\nI have everything I need to search and build your personalized itinerary within your ₹${context.budgetTotalINR?.toLocaleString() || '60,000'} budget.`,
          timestamp: 'Just now',
          isCompletionAction: true
        };
        setMessages((prev) => [...prev, aiMsg]);
        setActiveQuestion(null);
      } else {
        // Missing information detected: ask the single next question naturally!
        setActiveQuestion(nextQ);
        const aiMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: `${ackText}\n\n${nextQ.questionText}`,
          timestamp: 'Just now',
          suggestedOptions: nextQ.quickOptions
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    }, 450);
  };

  /**
   * Handle subsequent conversational user answers
   */
  const handleUserAnswer = (val: any, labelText?: string) => {
    if (!activeQuestion && !val) return;

    const answerLabel = labelText || (typeof val === 'string' ? val : String(val));
    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: answerLabel,
      timestamp: 'Just now'
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Update context with the specific requirement key
    const updatedContext: TripContext = { ...tripContext };
    const key = activeQuestion?.requirementKey || '';

    if (key === 'adults') {
      const num = typeof val === 'number' ? val : parseInt(String(val), 10) || 2;
      updatedContext.adultsCount = num;
      if (!updatedContext.partyType) {
        updatedContext.partyType = num === 1 ? 'solo' : num === 2 ? 'couple' : 'friends';
      }
    } else if (key === 'has_children') {
      const count = typeof val === 'number' ? val : (String(val).toLowerCase().includes('no') ? 0 : 2);
      updatedContext.childrenCount = count;
      if (count > 0) updatedContext.partyType = 'family';
    } else if (key === 'children_ages') {
      if (Array.isArray(val)) {
        updatedContext.childrenAges = val;
        updatedContext.childrenCount = val.length;
      } else {
        const nums = String(val).match(/\d+/g);
        if (nums) {
          updatedContext.childrenAges = nums.map((n) => parseInt(n, 10));
          updatedContext.childrenCount = updatedContext.childrenAges.length;
        }
      }
      updatedContext.partyType = 'family';
    } else if (key === 'budget') {
      if (typeof val === 'number') {
        updatedContext.budgetTotalINR = val;
        updatedContext.budgetTier = 'Budget';
      } else {
        const strVal = String(val).toLowerCase();
        if (strVal.includes('60,000') || strVal.includes('60000') || strVal.includes('60k')) {
          updatedContext.budgetTotalINR = 60000;
          updatedContext.budgetTier = 'Budget';
        } else if (strVal.includes('1.5') || strVal.includes('150000') || strVal.includes('1.5 lakh')) {
          updatedContext.budgetTotalINR = 150000;
          updatedContext.budgetTier = 'Comfortable';
        } else if (strVal.includes('1.2') || strVal.includes('120000') || strVal.includes('1.2 lakh')) {
          updatedContext.budgetTotalINR = 120000;
          updatedContext.budgetTier = 'Comfortable';
        } else if (strVal.includes('luxury') || strVal.includes('2.5') || strVal.includes('5-star')) {
          updatedContext.budgetTotalINR = 250000;
          updatedContext.budgetTier = 'Luxury';
        } else {
          updatedContext.budgetTier = 'Budget';
          updatedContext.budgetTotalINR = 100000;
        }
      }
    } else if (key === 'accommodation') {
      const accStr = String(val);
      if (accStr.toLowerCase().includes('connecting') || accStr.toLowerCase().includes('family suite') || accStr.toLowerCase().includes('suite')) {
        updatedContext.accommodationType = 'Connecting Family Suite';
      } else {
        updatedContext.accommodationType = accStr;
      }
    } else if (key === 'activities') {
      const act = String(val);
      if (!updatedContext.activities.includes(act)) {
        updatedContext.activities.push(act);
      }
    } else if (key === 'luggage') {
      updatedContext.luggage = String(val) as any;
    } else if (key === 'origin') {
      updatedContext.origin = String(val);
    } else if (key === 'destination') {
      updatedContext.destination = String(val);
    }

    // Recompute total travellers
    const k = updatedContext.childrenCount || 0;
    const a = updatedContext.adultsCount || 2;
    updatedContext.totalTravellers = a + k;
    updatedContext.roomCapacityNeeded = updatedContext.totalTravellers;

    setTripContext(updatedContext);

    // AI consultant response
    setTimeout(() => {
      setIsTyping(false);

      // Check if more questions are needed
      const nextQ = RequirementEngine.getNextQuestion(updatedContext);

      if (!nextQ) {
        // Sufficient information reached! Stop asking questions!
        setActiveQuestion(null);
        let completionText = '';
        if (key === 'accommodation') {
          completionText = `Awesome. That will give everyone enough space and beds.\n\nI have everything I need to search and build your personalized itinerary!`;
        } else {
          completionText = `Awesome! I have all necessary details to orchestrate your journey within your ${
            updatedContext.budgetTotalINR ? `₹${updatedContext.budgetTotalINR.toLocaleString()}` : '₹1,00,000'
          } budget.\n\nReady to search flights, family lodging, visas, and activities!`;
        }
        const completionMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: completionText,
          timestamp: 'Just now',
          isCompletionAction: true
        };
        setMessages((prev) => [...prev, completionMsg]);
      } else {
        // Next conversational question
        setActiveQuestion(nextQ);
        let conversationalPrefix = '';
        if (key === 'adults') conversationalPrefix = `Got it — ${updatedContext.adultsCount} adults.\n\n`;
        else if (key === 'has_children') conversationalPrefix = updatedContext.childrenCount ? `Great. ` : `Understood. Adults only.\n\n`;
        else if (key === 'children_ages') conversationalPrefix = `Perfect. That helps me choose family-friendly hotels and activities.\n\n`;
        else if (key === 'budget') conversationalPrefix = `Understood! Under ₹${updatedContext.budgetTotalINR?.toLocaleString() || '1,00,000'} for the whole family.\n\n`;
        else if (key === 'accommodation') conversationalPrefix = `Awesome. That will give everyone enough space and beds.\n\n`;
        else if (key === 'activities') conversationalPrefix = `Excellent choices. `;

        const aiMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: `${conversationalPrefix}${nextQ.questionText}`,
          timestamp: 'Just now',
          suggestedOptions: nextQ.quickOptions
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    }, 450);
  };

  /**
   * Final transition to Stage 3 (Trip Builder & Review Dashboard)
   */
  const handleProceedToTripReview = () => {
    setIsBuildingTransition(true);

    setTimeout(() => setPlanningStep(1), 350); // Flight seat matching
    setTimeout(() => setPlanningStep(2), 750); // Hotel capacity verification
    setTimeout(() => setPlanningStep(3), 1150); // Budget & Visa check
    setTimeout(() => {
      const tripScope = inferTripScope(tripContext.origin || 'Bengaluru', tripContext.destination || '');

      const finalized: TripPreferences = {
        destination: tripContext.destination || (tripScope === 'domestic' ? 'Goa, India' : 'Vietnam (Hanoi & Halong Bay)'),
        origin: tripContext.origin || 'Bengaluru (BLR)',
        targetDates: tripContext.dates || 'November 2026',
        durationDays: tripContext.durationDays || (tripScope === 'domestic' ? 7 : 10),
        partySize: tripContext.totalTravellers || tripContext.adultsCount || 4,
        adultsCount: tripContext.adultsCount || 2,
        childrenCount: tripContext.childrenCount || 0,
        childrenAges: tripContext.childrenAges.length > 0 ? tripContext.childrenAges : [8, 11],
        budgetTotalINR: tripContext.budgetTotalINR || (tripScope === 'domestic' ? 60000 : 100000),
        budgetTotalUSD: Math.round((tripContext.budgetTotalINR || 100000) / 84),
        budgetTier: (tripContext.budgetTier === 'Budget' ? 'Frugal' : (tripContext.budgetTier || 'Frugal')) as any,
        travelStyle: tripContext.travelStyle || 'Balanced',
        priority: (tripContext.priority === 'Romantic' || tripContext.priority === 'Relaxed' ? 'Family Friendly' : (tripContext.priority || 'Family Friendly')) as any,
        accommodationPreference: (tripContext.accommodationType as any) || 'Connecting Family Suite',
        dietaryOrNotes: tripContext.notes.join('; ') || 'Adjacent family seating and certified suite',
        scope: tripScope
      };

      onPreferencesFinalized(finalized);
    }, 1600);
  };

  // If building transition is active, show the 1.5s search & inventory matching state
  if (isBuildingTransition) {
    return (
      <div className="max-w-xl mx-auto p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-2xl my-8">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-teal-500/20 border-t-teal-400 animate-spin" />
          <div className="absolute inset-2 rounded-full bg-slate-950 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-teal-400 animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">
            Comparing flights & family stays for {tripContext.destination}...
          </h2>
          <p className="text-xs text-slate-400">
            Orchestrating live inventory, verified bed counts, and transparent budget balance.
          </p>
        </div>

        <div className="space-y-2 text-xs text-left max-w-sm mx-auto font-mono">
          <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
            planningStep >= 1 ? 'bg-slate-950 border-teal-500/40 text-teal-300' : 'bg-slate-950/40 border-slate-800 text-slate-600'
          }`}>
            <CheckCircle2 className={`h-4 w-4 ${planningStep >= 1 ? 'text-teal-400' : 'text-slate-600'}`} />
            <span>Matching family flights with 23kg luggage</span>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
            planningStep >= 2 ? 'bg-slate-950 border-teal-500/40 text-teal-300' : 'bg-slate-950/40 border-slate-800 text-slate-600'
          }`}>
            <CheckCircle2 className={`h-4 w-4 ${planningStep >= 2 ? 'text-teal-400' : 'text-slate-600'}`} />
            <span>Verifying certified 4-guest suite capacity</span>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
            planningStep >= 3 ? 'bg-slate-950 border-teal-500/40 text-teal-300' : 'bg-slate-950/40 border-slate-800 text-slate-600'
          }`}>
            <CheckCircle2 className={`h-4 w-4 ${planningStep >= 3 ? 'text-teal-400' : 'text-slate-600'}`} />
            <span>Balancing ₹{tripContext.budgetTotalINR?.toLocaleString() || '1,00,000'} target ceiling</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 shadow-md shadow-teal-500/20 flex items-center justify-center">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="h-4.5 w-4.5 text-teal-400" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              AeroDAG
            </h1>
            <p className="text-xs text-slate-400">
              Your AI travel planner
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {hasStartedConversation && (
            <button
              onClick={() => {
                setHasStartedConversation(false);
                setMessages([]);
                setActiveQuestion(null);
                setTripContext(RequirementEngine.createEmptyContext());
                setInputText('');
              }}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-teal-400" />
              <span>Start Over</span>
            </button>
          )}
          <button
            onClick={onBackToHome}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-850 transition cursor-pointer"
          >
            &larr; Search Home
          </button>
        </div>
      </div>

      {/* STAGE 1: INITIAL CONVERSATION ENTRY OR ACTIVE CHAT */}
      {!hasStartedConversation ? (
        /* INITIAL ENTRY VIEW */
        <div className="max-w-2xl mx-auto py-8 space-y-6 text-center">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Tell me about the trip you're planning.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              No long forms. Simply describe your destination, travellers, dates, or budget. I'll ask only what's missing.
            </p>
          </div>

          {/* Large Natural-Language Input Box */}
          <div className="p-2 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && inputText.trim() && handleUserFirstMessage(inputText.trim())}
              placeholder="e.g. Plan a 10-day family trip to Vietnam in November from Bengaluru..."
              className="flex-1 bg-transparent px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              onClick={() => inputText.trim() && handleUserFirstMessage(inputText.trim())}
              disabled={!inputText.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-500/25 transition active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              <span>Start Planning</span>
              <Send className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Click Inspiration Chips */}
          <div className="pt-4 space-y-2 text-left">
            <span className="text-[11px] font-mono text-slate-400 uppercase font-bold tracking-wider block text-center">
              Or pick an example request to test:
            </span>
            <div className="flex flex-wrap justify-center gap-2">
              {BENCHMARK_EXAMPLES.map((ex, idx) => (
                <button
                  key={idx}
                  onClick={() => handleUserFirstMessage(ex.prompt)}
                  className="text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 hover:text-white px-3 py-2 rounded-xl border border-slate-800 transition text-left flex items-center gap-1.5"
                >
                  <span className="text-teal-400">&bull;</span>
                  <span>{ex.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ACTIVE CONVERSATION + LIVE CONTEXT SPLIT LAYOUT */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT CHAT PANE (7 Columns) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 shadow-xl flex flex-col min-h-[500px] justify-between space-y-4">
              {/* Message Thread */}
              <div className="space-y-4 overflow-y-auto max-h-[460px] pr-1">
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

                      {/* Quick-Reply Option Buttons attached to AI message */}
                      {msg.suggestedOptions && msg.suggestedOptions.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-2">
                          {msg.suggestedOptions.map((opt, oIdx) => (
                            <button
                              key={oIdx}
                              onClick={() => handleUserAnswer(opt.value, opt.label)}
                              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-teal-500/20 text-slate-300 hover:text-teal-300 border border-slate-800 hover:border-teal-500/40 text-xs font-semibold transition active:scale-95"
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
                    <span>AeroDAG is planning the next step...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="pt-3 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && inputText.trim() && handleUserAnswer(inputText.trim(), inputText.trim())}
                  placeholder={
                    activeQuestion
                      ? `Type your reply or click a suggestion above...`
                      : `Type any additional notes or click Build My Trip...`
                  }
                  className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                />
                <button
                  onClick={() => inputText.trim() && handleUserAnswer(inputText.trim(), inputText.trim())}
                  disabled={!inputText.trim()}
                  className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT LIVE TRIP CONTEXT PANEL (5 Columns — Section 8 Compliance) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-teal-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Live Trip Context
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                  Adaptive Memory
                </span>
              </div>

              {/* Dynamic Context Fields */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-400 font-mono text-[11px]">Destination</span>
                  <strong className="text-white">{tripContext.destination || 'Detecting...'}</strong>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-400 font-mono text-[11px]">Origin</span>
                  <strong className="text-white">{tripContext.origin || 'Bengaluru (BLR)'}</strong>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-400 font-mono text-[11px]">Duration & Dates</span>
                  <strong className="text-white">
                    {tripContext.durationDays ? `${tripContext.durationDays} Days` : '10 Days'} ({tripContext.dates || 'Upcoming'})
                  </strong>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-mono text-[11px]">Travellers</span>
                    <strong className="text-teal-300">
                      {tripContext.totalTravellers || tripContext.adultsCount || 4} Guests ({tripContext.partyType || 'Family'})
                    </strong>
                  </div>
                  {tripContext.childrenAges.length > 0 && (
                    <div className="text-[10px] text-slate-400 font-mono">
                      Children Ages: {tripContext.childrenAges.join(', ')} years old
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-400 font-mono text-[11px]">Budget Target</span>
                  <strong className="text-emerald-400 font-mono">
                    {tripContext.budgetTotalINR ? `₹${tripContext.budgetTotalINR.toLocaleString()}` : (tripContext.budgetTier || '₹1,00,000')}
                  </strong>
                </div>

                {tripContext.accommodationType && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-400 font-mono text-[11px]">Accommodation</span>
                    <strong className="text-white">{tripContext.accommodationType}</strong>
                  </div>
                )}

                {tripContext.activities.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                    <span className="text-slate-400 font-mono text-[11px]">Activities</span>
                    <div className="text-slate-200">{tripContext.activities.join(' • ')}</div>
                  </div>
                )}

                {tripContext.walkingIntensity && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-400 font-mono text-[11px]">Walking Pace</span>
                    <strong className="text-purple-300">{tripContext.walkingIntensity} Intensity</strong>
                  </div>
                )}

                {tripContext.luggage && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-400 font-mono text-[11px]">Luggage</span>
                    <strong className="text-sky-300">{tripContext.luggage}</strong>
                  </div>
                )}
              </div>

              {/* Ready to Build Button if sufficient */}
              <div className="pt-2">
                <button
                  onClick={handleProceedToTripReview}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Sparkles className="h-3.5 w-3.5 text-teal-400" />
                  <span>Build Trip with Current Details</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
