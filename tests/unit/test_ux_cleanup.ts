/**
 * tests/unit/test_ux_cleanup.ts
 *
 * Locks in the UX clean-up (7 Nov 2026):
 * 1. Only real states/regions get the "Which part of …?" route step. The AI's
 *    guess can never turn Goa, Coorg or a city into a multi-base trip.
 * 2. Place cards send only "<days> days in <place>" — no invented preferences,
 *    budget or traveller count presented as what the user said.
 * 3. No invented ratings, review counts, "verified" claims or raw code field
 *    names on the plan screens.
 * 4. The questions screen asks only travellers/budget; dates, pace and needs are
 *    not extra steps, and the plan builds without a "Build Tailored Plan" tap.
 */
import fs from 'fs';
import path from 'path';
import { isKnownRegion } from '../../src/server/parseTripHandler';
import { applyAiParse } from '../../src/services/aiTripParser';
import { RequirementEngine } from '../../src/services/requirementEngine';

let passed = 0;
function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
  passed++;
  console.log(`✓ PASS ${msg}`);
}

const read = (rel: string) => fs.readFileSync(path.resolve(rel), 'utf8');

// 1. Region detection
for (const city of ['Goa', 'Coorg', 'Ooty', 'Mysuru', 'Udaipur', 'Munnar', 'Pondicherry']) {
  assert(!isKnownRegion(city), `${city} is a single-place trip, not a region`);
}
for (const region of ['Rajasthan', 'Kerala', 'Himachal', 'Uttarakhand']) {
  assert(isKnownRegion(region), `${region} is a region`);
}

{
  const ctx = RequirementEngine.createEmptyContext();
  const sources: Record<string, 'stated' | 'assumed' | 'needed'> = {};
  // Simulate the model wrongly calling Goa a region
  applyAiParse(ctx, sources, { destination: 'Goa', destinationType: 'region', sources: {} } as any);
  assert(ctx.destinationType === 'city', 'AI guess "region" for Goa is overridden to city');

  const ctx2 = RequirementEngine.createEmptyContext();
  applyAiParse(ctx2, {}, { destination: 'Rajasthan', destinationType: 'city', sources: {} } as any);
  assert(ctx2.destinationType === 'region', 'Rajasthan stays a region whatever the model says');
}

// 2. Place cards send only place + days
const describe = read('src/components/consumer/DescribeScreen.tsx');
const where = read('src/components/consumer/WhereShouldWeGo.tsx');
for (const [name, src] of [['DescribeScreen', describe], ['WhereShouldWeGo', where]] as const) {
  assert(!/for 2 adults under budget/.test(src), `${name}: card tap does not invent "2 adults" or a budget`);
  assert(!/\$\{dest\.shortLine\}`/.test(src), `${name}: card tap does not put marketing text in the user's mouth`);
}

// 3. No invented trust signals or code words on plan screens
const planDir = 'src/components/consumer/plan';
const planSources = fs.readdirSync(planDir).filter((f) => f.endsWith('.tsx')).map((f) => [f, read(path.join(planDir, f))] as const);
for (const [file, src] of planSources) {
  assert(!/travelTimeToNext:\s*</.test(src), `${file}: no raw "travelTimeToNext:" label shown to users`);
  assert(!/\{(?:stop|area|d)\.rating\}★/.test(src), `${file}: no invented ★ ratings`);
  assert(!/reviewCount\}\)/.test(src), `${file}: no invented review counts`);
  assert(!/Verified guests|Verified Stay|verified stay/i.test(src), `${file}: no "verified" claims`);
  assert(!/Food buffer:/.test(src), `${file}: buffer is one line, not split into categories`);
}

// 4. Fewer steps before the answer
const clarify = read('src/components/consumer/ClarifyScreen.tsx');
assert(!/list\.push\('dates'\)/.test(clarify), 'Dates are not a separate question step');
assert(!/list\.push\('time'\)/.test(clarify), 'Pace is not a separate question step');
assert(!/list\.push\('needs'\)/.test(clarify), 'Needs are not a separate question step');
assert(/currentStep === 'ready' && !isLoading/.test(clarify), 'Plan builds automatically when nothing is left to ask');
assert(!/'14–20 Nov 2026'/.test(clarify), 'No hard-coded 7-day fallback dates for a shorter trip');

console.log(`\nTOTAL PASSED: ${passed}`);
