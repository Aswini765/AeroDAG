import React, { useState, useEffect } from 'react';
import {
  Luggage,
  Calendar,
  Users,
  Sparkles,
  Send,
  Download,
  ArrowRight,
  Plane,
  Building,
  Car,
  ChevronLeft,
  AlertCircle
} from 'lucide-react';
import { ConfirmedBookingRecord, Currency } from '../../types/travelBooking';

interface MyTripsViewProps {
  confirmedTrips: ConfirmedBookingRecord[];
  currency: Currency;
  onExploreMore: () => void;
  isOffline?: boolean;
  isLoading?: boolean;
  loadError?: string | null;
  onRetry?: () => void;
  /** Which tab to open on. Omit to open Booked trips (or Saved plans if nothing is booked yet). */
  initialTab?: 'booked' | 'saved';
}

const DEFAULT_ASSISTANT_MESSAGE = {
  sender: 'assistant' as const,
  text: "Hello! I'm your AeroDAG Trip Assistant. Your saved journey is ready. How can I help with dining, day pacing, or packing questions?"
};

export const MyTripsView: React.FC<MyTripsViewProps> = ({
  confirmedTrips,
  currency,
  onExploreMore,
  isOffline = false,
  isLoading = false,
  loadError = null,
  onRetry,
  initialTab
}) => {
  const isSavedPlan = (t: ConfirmedBookingRecord) => !!t.bookingId?.startsWith('draft_');
  const bookedTrips = confirmedTrips.filter((t) => !isSavedPlan(t));
  const savedPlans = confirmedTrips.filter(isSavedPlan);
  // Open on Booked trips; if there are none yet but there are saved plans, open those instead
  const [tab, setTab] = useState<'booked' | 'saved'>(
    initialTab ?? (bookedTrips.length === 0 && savedPlans.length > 0 ? 'saved' : 'booked')
  );
  const visibleTrips = tab === 'booked' ? bookedTrips : savedPlans;

  const [selectedTripIndex, setSelectedTripIndex] = useState<number | null>(
    visibleTrips.length > 0 ? 0 : null
  );
  const switchTab = (next: 'booked' | 'saved') => {
    setTab(next);
    const list = next === 'booked' ? bookedTrips : savedPlans;
    setSelectedTripIndex(list.length > 0 ? 0 : null);
  };

  const activeTrip = selectedTripIndex !== null ? visibleTrips[selectedTripIndex] ?? null : null;
  const activeIsSavedPlan = !!activeTrip && isSavedPlan(activeTrip);

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([
    DEFAULT_ASSISTANT_MESSAGE
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // Load chat from localStorage whenever activeTrip changes
  useEffect(() => {
    if (!activeTrip?.bookingId) {
      setChatMessages([DEFAULT_ASSISTANT_MESSAGE]);
      return;
    }

    try {
      const stored = localStorage.getItem(`aerodag:v1:chat:${activeTrip.bookingId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatMessages(parsed);
          return;
        }
      }
    } catch {
      // ignore localStorage errors
    }
    setChatMessages([DEFAULT_ASSISTANT_MESSAGE]);
  }, [activeTrip?.bookingId]);

  const handleSendMessage = (textToSend?: string) => {
    const q = textToSend || chatInput;
    if (!q.trim()) return;

    const newMessages: Array<{ sender: 'user' | 'assistant'; text: string }> = [
      ...chatMessages,
      { sender: 'user', text: q }
    ];
    setChatMessages(newMessages);
    setChatInput('');
    setIsTyping(true);

    setTimeout(() => {
      const lower = q.toLowerCase();
      let reply: string;

      // 1. Actions the assistant cannot do (confirming, real PNR, payments, tickets)
      const unsupportedAction =
        lower.includes('confirm') ||
        lower.includes('pnr') ||
        lower.includes('pay') ||
        lower.includes('payment') ||
        lower.includes('credit card') ||
        lower.includes('upi') ||
        lower.includes('ticket') ||
        lower.includes('charge') ||
        lower.includes('refund') ||
        lower.includes('real booking') ||
        lower.includes('official');

      if (unsupportedAction) {
        reply = "I can't do that — this is a demo booking, so nothing can be changed or refunded.";
      } else if (lower.includes('budget') || lower.includes('money') || lower.includes('left') || lower.includes('remaining')) {
        // 2. Budget questions: answer directly from trip data
        const targetBudget = activeTrip?.budgetTotalINR || 60000;
        const totalPaid = activeTrip?.totalPaidINR || 0;
        const remaining = activeTrip?.remainingBudgetINR !== undefined
          ? activeTrip.remainingBudgetINR
          : Math.max(0, targetBudget - totalPaid);
        reply = `You have ₹${remaining.toLocaleString('en-IN')} remaining from your ₹${targetBudget.toLocaleString('en-IN')} target budget (Allocated plan total: ₹${totalPaid.toLocaleString('en-IN')}).`;
      } else if (lower.includes('food') || lower.includes('dinner') || lower.includes('restaurant')) {
        const dest = (activeTrip?.destination || '').toLowerCase();
        if (dest.includes('coorg')) {
          reply = `Recommended dinner in Coorg: Raintree Restaurant in Madikeri for authentic Kodava pork or veg curry, or Tiger Tiger for traditional Coorg thali.`;
        } else if (dest.includes('kerala')) {
          reply = `Recommended dinner in Kerala: Saravana Bhavan for traditional vegetarian sadhya, or Rapsy Restaurant in Munnar market for local malabar dishes.`;
        } else if (dest.includes('mysuru')) {
          reply = `Recommended dinner in Mysuru: Mylari Hotel in Nazarbad for legendary butter masala dose, or Gufha Restaurant for multi-cuisine dining.`;
        } else {
          reply = "Recommended dinner: Martin's Corner in Betalbatim (12 min drive from Heritage Village Resort). Known for fresh coastal Goan curries and family seating.";
        }
      } else if (lower.includes('pace') || lower.includes('less tiring') || lower.includes('relax')) {
        reply = "Your itinerary already schedules 2-hour afternoon rest downtime at the accommodation so your family can recharge before evening sightseeing.";
      } else {
        reply = "Your trip details and itinerary are saved here. Feel free to ask about remaining budget, dining options, or day pacing.";
      }

      const updatedWithReply = [...newMessages, { sender: 'assistant' as const, text: reply }];
      setChatMessages(updatedWithReply);
      setIsTyping(false);

      // Persist chat per trip
      if (activeTrip?.bookingId) {
        try {
          localStorage.setItem(`aerodag:v1:chat:${activeTrip.bookingId}`, JSON.stringify(updatedWithReply));
        } catch {
          // ignore
        }
      }
    }, 500);
  };

  // 1. Loading Skeleton State
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 text-left animate-fade-in-slide">
        <div className="pb-3 border-b border-[#E2E6E1]">
          <div className="h-7 w-32 bg-[#E2E6E1] rounded animate-pulse" />
          <div className="h-4 w-48 bg-[#E2E6E1]/60 rounded mt-2 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="trips-loading-skeleton">
          {[1, 2, 3].map((n) => (
            <div key={n} className="card-consumer p-5 space-y-3.5 bg-white border-[#E2E6E1]">
              <div className="flex justify-between">
                <div className="h-4 w-16 bg-[#E2E6E1] rounded animate-pulse" />
                <div className="h-4 w-20 bg-[#E2E6E1] rounded animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-5 w-3/4 bg-[#E2E6E1] rounded animate-pulse" />
                <div className="h-3.5 w-1/2 bg-[#E2E6E1] rounded animate-pulse" />
                <div className="h-3.5 w-2/3 bg-[#E2E6E1] rounded animate-pulse" />
              </div>
              <div className="pt-2 border-t border-[#E2E6E1] flex justify-between">
                <div className="h-4 w-16 bg-[#E2E6E1] rounded animate-pulse" />
                <div className="h-4 w-16 bg-[#E2E6E1] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Error State
  if (loadError) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 text-center card-consumer space-y-4 animate-fade-in-slide" data-testid="trips-error-state">
        <div className="h-12 w-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-[#15201D] font-heading">
          Couldn't load your trips. Retry
        </h1>
        <p className="text-xs sm:text-sm text-[#55625E]">
          {loadError}
        </p>
        <button
          type="button"
          onClick={onRetry || onExploreMore}
          className="btn-primary"
        >
          <span>Retry</span>
        </button>
      </div>
    );
  }

  // 3. Empty state: If no saved trips yet
  if (!confirmedTrips || confirmedTrips.length === 0) {
    return (
      <div className="max-w-md mx-auto my-16 space-y-4 animate-fade-in-slide">
        {isOffline && (
          <div className="p-3 rounded-xl bg-[#FBF3E8] border border-[#E6D4B8] text-[#8C5D23] text-xs flex items-center justify-center gap-2" data-testid="offline-mode-banner">
            <span className="h-2 w-2 rounded-full bg-[#D97706]" />
            <span>Offline mode — trips are saved on this device only.</span>
          </div>
        )}
        <div className="p-8 text-center card-consumer space-y-4">
          <div className="h-12 w-12 rounded-full bg-[#E3F1EC] text-[#0E6B59] flex items-center justify-center mx-auto">
            <Luggage className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-[#15201D] font-heading">
            No trips yet — plan your first one
          </h1>
          <p className="text-xs sm:text-sm text-[#55625E]">
            Describe a trip to build a plan that fits inside your budget.
          </p>
          <button
            type="button"
            onClick={onExploreMore}
            className="btn-primary"
          >
            <span>Plan a trip</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 text-left animate-fade-in-slide">
      {/* Offline Mode Banner */}
      {isOffline && (
        <div className="p-3 rounded-xl bg-[#FBF3E8] border border-[#E6D4B8] text-[#8C5D23] text-xs flex items-center gap-2" data-testid="offline-mode-banner">
          <span className="h-2 w-2 rounded-full bg-[#D97706]" />
          <span>Offline mode — trips are saved on this device only.</span>
        </div>
      )}

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E6E1]">
        <div>
          <h1 className="text-2xl font-bold text-[#15201D] font-heading">
            My Trips
          </h1>
          <p className="text-xs sm:text-sm text-[#55625E]">
            {bookedTrips.length} booked · {savedPlans.length} saved plan{savedPlans.length === 1 ? '' : 's'}
          </p>
        </div>

        <button
          type="button"
          onClick={onExploreMore}
          className="btn-primary py-2 px-3.5 text-xs sm:text-sm"
        >
          <span>Plan another trip</span>
        </button>
      </div>

      {/* Tabs: Booked trips vs Saved plans */}
      <div role="tablist" aria-label="Trip type" className="flex gap-2">
        {([
          ['booked', `Booked trips (${bookedTrips.length})`],
          ['saved', `Saved plans (${savedPlans.length})`]
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`mytrips-tab-${key}`}
            aria-selected={tab === key}
            onClick={() => switchTab(key)}
            className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold border transition-colors ${
              tab === key
                ? 'bg-[#0E6B59] text-white border-[#0E6B59]'
                : 'bg-white text-[#15201D] border-[#E2E6E1] hover:border-[#0E6B59]/40'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {visibleTrips.length === 0 && (
        <div className="card-consumer p-6 text-center space-y-2" data-testid="mytrips-tab-empty">
          <p className="text-sm font-semibold text-[#15201D]">
            {tab === 'booked' ? 'No booked trips yet' : 'No saved plans yet'}
          </p>
          <p className="text-xs text-[#55625E]">
            {tab === 'booked'
              ? 'Trips you book appear here.'
              : 'Click "Save trip" on any plan to keep it here for later.'}
          </p>
        </div>
      )}

      {/* Trips Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleTrips.map((trip, idx) => {
          const isSelected = selectedTripIndex === idx;

          return (
            <div
              key={trip.bookingId}
              data-testid="trip-card"
              className={`card-consumer p-5 space-y-3.5 transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#0E6B59] ring-2 ring-[#0E6B59]/20 bg-[#FFFFFF]'
                  : 'hover:border-[#0E6B59]/40 bg-[#FFFFFF]'
              }`}
              onClick={() => setSelectedTripIndex(idx)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E3F1EC] text-[#0E6B59]">
                  {isSavedPlan(trip) ? 'Saved plan' : trip.status === 'CANCELLED' ? 'Cancelled' : 'Booked'}
                </span>
                <span className="text-xs text-[#55625E] font-mono">
                  {isSavedPlan(trip) ? trip.createdAt : trip.pnr}
                </span>
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-bold text-[#15201D] font-heading">
                  {trip.destination}
                </h2>
                <div className="text-xs text-[#55625E] flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#0E6B59]" />
                  <span>{trip.travelDates}</span>
                </div>
                <div className="text-xs text-[#55625E] flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-[#0E6B59]" />
                  <span>{trip.passengers?.length || 3} travellers · {trip.origin}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E2E6E1] flex items-center justify-between">
                <div className="text-sm font-bold text-[#15201D]">
                  {trip.bookingId?.startsWith('draft_') && <span className="text-xs font-medium text-[#55625E] mr-1">Est.</span>}
                  ₹{trip.totalPaidINR.toLocaleString('en-IN')}
                </div>
                <span className="text-xs font-semibold text-[#0E6B59] hover:underline flex items-center gap-1">
                  <span>{isSelected ? 'Viewing' : 'Open trip'}</span>
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Trip Detail + Assistant Panel */}
      {activeTrip && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 items-start">
          {/* Read-Only Plan Layout (7 cols) */}
          <div className="lg:col-span-7 card-consumer p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E6E1]">
              <div className="space-y-0.5">
                <div className="text-xs uppercase font-bold text-[#0E6B59]">
                  Trip Details · Read-only
                </div>
                <h3 className="text-xl font-bold text-[#15201D] font-heading">
                  {activeTrip.tripTitle}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="btn-ghost py-2 px-3 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>PDF</span>
              </button>
            </div>

            {/* Travel Summary Cards */}
            <div className="space-y-3">
              {/* Flight */}
              <div className="p-3.5 rounded-xl bg-[#F5F6F3] border border-[#E2E6E1] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <Plane className="h-4 w-4 text-[#0E6B59]" />
                  <div>
                    <div className="font-bold text-[#15201D]">
                      {activeTrip.selectedFlight?.airline || 'Air India Express'} ({activeTrip.selectedFlight?.flightNumber || 'IX 924'})
                    </div>
                    <div className="text-[#55625E]">
                      {activeTrip.origin} → {activeTrip.destination}
                    </div>
                  </div>
                </div>
                <span className="font-bold text-[#15201D]">
                  {activeTrip.pnr}
                </span>
              </div>

              {/* Stay */}
              <div className="p-3.5 rounded-xl bg-[#F5F6F3] border border-[#E2E6E1] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <Building className="h-4 w-4 text-[#0E6B59]" />
                  <div>
                    <div className="font-bold text-[#15201D]">
                      {activeTrip.selectedHotel?.name || 'Heritage Village Resort & Spa, South Goa'}
                    </div>
                    <div className="text-[#55625E]">
                      {activeTrip.selectedHotel?.area || 'South Goa'} · {activeIsSavedPlan ? 'Not booked yet' : 'Demo voucher'}
                    </div>
                  </div>
                </div>
                <span className="font-bold text-[#15201D]">
                  {activeTrip.hotelVoucherId}
                </span>
              </div>

              {/* Transfer */}
              <div className="p-3.5 rounded-xl bg-[#F5F6F3] border border-[#E2E6E1] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <Car className="h-4 w-4 text-[#0E6B59]" />
                  <div>
                    <div className="font-bold text-[#15201D]">
                      {activeTrip.selectedTransfer?.title || 'Toyota Innova Crysta 7-Seater AC'}
                    </div>
                    <div className="text-[#55625E]">
                      Private Airport Transfer
                    </div>
                  </div>
                </div>
                <span className="font-bold text-[#15201D]">
                  {activeIsSavedPlan ? 'Not booked yet' : 'Included'}
                </span>
              </div>
            </div>

            {/* Total Paid */}
            <div className="pt-3 border-t border-[#E2E6E1] flex items-center justify-between text-sm">
              <span className="text-[#55625E] font-medium">{activeIsSavedPlan ? 'Estimated total' : 'Trip total (demo booking)'}</span>
              <span className="text-xl font-bold text-[#15201D] font-heading">
                ₹{activeTrip.totalPaidINR.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Assistant Side Panel (5 cols) */}
          <div className="lg:col-span-5 card-consumer p-5 space-y-4 sticky top-24">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E2E6E1]">
              <Sparkles className="h-4 w-4 text-[#0E6B59]" />
              <h3 className="text-sm font-bold text-[#15201D] font-heading">
                Post-Booking Assistant
              </h3>
            </div>

            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5">
              {[
                'Dinner near hotel',
                'Make pacing relaxed',
                'How much budget left?'
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleSendMessage(chip)}
                  className="pill-chip text-[11px] py-1 px-2.5"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Thread */}
            <div className="space-y-3 max-h-64 overflow-y-auto p-3 rounded-xl bg-[#F5F6F3] border border-[#E2E6E1] text-xs">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-2.5 rounded-xl ${
                      msg.sender === 'user'
                        ? 'bg-[#0E6B59] text-white'
                        : 'bg-white border border-[#E2E6E1] text-[#15201D]'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="text-[11px] text-[#55625E] italic">
                  Assistant is typing...
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about your trip..."
                className="flex-1 bg-white border border-[#E2E6E1] rounded-xl px-3 py-2 text-xs text-[#15201D] focus:ring-2 focus:ring-[#7CC4B3] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                className="btn-primary py-2 px-3 text-xs"
                aria-label="Send message"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
