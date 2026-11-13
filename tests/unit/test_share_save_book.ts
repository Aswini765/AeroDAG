/**
 * tests/unit/test_share_save_book.ts
 *
 * Share, save, book screen:
 * - Each place you sleep gets its own booking link with its own dates (Manali 20–23 Nov, Kasol 23–25 Nov).
 * - The group message shows the same total, buffer and per-person numbers as the plan.
 * - Booking hand-off and share live behind one action bar.
 */
import * as fs from 'fs';
import * as path from 'path';
import { getStayLegs, formatDateRange } from '../../src/services/bookingLinks';

let passed = 0;
function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
  passed++;
  console.log(`✓ PASS ${msg}`);
}

const party = { adults: 2, children: 1, childAges: [6] };

// 1. Multi-stop legs follow each other
const legs = getStayLegs({
  dates: '20–25 Nov 2026',
  destination: 'Himachal Pradesh, India',
  durationDays: 6,
  stays: [{ baseName: 'Manali', nights: 3 }, { baseName: 'Kasol', nights: 2 }]
}, party);
assert(legs.length === 2, 'Two stops give two hotel links');
assert(legs[0].place === 'Manali' && legs[0].dateLabel === '20–23 Nov', `Manali is 20–23 Nov (got ${legs[0].dateLabel})`);
assert(legs[1].place === 'Kasol' && legs[1].dateLabel === '23–25 Nov', `Kasol is 23–25 Nov (got ${legs[1].dateLabel})`);
assert(legs[0].url.includes('checkin=11202026') && legs[0].url.includes('checkout=11232026'), 'Manali link carries its own check-in/out');
assert(legs[1].url.includes('checkin=11232026') && legs[1].url.includes('checkout=11252026'), 'Kasol link carries its own check-in/out');
assert(legs[0].url.includes('roomStayQualifier=2e1e6e'), 'Guests (2 adults, 1 child aged 6) are filled in');
assert(legs[1].url.includes('searchText=Kasol'), 'Second link searches Kasol, not the state');

// 2. Single stop uses the trip nights
const single = getStayLegs({ dates: '20–23 Nov 2026', destination: 'Coorg, Karnataka, India', durationDays: 4 }, { adults: 2 });
assert(single.length === 1 && single[0].place === 'Coorg', 'Single stop books the destination');
assert(single[0].dateLabel === '20–23 Nov', `Single stop covers all nights (got ${single[0].dateLabel})`);

// 3. Unreadable dates never invent dates
const noDates = getStayLegs({ dates: 'sometime', destination: 'Goa', durationDays: 4 }, { adults: 2 });
assert(noDates[0].dateLabel === '' && !noDates[0].url.includes('checkin='), 'No made-up dates when the trip dates cannot be read');

// 4. Month boundaries
assert(formatDateRange(new Date(2026, 10, 30), new Date(2026, 11, 2)) === '30 Nov – 2 Dec', 'Ranges across months read naturally');

// 5. UI wiring
const root = path.join(process.cwd(), 'src/components/consumer/plan');
const header = fs.readFileSync(path.join(root, 'PlanHeader.tsx'), 'utf8');
const sheet = fs.readFileSync(path.join(root, 'ShareSaveSheet.tsx'), 'utf8');
assert(header.includes('Share with group') && header.includes('<ShareSaveSheet'), 'Share with group opens the Share, save, book screen');
assert(sheet.includes('same on the plan, the message and My trips'), 'Sheet states the one-total promise');
assert(sheet.includes('formatTripShareText') && sheet.includes('computeFullTripCost'), 'Sheet uses the same cost engine and message as everywhere else');
assert(sheet.includes('Saved · not booked'), 'Saved trips are never shown as booked');
assert(sheet.includes('getStayLegs'), 'Sheet lists one booking link per stop');

console.log(`\nAll ${passed} share/save/book assertions passed.`);
