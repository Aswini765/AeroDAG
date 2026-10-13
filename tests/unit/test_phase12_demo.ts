/**
 * AeroDAG Phase 12.4 — Demo Mode Verification Test
 */

import { DemoModeCoordinator } from '../../src/services/demo/demoModeCoordinator';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ DEMO ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runDemoTest() {
  console.log('=== AeroDAG Phase 12.4 Demo Mode Runner ===\n');

  const result = await DemoModeCoordinator.runGoldenFamilyJourneyDemo();
  assert(result.success === true, 'Golden Family Journey demo completed successfully');
  assert(result.simulated === true, 'Unambiguously labeled simulated: true');
  assert(result.stepsCompleted.length >= 8, 'Completed all 8 core demonstration steps');
  assert(typeof result.summary.bookingId === 'string', 'Generated sandbox booking ID');
  assert(result.summary.status === 'CONFIRMED', 'Authoritatively confirmed sandbox booking');

  console.log('\n--- Demo Steps Executed ---');
  result.stepsCompleted.forEach((s) => console.log(`   ${s}`));
  console.log('\n=== Phase 12.4 Demo Mode PASSED (5/5 assertions) ===');
}

runDemoTest().catch((err) => {
  console.error('Demo test failed:', err);
  process.exit(1);
});
