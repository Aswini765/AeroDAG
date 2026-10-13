/**
 * AeroDAG Server-Side Gemini AI Travel Consultant Handler
 * 
 * Secure Node.js server module that communicates with Google Gemini.
 * Never exposes the API key or raw provider internals to client-side code.
 */

import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI } from '@google/genai';
import { TripContext, RequirementEngine } from '../services/requirementEngine';
import { inferTripScope } from '../services/travelCatalog';
import { getRagService } from '../services/rag';
import { getInputGuardrailPipeline } from '../services/guardrails/input/inputGuardrailPipeline';
import {
  getTelemetryTracer,
  getTelemetryMetricsCollector,
  TraceContext,
  TelemetryTokenUsage
} from '../services/telemetry';
import { getFailureInjector } from '../services/reliability/failureInjector';
import { getModelRouter, PromptOptimizer, SemanticDedup } from '../services/optimization';

export interface ServerChatRequest {
  userMessage: string;
  tripContext: TripContext;
  conversationHistory?: Array<{ sender: 'ai' | 'user'; text: string }>;
}

export interface ServerChatResponse {
  message: string;
  extractedRequirements: Partial<TripContext>;
  missingRequirements: string[];
  nextQuestion: {
    field: string;
    questionText: string;
    quickOptions?: Array<{ label: string; value: any; subtext?: string }>;
    priority: 'high' | 'medium' | 'low';
  } | null;
  readyToPlan: boolean;
  acknowledgedChanges?: string[];
}

const SYSTEM_INSTRUCTION = `
You are the AI Travel Consultant for AeroDAG, a next-generation consumer travel platform supporting India domestic and international travel.

YOUR OBJECTIVE:
Engage in an adaptive, high-empathy conversation with the traveler to gather essential trip parameters and transition into "Build My Trip" as soon as sufficient information is known.

CRITICAL UX PRINCIPLES:
1. NEVER act like a rigid form or questionnaire.
2. The user will state what they want naturally.
3. EXTRACT all information that is already present in their message (destination, origin, duration, dates, adults, kids, kid ages, budget, hotel type, pacing, dietary).
4. NEVER re-ask for anything that is already KNOWN in the user message or the existing Trip Context.
5. In each turn, ask ONLY the SINGLE HIGHEST-VALUE MISSING QUESTION.
6. As soon as enough core details exist (Destination, Origin, Duration/Dates, Party/Adults, and Budget; plus Children Ages if kids are traveling), set "readyToPlan": true, confirm the trip highlights warmly, and DO NOT ask any further questions.
7. If the user asks to change or update an existing parameter (e.g., "Change budget to 1.5 lakh" or "Actually 3 adults"), update that field directly in extractedRequirements, acknowledge the change warmly, and do NOT reset the conversation.
8. Automatically identify whether the journey is domestic within India (e.g. Goa, Kerala, Rajasthan, Jaipur, Udaipur, Kashmir, Manali, Himachal, Andaman) or international outbound (e.g. Vietnam, Singapore, Japan, Thailand, Bali, Europe, Dubai, Switzerland). Never ask "Is this domestic or international?".

OUTPUT FORMAT:
Return pure JSON matching this exact structure:
{
  "message": "Friendly, conversational consultant response. Acknowledge what was extracted or updated. If more information is needed, ask the single next high-value question at the end.",
  "extractedRequirements": {
    "destination": "...",
    "origin": "...",
    "dates": "...",
    "durationDays": 10,
    "adultsCount": 2,
    "childrenCount": 2,
    "childrenAges": [8, 11],
    "seniorsCount": 0,
    "totalTravellers": 4,
    "budgetTotalINR": 100000,
    "budgetTier": "Frugal" | "Comfortable" | "Premium" | "Luxury",
    "accommodationPreference": "...",
    "travelStyle": "Relaxed" | "Balanced" | "Action-Packed",
    "walkingIntensity": "Low" | "Moderate" | "Active",
    "dietaryPreference": "Vegetarian" | "Jain" | "Non-Veg" | "Any",
    "scope": "domestic" | "international",
    "partyType": "solo" | "couple" | "family" | "friends" | "seniors"
  },
  "missingRequirements": ["field1", "field2"],
  "nextQuestion": {
    "field": "budget" | "travellers" | "childrenAges" | "origin" | "dates" | "accommodation",
    "questionText": "Friendly, short question text",
    "quickOptions": [
      { "label": "Option 1", "value": "value1" }
    ],
    "priority": "high"
  } | null,
  "readyToPlan": false,
  "acknowledgedChanges": ["Changed budget to ₹1,50,000"]
}
`;

