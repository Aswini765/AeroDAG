/**
 * Is the budget someone wrote for the whole trip, or for each person?
 *
 * Families think in one total ("family budget 60k"); friends think per head
 * ("15k each"). We never ask — we read it from their words, and show the maths
 * back ("₹15,000 each × 10 = ₹1,50,000") so a wrong guess is one tap to fix.
 */

export type BudgetBasis = 'total' | 'per_person' | 'none';

// "per person", "per head", "pp" anywhere; "each" only next to an amount ("15k each", "each of us can spend 12k")
const PER_PERSON_RE = /\b(?:per\s*(?:person|head|pax|adult|member)|pp|a\s+head|apiece|everyone'?s\s+budget|per\s*ppl)\b|\d[\d,.]*\s*(?:k|l|lakhs?|lacs?|thousand)?\s*(?:rs\.?|inr|rupees)?\s*(?:\/-\s*)?each\b|\beach\s+(?:of\s+us\s+)?(?:can\s+)?(?:spend|has|have|pay|budget)?\s*(?:of\s+)?(?:₹|rs\.?|inr)?\s*\d/i;
const TOTAL_RE = /\b(?:total|in\s+total|altogether|in\s+all|for\s+all(?:\s+of\s+us)?|overall|combined|whole\s+(?:trip|family|group)|entire\s+(?:trip|family|group)|family\s+budget|group\s+budget|our\s+budget|for\s+(?:the\s+)?(?:\d+|two|three|four|five|six|seven|eight|nine|ten)\s+of\s+us)\b/i;

/** Read the budget's basis from the user's own words. `null` = the words don't say. */
export function basisFromWords(text: string): Exclude<BudgetBasis, 'none'> | null {
  const t = (text || '').toLowerCase();
  if (PER_PERSON_RE.test(t)) return 'per_person';
  if (TOTAL_RE.test(t)) return 'total';
  return null;
}

/**
 * The words didn't say: a group of 5+ friends usually means a per-head amount,
 * unless the number is too big to be one person's share. Families and couples mean a total.
 */
export function guessBasis(amountINR: number, travellers: number, partyType?: string | null): Exclude<BudgetBasis, 'none'> {
  const friends = partyType === 'friends' || partyType === 'group';
  if (friends && travellers >= 5 && amountINR <= 30000) return 'per_person';
  return 'total';
}

export function decideBasis(text: string, amountINR: number | null, travellers: number, partyType?: string | null): BudgetBasis {
  if (!amountINR || amountINR <= 0) return 'none';
  return basisFromWords(text) || guessBasis(amountINR, travellers, partyType);
}

/** The trip's total, for the cost engine (which always works in totals). */
export function totalFromBudget(amountINR: number, basis: BudgetBasis, travellers: number): number {
  return basis === 'per_person' ? amountINR * Math.max(1, travellers) : amountINR;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** "₹15,000 each × 10 people = ₹1,50,000" or "₹60,000 for all 4 · about ₹15,000 each" */
export function budgetLine(totalINR: number, basis: BudgetBasis, travellers: number): string {
  const n = Math.max(1, travellers);
  if (basis === 'per_person') return `${inr(totalINR / n)} each × ${n} ${n === 1 ? 'person' : 'people'} = ${inr(totalINR)}`;
  if (n === 1) return `${inr(totalINR)} for you`;
  return `${inr(totalINR)} for all ${n} · about ${inr(totalINR / n)} each`;
}
