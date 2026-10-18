import { TripPlan, TripPreferences } from '../types/travelBooking';
import { computeFullTripCost } from './fullTripCostHelper';

export function formatTripShareText(plan: TripPlan, preferences?: TripPreferences | null): string {
  const cost = computeFullTripCost(plan, preferences);
  const adults = plan.travellers?.adults ?? preferences?.adultsCount ?? 2;
  const children = plan.travellers?.children ?? preferences?.childrenCount ?? 0;
  const travellersText = children > 0
    ? `${adults} adult${adults > 1 ? 's' : ''}, ${children} child${children > 1 ? 'ren' : ''}`
    : `${adults} traveller${adults > 1 ? 's' : ''}`;

  const linesText = cost.lines
    .map((l) => `• ${l.name}: ₹${l.amountINR.toLocaleString('en-IN')}${l.isEstimate ? ' (Est.)' : ''}`)
    .join('\n');

  return `✈️ Trip Plan: ${plan.destination.replace(/,.*$/, '')}
📅 Dates: ${plan.dates} (${plan.durationDays} days)
👥 Travellers: ${travellersText}

💰 Total Real Cost: ₹${cost.totalWithBufferINR.toLocaleString('en-IN')} (with 15% buffer)
👤 Per Person: ₹${cost.perPersonINR.toLocaleString('en-IN')}

Cost Breakdown:
${linesText}
• 15% Buffer for Surprises: ₹${cost.bufferAmountINR.toLocaleString('en-IN')}

Planned with AeroDAG (aerodag.onrender.com)`;
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