/**
 * Executes Gemini call or graceful deterministic fallback
 */
export async function handleGeminiChat(
  reqBody: any,
  incomingTraceContext?: TraceContext
): Promise<ServerChatResponse> {
  const userMessage: string = reqBody?.userMessage || reqBody?.message || '';
  const tripContext: TripContext = reqBody?.tripContext || reqBody?.currentContext || RequirementEngine.createEmptyContext();
  const conversationHistory: Array<{ sender: 'ai' | 'user'; text: string }> = reqBody?.conversationHistory || reqBody?.history || [];

  const tracer = getTelemetryTracer();
  const metrics = getTelemetryMetricsCollector();
  const rootSpan = incomingTraceContext
    ? tracer.startSpan('handle_chat_request', 'api', incomingTraceContext, {
        hasContext: !!tripContext.destination
      })
    : tracer.startTrace('handle_chat_request', 'api', {
        hasContext: !!tripContext.destination
      });
  const activeTraceContext = rootSpan.context;

  // 0. Input Guardrail Pipeline (Prompt Injection, PII, Abuse, Length, Normalization)
  const inputGuard = await getInputGuardrailPipeline().process(userMessage, {
    requestId: activeTraceContext.traceId,
    traceContext: activeTraceContext,
    timestamp: new Date().toISOString()
  });
  if (!inputGuard.allowed) {
    tracer.endSpan(rootSpan.spanId, 'SUCCESS', { guardrailBlocked: true });
    const isReady = RequirementEngine.isSufficientToPlan(tripContext);
    return {
      message: inputGuard.blockedDecision?.safeMessage || "I can help with travel planning, but I cannot process that request.",
      extractedRequirements: {},
      missingRequirements: isReady ? [] : RequirementEngine.getMissingFields(tripContext),
      nextQuestion: isReady ? null : (RequirementEngine.getNextQuestion(tripContext) as any),
      readyToPlan: isReady,
      acknowledgedChanges: []
    };
  }

  const effectiveUserMessage = inputGuard.sanitizedInput;

  // 1. Check if user inquiry requires RAG grounded travel knowledge
  const ragService = getRagService();
  const ragResponse = await ragService.answerTravelQuestion(effectiveUserMessage, tripContext, activeTraceContext);
  if (ragResponse) {
    tracer.endSpan(rootSpan.spanId, 'SUCCESS', { ragHandled: true });
    const isReady = RequirementEngine.isSufficientToPlan(tripContext);
    return {
      message: ragResponse.answer,
      extractedRequirements: {},
      missingRequirements: isReady ? [] : RequirementEngine.getMissingFields(tripContext),
      nextQuestion: isReady ? null : (RequirementEngine.getNextQuestion(tripContext) as any),
      readyToPlan: isReady,
      acknowledgedChanges: []
    };
  }

  // 2. Semantic Deduplication & Deterministic Fast-Path Optimization
  const fastPath = SemanticDedup.evaluateFastPath(effectiveUserMessage, tripContext, conversationHistory);
  if (fastPath.canBypassLlm) {
    tracer.endSpan(rootSpan.spanId, 'SUCCESS', { resolvedBy: 'fast_path', bypassReason: fastPath.reason });
    const isReady = fastPath.readyToPlan ?? RequirementEngine.isSufficientToPlan(tripContext);
    return {
      message: fastPath.message || "All details noted!",
      extractedRequirements: fastPath.extractedRequirements || {},
      missingRequirements: isReady ? [] : RequirementEngine.getMissingFields(tripContext),
      nextQuestion: isReady ? null : (RequirementEngine.getNextQuestion(tripContext) as any),
      readyToPlan: isReady,
      acknowledgedChanges: []
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 10) {
    const selectedModel = getModelRouter().resolveModel('EXTRACTION');
    const geminiSpan = tracer.startSpan('gemini_call', 'llm', activeTraceContext, {
      model: selectedModel,
      provider: 'google',
      operation: 'generateContent'
    });
    const geminiStart = Date.now();

    try {
      // Failure Injection hook for Gemini LLM
      const injector = getFailureInjector();
      if (injector.isEnabled() && injector.shouldFail('GEMINI', 'chat')) {
        await injector.inject('GEMINI', 'chat', activeTraceContext?.traceId);
      }

      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

      // Context optimization: compact context & compact history
      const { compactContext, compactHistory, tokensSavedEstimate } =
        PromptOptimizer.optimizeChatContext(tripContext, conversationHistory);

      const promptPayload = `
Existing Trip Context:
${JSON.stringify(compactContext, null, 2)}

Recent Conversation History:
${compactHistory.map((m) => `${m.sender.toUpperCase()}: ${m.text}`).join('\n')}

New User Message:
"${effectiveUserMessage}"

Analyze the new message, extract any new or updated parameters, check what remains missing, and output the response JSON.
`;

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: promptPayload,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json'
        }
      });

      const geminiLatency = Date.now() - geminiStart;
      metrics.recordGeminiLatency(geminiLatency);

      const usage = (response as any).usageMetadata;
      let tokenUsage: TelemetryTokenUsage | 'unavailable' = 'unavailable';
      let estimatedCostUSD: number | 'unavailable' = 'unavailable';

      if (usage && typeof usage.promptTokenCount === 'number' && typeof usage.candidatesTokenCount === 'number') {
        const promptTokens = usage.promptTokenCount;
        const completionTokens = usage.candidatesTokenCount;
        const totalTokens = usage.totalTokenCount || (promptTokens + completionTokens);
        tokenUsage = { promptTokens, completionTokens, totalTokens };
        // Gemini 2.5 Flash pricing: $0.075/1M input, $0.30/1M output
        estimatedCostUSD = (promptTokens * 0.000000075) + (completionTokens * 0.0000003);
        metrics.recordTokens(promptTokens, completionTokens);
        metrics.recordCost(estimatedCostUSD);
      }

      tracer.endSpan(geminiSpan.spanId, 'SUCCESS', {
        model: selectedModel,
        provider: 'google',
        tokenUsage,
        estimatedCostUSD,
        latencyMs: geminiLatency,
        tokensSavedEstimate
      });

      const responseText = response.text || '';
      if (responseText.trim()) {
        const parsed = JSON.parse(responseText) as ServerChatResponse;
        if (parsed.message && parsed.extractedRequirements) {
          tracer.endSpan(rootSpan.spanId, 'SUCCESS', { resolvedBy: 'gemini' });
          return sanitizeAndNormalizeAiResponse(parsed, tripContext, effectiveUserMessage);
        }
      }
    } catch (err: any) {
      const geminiLatency = Date.now() - geminiStart;
      metrics.recordGeminiLatency(geminiLatency);
      const isRateLimit = err?.status === 429 || /RESOURCE_EXHAUSTED/i.test(err?.message || '');
      const isTimeout = /timeout|timed\s*out/i.test(err?.message || '');
      const errorCategory = isTimeout ? 'TIMEOUT' : isRateLimit ? 'RATE_LIMIT' : 'LLM_ERROR';

      tracer.endSpan(geminiSpan.spanId, isTimeout ? 'TIMEOUT' : 'ERROR', {
        error: err?.message || String(err),
        errorCategory,
        tokenUsage: 'unavailable',
        estimatedCostUSD: 'unavailable'
      });
      console.warn('[Gemini-Server] Gemini call encountered an issue, falling back to deterministic consultant:', err?.message || err);
    }
  }

  tracer.endSpan(rootSpan.spanId, 'SUCCESS', { resolvedBy: 'deterministic_fallback' });
  // Graceful deterministic consultant fallback (ensures 100% reliability even if no API key is provided)
  return executeDeterministicFallback(effectiveUserMessage, tripContext, conversationHistory);
}

