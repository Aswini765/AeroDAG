// src/server/partySize.ts
// Smaller Gemini models often forget to count the person writing ("me, my wife and our son" -> 2).
// This counts the people a message clearly names, so the total is never lower than that.

const EXPLICIT_COUNT = /\b(\d{1,2}|two|three|four|five|six|seven|eight|nine|ten)\s*(adults?|people|persons?|pax|travell?ers|of us|members)\b|\bfamily of\s*\d/i;

export function impliedPartySize(text: string): { total: number; self: boolean } | null {
  const s = ` ${text.toLowerCase()} `;
  if (EXPLICIT_COUNT.test(s)) return null; // the user gave a number; trust the parser

  const self = /\b(me|i|i'm|myself|we|us|our)\b/.test(s) || /\bwith my\b/.test(s);
  let others = 0;
  if (/\b(wife|husband|spouse|partner|girlfriend|boyfriend|fianc[eé]e?)\b/.test(s)) others += 1;
  if (/\b(parents|in-?laws)\b/.test(s)) others += 2;
  const parentWords = s.match(/\b(mother-in-law|father-in-law|mother|mom|mum|amma|father|dad|papa|appa|grandmother|grandfather|grandma|grandpa|paati|thatha)\b/g) || [];
  others += new Set(parentWords).size;
  const kidWords = s.match(/\b(son|daughter|kid|child|baby|toddler)\b/g) || [];
  others += kidWords.length;
  if (/\b(sons|daughters|kids|children)\b/.test(s) && kidWords.length === 0) others += 2;

  if (!self && others === 0) return null;
  return { total: (self ? 1 : 0) + others, self };
}
