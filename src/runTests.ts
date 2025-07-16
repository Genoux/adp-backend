#!/usr/bin/env ts-node

/**
 * Test Runner for Race Condition and Frontend-Backend Sync Tests
 * Run with: npm run test:custom or ts-node src/runTests.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import test suites
import raceConditionTests from './tests/raceConditionTests';
import frontendBackendSyncTests from './tests/frontendBackendSync';

const runTests = async () => {
  console.log('🚀 Starting Custom Test Suite...\n');
  console.log('=' .repeat(60));
  
  try {
    // Run Race Condition Tests
    console.log('\n📋 RACE CONDITION TESTS');
    console.log('=' .repeat(60));
    await raceConditionTests.runAllRaceConditionTests();
    
    console.log('\n📋 FRONTEND-BACKEND SYNC TESTS');
    console.log('=' .repeat(60));
    await frontendBackendSyncTests.runAllSyncTests();
    
    console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error);
    console.log('=' .repeat(60));
    process.exit(1);
  }
};

// Run individual test suites
const runIndividualTests = async () => {
  const args = process.argv.slice(2);
  
  if (args.includes('--race-conditions')) {
    console.log('🔒 Running Race Condition Tests Only...\n');
    await raceConditionTests.runAllRaceConditionTests();
    return;
  }
  
  if (args.includes('--sync')) {
    console.log('🔄 Running Frontend-Backend Sync Tests Only...\n');
    await frontendBackendSyncTests.runAllSyncTests();
    return;
  }
  
  if (args.includes('--atomic-locking')) {
    console.log('🔒 Running Atomic Locking Test Only...\n');
    await raceConditionTests.testAtomicLocking();
    return;
  }
  
  if (args.includes('--concurrent')) {
    console.log('⚡ Running Concurrent Operations Test Only...\n');
    await raceConditionTests.testConcurrentSelections();
    return;
  }
  
  if (args.includes('--idempotent')) {
    console.log('🔄 Running Idempotent Operations Test Only...\n');
    await raceConditionTests.testIdempotentSelection();
    return;
  }
  
  if (args.includes('--timer-race')) {
    console.log('⏱️ Running Timer Race Condition Test Only...\n');
    await raceConditionTests.testTimerSelectionRace();
    return;
  }
  
  if (args.includes('--connection')) {
    console.log('🔌 Running Connection Stability Test Only...\n');
    await frontendBackendSyncTests.testConnectionStability();
    return;
  }
  
  if (args.includes('--error-handling')) {
    console.log('❌ Running Error Handling Test Only...\n');
    await frontendBackendSyncTests.testErrorHandling();
    return;
  }
  
  if (args.includes('--help')) {
    console.log(`
🧪 Test Runner Options:
======================

Run all tests:
  npm run test:custom
  ts-node src/runTests.ts

Run specific test suites:
  --race-conditions    Run all race condition tests
  --sync              Run all frontend-backend sync tests
  
Run individual tests:
  --atomic-locking    Test atomic lock operations
  --concurrent        Test concurrent SELECT_CHAMPION operations
  --idempotent        Test idempotent champion selection
  --timer-race        Test timer and selection race conditions
  --connection        Test connection stability
  --error-handling    Test error handling between frontend/backend
  
Examples:
  ts-node src/runTests.ts --race-conditions
  ts-node src/runTests.ts --atomic-locking
  ts-node src/runTests.ts --help
    `);
    return;
  }
  
  // Run all tests by default
  await runTests();
};

// Execute based on arguments
if (require.main === module) {
  runIndividualTests().catch(console.error);
}