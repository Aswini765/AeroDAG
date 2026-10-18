import React from 'react';
import {
  ShieldCheck,
  MapPin,
  ExternalLink,
  Star,
  CheckCircle2,
  Users,
  Award,
  Sparkles
} from 'lucide-react';
import { TrustVerificationDetails, HotelItem, TransferItem } from '../../../types/travelBooking';

interface TrustAndVerificationCardProps {
  trust?: TrustVerificationDetails;
  hotel: HotelItem;
  transfer?: TransferItem | null;
}

export const TrustAndVerificationCard: React.FC<TrustAndVerificationCardProps> = ({
  trust,
  hotel,
  transfer
}) => {
  if (!trust) return null;

  return (
    <div className="card-consumer p-5 sm:p-6 space-y-5 text-left border-[#E2E6E1]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E6E1]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E3F1EC] text-[#0E6B59] uppercase tracking-wider">
              Trust & Safety Verification
            </span>
            <span className="text-xs text-[#55625E]">· Anti-Fraud Protections</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#15201D] font-heading">
            Verified Stays, Seating & Driver Vetting
          </h3>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#0E6B59] font-bold bg-[#E3F1EC]/60 px-3 py-1 rounded-full">
          <ShieldCheck className="h-4 w-4 text-[#0E6B59]" />
          <span>100% Verified Providers</span>
        </div>
      </div>

      {/* 2-Column: Google Maps Visual Integration & Seat / Driver Behavior */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Google Maps Visual Integration */}
        <div className="p-4 rounded-xl bg-[#F8FAF9] border border-[#E2E6E1] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#0E6B59]" />
              <span className="font-bold text-xs text-[#15201D]">
                Google Maps Visual Verification
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E3F1EC] text-[#0E6B59]">
              Live Pin Verified
            </span>
          </div>

          <p className="text-xs text-[#55625E] leading-relaxed">
            Satellite coordinates and Street View matched to prevent wide-angle lens deception. Verifies true walking distance from beach / sights and absence of nearby construction.
          </p>

          {trust.googleMapsUrl && (
            <a
              href={trust.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0E6B59] hover:underline pt-1"
            >
              <span>View {hotel.name} on Google Maps</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {/* Seat Type & Driver Behavior Rating */}
        <div className="p-4 rounded-xl bg-[#F8FAF9] border border-[#E2E6E1] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-[#0E6B59]" />
              <span className="font-bold text-xs text-[#15201D]">
                Seat & Chauffeur Vetting
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-[#0E6B59] bg-[#E3F1EC] px-2 py-0.5 rounded-full">
              <Star className="h-3 w-3 fill-[#0E6B59] text-[#0E6B59]" />
              <span>{trust.driverBehaviorRating}★</span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-[#55625E]">
            <div className="font-semibold text-[#15201D]">
              {trust.seatTypeVerified}
            </div>
            <p className="text-[11px] leading-relaxed">
              {trust.driverVettingNote}
            </p>
          </div>
        </div>
      </div>

      {/* Verified Reviews Section with Persona Badges */}
      {trust.verifiedReviews && trust.verifiedReviews.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <div className="text-xs font-bold text-[#15201D] flex items-center justify-between">
            <span>Verified Persona Reviews</span>
            <span className="text-[11px] text-[#55625E] font-normal">Real checked-in guests</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {trust.verifiedReviews.map((rev) => (
              <div
                key={rev.id}
                className="p-3.5 rounded-xl border border-[#E2E6E1] bg-[#FFFFFF] space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-bold text-[#15201D]">{rev.author}</div>
                    <div className="text-[10px] text-[#0E6B59] font-medium">{rev.persona}</div>
                  </div>
                  <div className="flex items-center gap-0.5 text-[#D97706] font-bold text-[11px]">
                    <Star className="h-3 w-3 fill-[#D97706]" />
                    <span>{rev.rating}</span>
                  </div>
                </div>

                <p className="text-[#55625E] text-[11px] leading-relaxed">
                  "{rev.comment}"
                </p>

                {rev.highlightBadge && (
                  <div className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#E3F1EC] text-[#0E6B59]">
                    ✓ {rev.highlightBadge}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
