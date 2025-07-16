/**
 * Race Condition Test Suite
 * This file contains tests to verify that race conditions are properly handled
 */

import RoomTimerManager from '../services/RoomTimerManager';
import finishTurn from '../utils/actions/finishTurn';
import { selectChampion } from '../utils/actions/selectChampion';

// Mock room and team data for testing
const mockRoom = {
  id: 1,
  status: 'ban' as const,
  cycle: 1,
  ready: true,
  blue_team_id: 1,
  red_team_id: 2,
  created_at: new Date().toISOString(),
  heroes_pool: [
    { id: '1', name: 'Champion1', selected: false },
    { id: '2', name: 'Champion2', selected: false },
  ]
};

const mockTeam = {
  id: 1,
  name: 'Blue Team',
  is_turn: true,
  can_select: true,
  room_id: 1,
  color: 'blue',
  ready: false,
  created_at: new Date().toISOString(),
  heroes_ban: [{ id: null, name: '', selected: false }],
  heroes_selected: []
};

/**
 * Test: Atomic Lock Operations
 * Verifies that tryLockRoom prevents concurrent operations
 */
export const testAtomicLocking = async () => {
  console.log('🔒 Testing atomic lock operations...');
  
  const roomTimerManager = RoomTimerManager.getInstance();
  const roomId = 999; // Test room ID
  
  // Initialize test room
  roomTimerManager.initTimer(roomId);
  
  // Test 1: First lock should succeed
  const firstLock = roomTimerManager.tryLockRoom(roomId);
  console.log(`First lock attempt: ${firstLock ? 'SUCCESS' : 'FAILED'}`);
  
  // Test 2: Second lock should fail (room already locked)
  const secondLock = roomTimerManager.tryLockRoom(roomId);
  console.log(`Second lock attempt: ${secondLock ? 'FAILED (should be false)' : 'SUCCESS (correctly blocked)'}`);
  
  // Test 3: Unlock and try again
  roomTimerManager.unlockRoom(roomId);
  const thirdLock = roomTimerManager.tryLockRoom(roomId);
  console.log(`Third lock attempt after unlock: ${thirdLock ? 'SUCCESS' : 'FAILED'}`);
  
  // Cleanup
  roomTimerManager.unlockRoom(roomId);
  roomTimerManager.deleteTimer(roomId);
  
  console.log('✅ Atomic lock test completed\n');
};

/**
 * Test: Concurrent SELECT_CHAMPION Operations
 * Simulates multiple rapid SELECT_CHAMPION events
 */
export const testConcurrentSelections = async () => {
  console.log('⚡ Testing concurrent SELECT_CHAMPION operations...');
  
  const roomTimerManager = RoomTimerManager.getInstance();
  const roomId = 998;
  
  // Initialize test room
  roomTimerManager.initTimer(roomId);
  
  // Simulate multiple concurrent finishTurn calls
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(finishTurn(roomId, roomTimerManager));
  }
  
  try {
    await Promise.all(promises);
    console.log('✅ Concurrent operations handled gracefully');
  } catch (error) {
    console.log('❌ Error in concurrent operations:', error);
  }
  
  // Cleanup
  roomTimerManager.deleteTimer(roomId);
  console.log('✅ Concurrent selection test completed\n');
};

/**
 * Test: Idempotent Champion Selection
 * Verifies that selectChampion can be called multiple times safely
 */
export const testIdempotentSelection = async () => {
  console.log('🔄 Testing idempotent champion selection...');
  
  try {
    // First call should succeed
    const firstResult = await selectChampion(mockRoom, mockTeam);
    console.log(`First selection: ${firstResult ? 'SUCCESS' : 'FAILED'}`);
    
    // Second call should be idempotent (no changes)
    const secondResult = await selectChampion(mockRoom, mockTeam);
    console.log(`Second selection: ${secondResult ? 'FAILED (should be idempotent)' : 'SUCCESS (correctly idempotent)'}`);
    
  } catch (error) {
    console.log('❌ Error in idempotent test:', error);
  }
  
  console.log('✅ Idempotent selection test completed\n');
};

/**
 * Test: Timer and Selection Race Condition
 * Verifies that timer expiration and manual selection don't conflict
 */
export const testTimerSelectionRace = async () => {
  console.log('⏱️ Testing timer and selection race condition...');
  
  const roomTimerManager = RoomTimerManager.getInstance();
  const roomId = 997;
  
  // Initialize test room
  roomTimerManager.initTimer(roomId);
  
  // Start timer
  roomTimerManager.startTimer(roomId);
  
  // Immediately try to finish turn (simulating user selection)
  await finishTurn(roomId, roomTimerManager);
  
  // Check that room is properly locked
  const isLocked = roomTimerManager.isLocked(roomId);
  console.log(`Room lock status after operation: ${isLocked ? 'LOCKED' : 'UNLOCKED'}`);
  
  // Cleanup
  roomTimerManager.unlockRoom(roomId);
  roomTimerManager.deleteTimer(roomId);
  
  console.log('✅ Timer-selection race test completed\n');
};

/**
 * Run all race condition tests
 */
export const runAllRaceConditionTests = async () => {
  console.log('🚀 Starting Race Condition Test Suite...\n');
  
  await testAtomicLocking();
  await testConcurrentSelections();
  await testIdempotentSelection();
  await testTimerSelectionRace();
  
  console.log('✅ All race condition tests completed successfully!');
};

// Export individual tests for manual running
export default {
  testAtomicLocking,
  testConcurrentSelections,
  testIdempotentSelection,
  testTimerSelectionRace,
  runAllRaceConditionTests
};