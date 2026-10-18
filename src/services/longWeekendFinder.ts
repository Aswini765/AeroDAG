/**
 * AeroDAG Long Weekend Finder
 * 
 * Computes upcoming long weekends for the next 12 months using ONLY fixed national holidays:
 * - 26 Jan (Republic Day)
 * - 15 Aug (Independence Day)
 * - 2 Oct (Gandhi Jayanti)
 * - 25 Dec (Christmas)
 * plus weekends.
 * 
 * Displays e.g.:
 * "Fri 2 Oct – Sun 4 Oct · 0 leave days"
 * with note: "Check your own office/school holiday list"
 */

export interface LongWeekendOption {
  id: string;
  holidayName: string;
  holidayDateStr: string;
  startDate: Date;
  endDate: Date;
  startDateIso: string;
  endDateIso: string;
  label: string;
  leaveDays: number;
  leaveDaysNote: string;
  daysCount: number;
  note: string;
}

const FIXED_HOLIDAYS = [
  { name: 'Republic Day', month: 0, day: 26 },
  { name: 'Independence Day', month: 7, day: 15 },
  { name: 'Gandhi Jayanti', month: 9, day: 2 },
  { name: 'Christmas', month: 11, day: 25 }
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function formatDate(d: Date): string {
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

export function findLongWeekends(
  baseDate: Date = new Date(),
  monthsAhead: number = 12
): LongWeekendOption[] {
  const results: LongWeekendOption[] = [];
  const startYear = baseDate.getFullYear();
  const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const maxDate = new Date(today.getFullYear(), today.getMonth() + monthsAhead, today.getDate());

  for (let year = startYear; year <= startYear + 1; year++) {
    for (const hol of FIXED_HOLIDAYS) {
      const holDate = new Date(year, hol.month, hol.day);
      if (holDate < today || holDate > maxDate) {
        continue;
      }

      const dow = holDate.getDay(); // 0 Sun, 1 Mon, 2 Tue, 3 Wed, 4 Thu, 5 Fri, 6 Sat
      
      // Drop holidays that fall on a Saturday or Sunday (not a long weekend)
      if (dow === 0 || dow === 6) {
        continue;
      }

      let startDate: Date;
      let endDate: Date;
      let leaveDays = 0;
      let leaveDaysNote = '0 leave days';

      if (dow === 5) {
        // Friday holiday -> Fri to Sun (3 days, 0 leave days)
        startDate = holDate;
        endDate = addDays(holDate, 2);
        leaveDays = 0;
        leaveDaysNote = '0 leave days';
      } else if (dow === 1) {
        // Monday holiday -> Sat to Mon (3 days, 0 leave days)
        startDate = addDays(holDate, -2);
        endDate = holDate;
        leaveDays = 0;
        leaveDaysNote = '0 leave days';
      } else if (dow === 4) {
        // Thursday holiday -> Thu to Sun (4 days, 1 leave day on Friday)
        startDate = holDate;
        endDate = addDays(holDate, 3);
        leaveDays = 1;
        leaveDaysNote = '1 leave day (Fri)';
      } else if (dow === 2) {
        // Tuesday holiday -> Sat to Tue (4 days, 1 leave day on Monday)
        startDate = addDays(holDate, -3);
        endDate = holDate;
        leaveDays = 1;
        leaveDaysNote = '1 leave day (Mon)';
      } else if (dow === 3) {
        // Wednesday holiday -> Wed to Sun (5 days, 2 leave days on Thu & Fri)
        startDate = holDate;
        endDate = addDays(holDate, 4);
        leaveDays = 2;
        leaveDaysNote = '2 leave days (Thu, Fri)';
      } else {
        continue;
      }

      const daysCount = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
      if (daysCount < 3) {
        continue;
      }

      const label = `${formatDate(startDate)} – ${formatDate(endDate)} ${endDate.getFullYear()} · ${leaveDaysNote}`;

      results.push({
        id: `lw-${hol.name.toLowerCase().replace(/\s+/g, '-')}-${year}`,
        holidayName: hol.name,
        holidayDateStr: `${hol.day} ${MONTH_NAMES[hol.month]} ${year}`,
        startDate,
        endDate,
        startDateIso: toIso(startDate),
        endDateIso: toIso(endDate),
        label,
        leaveDays,
        leaveDaysNote,
        daysCount,
        note: 'Check your own office/school holiday list'
      });
    }
  }

  // Sort chronologically by start date
  return results.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}
