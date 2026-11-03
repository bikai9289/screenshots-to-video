/**
 * Multi-Tab AI Polling Concurrency & Regression Test Runner
 *
 * Test Suites:
 * - test-session-locks: Tests 1-3 (Web Lock lifecycle, unified locks, atomic batch locking)
 * - test-takeover-simulation: Tests 4-5 (Takeover timer on close, full 3-tab simulation)
 * - test-rotation-concurrency: Tests 6-7 (Fair batch rotation anti-starvation, vendor concurrency throttle)
 */

import { runTest10 } from './polling-tests/test-atomic-credit-deduction';
import { runTest8 } from './polling-tests/test-ghost-slot-reclaim';
import { runTest9 } from './polling-tests/test-lease-renewal';
import { runTest6, runTest7 } from './polling-tests/test-rotation-concurrency';
import {
  runTest1,
  runTest2,
  runTest3,
} from './polling-tests/test-session-locks';
import { runTest4, runTest5 } from './polling-tests/test-takeover-simulation';

async function runAllTests() {
  console.log(
    '🚀 Starting Multi-Tab AI Polling Automated Regression Suite...\n'
  );

  await runTest1();
  await runTest2();
  await runTest3();
  await runTest4();
  await runTest5();
  await runTest6();
  await runTest7();
  await runTest8();
  await runTest9();
  await runTest10();

  console.log('\n🎉 ALL 10 TEST SCENARIOS PASSED WITH ZERO ERRORS!\n');
}

runAllTests().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
