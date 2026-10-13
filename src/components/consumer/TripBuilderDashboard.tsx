import React from 'react';
import {
  TripPlan,
  TripPreferences,
  FlightItem,
  HotelItem,
  TransferItem,
  ActivityDayItem,
  VisaDetails,
  Currency
} from '../../types/travelBooking';
import { PlanScreen } from './PlanScreen';

interface TripBuilderDashboardProps {
  preferences: TripPreferences;
  selectedFlight: FlightItem | null;
  selectedHotel: HotelItem | null;
  selectedTransfer: TransferItem | null;
  visaDetails: VisaDetails | null;
  itinerary: ActivityDayItem[];
  activeTripPlan?: TripPlan | null;
  onTripPlanChange?: (plan: TripPlan) => void;
  onSelectFlight: (flight: FlightItem) => void;
  onSelectHotel: (hotel: HotelItem) => void;
  onSelectTransfer: (transfer: TransferItem) => void;
  onUpdateItineraryDay: (
    dayNumber: number,
    modificationType: 'relaxed' | 'food' | 'budget'
  ) => void;
  onChangeFlight: () => void;
  onChangeHotel: () => void;
  onProceedToCheckout: () => void;
  currency: Currency;
  onBudgetIncrease?: (newBudget: number) => void;
  onAutoFixBudget?: () => void;
  onDescribeAgain?: () => void;
}

export const TripBuilderDashboard: React.FC<TripBuilderDashboardProps> = ({
  preferences,
  selectedFlight,
  selectedHotel,
  selectedTransfer,
  visaDetails,
  itinerary,
  activeTripPlan,
  onTripPlanChange,
  onSelectFlight,
  onSelectHotel,
  onSelectTransfer,
  onUpdateItineraryDay,
  onProceedToCheckout,
  currency,
  onDescribeAgain
}) => {
  // If activeTripPlan is available, use it directly
  if (activeTripPlan) {
    return (
      <PlanScreen
        plan={activeTripPlan}
        preferences={preferences}
        onPlanChange={(updatedPlan) => {
          if (onTripPlanChange) onTripPlanChange(updatedPlan);
          if (updatedPlan.flight) onSelectFlight(updatedPlan.flight);
          if (updatedPlan.hotel) onSelectHotel(updatedPlan.hotel);
          if (updatedPlan.transfer) onSelectTransfer(updatedPlan.transfer);
        }}
        onProceedToReview={onProceedToCheckout}
        onDescribeAgain={onDescribeAgain || (() => window.location.reload())}
        onUpdateItineraryDay={onUpdateItineraryDay}
      />
    );
  }

  // Fallback if no plan object
  return (
    <div className="max-w-xl mx-auto my-16 p-8 text-center card-consumer space-y-4">
      <h2 className="text-xl font-bold text-[#15201D] font-heading">No plan generated yet</h2>
      <p className="text-sm text-[#55625E]">
        Describe your journey to generate a tailored itinerary within budget.
      </p>
    </div>
  );
};