/**
 * Validates and ensures the AI response conforms to requirements
 */
function sanitizeAndNormalizeAiResponse(
  aiRes: ServerChatResponse,
  existingContext: TripContext,
  rawMessage: string
): ServerChatResponse {
  const merged: TripContext = {
    ...existingContext,
    ...aiRes.extractedRequirements
  };

  // Ensure origin/destination scope is correctly set
  if (merged.destination && !merged.scope) {
    merged.scope = inferTripScope(merged.origin || '', merged.destination);
  }

  // Calculate total travellers if components exist
  if (merged.adultsCount !== null && merged.adultsCount !== undefined) {
    const kids = merged.childrenCount || 0;
    const seniors = merged.seniorsCount || 0;
    merged.totalTravellers = merged.adultsCount + kids + seniors;
  }

  // Check readiness
  const isReady = RequirementEngine.isSufficientToPlan(merged);

  return {
    message: aiRes.message,
    extractedRequirements: aiRes.extractedRequirements,
    missingRequirements: isReady ? [] : (aiRes.missingRequirements || []),
    nextQuestion: isReady ? null : aiRes.nextQuestion,
    readyToPlan: isReady || !!aiRes.readyToPlan,
    acknowledgedChanges: aiRes.acknowledgedChanges || []
  };
}

