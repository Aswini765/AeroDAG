// src/services/dateResolver.ts
// Turns natural travel-date phrases into exact dates, relative to today.
//   "20th to 27th this month"        -> 20–27 Oct 2026 (8 days)
//   "between the 20th and 27th"      -> this month, or next month if those days have passed
//   "28 Oct to 2 Nov", "Nov 14-20"   -> exact ranges
//   "from 5 Nov for 4 days"          -> 5–8 Nov 2026
//   "this weekend" / "next weekend"  -> Fri–Sun
// Deterministic on purpose: the same sentence always gives the same dates.

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const DAY_RE = '(?<![\\d,.])(\\d{1,2})(?:st|nd|rd|th)?(?![\\d,])';
const SEP_RE = '\\s*(?:-|–|—|to|till|until|and|through)\\s*(?:the\\s+)?';
const WORD_NUMS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

export interface ResolvedDates {
  ok: true;
  start: Date;
  end: Date;
  days: number;
  nights: number;
  /** "20–27 Oct 2026" or "28 Oct – 2 Nov 2026" */
  label: string;
  matchedText: string;
}
export interface DateProblem {
  ok: false;
  error: string;
  matchedText: string;
}
export type DateResolution = ResolvedDates | DateProblem | null;

const monthIndex = (m: string) => MONTHS.indexOf(m.slice(0, 3).toLowerCase());
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayDiff = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);

export function formatDateRange(start: Date, end: Date): string {
  const sm = MONTH_LABELS[start.getMonth()];
  const em = MONTH_LABELS[end.getMonth()];
  if (start.getFullYear() !== end.getFullYear()) {
    return `${start.getDate()} ${sm} ${start.getFullYear()} – ${end.getDate()} ${em} ${end.getFullYear()}`;
  }
  if (start.getMonth() === end.getMonth()) {
    return start.getDate() === end.getDate()
      ? `${start.getDate()} ${sm} ${start.getFullYear()}`
      : `${start.getDate()}–${end.getDate()} ${sm} ${start.getFullYear()}`;
  }
  return `${start.getDate()} ${sm} – ${end.getDate()} ${em} ${end.getFullYear()}`;
}

function build(start: Date, end: Date, matchedText: string, today: Date): DateResolution {
  const t = startOfDay(today);
  if (end < start) return { ok: false, error: 'The end date is before the start date. Please check your dates.', matchedText };
  if (start < t) {
    return {
      ok: false,
      error: `${formatDateRange(start, end)} has already passed. Please pick upcoming dates.`,
      matchedText
    };
  }
  const days = dayDiff(start, end) + 1;
  if (days > 60) return { ok: false, error: 'That trip is longer than 60 days. Please pick a shorter range.', matchedText };
  return { ok: true, start, end, days, nights: Math.max(0, days - 1), label: formatDateRange(start, end), matchedText };
}

function makeDate(y: number, m: number, d: number): Date | null {
  if (m < 0 || m > 11 || d < 1 || d > daysInMonth(y, m)) return null;
  return new Date(y, m, d);
}

/** Pick the year: the given one; else next year for a month already gone, else this year.
 *  (A day that passed earlier THIS month stays this year, so the user gets a clear "already passed".) */
function pickYear(m: number, _d: number, today: Date, explicitYear?: string): number {
  if (explicitYear) return parseInt(explicitYear, 10);
  return m < today.getMonth() ? today.getFullYear() + 1 : today.getFullYear();
}

function invalidDay(matchedText: string): DateProblem {
  return { ok: false, error: "That date doesn't exist in the calendar. Please check the day and month.", matchedText };
}

