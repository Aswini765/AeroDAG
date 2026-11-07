import React from 'react';
import { ArrowLeft, ArrowRight, Check, X, Clock, Calendar, Sparkles, Tag, ShieldCheck } from 'lucide-react';
import { DestinationComparisonResult, ComparisonPlaceItem } from '../../services/destinationComparisonService';
import { TripPlan } from '../../types/travelBooking';

interface DestinationComparisonViewProps {
  comparison: DestinationComparisonResult;
  onSelectPlacePlan: (plan: TripPlan) => void;
  onBackToSearch: () => void;
}

export const DestinationComparisonView: React.FC<DestinationComparisonViewProps> = ({
  comparison,
  onSelectPlacePlan,
  onBackToSearch
}) => {
  const { places, durationDays, totalTravellers, targetBudgetINR, transportMode } = comparison;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in-slide space-y-6">
      {/* Top Header & Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E6E1]">
        <div className="space-y-1">
          <button
            type="button"
            onClick={onBackToSearch}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0E6B59] hover:underline mb-1 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to search</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#15201D] font-heading">
            Comparing {places.map((p) => p.cleanName).join(' vs ')}
          </h1>
          <p className="text-xs sm:text-sm text-[#55625E]">
            {durationDays} days · {totalTravellers} traveller{totalTravellers > 1 ? 's' : ''} · Target Budget: ₹{targetBudgetINR.toLocaleString('en-IN')} {transportMode ? `· ${transportMode}` : ''}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 bg-[#E3F1EC] text-[#0E6B59] px-3.5 py-1.5 rounded-full text-xs font-bold self-start sm:self-auto">
          <Sparkles className="h-4 w-4" />
          <span>Same Cost Engine Comparison</span>
        </div>
      </div>

      {/* Side-by-Side Columns Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-${Math.min(3, places.length)} gap-4 sm:gap-6`}>
        {places.map((item) => {
          return (
            <div
              key={item.cleanName}
              className="card-consumer p-0 overflow-hidden border border-[#E2E6E1] bg-white rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow"
            >
              {/* Photo & Header */}
              <div className="relative h-44 sm:h-48 w-full bg-[#E2E6E1] overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={item.cleanName}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0E6B59] bg-white/95 px-2.5 py-0.5 rounded-full shadow-xs">
                    {item.vibe}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                  <h2 className="text-2xl font-bold text-white drop-shadow-md font-heading">
                    {item.cleanName}
                  </h2>
                  <span className="text-[11px] font-bold text-[#15201D] bg-white/95 backdrop-blur-xs px-2.5 py-0.5 rounded-md shadow-xs">
                    {item.priceLabel}
                  </span>
                </div>
              </div>

              {/* Rows of Comparison */}
              <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col justify-between text-left text-xs">
                <div className="space-y-3.5">
                  {/* Row 1: Total with Buffer */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E6E1]/70">
                    <span className="text-[#55625E] font-medium">Total (with buffer)</span>
                    <span className="text-base font-black text-[#15201D]">
                      ₹{item.totalWithBufferINR.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Row 2: Per Person */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E6E1]/70">
                    <span className="text-[#55625E] font-medium">Per person</span>
                    <span className="font-bold text-[#15201D]">
                      ₹{item.perPersonINR.toLocaleString('en-IN')}/person
                    </span>
                  </div>

                  {/* Row 3: Fits Budget */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E6E1]/70">
                    <span className="text-[#55625E] font-medium">Fits budget?</span>
                    <span
                      className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md ${item.fitsBudget
                        ? 'bg-[#E3F1EC] text-[#0E6B59]'
                        : 'bg-[#FCEFD9] text-[#8A4307]'
                        }`}
                    >
                      {item.fitsBudget ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Yes (Within budget)</span>
                        </>
                      ) : (
                        <>
                          <X className="h-3.5 w-3.5" />
                          <span>+₹{item.budgetDifferenceINR.toLocaleString('en-IN')} over</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Row 4: Travel time and mode */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E6E1]/70">
                    <span className="text-[#55625E] font-medium flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-[#0E6B59]" />
                      <span>Travel time</span>
                    </span>
                    <span className="font-semibold text-[#15201D]">
                      {item.travelTime} ({item.travelMode})
                    </span>
                  </div>

                  {/* Row 5: Best months */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E6E1]/70">
                    <span className="text-[#55625E] font-medium flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-[#0E6B59]" />
                      <span>Best months</span>
                    </span>
                    <span className="font-semibold text-[#15201D]">
                      {item.bestMonths}
                    </span>
                  </div>

                  {/* Row 6: Price Label */}
                  <div className="flex items-center justify-between">
                    <span className="text-[#55625E] font-medium flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5 text-[#0E6B59]" />
                      <span>Price label</span>
                    </span>
                    <span className="font-semibold text-[#15201D]">
                      {item.priceLabel}
                    </span>
                  </div>
                </div>

                {/* Action CTA: "Plan this one" */}
                <div className="pt-4 border-t border-[#E2E6E1]">
                  <button
                    type="button"
                    onClick={() => onSelectPlacePlan(item.plan)}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#0E6B59] hover:bg-[#0A5546] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <span>Plan {item.cleanName}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footnote on transparent pricing */}
      <div className="p-3.5 rounded-xl bg-[#F6F8F6] border border-[#E2E6E1] text-xs text-[#55625E] flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[#0E6B59] shrink-0" />
        <span>
          Every comparison column is computed using the identical full cost engine including stay, travel, dining, activities and the 15% surprise buffer.
        </span>
      </div>
    </div>
  );
};

