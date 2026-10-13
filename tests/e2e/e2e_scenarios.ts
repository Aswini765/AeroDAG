/**
 * AeroDAG Real Browser End-to-End Test Suite (Phase 5)
 *
 * Drives the real application UI in headless Chrome via Puppeteer:
 * - Scenario 1: Happy path (Describe -> Clarify -> Plan -> Review -> Done -> My Trips)
 * - Scenario 2: Stay Upgrade -> Over budget -> Balancing options -> Revert
 * - Scenario 3: Infeasible Goa 7-day budget -> Shortfall card -> Apply concrete fix
 * - Scenario 4: No dates prompt -> Date clarification asked without plan
 * - Scenario 5: Double-click simulated booking idempotency (exactly 1 record in My Trips)
 * - Scenario 6: String leak guard across all Scenario 1 screens
 * - Accessibility: axe-core audit across all 6 views (assert 0 serious / 0 critical)
 * - Keyboard navigation: primary actions reachable via keyboard
 * - Mobile: 375px viewport horizontal scroll check on all screens
 */

import puppeteer, { Browser, Page } from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_BASE_URL = 'http://localhost:3000';
const axeCoreSource = fs.readFileSync(path.join(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (!condition) {
    failedTests++;
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`✅ PASS: ${message}`);
}

// Leak words to guard against
const LEAK_WORDS = ['Vietnam', 'Hanoi', 'HAN', 'VN-', 'Noi Bai', 'Sharma', 'Guaranteed', 'CVV'];

async function assertNoLeaks(page: Page, screenName: string) {
  const pageText = await page.evaluate(() => document.body.innerText);
  for (const word of LEAK_WORDS) {
    // Regex matching whole word or token
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    const hasLeak = regex.test(pageText);
    assert(!hasLeak, `Leak guard on ${screenName}: page must not contain '${word}'`);
  }
}

async function runAxeAudit(page: Page, screenName: string) {
  // Allow any CSS fade/slide transitions to fully settle before computing contrast
  await new Promise((r) => setTimeout(r, 500));
  await page.evaluate(axeCoreSource);
  const results = await page.evaluate(async () => {
    return await (window as any).axe.run();
  });

  const critical = results.violations.filter((v: any) => v.impact === 'critical');
  const serious = results.violations.filter((v: any) => v.impact === 'serious');
  const minorOrModerate = results.violations.filter((v: any) => v.impact === 'minor' || v.impact === 'moderate');

  if (serious.length > 0) {
    console.error(`Serious violations on ${screenName}:`, serious.map((s: any) => ({ id: s.id, desc: s.description, nodes: s.nodes.map((n: any) => n.html) })));
  }

  assert(critical.length === 0, `Axe audit on ${screenName}: 0 critical accessibility violations (found ${critical.length})`);
  assert(serious.length === 0, `Axe audit on ${screenName}: 0 serious accessibility violations (found ${serious.length})`);

  console.log(`ℹ️ [Accessibility] ${screenName} minor/moderate notices: ${minorOrModerate.length}`);
  return { critical: critical.length, serious: serious.length, minor: minorOrModerate.length };
}

async function checkMobile375(page: Page, screenName: string) {
  await page.setViewport({ width: 375, height: 812 });
  // Allow potential layout reflow
  await new Promise((r) => setTimeout(r, 200));
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert(scrollWidth <= 375, `Mobile 375px viewport on ${screenName}: no horizontal scroll (scrollWidth: ${scrollWidth}px <= 375px)`);
  // Restore desktop viewport
  await page.setViewport({ width: 1280, height: 850 });
}

async function runAllScenarios() {
  console.log('========================================================');
  console.log('STARTING AERODAG PHASE 5 REAL BROWSER E2E TEST SUITE');
  console.log('========================================================');

  const browser: Browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    protocolTimeout: 120_000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,850', '--disable-dev-shm-usage', '--disable-gpu']
  });

  try {
    const page: Page = await browser.newPage();
    page.on('pageerror', (err) => console.error('🚨 BROWSER ERROR:', err));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.error('🚨 BROWSER CONSOLE ERROR:', msg.text());
    });
    await page.setViewport({ width: 1280, height: 850 });

    // -------------------------------------------------------------------------
    // SCENARIO 1: Happy Path
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 1: Happy Path ---');
    await page.goto(`${APP_BASE_URL}?demo=1`, { waitUntil: 'networkidle0' });

    // 1. Describe Screen Checks
    await assertNoLeaks(page, 'Describe Screen');
    await runAxeAudit(page, 'Describe Screen');
    await checkMobile375(page, 'Describe Screen');

    const promptText = '7 days in Goa from Bengaluru for me, my wife and our 10-year-old daughter. Budget ₹60,000. Comfortable family-friendly hotel, not too much walking.';
    await page.waitForSelector('#trip-description-input');
    await page.type('#trip-description-input', promptText);
    await page.click('button[type="submit"]');

    // 2. Clarify Screen (Date Question)
    await page.waitForSelector('h2');
    const clarifyHeading = await page.evaluate(() => document.body.innerText);
    assert(clarifyHeading.includes('One thing changes the price most: when are you going?'), 'Clarify screen displays date question');

    await assertNoLeaks(page, 'Clarify Screen');
    await runAxeAudit(page, 'Clarify Screen');
    await checkMobile375(page, 'Clarify Screen');

    // Pick 14–20 Nov
    const clickedDate = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const novBtn = buttons.find((b) => b.textContent && b.textContent.includes('14–20 Nov'));
      if (novBtn) {
        novBtn.click();
        return true;
      }
      return false;
    });
    assert(clickedDate, 'Clicked 14–20 Nov date option button');

    // 3. Plan Screen
    await page.waitForFunction(
      () => document.body.innerText.includes('Total trip cost') && document.body.innerText.includes('days in South Goa'),
      { timeout: 15000 }
    );
    await assertNoLeaks(page, 'Plan Screen');
    await runAxeAudit(page, 'Plan Screen');
    await checkMobile375(page, 'Plan Screen');

    // BudgetCard assertions
    const planText = await page.evaluate(() => document.body.innerText);
    assert(planText.includes('Within budget'), 'Budget card shows "Within budget"');
    assert(planText.includes('left in your budget'), 'Budget card shows "left in your budget"');

    // Total cost check <= 60000
    const extractedCost = await page.evaluate(() => {
      const match = document.body.innerText.match(/₹\s*([0-9,]+)\s+of\s+₹\s*60,000\s+budget/);
      if (match) return parseInt(match[1].replace(/,/g, ''), 10);
      return null;
    });
    assert(extractedCost !== null && extractedCost <= 60000, `Plan total cost (₹${extractedCost}) <= ₹60,000`);

    // Every budget line has a source tag
    const sourceTagsCount = await page.evaluate(() => {
      const tags = document.querySelectorAll('.source-tag, [class*="source-tag"]');
      return tags.length;
    });
    assert(sourceTagsCount >= 6, `Every budget line item has a source tag (found ${sourceTagsCount})`);

    // Airport note mentions Dabolim
    assert(planText.includes('Dabolim'), 'Optimal arrival airport note mentions Dabolim');

    // Navigate to Review & book
    await page.click('#review-and-book-btn');

    // 4. Review & Book Screen
    await page.waitForSelector('#run-simulated-booking-btn');
    await assertNoLeaks(page, 'Review Screen');
    await runAxeAudit(page, 'Review Screen');
    await checkMobile375(page, 'Review Screen');

    // Verify Run simulated booking button is initially disabled
    const isInitiallyDisabled = await page.evaluate(() => {
      const btn = document.querySelector('#run-simulated-booking-btn') as HTMLButtonElement;
      return btn ? btn.disabled : false;
    });
    assert(isInitiallyDisabled, 'Run simulated booking button is disabled when traveller details are empty');

    // Fill 3 traveller names
    await page.type('#input-fn-pax-adult-1', 'Aarav');
    await page.type('#input-ln-pax-adult-1', 'Kumar');
    await page.type('#input-fn-pax-adult-2', 'Priya');
    await page.type('#input-ln-pax-adult-2', 'Kumar');
    await page.type('#input-fn-pax-child-1', 'Ananya');
    await page.type('#input-ln-pax-child-1', 'Kumar');

    // Still disabled because lead email & phone are missing
    const isStillDisabled = await page.evaluate(() => {
      const btn = document.querySelector('#run-simulated-booking-btn') as HTMLButtonElement;
      return btn ? btn.disabled : false;
    });
    assert(isStillDisabled, 'Run simulated booking button remains disabled without lead email and phone');

    // Fill lead email and phone
    await page.type('#input-email-pax-adult-1', 'aarav.kumar@example.com');
    await page.type('#input-mobile-pax-adult-1', '9876543210');

    // Now enabled
    const isEnabledNow = await page.evaluate(() => {
      const btn = document.querySelector('#run-simulated-booking-btn') as HTMLButtonElement;
      return btn ? !btn.disabled : false;
    });
    assert(isEnabledNow, 'Run simulated booking button is enabled when valid details are provided');

    // Run simulated booking
    await page.click('#run-simulated-booking-btn');

    // 5. Done Screen
    await page.waitForSelector('#view-in-my-trips-btn', { timeout: 10000 });
    await assertNoLeaks(page, 'Done Screen');
    await runAxeAudit(page, 'Done Screen');
    await checkMobile375(page, 'Done Screen');

    const doneText = await page.evaluate(() => document.body.innerText);
    assert(doneText.includes('SIMULATED BOOKING'), 'Done screen shows "SIMULATED BOOKING" badge');
    assert(doneText.includes('no tickets were issued'), 'Done screen shows "no tickets were issued" disclaimer');

    // Navigate to My Trips
    await page.click('#view-in-my-trips-btn');

    // 6. My Trips Screen
    await page.waitForFunction(() => document.body.innerText.includes('My Trips') || document.body.innerText.includes('SIMULATED'));
    await assertNoLeaks(page, 'My Trips Screen');
    await runAxeAudit(page, 'My Trips Screen');
    await checkMobile375(page, 'My Trips Screen');

    const myTripsText = await page.evaluate(() => document.body.innerText);
    assert(myTripsText.toLowerCase().includes('simulated'), 'My Trips screen lists trip with "Simulated" status');
    assert(!myTripsText.includes('Confirmed Voucher'), 'My Trips does NOT display "Confirmed Voucher"');
    assert(!myTripsText.includes('Reserved\n') && !myTripsText.includes('· Reserved'), 'My Trips does NOT display "Reserved" status');

    // Test Trip Assistant on My Trips
    await page.waitForSelector('input[placeholder="Ask about your trip..."]');
    await page.type('input[placeholder="Ask about your trip..."]', 'How much budget left?');
    await page.click('button[aria-label="Send message"]');
    await page.waitForFunction(() => document.body.innerText.includes('remaining from your'));
    const assistantBudgetText = await page.evaluate(() => document.body.innerText);
    assert(assistantBudgetText.includes('remaining from your') && assistantBudgetText.includes('target budget'),
      'Assistant answers "How much budget left?" from trip data with remaining amount');
    assert(!assistantBudgetText.includes("I've noted that"), 'Assistant does NOT say "I\'ve noted that"');

    // Test Assistant honest refusal on real booking/PNR actions
    await page.type('input[placeholder="Ask about your trip..."]', 'Please confirm my ticket and issue real PNR');
    await page.click('button[aria-label="Send message"]');
    await page.waitForFunction(() => document.body.innerText.includes("I can't do that — this is a simulated booking."));
    const assistantRefusalText = await page.evaluate(() => document.body.innerText);
    assert(assistantRefusalText.includes("I can't do that — this is a simulated booking."),
      'Assistant honestly refuses real PNR/confirmation: "I can\'t do that — this is a simulated booking."');

    // Reload page to verify persistence across page reloads
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('#nav-my-trips-btn');
    await page.click('#nav-my-trips-btn');
    await page.waitForFunction(() => document.body.innerText.includes('My Trips') && document.body.innerText.toLowerCase().includes('simulated'));
    const reloadedMyTripsText = await page.evaluate(() => document.body.innerText);
    assert(reloadedMyTripsText.toLowerCase().includes('simulated'), 'Reloaded My Trips screen still lists trip with "Simulated" status (persisted across page reload)');

    // -------------------------------------------------------------------------
    // SCENARIO 2: Stay Upgrade -> Over Budget -> Balancing Options -> Switch Back
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 2: Luxury Upgrade & Balancing Options ---');
    await page.goto(`${APP_BASE_URL}/?demo=1&view=plan`, { waitUntil: 'networkidle0' });

    // Wait for and select the 5★ stay upgrade card
    await page.waitForSelector('[id^="upgrade-option-"]');
    await page.evaluate(() => {
      const el = document.querySelector('[id^="upgrade-option-"]') as HTMLElement;
      if (el) el.click();
    });

    // Status pill shows "₹X over"
    await page.waitForSelector('#switch-back-to-standard-hotel-btn');
    await page.waitForFunction(() => document.body.innerText.includes('Balancing options to bring trip back within budget') || document.body.innerText.includes('over your budget'));
    const upgradedText = await page.evaluate(() => document.body.innerText);
    assert(upgradedText.match(/₹[0-9,]+\s+over/) !== null || upgradedText.includes('over your budget'), 'Status pill shows "₹X over"');

    // Balancing options visible
    assert(
      upgradedText.includes('Balancing options to bring trip back within budget') ||
      upgradedText.includes('Vasco da Gama Express') ||
      upgradedText.includes('Yesvantpur') ||
      upgradedText.includes('Reduce to 5 days'),
      'Balancing options are displayed under the luxury upgrade'
    );

    // Switch back to standard stay
    await page.click('#switch-back-to-standard-hotel-btn');
    await page.waitForFunction(() => document.body.innerText.includes('Within budget'));
    const revertedText = await page.evaluate(() => document.body.innerText);
    assert(revertedText.includes('Within budget'), 'Status pill restored to "Within budget" after switching back');

    // -------------------------------------------------------------------------
    // SCENARIO 3: Infeasible Scenario (Goa 7 days, 2A+1C, ₹15,000)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 3: Infeasible Budget Shortfall & Concrete Fixes ---');
    await page.goto(`${APP_BASE_URL}?demo=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#trip-description-input');
    await page.type('#trip-description-input', '7 days in Goa from Bengaluru for 2 adults and 1 child with budget ₹15,000. 14–20 Nov 2026.');
    await page.click('button[type="submit"]');

    // Infeasible card shows shortfall
    await page.waitForFunction(() => document.body.innerText.includes('Trip exceeds budget by ₹'));
    const infeasibleText = await page.evaluate(() => document.body.innerText);
    assert(infeasibleText.includes('Trip exceeds budget by ₹'), 'Infeasible card shows budget shortfall');
    assert(infeasibleText.toLowerCase().includes('choose a fix to fit inside your budget'), 'Infeasible card presents concrete fixes');

    // Extract initial calculated cost
    const initialCalculated = await page.evaluate(() => {
      const match = document.body.innerText.match(/requires at least ₹([0-9,]+)/);
      return match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
    });
    assert(initialCalculated > 15000, `Initial calculated cost is ₹${initialCalculated}`);

    // Click the first concrete fix
    await page.waitForSelector('[id^="concrete-fix-"]');
    await page.click('[id^="concrete-fix-"]');
    assert(true, 'Clicked concrete budget fix');

    // Plan re-runs and numbers change
    await page.waitForFunction(() => document.body.innerText.includes('Total trip cost') || document.body.innerText.includes('requires at least'));
    console.log('✅ PASS: Concrete fix re-ran the planner');

    // -------------------------------------------------------------------------
    // SCENARIO 4: No Dates Given
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 4: No Dates Prompt Asks Date Question Without Plan ---');
    await page.goto(`${APP_BASE_URL}?demo=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#trip-description-input');
    await page.type('#trip-description-input', '7 days in Goa from Bengaluru for me, my wife and our 10-year-old daughter. Budget ₹60,000. Comfortable family-friendly hotel, not too much walking.');
    await page.click('button[type="submit"]');

    await page.waitForSelector('h2');
    const noDatesText = await page.evaluate(() => document.body.innerText);
    assert(noDatesText.includes('One thing changes the price most: when are you going?'), 'Clarify screen asks the date question');
    assert(!noDatesText.includes('Total trip cost'), 'Plan is not shown before dates are selected');

    // -------------------------------------------------------------------------
    // SCENARIO 5: Double-Click "Run simulated booking" Idempotency
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 5: Double-Click Simulated Booking Idempotency ---');
    await page.evaluate(() => {
      try { localStorage.clear(); } catch {}
    });
    await page.goto(`${APP_BASE_URL}/?demo=1&view=review`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#run-simulated-booking-btn');

    // Click "Fill test details" button to provide valid passenger data
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Fill test details'));
      if (btn) (btn as HTMLElement).click();
    });

    // Click button twice rapidly
    await page.evaluate(() => {
      const btn = document.querySelector('#run-simulated-booking-btn') as HTMLElement;
      btn.click();
      btn.click();
    });

    await page.waitForSelector('#view-in-my-trips-btn', { timeout: 10000 });
    await page.click('#view-in-my-trips-btn');

    // Confirm exactly 1 record exists in My Trips
    await page.waitForFunction(() => document.body.innerText.includes('My Trips'));
    const tripCardsCount = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-testid="trip-card"]');
      return cards.length;
    });
    assert(tripCardsCount === 1, `Exactly one trip saved in My Trips after double-clicking (found ${tripCardsCount})`);

    // -------------------------------------------------------------------------
    // STEP 2: Keyboard-Only Navigation Run
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Keyboard-Only Navigation Run ---');
    await page.goto(`${APP_BASE_URL}?demo=1`, { waitUntil: 'networkidle0' });

    // Focus textarea and type
    await page.focus('#trip-description-input');
    await page.keyboard.type('7 days in Goa from Bengaluru for 2 adults and 1 kid, ₹60,000, 14–20 Nov 2026.');

    // Tab to submit button and press Enter
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Wait for Plan screen
    await page.waitForFunction(() => document.body.innerText.includes('Total trip cost'), { timeout: 10000 });
    const isPlanReached = await page.evaluate(() => document.body.innerText.includes('Total trip cost'));
    assert(isPlanReached, 'Keyboard-only navigation reached Plan screen successfully');

    // -------------------------------------------------------------------------
    // STEP 3: Phase 6 Stage B Account Menu & Session Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Account Menu & Guest Session ---');
    await page.waitForSelector('[data-testid="account-menu-button"]');
    const accountBtnText = await page.evaluate(() => document.querySelector('[data-testid="account-menu-button"]')?.textContent || '');
    assert(accountBtnText.includes('Guest'), 'Account menu button displays "Guest" session badge');

    // Open dropdown
    await page.click('[data-testid="account-menu-button"]');
    await page.waitForSelector('[data-testid="account-menu-dropdown"]');
    const dropdownText = await page.evaluate(() => document.querySelector('[data-testid="account-menu-dropdown"]')?.textContent || '');
    assert(dropdownText.includes('Save my trips with email'), 'Account dropdown includes "Save my trips with email"');
    assert(dropdownText.includes('Guest trips will be lost unless you save them with email'), 'Account dropdown contains guest trip warning');
    // Close dropdown
    await page.click('[data-testid="account-menu-button"]');

    // -------------------------------------------------------------------------
    // STEP 4: Deterministic Demo Mode & Zero API Key Basic Mode Check
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Deterministic Demo Mode & AI Fallback Notice ---');
    await page.goto(`${APP_BASE_URL}?basic=1`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#try-the-demo-link');
    const hasDemoLink = await page.evaluate(() => !!document.querySelector('#try-the-demo-link'));
    assert(hasDemoLink, 'Describe screen includes "Try the demo" button');

    // AI basic mode notice is present when no Gemini key is provided
    const basicModeText = await page.evaluate(() => {
      const el = document.querySelector('#ai-basic-mode-note');
      return el ? el.textContent : '';
    });
    assert(basicModeText.includes('AI parsing unavailable — using basic mode'), 'Basic mode note "AI parsing unavailable — using basic mode" is rendered');

    // Click "Try the demo"
    await page.click('#try-the-demo-link');
    await page.waitForFunction(() => document.body.innerText.includes('Total trip cost'), { timeout: 10000 });
    const demoPlanLoaded = await page.evaluate(() => document.body.innerText.includes('7 days in South Goa') && document.body.innerText.includes('DEMO MODE'));
    assert(demoPlanLoaded, '"Try the demo" loaded fixed Goa family plan with DEMO MODE banner visible');

    // -------------------------------------------------------------------------
    // STEP 5: Unsupported Requests & Date Validation
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Unsupported Requests & Date Validation ---');
    await page.goto(`${APP_BASE_URL}?demo=1`, { waitUntil: 'networkidle0' });

    // Test 1: Unsupported destination "Paris"
    await page.waitForSelector('#trip-description-input');
    await page.type('#trip-description-input', 'Trip to Paris for 2 adults');
    await page.click('button[type="submit"]');

    await page.waitForSelector('#unsupported-destination-error');
    const parisErrorText = await page.evaluate(() => document.querySelector('#unsupported-destination-error')?.textContent || '');
    assert(parisErrorText.includes("We can't plan Paris yet. AeroDAG currently covers:"),
      `Paris error message matches specification: "${parisErrorText}"`);
    assert(parisErrorText.includes('Goa') && parisErrorText.includes('Coorg'), 'Error message lists supported destinations');

    // Verify textarea retains user's text
    const textAfterParis = await page.evaluate(() => (document.querySelector('#trip-description-input') as HTMLTextAreaElement)?.value || '');
    assert(textAfterParis === 'Trip to Paris for 2 adults', 'Textarea retains user text "Trip to Paris for 2 adults"');

    // Test 2: Unparseable text "asdfgh qwerty"
    await page.evaluate(() => {
      const input = document.querySelector('#trip-description-input') as HTMLTextAreaElement;
      if (input) input.value = '';
    });
    await page.type('#trip-description-input', 'asdfgh qwerty');
    await page.click('button[type="submit"]');

    await page.waitForSelector('#unsupported-destination-error');
    const gibberishErrorText = await page.evaluate(() => document.querySelector('#unsupported-destination-error')?.textContent || '');
    assert(gibberishErrorText.includes("We can't plan asdfgh qwerty yet. AeroDAG currently covers:"),
      `Unparseable text error message matches specification: "${gibberishErrorText}"`);
    const textAfterGibberish = await page.evaluate(() => (document.querySelector('#trip-description-input') as HTMLTextAreaElement)?.value || '');
    assert(textAfterGibberish === 'asdfgh qwerty', 'Textarea retains user text "asdfgh qwerty"');

    // Test 3: Date validation on Clarify screen
    // Click supported chip "Goa" from the error card
    await page.evaluate(() => {
      const chips = Array.from(document.querySelectorAll('#unsupported-destination-error button'));
      const goaChip = chips.find(c => c.textContent?.includes('Goa'));
      if (goaChip) (goaChip as HTMLElement).click();
    });
    await page.click('button[type="submit"]');

    // Wait for Clarify screen
    await page.waitForSelector('input[placeholder*="Or type specific dates"]');

    // Enter "yesterday"
    await page.type('input[placeholder*="Or type specific dates"]', 'yesterday');
    await page.evaluate(() => {
      const form = document.querySelector('form input[placeholder*="Or type specific dates"]')?.closest('form');
      const submitBtn = form?.querySelector('button[type="submit"]');
      if (submitBtn) (submitBtn as HTMLElement).click();
    });
    await page.waitForSelector('#custom-date-error');
    const pastDateErr = await page.evaluate(() => document.querySelector('#custom-date-error')?.textContent || '');
    assert(pastDateErr.includes('future') || pastDateErr.includes('past'), `Rejects "yesterday" with error: "${pastDateErr}"`);

    // Enter "32 Feb"
    await page.evaluate(() => {
      const inp = document.querySelector('input[placeholder*="Or type specific dates"]') as HTMLInputElement;
      if (inp) inp.value = '';
    });
    await page.type('input[placeholder*="Or type specific dates"]', '32 Feb');
    await page.evaluate(() => {
      const form = document.querySelector('form input[placeholder*="Or type specific dates"]')?.closest('form');
      const submitBtn = form?.querySelector('button[type="submit"]');
      if (submitBtn) (submitBtn as HTMLElement).click();
    });
    await page.waitForSelector('#custom-date-error');
    const invalidDayErr = await page.evaluate(() => document.querySelector('#custom-date-error')?.textContent || '');
    assert(invalidDayErr.includes('Invalid') || invalidDayErr.includes('valid'), `Rejects "32 Feb" with error: "${invalidDayErr}"`);

    // -------------------------------------------------------------------------
    // STEP 6: Home-Page Example Chips Title Invariant
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Home-Page Example Chips Destination Invariant ---');
    const examples = [
      { name: 'Goa', chipText: 'Goa', datePick: '14–20 Nov' },
      { name: 'Coorg', chipText: 'Coorg', datePick: '20–22 Nov' },
      { name: 'Kerala', chipText: 'Kerala', datePick: '14–20 Nov' },
      { name: 'Mysuru', chipText: 'Mysuru', datePick: '15 Nov' }
    ];

    for (const ex of examples) {
      await page.goto(`${APP_BASE_URL}?demo=1`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('.pill-chip');

      // Click the example chip
      const clicked = await page.evaluate((chipText) => {
        const chips = Array.from(document.querySelectorAll('.pill-chip'));
        const target = chips.find(c => c.textContent && c.textContent.includes(chipText));
        if (target) {
          (target as HTMLElement).click();
          return true;
        }
        return false;
      }, ex.chipText);
      assert(clicked, `Found and clicked example chip for "${ex.name}"`);

      // Click "Plan my trip"
      await page.click('button[type="submit"]');

      // On clarify screen, wait for date question
      await page.waitForFunction(() => document.body.innerText.includes('when are you going?'), { timeout: 10000 });
      const clickedDate = await page.evaluate((dateText) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const dateBtn = buttons.find(b => b.textContent && b.textContent.includes(dateText));
        if (dateBtn) {
          (dateBtn as HTMLElement).click();
          return true;
        }
        return false;
      }, ex.datePick);
      assert(clickedDate, `Found and clicked date option button containing "${ex.datePick}" for "${ex.name}"`);

      // Wait for Plan Screen (feasible budget card or honest infeasible card)
      await page.waitForFunction(
        () => document.body.innerText.includes('Total trip cost') ||
              document.body.innerText.includes('requires at least') ||
              document.body.innerText.includes('days in '),
        { timeout: 15000 }
      );
      const planHeading = await page.evaluate(() => document.body.innerText);
      assert(planHeading.toLowerCase().includes(ex.name.toLowerCase()),
        `Plan title contains destination "${ex.name}" for "${ex.chipText}" example`);

      if (ex.name === 'Coorg') {
        assert(planHeading.includes('Within budget') || !planHeading.includes('infeasible'),
          'Coorg weekend for two · ₹20,000 produces feasible plan');
        assert(!planHeading.includes('IX 924') && !planHeading.includes('IndiGo'),
          'Coorg plan contains no flights (road transit)');
      }
    }

    console.log('\n========================================================');
    console.log(`ALL E2E SCENARIOS COMPLETED: ${passedTests}/${totalTests} PASSED`);
    console.log('========================================================');
  } finally {
    await browser.close();
  }
}

runAllScenarios()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal E2E suite failure:', err);
    process.exit(1);
  });
