import React from 'react';
import { ShieldAlert, Users, Leaf, Baby, Accessibility, Backpack } from 'lucide-react';
import { TripPlan, TripPreferences } from '../../../types/travelBooking';
import { permitNotes, roomsNeeded } from '../../../services/travelRealism';

interface ForYourTripCardProps {
  plan: TripPlan;
  preferences: TripPreferences;
}

const BEACH = /goa|gokarna|varkala|kovalam|pondicherry|puducherry|andaman|havelock|puri|alibaug|tarkarli|lakshadweep|mahabalipuram/i;
const HILLS = /manali|shimla|kasol|dharamshala|mcleod|mussoorie|nainital|rishikesh|darjeeling|gangtok|shillong|cherrapunji|ooty|kodaikanal|munnar|coorg|chikmagalur|tawang|ziro|leh|ladakh|spiti|kashmir|srinagar|gulmarg|himachal|uttarakhand|sikkim|meghalaya|arunachal/i;

/**
 * "For your trip": things a local would tell you, specific to this place and this group.
 * Permits first (they can stop a trip), then kids / seniors / food / solo / big group.
 */
export const ForYourTripCard: React.FC<ForYourTripCardProps> = ({ plan, preferences }) => {
  const placeText = `${plan.destination} ${(plan.stays || []).map((s) => s.baseName).join(' ')} ${plan.hotel?.area || ''} ${plan.itinerary.map((d) => `${d.morning} ${d.afternoon}`).join(' ')}`;
  const permits = permitNotes(placeText);
  const place = plan.destination.replace(/,.*$/, '').trim();
  const t = plan.travellers;
  const notesText = `${preferences.dietaryOrNotes || ''} ${preferences.dietaryPreference || ''} ${(preferences.tripNeeds || []).join(' ')} ${(plan.groupNeeds || []).join(' ')}`.toLowerCase();
  const isVeg = /veg|jain|satvik/.test(notesText) && !/non[- ]?veg/.test(notesText);
  const isBeach = BEACH.test(placeText);
  const isHills = HILLS.test(placeText);
  const ages = (t.childAges || []).filter((a) => typeof a === 'number');
  const grownUps = t.adults + (t.seniors || 0);

  const lines: { icon: React.ReactNode; text: string }[] = [];

  if (t.children > 0) {
    // Age 8 is our stand-in when no age was given: never show it as if the traveller said it
    const told = ages.filter((a) => a !== 8);
    const ageText = told.length && told.length === ages.length ? ` aged ${ages.join(' and ')}` : told.length ? ` (age${told.length > 1 ? 's' : ''} given: ${told.join(', ')})` : '';
    lines.push({
      icon: <Baby className="h-4 w-4 text-[#0E6B59]" />,
      text: `With ${t.children === 1 ? 'a child' : `${t.children} kids`}${ageText}: ${
        isBeach ? 'pick calm, lifeguarded beaches and skip water sports for under-12s' : isHills ? 'carry warm layers and motion-sickness tablets for winding roads' : 'keep drives under 3 hours and plan a pool or park break each afternoon'
      }. Ask for an extra bed — we priced ${roomsNeeded(t.adults, t.children, t.seniors || 0)} room${roomsNeeded(t.adults, t.children, t.seniors || 0) > 1 ? 's' : ''}.`
    });
  }
  if ((t.seniors || 0) > 0) {
    lines.push({
      icon: <Accessibility className="h-4 w-4 text-[#0E6B59]" />,
      text: `For older travellers: ask for a ground-floor room or a lift, keep one easy day${isHills ? ', and check for altitude or steep walks before you go' : ''}.`
    });
  }
  if (isVeg) {
    lines.push({
      icon: <Leaf className="h-4 w-4 text-[#0E6B59]" />,
      text: `Pure veg: ${
        isBeach ? `beach shacks in ${place} are mostly seafood — look for Udupi or thali places, and ask for a veg thali` : `search "pure veg" near your stay in ${place}; Udupi-style and Marwari bhojanalayas are a safe bet`
      }.`
    });
  }
  if (t.total === 1) {
    lines.push({
      icon: <Backpack className="h-4 w-4 text-[#0E6B59]" />,
      text: `Travelling solo: backpacker hostels with lockers are the cheapest safe stay; share your live location and avoid arriving after dark.`
    });
  } else if (grownUps >= 5) {
    lines.push({
      icon: <Users className="h-4 w-4 text-[#0E6B59]" />,
      text: `Group of ${t.total}: priced as ${roomsNeeded(t.adults, t.children, t.seniors || 0)} rooms with triple sharing. One tempo traveller for the day is cheaper than ${Math.ceil(t.total / 4)} cabs.`
    });
  }

  if (permits.length === 0 && lines.length === 0) return null;

  return (
    <section id="for-your-trip" aria-labelledby="for-your-trip-title" className="rounded-[14px] bg-white border border-[#E2E6E1] p-3.5 space-y-2.5 text-left">
      <h2 id="for-your-trip-title" className="text-[15px] font-bold text-[#15201D]">For your trip</h2>
      {permits.map((p) => (
        <div key={p} id="permit-needed" className="flex items-start gap-2 rounded-xl bg-[#FCEFD9] px-3 py-2.5 text-[13px] text-[#7A4B00]">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <span><strong>Permit needed.</strong> {p}</span>
        </div>
      ))}
      {lines.map((l) => (
        <div key={l.text} className="flex items-start gap-2 text-[13px] text-[#15201D]">
          <span className="mt-0.5 shrink-0">{l.icon}</span>
          <span>{l.text}</span>
        </div>
      ))}
    </section>
  );
};
