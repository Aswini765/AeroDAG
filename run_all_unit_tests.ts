import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const unitDir = path.resolve('tests/unit');
const files = fs.readdirSync(unitDir).filter(f => f.endsWith('.ts'));

console.log(`========================================================`);
console.log(`AeroDAG Unit Test Runner — ${files.length} Suites`);
console.log(`========================================================\n`);

let totalSuitesPassed = 0;
let totalSuitesFailed = 0;
let grandTotalAssertions = 0;

for (const file of files) {
  const fullPath = path.join(unitDir, file);
  const start = Date.now();
  try {
    const stdout = execSync(`npx tsx "${fullPath}"`, { timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    
    // Look for explicit summary lines like "21/21 assertions", "42 PASSED", "TOTAL PASSED: 32", etc.
    let assertions: number | null = null;
    const summaryMatch = stdout.match(/PASSED\s*\(\s*(\d+)\s*\/\s*\d+\s*assertions\s*\)/i)
      || stdout.match(/TEST RESULTS:\s*(\d+)\s*PASSED/i)
      || stdout.match(/(\d+)\s*PASSED\s*\/\s*\d+\s*FAILED/i)
      || stdout.match(/(?:TOTAL PASSED|PASSED|TOTAL TESTS PASSED|VERIFICATION SUMMARY|SECURITY SUMMARY|RELIABILITY SUMMARY):\s*(\d+)/i)
      || stdout.match(/ALL TESTS PASSED:\s*(\d+)/i)
      || stdout.match(/(\d+)\s*\/\s*\d+\s*PASSED/i)
      || stdout.match(/TOTAL:\s*(\d+)\s*PASSED/i)
      || stdout.match(/SUMMARY:\s*(\d+)\s*PASSED/i);
    
    if (summaryMatch) {
      assertions = parseInt(summaryMatch[1], 10);
    } else {
      const explicitPasses = stdout.match(/(?:✓ PASS|✅ PASS|^✅\s+.+$)/gm);
      if (explicitPasses && explicitPasses.length > 1) {
        assertions = explicitPasses.length;
      }
    }

    if (assertions !== null && assertions > 0) {
      grandTotalAssertions += assertions;
      console.log(`✓ [PASS] ${file.padEnd(28)} | ${String(assertions).padStart(3)} assertions | ${duration}s`);
    } else {
      console.log(`✓ [PASS] ${file.padEnd(28)} | suite passed (assertions not counted) | ${duration}s`);
    }
    totalSuitesPassed++;
  } catch (err: any) {
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    const msg = (err.stderr?.toString() || err.stdout?.toString() || err.message || '').slice(0, 100);
    console.error(`✗ [FAIL] ${file.padEnd(28)} | ${duration}s | ${msg}`);
    totalSuitesFailed++;
  }
}

console.log(`\n========================================================`);
console.log(`RESULTS: ${totalSuitesPassed}/${files.length} Suites Passed, ${totalSuitesFailed} Failed`);
console.log(`Total Assertions Passed: ${grandTotalAssertions}`);
console.log(`========================================================`);

if (totalSuitesFailed > 0) process.exit(1);
