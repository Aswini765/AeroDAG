import { TripPlan, TripPreferences } from '../types/travelBooking';
import { computeFullTripCost } from './fullTripCostHelper';
import { generatePlanOptions } from './planOptionsGenerator';

export function formatTripShareText(plan: TripPlan, preferences?: TripPreferences | null): string {
  const cost = computeFullTripCost(plan, preferences);
  const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
  const adults = plan.travellers?.adults ?? preferences?.adultsCount ?? 2;
  const children = plan.travellers?.children ?? preferences?.childrenCount ?? 0;
  const total = adults + children;
  const travellersText = children > 0
    ? `${adults} adult${adults > 1 ? 's' : ''} + ${children} child${children > 1 ? 'ren' : ''}`
    : `${adults} ${adults === 1 ? 'person' : 'people'}`;
  const place = plan.destination.replace(/,.*$/, '').trim();
  const origin = (plan.origin || '').replace(/\s*\([^)]*\)/, '').trim();

  const stayText = plan.stays && plan.stays.length > 1
    ? plan.stays.map((s) => `${s.baseName} ${s.nights}N`).join(' + ')
    : `${Math.max(1, plan.durationDays - 1)} night${plan.durationDays - 1 === 1 ? "" : "s"} in ${plan.hotel?.area || place}`;
  const travelText = plan.flight ? `flights from ${origin}` : plan.selectedTrain ? `train from ${origin}` : `by road from ${origin}`;

  const budget = preferences?.budgetTotalINR || plan.budget?.targetINR || 0;
  const budgetText = budget > 0
    ? (cost.totalWithBufferINR > budget
        ? ` · ${inr(cost.totalWithBufferINR - budget)} over our ${inr(budget)}`
        : ` · fits our ${inr(budget)}`)
    : '';

  // A cheaper way to do the same trip, from the same cost engine
  let cheaperText = '';
  try {
    const options = generatePlanOptions(plan, preferences);
    const cheapest = options.reduce((m, o) => (o.totalCostINR < m.totalCostINR ? o : m), options[0]);
    if (cheapest && cheapest.totalCostINR < cost.totalWithBufferINR - 500) {
      cheaperText = `\nCheaper option: ${inr(cheapest.totalCostINR)} (${cheapest.stayArea}${cheapest.travelMode ? ', ' + cheapest.travelMode.toLowerCase() : ''})`;
    }
  } catch {
    // options are a nice-to-have in the message
  }

  return `${place} · ${plan.dates} · ${travellersText}
${stayText}, ${travelText}

Real total: ${inr(cost.totalWithBufferINR)} (incl. 15% buffer of ${inr(cost.bufferAmountINR)})
${total > 1 ? `${inr(cost.perPersonINR)} each` : 'Just me'}${budgetText}${cheaperText}

Prices are estimates, not quotes. Planned with AeroDAG (aerodag.onrender.com)`;
}

export function getWhatsAppShareUrl(plan: TripPlan, preferences?: TripPreferences | null): string {
  const text = formatTripShareText(plan, preferences);
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export async function shareTripPlan(
  plan: TripPlan,
  preferences?: TripPreferences | null
): Promise<{ method: 'native' | 'clipboard' | 'whatsapp'; success: boolean }> {
  const text = formatTripShareText(plan, preferences);
  const title = `Trip Plan to ${plan.destination.replace(/,.*$/, '')}`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text });
      return { method: 'native', success: true };
    } catch (e: any) {
      if (e.name === 'AbortError') {
        return { method: 'native', success: false };
      }
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return { method: 'clipboard', success: true };
    } catch {
      // Fallback to whatsapp
    }
  }

  return { method: 'whatsapp', success: true };
}