export function resolveTravelDates(text: string, today: Date = new Date()): DateResolution {
  const s = text.toLowerCase().replace(/\s+/g, ' ');
  let m: RegExpMatchArray | null;

  // 1. "28 oct to 2 nov (2026)"
  m = s.match(new RegExp(`${DAY_RE}\\s*(?:of\\s+)?${MONTH_RE}${SEP_RE}${DAY_RE}\\s*(?:of\\s+)?${MONTH_RE}(?:,?\\s*(\\d{4}))?`));
  if (m) {
    const m1 = monthIndex(m[2]), m2 = monthIndex(m[4]);
    const y1 = pickYear(m1, +m[1], today, m[5]);
    const y2 = m2 < m1 ? y1 + 1 : y1;
    const a = makeDate(y1, m1, +m[1]), b = makeDate(y2, m2, +m[3]);
    return a && b ? build(a, b, m[0], today) : invalidDay(m[0]);
  }

  // 2. "20 to 27 oct", "20th to 27th of october 2026"
  m = s.match(new RegExp(`${DAY_RE}${SEP_RE}${DAY_RE}\\s*(?:of\\s+)?${MONTH_RE}(?:,?\\s*(\\d{4}))?`));
  if (m) {
    const mi = monthIndex(m[3]);
    const y = pickYear(mi, +m[1], today, m[4]);
    const a = makeDate(y, mi, +m[1]), b = makeDate(y, mi, +m[2]);
    return a && b ? build(a, b, m[0], today) : invalidDay(m[0]);
  }

  // 3. "oct 20 to 27", "november 14-20 2026"
  m = s.match(new RegExp(`${MONTH_RE}\\s+${DAY_RE}${SEP_RE}${DAY_RE}(?:,?\\s*(\\d{4}))?`));
  if (m) {
    const mi = monthIndex(m[1]);
    const y = pickYear(mi, +m[2], today, m[4]);
    const a = makeDate(y, mi, +m[2]), b = makeDate(y, mi, +m[3]);
    return a && b ? build(a, b, m[0], today) : invalidDay(m[0]);
  }

  // 4. "20th to 27th (of) this month / next month", "between the 20th and 27th"
  m = s.match(new RegExp(`(?:between\\s+(?:the\\s+)?|from\\s+(?:the\\s+)?)?${DAY_RE}${SEP_RE}${DAY_RE}(?:\\s+(?:of\\s+)?(this|next|coming)\\s+month)?`));
  if (m && (/(st|nd|rd|th)\b/.test(m[0]) || m[3] || /between|from/.test(m[0]))) {
    const d1 = +m[1], d2 = +m[2];
    let y = today.getFullYear(), mi = today.getMonth();
    const explicitNext = m[3] === 'next' || m[3] === 'coming';
    if (explicitNext || (!m[3] && d1 < today.getDate())) {
      mi += 1;
      if (mi > 11) { mi = 0; y += 1; }
    }
    const a = makeDate(y, mi, d1);
    // "28th to 3rd" crosses into the following month
    const b = d2 >= d1 ? makeDate(y, mi, d2) : makeDate(mi === 11 ? y + 1 : y, (mi + 1) % 12, d2);
    return a && b ? build(a, b, m[0], today) : invalidDay(m[0]);
  }

  // Duration helper for single-start phrases: "for 5 days" / "for 4 nights" / "for a week"
  const durM = s.match(/for\s+(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|a)\s*(day|days|night|nights|week|weeks)\b/);
  const durationDays = (() => {
    if (!durM) return null;
    const n = durM[1] === 'a' ? 1 : (WORD_NUMS[durM[1]] ?? parseInt(durM[1], 10));
    if (/week/.test(durM[2])) return n * 7;
    if (/night/.test(durM[2])) return n + 1;
    return n;
  })();

  // 5. "from 5 nov (for 4 days)", "on 20th october"
  m = s.match(new RegExp(`(?:from|on|starting|leaving)\\s+(?:the\\s+)?${DAY_RE}\\s*(?:of\\s+)?${MONTH_RE}(?:,?\\s*(\\d{4}))?`))
    || s.match(new RegExp(`(?:from|on|starting|leaving)\\s+${MONTH_RE}\\s+${DAY_RE}(?:,?\\s*(\\d{4}))?`));
  if (m && durationDays) {
    const first = /^\d/.test(m[1]);
    const day = first ? +m[1] : +m[2];
    const mi = monthIndex(first ? m[2] : m[1]);
    const y = pickYear(mi, day, today, m[3]);
    const a = makeDate(y, mi, day);
    return a ? build(a, addDays(a, durationDays - 1), m[0], today) : invalidDay(m[0]);
  }

  // 6. "this weekend" / "next weekend" (Fri–Sun)
  m = s.match(/\b(this|next|coming)\s+weekend\b/);
  if (m) {
    const dow = today.getDay(); // 0 Sun … 5 Fri, 6 Sat
    let toFri = (5 - dow + 7) % 7;
    if (dow === 6) toFri = -1; // Saturday: this weekend started yesterday
    if (dow === 0) toFri = 5; // Sunday: treat "this weekend" as the coming one
    let fri = addDays(startOfDay(today), toFri);
    if (m[1] === 'next' && dow >= 1 && dow <= 4) fri = addDays(fri, 7);
    if (fri < startOfDay(today)) fri = startOfDay(today);
    const sun = addDays(fri, fri.getDay() === 6 ? 1 : 2);
    return build(fri, sun, m[0], today);
  }

  // 7. A start date anywhere + a trip length anywhere:
  //    "7 days in Goa ... starting tomorrow evening", "7-day Goa trip from October 19th"
  const start = findStartDate(s, today);
  const length = durationDays ?? findTripLength(s);
  if (start && 'error' in start) return { ok: false, error: start.error, matchedText: start.matchedText };
  if (start && length) {
    return build(start.date, addDays(start.date, length - 1), start.matchedText, today);
  }
  // A start date but no length ("Goa on 25 December"): assume a 5-day trip.
  if (start && start.matchedText !== 'today') {
    return build(start.date, addDays(start.date, 4), start.matchedText, today);
  }

  return null;
}

