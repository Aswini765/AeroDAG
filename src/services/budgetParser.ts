/**
 * Dedicated budget parser for Indian and international travel budgets.
 * Supports:
 * - Lakhs: "1.5 lakh", "1.5 lakhs", "1.5 lac", "1.5L", "2 lakh", "2.5 lacs"
 * - Thousands (k): "45k", "35.5k", "120k", "25 k"
 * - Currency prefixes/suffixes: "₹45,000", "rs. 45000", "45000 inr", "45000 rupees"
 * - Contextual phrases: "budget 45000", "under 35k", "cap of 50000"
 * - Plain 5-7 digit numbers: "45000", "120000"
 */

export function parseBudgetINR(text: string): number | null {
  if (!text) return null;
  const lower = text.toLowerCase().replace(/,/g, '');

  // 1. Lakhs: e.g. "1.5 lakh", "1.5lakhs", "1.5 lac", "1.5l", "2 lakh", "0.75 lakh"
  const lakhMatch = lower.match(/(?:(?:budget|under|around|approx|cap|within|to|is|of|for|₹|rs\.?|inr)\s*)?(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?|lac|l\b)/i);
  if (lakhMatch) {
    const val = parseFloat(lakhMatch[1]);
    if (!isNaN(val) && val > 0) {
      return Math.round(val * 100000);
    }
  }

  // 2. Thousands with 'k': e.g. "45k", "45 k", "35.5k", "budget 60k"
  const kMatch = lower.match(/(?:(?:budget|under|around|approx|cap|within|to|is|of|for|₹|rs\.?|inr)\s*)?(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) {
    const val = parseFloat(kMatch[1]);
    if (!isNaN(val) && val > 0) {
      return Math.round(val * 1000);
    }
  }

  // 3. Currency symbols or budget keyword with digits: e.g. "₹45000", "rs. 45000", "inr 45000", "budget 45000", "45000 inr", "45000 rupees"
  const currencyMatch =
    lower.match(/(?:(?:₹|rs\.?|inr|rupees?|budget|under|around|approx|cap|within)\s*)(\d{4,7})/i) ||
    lower.match(/(\d{4,7})\s*(?:₹|rs\.?|inr|rupees?|budget)/i);
  if (currencyMatch) {
    const val = parseInt(currencyMatch[1], 10);
    if (!isNaN(val) && val >= 3000) {
      return val;
    }
  }

  // 4. Standalone 5 to 7 digit numbers (e.g. "45000", "60000")
  const standaloneMatch = lower.match(/\b(\d{5,7})\b/);
  if (standaloneMatch) {
    const val = parseInt(standaloneMatch[1], 10);
    if (!isNaN(val) && val >= 3000) {
      return val;
    }
  }

  return null;
}
