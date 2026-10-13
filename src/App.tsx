/**
 * AeroDAG — Consumer Travel Planning & Booking Platform
 * Phase 4: Light, calm, readable, consumer-friendly redesign.
 */

import React, { useState, useEffect } from 'react';
import { ConsumerNavbar, FlowStep } from './components/consumer/ConsumerNavbar';
import { DescribeScreen } from './components/consumer/DescribeScreen';
import { ClarifyScreen, validateTravelDate } from './components/consumer/ClarifyScreen';
import { callParseTrip, applyAiParse, ParseTripResult } from './services/aiTripParser';
import { resolveTravelDates } from './services/dateResolver';
import { LoadingPlanScreen } from './components/consumer/LoadingPlanScreen';
import { PlanScreen } from './components/consumer/PlanScreen';
import { CheckoutBookingFlow } from './components/consumer/CheckoutBookingFlow';
import { BookingConfirmationView } from './components/consumer/BookingConfirmationView';
import { MyTripsView } from './components/consumer/MyTripsView';
import { HowItWorksModal } from './components/consumer/HowItWorksModal';

import {
  TripPreferences,
  Currency,
  ConfirmedBookingRecord,
  TripPlan
} from './types/travelBooking';
import { TripContext, RequirementEngine } from './services/requirementEngine';
import { TripPlanningEngine } from './services/tripPlanningEngine';
import { getTripSummary } from './services/tripSummaryHelper';
import { KeepTripsCard } from './components/consumer/KeepTripsCard';
import {
  initializeAuth,
  continueWithEmail,
  rememberGuestTrip,
  carryOverGuestTrips,
  signOutAndResetGuest,
  isSupabaseConfigured,
  supabase,
  User as SupabaseUser,
  getTripStore
} from './services/persistence';