/** Trip length anywhere in the text: "7 days", "7-day", "5 nights", "a week", "2 weeks", "weekend". */
export function findTripLength(text: string): number | null {
  const s = text.toLowerCase();
  let m = s.match(/\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s*[- ]?(day|days|night|nights)\b/);
  if (m) {
    const n = WORD_NUMS[m[1]] ?? parseInt(m[1], 10);
    return /night/.test(m[2]) ? n + 1 : n;
  }
  m = s.match(/\b(a|one|two|three|\d)\s*[- ]?weeks?\b/);
  if (m) return (m[1] === 'a' ? 1 : (WORD_NUMS[m[1]] ?? parseInt(m[1], 10))) * 7;
  return null;
}

/** A start date anywhere in the text: "tomorrow", "day after tomorrow", "19 Oct", "October 19th", "starting the 19th". */
export function findStartDate(
  text: string,
  today: Date = new Date()
): { date: Date; matchedText: string } | { error: string; matchedText: string } | null {
  const s = text.toLowerCase().replace(/\s+/g, ' ');
  if (/\bday after tomorrow\b/.test(s)) return { date: addDays(startOfDay(today), 2), matchedText: 'day after tomorrow' };
  if (/\btomorrow\b/.test(s)) return { date: addDays(startOfDay(today), 1), matchedText: 'tomorrow' };
  if (/\btoday\b|\btonight\b/.test(s)) return { date: startOfDay(today), matchedText: 'today' };
  let m = s.match(new RegExp(`${DAY_RE}\\s*(?:of\\s+)?${MONTH_RE}(?:,?\\s*(\\d{4}))?`));
  if (m) {
    const mi = monthIndex(m[2]);
    const d = makeDate(pickYear(mi, +m[1], today, m[3]), mi, +m[1]);
    return d ? { date: d, matchedText: m[0] } : { error: "That date doesn't exist in the calendar. Please check the day and month.", matchedText: m[0] };
  }
  m = s.match(new RegExp(`${MONTH_RE}\\s+${DAY_RE}(?:,?\\s*(\\d{4}))?`));
  if (m) {
    const mi = monthIndex(m[1]);
    const d = makeDate(pickYear(mi, +m[2], today, m[3]), mi, +m[2]);
    return d ? { date: d, matchedText: m[0] } : { error: "That date doesn't exist in the calendar. Please check the day and month.", matchedText: m[0] };
  }
  // "starting the 19th", "from 19th" (this month, or next month if that day has passed)
  m = s.match(/(?:from|starting|leaving|on)\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/);
  if (m) {
    let y = today.getFullYear(), mi = today.getMonth();
    if (+m[1] < today.getDate()) { mi += 1; if (mi > 11) { mi = 0; y += 1; } }
    const d = makeDate(y, mi, +m[1]);
    return d ? { date: d, matchedText: m[0] } : null;
  }
  return null;
}
