/**
 * AeroDAG — AI-Native Consumer Travel Booking & Orchestration Platform
 * Combines a consumer travel experience (ixigo / Skyscanner style)
 * with an invisible multi-agent AI orchestration engine.
 */

import React, { useState } from 'react';
import { ConsumerNavbar } from './components/consumer/ConsumerNavbar';
import { HeroSearchHome } from './components/consumer/HeroSearchHome';
import { ConversationalAITripPlanner } from './components/consumer/ConversationalAITripPlanner';
import { FlightResultsView } from './components/consumer/FlightResultsView';
import { HotelResultsView } from './components/consumer/HotelResultsView';
import { TripBuilderDashboard } from './components/consumer/TripBuilderDashboard';
import { CheckoutBookingFlow } from './components/consumer/CheckoutBookingFlow';
import { BookingConfirmationView } from './components/consumer/BookingConfirmationView';
import { MyTripsView } from './components/consumer/MyTripsView';
import { SystemObservabilityModal } from './components/observability/SystemObservabilityModal';

import {
  FlightItem,
  HotelItem,
  TransferItem,
  ActivityDayItem,
  VisaDetails,
  TripPreferences,
  Currency,
  ConfirmedBookingRecord
} from './types/travelBooking';

import {
  MOCK_FLIGHTS_VIETNAM,
  MOCK_HOTELS_VIETNAM,
  MOCK_TRANSFERS_VIETNAM,
  MOCK_VISA_VIETNAM,
  MOCK_ITINERARY_VIETNAM,
  calculateTripFinancials
} from './services/travelCatalog';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'home' | 'planner' | 'flights' | 'hotels' | 'trip' | 'mytrips' | 'checkout' | 'confirmed'
  >('planner');

  const [currency, setCurrency] = useState<Currency>('INR');
  const [isObservabilityOpen, setIsObservabilityOpen] = useState(false);

  // Active Trip State
  const [currentPrompt, setCurrentPrompt] = useState('');

  const [tripPreferences, setTripPreferences] = useState<TripPreferences>({
    destination: 'Vietnam (Hanoi, Halong Bay & Ninh Binh)',
    origin: 'Bengaluru (BLR)',
    targetDates: 'Nov 10 – Nov 20, 2026',
    durationDays: 10,
    partySize: 4,
    adultsCount: 2,
    childrenCount: 2,
    childrenAges: [8, 11],
    budgetTotalINR: 100000,
    budgetTotalUSD: 1200,
    budgetTier: 'Frugal',
    travelStyle: 'Balanced',
    priority: 'Family Friendly',
    accommodationPreference: 'Connecting Family Suite',
    dietaryOrNotes: 'Family with two young kids; adjacent seating and certified 4-bed suite required.'
  });

  const [selectedFlight, setSelectedFlight] = useState<FlightItem>(MOCK_FLIGHTS_VIETNAM[0]);
  const [selectedHotel, setSelectedHotel] = useState<HotelItem>(MOCK_HOTELS_VIETNAM[0]);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferItem>(MOCK_TRANSFERS_VIETNAM[0]);
  const [visaDetails, setVisaDetails] = useState<VisaDetails>(MOCK_VISA_VIETNAM);
  const [itinerary, setItinerary] = useState<ActivityDayItem[]>(MOCK_ITINERARY_VIETNAM);

  // Confirmed bookings list
  const [confirmedTrips, setConfirmedTrips] = useState<ConfirmedBookingRecord[]>([]);
  const [latestConfirmedRecord, setLatestConfirmedRecord] = useState<ConfirmedBookingRecord | null>(null);

  // Financial calculations
  const financials = calculateTripFinancials(
    selectedFlight,
    selectedHotel,
    selectedTransfer,
    visaDetails,
    itinerary,
    tripPreferences.budgetTotalINR
  );

  // Navigation handlers
  const handleStartAIPlan = (promptText: string) => {
    setCurrentPrompt(promptText);
    setActiveTab('planner');
  };

  const handlePreferencesFinalized = (prefs: TripPreferences) => {
    setTripPreferences(prefs);
    setActiveTab('trip');
  };

  const handleUpdateItineraryDay = (
    dayNumber: number,
    modificationType: 'relaxed' | 'food' | 'budget'
  ) => {
    setItinerary((prev) =>
      prev.map((item) => {
        if (item.day !== dayNumber) return item;

        if (modificationType === 'relaxed') {
          return {
            ...item,
            afternoon: 'Relaxed downtime at Old Quarter hotel; afternoon tea and children board games.',
            familyFriendlyScore: 10
          };
        } else if (modificationType === 'food') {
          return {
            ...item,
            evening: item.evening + ' Includes guided night street food tasting with fresh mango sticky rice.',
            localDining: [...item.localDining, 'Specialty egg coffee tasting']
          };
        } else {
          return {
            ...item,
            afternoon: 'Free self-guided walk through botanical shaded gardens and temple courtyards.',
            estimatedCostINR: Math.max(200, item.estimatedCostINR - 500)
          };
        }
      })
    );
  };

  const handleBookingSuccess = (confirmedRecord: ConfirmedBookingRecord) => {
    setConfirmedTrips((prev) => [confirmedRecord, ...prev]);
    setLatestConfirmedRecord(confirmedRecord);
    setActiveTab('confirmed');
  };

  const handleAutoFixBudget = () => {
    // Switch to budget hotel option to restore budget compliance
    setSelectedHotel(MOCK_HOTELS_VIETNAM[1]); // May De Ville
  };

  const handleBudgetIncrease = (newBudget: number) => {
    setTripPreferences((prev) => ({
      ...prev,
      budgetTotalINR: newBudget,
      budgetTotalUSD: Math.round(newBudget / 84)
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500/30 selection:text-teal-200">
      {/* 1. Global Consumer Travel Navbar */}
      <ConsumerNavbar
        activeTab={
          activeTab === 'checkout' || activeTab === 'confirmed' ? 'trip' : activeTab
        }
        setActiveTab={(tab) => setActiveTab(tab)}
        currency={currency}
        setCurrency={setCurrency}
        onOpenObservability={() => setIsObservabilityOpen(true)}
        hasConfirmedTrip={confirmedTrips.length > 0}
      />

      {/* 2. Main Consumer Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* VIEW 1: HOME PAGE */}
        {activeTab === 'home' && (
          <HeroSearchHome
            onStartAIPlan={handleStartAIPlan}
            onQuickSearchFlights={() => setActiveTab('flights')}
            onQuickSearchHotels={() => setActiveTab('hotels')}
            currency={currency}
          />
        )}

        {/* VIEW 2: DYNAMIC CONVERSATIONAL AI TRIP PLANNER */}
        {activeTab === 'planner' && (
          <ConversationalAITripPlanner
            initialPrompt={currentPrompt}
            onPreferencesFinalized={handlePreferencesFinalized}
            currency={currency}
            onBackToHome={() => setActiveTab('home')}
          />
        )}

        {/* VIEW 3: FLIGHT SEARCH & SELECTION */}
        {activeTab === 'flights' && (
          <FlightResultsView
            selectedFlight={selectedFlight}
            onSelectFlight={(fl) => {
              setSelectedFlight(fl);
              setActiveTab('trip');
            }}
            currency={currency}
            onContinueToStays={() => setActiveTab('hotels')}
          />
        )}

        {/* VIEW 4: HOTEL SEARCH & SELECTION */}
        {activeTab === 'hotels' && (
          <HotelResultsView
            selectedHotel={selectedHotel}
            onSelectHotel={(ht) => {
              setSelectedHotel(ht);
              setActiveTab('trip');
            }}
            currency={currency}
            onContinueToItinerary={() => setActiveTab('trip')}
          />
        )}

        {/* VIEW 5: TRIP BUILDER & INTEGRATED DASHBOARD */}
        {activeTab === 'trip' && (
          <TripBuilderDashboard
            preferences={tripPreferences}
            selectedFlight={selectedFlight}
            selectedHotel={selectedHotel}
            selectedTransfer={selectedTransfer}
            visaDetails={visaDetails}
            itinerary={itinerary}
            onUpdateItineraryDay={handleUpdateItineraryDay}
            onChangeFlight={() => setActiveTab('flights')}
            onChangeHotel={() => setActiveTab('hotels')}
            onProceedToCheckout={() => setActiveTab('checkout')}
            currency={currency}
            onBudgetIncrease={handleBudgetIncrease}
            onAutoFixBudget={handleAutoFixBudget}
          />
        )}

        {/* VIEW 6: CHECKOUT & PASSENGER DETAILS */}
        {activeTab === 'checkout' && (
          <CheckoutBookingFlow
            preferences={tripPreferences}
            selectedFlight={selectedFlight}
            selectedHotel={selectedHotel}
            selectedTransfer={selectedTransfer}
            visaDetails={visaDetails}
            totalCostINR={financials.totalCalculatedCostINR}
            totalCostUSD={financials.totalCalculatedCostUSD}
            currency={currency}
            onBookingSuccess={handleBookingSuccess}
            onBackToTrip={() => setActiveTab('trip')}
          />
        )}

        {/* VIEW 7: BOOKING CONFIRMATION */}
        {activeTab === 'confirmed' && latestConfirmedRecord && (
          <BookingConfirmationView
            confirmedBooking={latestConfirmedRecord}
            currency={currency}
            onGoToMyTrips={() => setActiveTab('mytrips')}
            onOpenTripAssistant={() => setActiveTab('mytrips')}
          />
        )}

        {/* VIEW 8: MY TRIPS & POST-BOOKING ASSISTANT */}
        {activeTab === 'mytrips' && (
          <MyTripsView
            confirmedTrips={confirmedTrips}
            currency={currency}
            onExploreMore={() => setActiveTab('home')}
          />
        )}
      </main>

      {/* 3. Subtle Footer with Reviewer Observability Link */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">AeroDAG Travel</span>
            <span>&bull;</span>
            <span>AI-Native Travel Planning & Booking Platform</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <button
              onClick={() => setIsObservabilityOpen(true)}
              className="text-teal-400 hover:text-teal-300 transition flex items-center gap-1"
            >
              <span>Portfolio Architecture & System Observability</span>
            </button>
            <span>&bull;</span>
            <span>&copy; 2026 AeroDAG</span>
          </div>
        </div>
      </footer>

      {/* 4. Separate Developer/Portfolio Observability Modal (Invisible to normal consumers) */}
      <SystemObservabilityModal
        isOpen={isObservabilityOpen}
        onClose={() => setIsObservabilityOpen(false)}
      />
    </div>
  );
}