export default function App() {
  const [currentStep, setCurrentStep] = useState<FlowStep>('describe');
  const [currency, setCurrency] = useState<Currency>('INR');
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  // Phase 6: Supabase Auth & Session State
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [isAuthAnonymous, setIsAuthAnonymous] = useState<boolean>(true);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);

  // Phase 6: Trips loading & error states
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  const [tripsLoadError, setTripsLoadError] = useState<string | null>(null);

  // Active Trip State
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [tripContext, setTripContext] = useState<TripContext>(() => RequirementEngine.createEmptyContext());
  const [activeTripPlan, setActiveTripPlan] = useState<TripPlan | null>(null);
  const [tripPreferences, setTripPreferences] = useState<TripPreferences | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);

  // Confirmed bookings list
  const [confirmedTrips, setConfirmedTrips] = useState<ConfirmedBookingRecord[]>([]);
  const [latestConfirmedRecord, setLatestConfirmedRecord] = useState<ConfirmedBookingRecord | null>(null);
  const [isAiAvailable, setIsAiAvailable] = useState(false);
  // Optional "keep your trips" email card after booking (guests only)
  const [bookingContactEmail, setBookingContactEmail] = useState<string | undefined>(undefined);
  const [bookingEmailCardDismissed, setBookingEmailCardDismissed] = useState(false);
  const carryOverRunning = React.useRef(false);
  // Which My Trips tab the top-bar link opened ("Saved plans" opens straight on saved plans)
  const [myTripsTab, setMyTripsTab] = useState<'booked' | 'saved' | undefined>(undefined);
  const savedPlansCount = confirmedTrips.filter((t) => t.bookingId?.startsWith('draft_')).length;

  const fetchTrips = async (offline: boolean = isOfflineMode) => {
    setIsLoadingTrips(true);
    setTripsLoadError(null);
    try {
      const store = getTripStore(offline);
      const trips = await store.listTrips();
      setConfirmedTrips(trips);
    } catch (err: any) {
      console.warn('Failed to load trips:', err);
      setTripsLoadError(err?.message || "Couldn't load your trips. Retry");
    } finally {
      setIsLoadingTrips(false);
    }
  };

  // Phase 6: Initialize Auth Session on mount
  useEffect(() => {
    let isMounted = true;

    initializeAuth().then((res) => {
      if (!isMounted) return;
      setAuthUser(res.user);
      setIsAuthAnonymous(res.isAnonymous);
      setIsOfflineMode(res.isOffline);
      fetchTrips(res.isOffline);
    });

    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!isMounted) return;
        if (session?.user) {
          setAuthUser(session.user);
          const anon = session.user.is_anonymous ?? !session.user.email;
          setIsAuthAnonymous(anon);
          setIsOfflineMode(false);
          if (!anon && !carryOverRunning.current) {
            // Signed in with email: bring along trips saved as a guest on this device
            carryOverRunning.current = true;
            carryOverGuestTrips(session.user.id, getTripStore(false))
              .catch(() => 0)
              .finally(() => {
                carryOverRunning.current = false;
                fetchTrips(false);
              });
          } else {
            fetchTrips(false);
          }
        } else {
          setAuthUser(null);
          setIsAuthAnonymous(true);
        }
      });

      return () => {
        isMounted = false;
        subscription?.unsubscribe();
      };
    }
  }, []);

  // Check backend config on mount to detect Gemini key presence
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('basic') === '1' || params.get('ai') === '0') {
      setIsAiAvailable(false);
      return;
    }
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        setIsAiAvailable(!!data.hasGeminiKey);
      })
      .catch(() => {
        setIsAiAvailable(false);
      });
  }, []);

  // Scroll to top on step change (Section 11)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Support direct URL query parameter routing for preview & verification (?view=...)
  // Strictly restricted to development mode (import.meta.env.DEV) or behind a ?demo=1 flag.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isDevOrDemo = import.meta.env.DEV || params.get('demo') === '1';
    const view = params.get('view');
    if (!view || !isDevOrDemo) return;

    const initDemo = async () => {
      const ctx = RequirementEngine.createEmptyContext();
      ctx.destination = 'Goa, India';
      ctx.origin = 'Bengaluru (BLR)';
      ctx.durationDays = 7;
      ctx.budgetTotalINR = 60000;
      ctx.partyType = 'family';
      ctx.totalTravellers = 3;
      ctx.adultsCount = 2;
      ctx.childrenCount = 1;
      ctx.childrenAges = [10];
      ctx.walkingIntensity = 'Low';
      ctx.dates = '12–18 Nov 2026';
      setTripContext(ctx);

      const prompt = 'Family week in Goa with my wife and our 10-year-old daughter. Budget ₹60,000. Not too much walking.';
      setCurrentPrompt(prompt);

      if (view === 'describe') {
        setCurrentStep('describe');
        return;
      }

      if (view === 'clarify') {
        ctx.dates = null;
        setCurrentStep('clarify');
        return;
      }

      const plan = await TripPlanningEngine.buildDeterministicPlan(ctx);
      const prefs: TripPreferences = {
        destination: plan.destination,
        origin: plan.origin,
        targetDates: plan.dates,
        durationDays: plan.durationDays,
        partySize: plan.travellers.total,
        adultsCount: plan.travellers.adults,
        childrenCount: plan.travellers.children,
        childrenAges: plan.travellers.childAges,
        budgetTotalINR: plan.budget.targetINR,
        budgetTotalUSD: Math.round(plan.budget.targetINR / 84),
        budgetTier: 'Comfortable',
        travelStyle: 'Relaxed',
        priority: 'Family Friendly',
        accommodationPreference: 'Connecting Family Suite',
        dietaryOrNotes: 'Low walking; family with 10yo child',
        scope: 'domestic'
      };

      const sampleBooking: ConfirmedBookingRecord = {
        bookingId: 'AD-GOA-7821',
        pnr: 'AD-GOA-7821',
        hotelVoucherId: 'HTL-GOA-901',
        tripTitle: '7 days in Goa',
        destination: 'Goa, India',
        origin: 'Bengaluru (BLR)',
        travelDates: '12–18 Nov 2026',
        createdAt: new Date().toISOString(),
        status: 'SIMULATED',
        totalPaidINR: plan.budget.grandTotalINR,
        totalPaidUSD: Math.round(plan.budget.grandTotalINR / 84),
        budgetTotalINR: 60000,
        remainingBudgetINR: Math.max(0, 60000 - plan.budget.grandTotalINR),
        passengers: [
          { type: 'ADULT', title: 'Mr', firstName: 'Aarav', lastName: 'Kumar' },
          { type: 'ADULT', title: 'Ms', firstName: 'Priya', lastName: 'Kumar' },
          { type: 'CHILD', title: 'Miss', firstName: 'Ananya', lastName: 'Kumar', age: 10 }
        ],
        selectedFlight: plan.flight,
        selectedHotel: plan.hotel,
        selectedTransfer: plan.transfer,
        itinerary: plan.itinerary,
        scope: 'domestic'
      };

      if (view === 'plan') {
        setActiveTripPlan(plan);
        setTripPreferences(prefs);
        setCurrentStep('plan');
      } else if (view === 'plan_overbudget') {
        const overPlan: TripPlan = {
          ...plan,
          budget: {
            ...plan.budget,
            targetINR: 60000,
            grandTotalINR: 72500,
            isOverBudget: true,
            remainingBudgetINR: 0,
            overBudgetAmountINR: 12500
          }
        };
        setActiveTripPlan(overPlan);
        setTripPreferences(prefs);
        setCurrentStep('plan');
      } else if (view === 'plan_infeasible') {
        const infeasiblePlan: TripPlan = {
          ...plan,
          status: 'infeasible',
          shortfallINR: 18200,
          concreteFixes: [
            {
              id: 'fix_nights',
              actionType: 'fewer_nights',
              title: 'Shorten trip to 5 days',
              description: 'Reduce accommodation to 4 nights to fit within ₹60,000 budget.',
              rupeeImpactINR: 14500
            },
            {
              id: 'fix_train',
              actionType: 'mode_switch',
              title: 'Switch flight to Yesvantpur – Vasco da Gama Express',
              description: 'Travel by 2-Tier AC sleeper rail (Train 17309: YPR to VSG) with confirmed berths.',
              rupeeImpactINR: 14160
            },
            {
              id: 'fix_hotel',
              actionType: 'budget_hotel',
              title: 'Switch to verified 3-star resort',
              description: 'Stay in beachfront standard resort with family amenities.',
              rupeeImpactINR: 8800
            }
          ]
        };
        setActiveTripPlan(infeasiblePlan);
        setTripPreferences(prefs);
        setCurrentStep('plan');
      } else if (view === 'review') {
        setActiveTripPlan(plan);
        setTripPreferences(prefs);
        setCurrentStep('review');
      } else if (view === 'done') {
        setActiveTripPlan(plan);
        setTripPreferences(prefs);
        setConfirmedTrips([sampleBooking]);
        setLatestConfirmedRecord(sampleBooking);
        setCurrentStep('done');
      } else if (view === 'mytrips') {
        setActiveTripPlan(plan);
        setTripPreferences(prefs);
        setConfirmedTrips([sampleBooking]);
        setLatestConfirmedRecord(sampleBooking);
        setCurrentStep('mytrips');
      }
    };

    initDemo();
  }, []);

  // Handle deterministic demo mode from Screen 1 (Describe)
  const handleTryDemo = async () => {
    const ctx = RequirementEngine.createEmptyContext();
    ctx.destination = 'Goa, India';
    ctx.origin = 'Bengaluru (BLR)';
    ctx.durationDays = 7;
    ctx.budgetTotalINR = 60000;
    ctx.partyType = 'family';
    ctx.totalTravellers = 3;
    ctx.adultsCount = 2;
    ctx.childrenCount = 1;
    ctx.childrenAges = [10];
    ctx.walkingIntensity = 'Low';
    ctx.dates = '14–20 Nov 2026';
    setTripContext(ctx);

    const prompt = '7 days in Goa from Bengaluru for me, my wife and our 10-year-old daughter. Budget ₹60,000. 14–20 Nov 2026. Comfortable family-friendly hotel, not too much walking.';
    setCurrentPrompt(prompt);

    setIsLoadingPlan(true);
    try {
      const plan = await TripPlanningEngine.buildDeterministicPlan(ctx);
      const prefs: TripPreferences = {
        destination: plan.destination,
        origin: plan.origin,
        targetDates: plan.dates,
        durationDays: plan.durationDays,
        partySize: plan.travellers.total,
        adultsCount: plan.travellers.adults,
        childrenCount: plan.travellers.children,
        childrenAges: plan.travellers.childAges,
        budgetTotalINR: plan.budget.targetINR,
        budgetTotalUSD: Math.round(plan.budget.targetINR / 84),
        budgetTier: 'Comfortable',
        travelStyle: 'Relaxed',
        priority: 'Family Friendly',
        accommodationPreference: 'Connecting Family Suite',
        dietaryOrNotes: 'Low walking; family with 10yo child',
        scope: 'domestic'
      };
      setActiveTripPlan(plan);
      setTripPreferences(prefs);
      setTimeout(() => {
        setIsLoadingPlan(false);
        setCurrentStep('plan');
      }, 500);
    } catch {
      setIsLoadingPlan(false);
      setCurrentStep('clarify');
    }
  };

  // Handle starting a plan from Screen 1 (Describe).
  // Returns an error message for the Describe screen, or null when we moved on.
  const handleStartPlan = async (promptText: string): Promise<string | null> => {
    const SUPPORTED_MSG = 'AeroDAG currently covers: Goa, Coorg, Kerala, Mysuru.';
    const lower = promptText.toLowerCase();

    // 1. Try the AI parser first (server-side Gemini), when it is configured.
    const ai: ParseTripResult = isAiAvailable ? await callParseTrip(promptText) : { kind: 'failed' };
    if (ai.kind === 'unsupported') {
      return `We can't plan ${ai.place} yet. ${SUPPORTED_MSG}`;
    }
    if (ai.kind === 'unparseable') {
      return `We couldn't understand that. Try something like "5 days in Goa for 2, ₹40,000".`;
    }

    // 2. Rule-based parse (always runs: it is the Basic-mode fallback and fills gaps)
    const ctx = RequirementEngine.createEmptyContext();
    const fieldSources: Record<string, 'stated' | 'assumed' | 'needed'> = {};

    // Destination
    if (lower.includes('goa')) {
      ctx.destination = 'Goa, India';
    } else if (lower.includes('coorg') || lower.includes('kodagu') || lower.includes('madikeri')) {
      ctx.destination = 'Coorg, Karnataka';
    } else if (lower.includes('kerala') || lower.includes('munnar') || lower.includes('alleppey') || lower.includes('alappuzha') || /\b(kumarakom|thekkady|wayanad|varkala|kovalam|fort kochi)\b/.test(lower)) {
      ctx.destination = 'Kerala, India';
    } else if (lower.includes('mysuru') || lower.includes('mysore')) {
      ctx.destination = 'Mysuru, Karnataka';
    } else if (ai.kind !== 'ok') {
      return `We couldn't find a destination we cover in that. ${SUPPORTED_MSG}`;
    }
    fieldSources.destination = 'stated';

    // Origin
    if (lower.includes('delhi')) {
      ctx.origin = 'New Delhi (DEL)';
      fieldSources.origin = 'stated';
    } else if (lower.includes('mumbai')) {
      ctx.origin = 'Mumbai (BOM)';
      fieldSources.origin = 'stated';
    } else if (lower.includes('kochi') || lower.includes('cochin')) {
      ctx.origin = 'Kochi (COK)';
      fieldSources.origin = 'stated';
    } else if (lower.includes('chennai')) {
      ctx.origin = 'Chennai (MAA)';
      fieldSources.origin = 'stated';
    } else if (lower.includes('hyderabad')) {
      ctx.origin = 'Hyderabad (HYD)';
      fieldSources.origin = 'stated';
    } else if (lower.includes('bengaluru') || lower.includes('bangalore') || lower.includes('blr')) {
      ctx.origin = 'Bengaluru (BLR)';
      fieldSources.origin = 'stated';
    } else {
      ctx.origin = 'Bengaluru (BLR)';
      fieldSources.origin = 'assumed';
    }

    // Duration ("weekend"/"week" are interpretations, so they are assumed)
    const daysMatch = promptText.match(/(\d+)\s*[- ]?(?:day|days)/i);
    if (daysMatch) {
      ctx.durationDays = parseInt(daysMatch[1], 10);
      fieldSources.duration = 'stated';
    } else if (lower.includes('day trip')) {
      ctx.durationDays = 1;
      fieldSources.duration = 'stated';
    } else if (lower.includes('weekend')) {
      ctx.durationDays = 3;
      fieldSources.duration = 'assumed';
    } else if (lower.includes('week')) {
      ctx.durationDays = 7;
      fieldSources.duration = 'assumed';
    } else {
      ctx.durationDays = 7;
      fieldSources.duration = 'assumed';
    }

    // Budget
    const budgetMatch = promptText.match(/(?:₹|rs\.?|inr|budget)\s*(\d{1,3}(?:,\d{2,3})+|\d{4,7})|(\d{1,3}(?:,\d{2,3})+|\d{4,7})\s*(?:₹|rs|inr|rupees)/i)
      || promptText.match(/(\d{1,3}(?:,\d{3})+|\d{5,7})/);
    const rawBudget = budgetMatch ? parseInt((budgetMatch[1] || budgetMatch[2] || '').replace(/,/g, ''), 10) : NaN;
    if (!isNaN(rawBudget) && rawBudget >= 5000) {
      ctx.budgetTotalINR = rawBudget;
      fieldSources.budget = 'stated';
    } else {
      ctx.budgetTotalINR = 60000;
      fieldSources.budget = 'assumed';
    }

    // Travellers: read actual numbers and ages instead of hard-coding them
    const wordNum: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
    const toNum = (s: string) => (/^\d+$/.test(s) ? parseInt(s, 10) : wordNum[s] ?? 0);
    const childAges: number[] = [];
    const seniorAges: number[] = [];
    let adults = 0;
    let travellersStated = false;

    // "parents who are 70", "parents aged 68 and 72", "my parents"
    const parentsMatch = lower.match(/parents?(?:\s+(?:who\s+are|aged|age|both))?\s*(\d{2})?(?:\s*(?:and|&)\s*(\d{2}))?/);
    if (parentsMatch && /\bparents?\b/.test(lower)) {
      const a1 = parentsMatch[1] ? parseInt(parentsMatch[1], 10) : 65;
      const a2 = parentsMatch[2] ? parseInt(parentsMatch[2], 10) : a1;
      seniorAges.push(a1, a2);
      travellersStated = true;
    }
    // "10-year-old", "10 year old", "aged 7"
    const ageRe = /(\d{1,2})\s*[- ]?(?:year|yr)s?[- ]?old|aged?\s+(\d{1,2})\b/g;
    let m: RegExpExecArray | null;
    while ((m = ageRe.exec(lower)) !== null) {
      const age = parseInt(m[1] || m[2], 10);
      const idx = m.index;
      // skip ages already consumed by the "parents ... NN" phrase
      if (parentsMatch && parentsMatch.index !== undefined && idx >= parentsMatch.index && idx < parentsMatch.index + parentsMatch[0].length) continue;
      if (age < 18) childAges.push(age);
      else if (age >= 60) seniorAges.push(age);
      else adults += 1;
      travellersStated = true;
    }
    // children mentioned without an age
    if (childAges.length === 0 && /\b(daughter|son|child|kid)\b/.test(lower)) {
      const kidCount = lower.match(/\b(\d|one|two|three|four)\s+(?:kids|children)\b/);
      const n = kidCount ? toNum(kidCount[1]) : 1;
      for (let i = 0; i < n; i++) childAges.push(8);
      travellersStated = true;
    }
    const adultsMatch = lower.match(/\b(\d|one|two|three|four|five|six)\s+adults?\b/);
    const groupMatch = lower.match(/\bfor\s+(\d|two|three|four|five|six)\b(?!\s*(?:day|night|week))/);
    if (adultsMatch) {
      adults = toNum(adultsMatch[1]);
      travellersStated = true;
    } else if (/\b(wife|husband|partner|spouse)\b/.test(lower)) {
      adults = Math.max(adults, 2);
      travellersStated = true;
    } else if (/\b(solo|alone|by myself)\b/.test(lower)) {
      adults = 1;
      travellersStated = true;
    } else if (/\bcouple\b/.test(lower)) {
      adults = 2;
      travellersStated = true;
    } else if (groupMatch && childAges.length === 0 && seniorAges.length === 0) {
      adults = toNum(groupMatch[1]);
      travellersStated = true;
    } else if (childAges.length === 0 && seniorAges.length === 0 && /\b(family|families|group|friends|gang)\b/.test(lower)) {
      // "with my family" / "with friends" but no count: assume 2 adults and label it "assumed"
      adults = Math.max(adults, 2);
    } else if (seniorAges.length > 0 || childAges.length > 0 || /\b(i|me|my)\b/.test(lower)) {
      adults = Math.max(adults, 1);
    }
    if (adults + childAges.length + seniorAges.length === 0) {
      adults = 2;
      travellersStated = false;
    }
    ctx.adultsCount = adults;
    ctx.childrenCount = childAges.length;
    ctx.childrenAges = childAges;
    ctx.seniorsCount = seniorAges.length;
    ctx.seniorsAges = seniorAges;
    ctx.totalTravellers = adults + childAges.length + seniorAges.length;
    ctx.partyType = ctx.totalTravellers === 1 ? 'solo'
      : (childAges.length > 0 || seniorAges.length > 0) ? 'family'
      : ctx.totalTravellers === 2 ? 'couple' : 'friends';
    fieldSources.travellers = travellersStated ? 'stated' : 'assumed';

    // Walking pace
    if (lower.includes('not too much walking') || lower.includes('slow pace') || lower.includes('low walking') || lower.includes('relaxed')) {
      ctx.walkingIntensity = 'Low';
      ctx.travelStyle = 'Relaxed';
      fieldSources.pace = 'stated';
    } else if (lower.includes('active') || lower.includes('action-packed') || lower.includes('fast pace') || lower.includes('adventure')) {
      ctx.walkingIntensity = 'Active';
      ctx.travelStyle = 'Action-Packed';
      fieldSources.pace = 'stated';
    } else if (seniorAges.length > 0) {
      ctx.walkingIntensity = 'Low';
      ctx.travelStyle = 'Relaxed';
      fieldSources.pace = 'assumed';
    } else {
      ctx.walkingIntensity = 'Moderate';
      ctx.travelStyle = 'Balanced';
      fieldSources.pace = 'assumed';
    }

    // Hotel preference
    if (lower.includes('comfortable') || lower.includes('family-friendly') || lower.includes('nature stay') || lower.includes('ground floor') || lower.includes('hotel') || lower.includes('resort')) {
      ctx.accommodationPreference = lower.includes('nature stay') ? 'Scenic nature stay' : 'Comfortable family-friendly hotel';
      fieldSources.accommodation = 'stated';
    } else if (seniorAges.length > 0) {
      ctx.accommodationPreference = 'Accessible 3–4★ stay (lift or ground floor)';
      fieldSources.accommodation = 'assumed';
    } else {
      ctx.accommodationPreference = 'Standard 3–4★ stay';
      fieldSources.accommodation = 'assumed';
    }
    ctx.budgetTier = 'Comfortable';

    // Transport mode
    if (lower.includes('train') || lower.includes('rail')) {
      ctx.transportMode = 'Train';
    } else if (/\b(car|cab|drive|road trip)\b/.test(lower)) {
      ctx.transportMode = 'Cab';
    } else {
      ctx.transportMode = 'Flight';
    }

    // Dates: understand "20th to 27th this month", "28 Oct to 2 Nov", "next weekend", "from 5 Nov for 4 days"
    const resolvedDates = resolveTravelDates(promptText);
    if (resolvedDates && !resolvedDates.ok) {
      return resolvedDates.error;
    }
    ctx.dates = null;
    fieldSources.dates = 'needed';

    // 3. Overlay the AI understanding when we have it
    ctx.parseMode = 'basic';
    if (ai.kind === 'ok') {
      applyAiParse(ctx, fieldSources, ai.data);
    }
    // Exact dates win over any guessed duration: 20–27 Oct is 8 days, whatever else was assumed.
    if (resolvedDates && resolvedDates.ok) {
      ctx.dates = resolvedDates.label;
      fieldSources.dates = 'stated';
      ctx.durationDays = resolvedDates.days;
      fieldSources.duration = 'stated';
    }
    ctx.fieldSources = fieldSources;
    setCurrentPrompt(promptText);

    const hasDates = !!ctx.dates;
    setTripContext(ctx);
    if (hasDates) {
      // Dates are present -> generate plan directly
      setIsLoadingPlan(true);
      try {
        const plan = await TripPlanningEngine.buildDeterministicPlan(ctx);
        const style: TripPreferences['travelStyle'] =
          ctx.travelStyle === 'Relaxed' || ctx.travelStyle === 'Action-Packed' ? ctx.travelStyle : 'Balanced';
        const prefs: TripPreferences = {
          destination: plan.destination,
          origin: plan.origin,
          targetDates: plan.dates,
          durationDays: plan.durationDays,
          partySize: plan.travellers.total,
          adultsCount: plan.travellers.adults,
          childrenCount: plan.travellers.children,
          childrenAges: plan.travellers.childAges,
          budgetTotalINR: plan.budget.targetINR,
          budgetTotalUSD: Math.round(plan.budget.targetINR / 84),
          budgetTier: 'Comfortable',
          travelStyle: style,
          priority: 'Family Friendly',
          accommodationPreference: (ctx.accommodationPreference as any) || 'Connecting Family Suite',
          dietaryOrNotes: ctx.notes.join('; '),
          scope: plan.scope,
          transportMode: ctx.transportMode || undefined,
          selectedTrain: plan.selectedTrain
        };
        setActiveTripPlan(plan);
        setTripPreferences(prefs);
        setTimeout(() => {
          setIsLoadingPlan(false);
          setCurrentStep('plan');
        }, 800);
      } catch (e) {
        setIsLoadingPlan(false);
        setCurrentStep('clarify');
      }
    } else {
      // Dates strictly required -> Transition to Screen 2 (Clarify)
      setCurrentStep('clarify');
    }
    return null;
  };

  // Save the current plan as a draft in My Trips (Supabase, or this browser in offline mode)
  const handleSaveDraft = async (): Promise<boolean> => {
    if (!activeTripPlan) return false;
    const plan = activeTripPlan;
    const t = plan.travellers;
    const passengers: ConfirmedBookingRecord['passengers'] = [
      ...Array.from({ length: t.adults || 0 }, (_, i) => ({ type: 'ADULT' as const, title: '', firstName: `Adult ${i + 1}`, lastName: '' })),
      ...(t.childAges || []).map((age, i) => ({ type: 'CHILD' as const, title: '', firstName: `Child ${i + 1}`, lastName: '', age })),
      ...Array.from({ length: t.seniors || 0 }, (_, i) => ({ type: 'SENIOR' as const, title: '', firstName: `Senior ${i + 1}`, lastName: '' }))
    ];
    const total = plan.budget.grandTotalINR;
    const draft: ConfirmedBookingRecord = {
      bookingId: `draft_${Date.now()}`,
      pnr: 'Saved plan',
      hotelVoucherId: '',
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'SELECTED',
      tripTitle: `${plan.durationDays}-Day Trip to ${plan.destination}`,
      destination: plan.destination,
      origin: plan.origin,
      travelDates: plan.dates,
      totalPaidINR: total,
      totalPaidUSD: Math.round(total / 84),
      budgetTotalINR: plan.budget.targetINR,
      remainingBudgetINR: plan.budget.remainingBudgetINR,
      passengers,
      selectedFlight: plan.flight,
      selectedTrain: plan.selectedTrain || null,
      selectedHotel: plan.hotel,
      selectedTransfer: plan.transfer,
      itinerary: plan.itinerary,
      visa: null,
      scope: plan.scope
    };
    try {
      await getTripStore(isOfflineMode).saveDraft(draft);
      if (isAuthAnonymous && !isOfflineMode) rememberGuestTrip('draft', draft, authUser?.id ?? null);
      await fetchTrips();
      return true;
    } catch (err) {
      console.warn('Failed to save draft trip:', err);
      return false;
    }
  };

  // Handle plan finalized from Clarify Screen
  const handlePlanReadyFromClarify = (plan: TripPlan, prefs: TripPreferences) => {
    setActiveTripPlan(plan);
    setTripPreferences(prefs);
    setCurrentStep('plan');
  };

  // Handle booking success from Review Screen
  const handleBookingSuccess = async (confirmedRecord: ConfirmedBookingRecord, contactEmail?: string) => {
    setBookingContactEmail(contactEmail);
    setBookingEmailCardDismissed(false);
    if (isAuthAnonymous && !isOfflineMode) rememberGuestTrip('booking', confirmedRecord, authUser?.id ?? null);
    try {
      const store = getTripStore(isOfflineMode);
      const idempotencyKey = `idem_${confirmedRecord.bookingId}_${confirmedRecord.totalPaidINR}`;
      const { booking } = await store.saveSimulatedBooking(confirmedRecord, idempotencyKey);
      setConfirmedTrips((prev) => [booking, ...prev.filter(t => t.bookingId !== booking.bookingId)]);
      setLatestConfirmedRecord(booking);
    } catch (err) {
      console.warn('Failed to save to trip store, keeping locally:', err);
      setConfirmedTrips((prev) => [confirmedRecord, ...prev]);
      setLatestConfirmedRecord(confirmedRecord);
    }
    setCurrentStep('done');
  };

  // Phase 6: Handle Email Linking
  // One email action for Save trip, booking and Sign in (links a new email, or signs in an existing one)
  const handleLinkEmail = async (email: string) => {
    return await continueWithEmail(email);
  };

  // Phase 6: Handle Sign Out
  const handleSignOut = async () => {
    const res = await signOutAndResetGuest();
    if (res.success) {
      setConfirmedTrips([]);
      setLatestConfirmedRecord(null);
      const authState = await initializeAuth();
      setAuthUser(authState.user);
      setIsAuthAnonymous(authState.isAnonymous);
      setIsOfflineMode(authState.isOffline);
      await fetchTrips(authState.isOffline);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6F3] text-[#15201D] flex flex-col font-sans">
      {/* 1. Consumer Navbar with 4-Step Progress Bar */}
      <ConsumerNavbar
        currentStep={currentStep}
        onNavigate={(step) => {
          if (step === 'mytrips') setMyTripsTab(undefined);
          setCurrentStep(step);
        }}
        onOpenSavedPlans={() => {
          setMyTripsTab('saved');
          setCurrentStep('mytrips');
        }}
        savedPlansCount={savedPlansCount}
        myTripsTab={myTripsTab}
        currency={currency}
        setCurrency={setCurrency}
        onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
        hasConfirmedTrips={confirmedTrips.length > 0}
        authUser={authUser}
        isAuthAnonymous={isAuthAnonymous}
        isOfflineMode={isOfflineMode}
        onLinkEmail={handleLinkEmail}
        onSignOut={handleSignOut}
      />

      {/* 2. Main Content Container */}
      <main className="flex-1 w-full">
        {/* Loading Screen */}
        {isLoadingPlan && (
          <LoadingPlanScreen destination={tripContext.destination || undefined} />
        )}

        {/* SCREEN 1: DESCRIBE (Home / Planner Entry) */}
        {!isLoadingPlan && currentStep === 'describe' && (
          <DescribeScreen
            onStartPlan={handleStartPlan}
            onTryDemo={handleTryDemo}
            isAiAvailable={isAiAvailable}
          />
        )}

        {/* SCREEN 2: CLARIFY */}
        {!isLoadingPlan && currentStep === 'clarify' && (
          <ClarifyScreen
            initialPrompt={currentPrompt}
            tripContext={tripContext}
            onPlanReady={handlePlanReadyFromClarify}
            onBackToDescribe={() => setCurrentStep('describe')}
          />
        )}

        {/* SCREEN 3: PLAN */}
        {!isLoadingPlan && currentStep === 'plan' && activeTripPlan && tripPreferences && (
          <PlanScreen
            plan={activeTripPlan}
            preferences={tripPreferences}
            onPlanChange={(updated) => setActiveTripPlan(updated)}
            onProceedToReview={() => setCurrentStep('review')}
            onDescribeAgain={() => setCurrentStep('describe')}
            onSaveDraft={handleSaveDraft}
            isGuest={isAuthAnonymous && !isOfflineMode}
            onContinueWithEmail={handleLinkEmail}
            onUpdateItineraryDay={(dayNumber, modificationType) => {
              setActiveTripPlan((prev) => {
                if (!prev) return null;
                const updatedItinerary = prev.itinerary.map((d) => {
                  if (d.day !== dayNumber) return d;
                  if (modificationType === 'relaxed') {
                    return { ...d, afternoon: 'Relaxed downtime at accommodation; afternoon tea.', walkingLevel: 'very light' as const };
                  } else if (modificationType === 'food') {
                    return { ...d, evening: d.evening + ' Includes guided local culinary tasting stop.' };
                  } else {
                    return { ...d, afternoon: 'Free self-guided scenic walk through public gardens.', estimatedCostINR: Math.max(200, d.estimatedCostINR - 500) };
                  }
                });
                return { ...prev, itinerary: updatedItinerary };
              });
            }}
          />
        )}

        {/* SCREEN 4: REVIEW & CHECKOUT */}
        {!isLoadingPlan && currentStep === 'review' && tripPreferences && (
          <CheckoutBookingFlow
            preferences={tripPreferences}
            selectedFlight={activeTripPlan?.flight}
            selectedHotel={activeTripPlan?.hotel}
            selectedTransfer={activeTripPlan?.transfer}
            visaDetails={activeTripPlan?.visa}
            totalCostINR={activeTripPlan?.budget.grandTotalINR}
            currency={currency}
            onBookingSuccess={handleBookingSuccess}
            onBackToTrip={() => setCurrentStep('plan')}
            tripSummary={activeTripPlan ? getTripSummary({ tripPlan: activeTripPlan, preferences: tripPreferences }) : null}
          />
        )}

        {/* SCREEN 5: DONE (CONFIRMATION) */}
        {!isLoadingPlan && currentStep === 'done' && latestConfirmedRecord && (
          <>
          {isAuthAnonymous && !isOfflineMode && !bookingEmailCardDismissed && (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
              <KeepTripsCard
                id="booking-email-card"
                title="Booking confirmed — it's in My Trips"
                description="Get this booking on any device. We'll send a link to your email — no password."
                defaultEmail={bookingContactEmail}
                onSubmitEmail={handleLinkEmail}
                onDismiss={() => setBookingEmailCardDismissed(true)}
              />
            </div>
          )}
          <BookingConfirmationView
            confirmedBooking={latestConfirmedRecord}
            currency={currency}
            onGoToMyTrips={() => { setMyTripsTab('booked'); setCurrentStep('mytrips'); }}
            onPlanAnotherTrip={() => setCurrentStep('describe')}
          />
          </>
        )}

        {/* MY TRIPS VIEW */}
        {!isLoadingPlan && currentStep === 'mytrips' && (
          <MyTripsView
            key={myTripsTab ?? 'auto'}
            initialTab={myTripsTab}
            confirmedTrips={confirmedTrips}
            currency={currency}
            onExploreMore={() => setCurrentStep('describe')}
            isOffline={isOfflineMode}
            isLoading={isLoadingTrips}
            loadError={tripsLoadError}
            onRetry={() => fetchTrips(isOfflineMode)}
          />
        )}
      </main>

      {/* 3. Subtle Footer with "How it works" Access */}
      <footer className="border-t border-[#E2E6E1] bg-[#FFFFFF] py-6 px-4 text-xs text-[#55625E]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#15201D]">AeroDAG</span>
            <span>·</span>
            <span>Plan a trip you can actually take</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => setIsHowItWorksOpen(true)}
              className="text-[#0E6B59] hover:underline cursor-pointer font-medium"
            >
              How it works & System Architecture
            </button>
            <span>·</span>
            <span>&copy; 2026 AeroDAG · Demo</span>
          </div>
        </div>
      </footer>

      {/* 4. "How It Works" & Technical Observability Modal */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />
    </div>
  );
}