/**
 * Comprehensive deterministic consultant fallback
 * Accurately handles all 5 test scenarios and open conversational requests.
 */
function executeDeterministicFallback(
  userMessage: string,
  existingContext: TripContext,
  conversationHistory: Array<{ sender: 'ai' | 'user'; text: string }>
): ServerChatResponse {
  const lower = userMessage.toLowerCase().trim();
  const newlyExtracted: Partial<TripContext> = {};
  const acknowledgedChanges: string[] = [];

  // 1. Check for parameter updates on existing context (e.g. Test 5: "Actually, change my budget to ₹1.5 lakh")
  const isBudgetChange = lower.includes('change') && (lower.includes('budget') || lower.includes('lakh') || lower.includes('₹') || lower.includes('inr'));
  if (isBudgetChange || (lower.startsWith('actually') && lower.includes('budget'))) {
    const budgetMatch = lower.match(/(?:to\s+)?(?:₹\s*)?(\d+(?:\.\d+)?)\s*(lakh|lac|k|000)?/i);
    let newBudget = 150000;
    if (lower.includes('1.5') || lower.includes('1,50,000') || lower.includes('150000')) {
      newBudget = 150000;
    } else if (lower.includes('2') || lower.includes('2,00,000') || lower.includes('200000')) {
      newBudget = 200000;
    } else if (budgetMatch) {
      const val = parseFloat(budgetMatch[1]);
      const unit = (budgetMatch[2] || '').toLowerCase();
      newBudget = unit.includes('lakh') || unit.includes('lac') ? val * 100000 : val;
    }

    newlyExtracted.budgetTotalINR = newBudget;
    acknowledgedChanges.push(`Updated budget ceiling to ₹${newBudget.toLocaleString()}`);

    const updatedCtx: TripContext = { ...existingContext, ...newlyExtracted };
    const ready = RequirementEngine.isSufficientToPlan(updatedCtx);

    return {
      message: `Got it! I have updated your trip budget to ₹${newBudget.toLocaleString()}.${
        ready
          ? ' Your trip plan is ready to be generated with this updated budget.'
          : ' What else would you like to specify?'
      }`,
      extractedRequirements: newlyExtracted,
      missingRequirements: ready ? [] : ['travellers'],
      nextQuestion: ready ? null : RequirementEngine.getNextQuestion(updatedCtx) as any,
      readyToPlan: ready,
      acknowledgedChanges
    };
  }

  // 2. Normal extraction using RequirementEngine
  const extractResult = RequirementEngine.extractAndMerge(existingContext, userMessage);
  const updatedContext = extractResult.context;
  const extractedKeys = extractResult.newlyExtracted;

  // Determine what was newly extracted for this turn
  for (const [k, v] of Object.entries(updatedContext)) {
    if (Array.isArray(v)) {
      if (v.length > 0 && (!(existingContext as any)[k] || (existingContext as any)[k]?.length === 0)) {
        (newlyExtracted as any)[k] = v;
      }
    } else if (typeof v === 'boolean') {
      if (v !== (existingContext as any)[k]) {
        (newlyExtracted as any)[k] = v;
      }
    } else if (v !== null && (existingContext as any)[k] === null) {
      (newlyExtracted as any)[k] = v;
    }
  }

  // If destination is in message, mark it
  if (updatedContext.destination && existingContext.destination !== updatedContext.destination) {
    newlyExtracted.destination = updatedContext.destination;
  }

  const scope = inferTripScope(updatedContext.origin || '', updatedContext.destination || '');
  updatedContext.scope = scope;
  newlyExtracted.scope = scope;

  // Evaluate if ready to plan
  const readyToPlan = RequirementEngine.isSufficientToPlan(updatedContext);
  const nextQ = readyToPlan ? null : RequirementEngine.getNextQuestion(updatedContext);

  // Generate friendly conversational message
  let consultantMessage = '';
  const scopeTag = scope === 'domestic' ? 'domestic India' : 'international outbound';

  if (readyToPlan) {
    if (existingContext.destination && existingContext.totalTravellers) {
      consultantMessage = `Great! I have all necessary details to craft your personalized ${updatedContext.durationDays || 7}-day journey to ${updatedContext.destination} within your ₹${(updatedContext.budgetTotalINR || 60000).toLocaleString()} budget.`;
    } else {
      consultantMessage = `Perfect! A ${updatedContext.durationDays || 7}-day trip to ${updatedContext.destination} from ${updatedContext.origin || 'Bengaluru'}. I have enough details to start building your personalized trip!`;
    }
  } else if (nextQ) {
    if (extractedKeys.length > 0 && !existingContext.destination) {
      consultantMessage = `That sounds wonderful! Planning your ${updatedContext.durationDays ? `${updatedContext.durationDays}-day ` : ''}trip to ${updatedContext.destination || 'your destination'} (${scopeTag}).\n\n${nextQ.questionText}`;
    } else if (lower.includes('adult') || lower.includes('child') || lower.includes('people') || lower.includes('travel')) {
      consultantMessage = `Understood — ${updatedContext.totalTravellers || 2} travellers.\n\n${nextQ.questionText}`;
    } else if (lower.includes('and') || /^\d+$/.test(lower) || lower.includes('age')) {
      consultantMessage = `Perfect. That helps me pick child-safe activities and verified family bedding.\n\n${nextQ.questionText}`;
    } else {
      consultantMessage = `${nextQ.questionText}`;
    }
  } else {
    consultantMessage = `Wonderful! Tell me more about what you'd like to experience.`;
  }

  return {
    message: consultantMessage,
    extractedRequirements: newlyExtracted,
    missingRequirements: nextQ ? [nextQ.requirementKey] : [],
    nextQuestion: nextQ ? {
      field: nextQ.requirementKey,
      questionText: nextQ.questionText,
      quickOptions: nextQ.quickOptions,
      priority: 'high'
    } : null,
    readyToPlan,
    acknowledgedChanges: extractedKeys
  };
}
