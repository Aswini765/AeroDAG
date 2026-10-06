import React, { useState } from 'react';
import {
  Luggage,
  Calendar,
  MapPin,
  Plane,
  Building,
  Car,
  Sparkles,
  Send,
  MessageSquare,
  CheckCircle2,
  Clock,
  ArrowRight,
  Download,
  Share2,
  Users
} from 'lucide-react';
import { ConfirmedBookingRecord, Currency } from '../../types/travelBooking';

interface MyTripsViewProps {
  confirmedTrips: ConfirmedBookingRecord[];
  currency: Currency;
  onExploreMore: () => void;
}

export const MyTripsView: React.FC<MyTripsViewProps> = ({
  confirmedTrips,
  currency,
  onExploreMore
}) => {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: 'user' | 'assistant'; text: string; actionApplied?: string }>
  >([
    {
      sender: 'assistant',
      text: "Hello! I'm your AeroDAG Trip Assistant. Your Vietnam family vacation is confirmed. How can I assist you with dining, itinerary pacing, or packing tips today?"
    }
  ]);
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);

  const activeTrip = confirmedTrips[0];

  const handleSendMessage = (textToSend?: string) => {
    const q = textToSend || chatInput;
    if (!q.trim()) return;

    setChatMessages((prev) => [...prev, { sender: 'user', text: q }]);
    setChatInput('');
    setIsAssistantThinking(true);

    setTimeout(() => {
      const lower = q.toLowerCase();
      let reply = '';
      let action = '';

      if (lower.includes('restaurant') || lower.includes('dinner') || lower.includes('food')) {
        reply =
          'I have added "Quan An Ngon (Hanoi Garden Feast)" to your Day 2 dinner recommendations. It is just a 6-minute stroll from your Golden Silk Suite and features a courtyard with kid-friendly dishes like fresh rice paper rolls and crispy banh xeo.';
        action = 'Added Quan An Ngon to Day 2 dinner.';
      } else if (lower.includes('less tiring') || lower.includes('relax') || lower.includes('day 4')) {
        reply =
          'I have adjusted Day 4 (Ninh Binh Excursion): the boat cave trip is kept at an easy morning hour, the afternoon bicycle ride has been shifted to a gentle electric golf-cart transfer, and we added a 2-hour rest window at your hotel before dinner.';
        action = 'Updated Day 4 with relaxed pacing.';
      } else if (lower.includes('money') || lower.includes('budget') || lower.includes('left')) {
        reply =
          'You have approximately ₹7,600 INR ($90 USD) remaining from your ₹1,00,000 budget allocation. Your flights, 10-night family suite, airport minivan, and official e-visas are already 100% paid for!';
      } else if (lower.includes('visa')) {
        reply =
          'Yes, each traveler needs the 30-day single entry e-Visa ($25 / ₹2,100 per person). We recommend submitting your applications online at evisa.xuatnhapcanh.gov.vn by October 25 to ensure smooth processing.';
      } else if (lower.includes('cab') || lower.includes('transfer')) {
        reply =
          'Your round-trip private 7-seater AC minivan airport transfer is already confirmed and included in your booking! The driver will be holding a name board at Noi Bai arrival gate.';
      } else {
        reply =
          'I have noted your request and updated your trip context. All your travel preferences and reservations remain safe and intact.';
      }

      setChatMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: reply, actionApplied: action }
      ]);
      setIsAssistantThinking(false);
    }, 700);
  };

  if (!activeTrip) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <Luggage className="h-12 w-12 text-slate-600 mx-auto" />
        <h2 className="text-lg font-bold text-white">No Confirmed Trips Yet</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          You haven't booked a trip yet. Use our AI Trip Planner to plan and confirm your next journey.
        </p>
        <button
          onClick={onExploreMore}
          className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs transition"
        >
          Plan a Trip with AI
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Page Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Luggage className="h-5 w-5 text-amber-400" />
            <span>My Trips & Upcoming Journeys</span>
          </h1>
          <p className="text-xs text-slate-400">
            View your active bookings, vouchers, and collaborate with your AI trip assistant.
          </p>
        </div>

        <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          1 Upcoming Confirmed Trip
        </span>
      </div>

      {/* Confirmed Trip Card */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono font-bold">
                CONFIRMED
              </span>
              <span className="text-xs font-mono text-slate-400">
                Booking ID: {activeTrip.bookingId}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">{activeTrip.tripTitle}</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {activeTrip.travelDates} &bull; {activeTrip.origin} &rarr; {activeTrip.destination}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>PDF Itinerary</span>
            </button>
          </div>
        </div>

        {/* Breakdown Items */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 block font-mono text-[10px] uppercase flex items-center gap-1">
              <Plane className="h-3.5 w-3.5 text-sky-400" /> Flight PNR
            </span>
            <div className="font-bold text-white text-sm">{activeTrip.pnr}</div>
            <div className="text-slate-400 text-[11px]">{activeTrip.selectedFlight.airline} (4 Seats)</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 block font-mono text-[10px] uppercase flex items-center gap-1">
              <Building className="h-3.5 w-3.5 text-emerald-400" /> Hotel Voucher
            </span>
            <div className="font-bold text-white text-sm">{activeTrip.hotelVoucherId}</div>
            <div className="text-slate-400 text-[11px]">{activeTrip.selectedHotel.name}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 block font-mono text-[10px] uppercase flex items-center gap-1">
              <Car className="h-3.5 w-3.5 text-amber-400" /> Airport Transfer
            </span>
            <div className="font-bold text-white text-sm">Driver Assigned</div>
            <div className="text-slate-400 text-[11px]">Private 7-Seater AC Minivan</div>
          </div>
        </div>
      </div>

      {/* POST-BOOKING AI ASSISTANT EMBEDDED CONSOLE */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Post-Booking AI Travel Assistant</h3>
              <p className="text-[11px] text-slate-400">
                Ask questions or adjust your trip anytime without having to restart.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
            Trip Context Active
          </span>
        </div>

        {/* Example Suggestion Chips */}
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            'Can you suggest a child-friendly dinner near our hotel?',
            'Make Day 4 less tiring',
            'How much spending money do we have left?',
            'Do we need an international driving permit?'
          ].map((promptText, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(promptText)}
              className="text-[11px] text-slate-300 bg-slate-950 hover:bg-slate-850 px-2.5 py-1 rounded-lg border border-slate-800 transition"
            >
              &bull; {promptText}
            </button>
          ))}
        </div>

        {/* Message Thread */}
        <div className="space-y-3 max-h-72 overflow-y-auto p-4 rounded-xl bg-slate-950 border border-slate-800">
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-teal-600 text-slate-950 font-medium rounded-tr-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none space-y-1.5'
                }`}
              >
                <div>{msg.text}</div>
                {msg.actionApplied && (
                  <div className="text-[10px] font-mono text-teal-300 bg-slate-950/80 px-2 py-0.5 rounded border border-teal-500/30 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-teal-400" />
                    <span>{msg.actionApplied}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isAssistantThinking && (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
              <span>Trip Assistant is reviewing your itinerary...</span>
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask anything about your confirmed trip (e.g. food spots, pacing, packing)..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
          />
          <button
            onClick={() => handleSendMessage()}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
