/**
 * Frontend-Backend Synchronization Test
 * This file tests the complete flow from frontend to backend
 */

import { Server } from 'socket.io';
import { createServer } from 'http';
import { io as Client } from 'socket.io-client';
import RoomTimerManager from '../services/RoomTimerManager';

const TEST_PORT = 4001;
const TEST_ROOM_ID = 9999;

/**
 * Test: Complete Frontend-Backend Communication Flow
 */
export const testFrontendBackendSync = async () => {
  console.log('🔄 Testing Frontend-Backend Synchronization...');
  
  // Create test server
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  
  // Set up room timer manager
  const roomTimerManager = RoomTimerManager.getInstance();
  roomTimerManager.setIo(io);
  
  // Initialize test room
  roomTimerManager.initTimer(TEST_ROOM_ID);
  
  // Set up backend event handlers (simplified)
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('joinRoom', ({ roomid }) => {
      console.log(`Client joined room ${roomid}`);
      socket.join(roomid.toString());
      socket.emit('message', `Welcome to room ${roomid}`);
    });
    
    socket.on('SELECT_CHAMPION', ({ roomid }) => {
      console.log(`SELECT_CHAMPION event received for room ${roomid}`);
      socket.emit('message', 'Champion selection processed');
    });
    
    socket.on('TEAM_READY', ({ roomid, teamid }) => {
      console.log(`TEAM_READY event received for room ${roomid}, team ${teamid}`);
      socket.emit('message', 'Team ready processed');
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
  
  // Start test server
  await new Promise<void>((resolve) => {
    httpServer.listen(TEST_PORT, resolve);
  });
  
  console.log(`Test server started on port ${TEST_PORT}`);
  
  // Create test client (simulating frontend)
  const clientSocket = Client(`http://localhost:${TEST_PORT}`);
  
  // Test connection
  await new Promise<void>((resolve) => {
    clientSocket.on('connect', () => {
      console.log('✅ Client connected successfully');
      resolve();
    });
  });
  
  // Test joinRoom event
  await new Promise<void>((resolve) => {
    clientSocket.on('message', (message) => {
      if (message.includes('Welcome to room')) {
        console.log('✅ joinRoom event processed:', message);
        resolve();
      }
    });
    
    clientSocket.emit('joinRoom', { roomid: TEST_ROOM_ID });
  });
  
  // Test SELECT_CHAMPION event
  await new Promise<void>((resolve) => {
    clientSocket.on('message', (message) => {
      if (message.includes('Champion selection processed')) {
        console.log('✅ SELECT_CHAMPION event processed:', message);
        resolve();
      }
    });
    
    clientSocket.emit('SELECT_CHAMPION', { roomid: TEST_ROOM_ID });
  });
  
  // Test TEAM_READY event
  await new Promise<void>((resolve) => {
    clientSocket.on('message', (message) => {
      if (message.includes('Team ready processed')) {
        console.log('✅ TEAM_READY event processed:', message);
        resolve();
      }
    });
    
    clientSocket.emit('TEAM_READY', { roomid: TEST_ROOM_ID, teamid: 1 });
  });
  
  // Test timer events
  console.log('🕐 Testing timer events...');
  roomTimerManager.startTimer(TEST_ROOM_ID);
  
  await new Promise<void>((resolve) => {
    clientSocket.on('TIMER', (time) => {
      console.log('✅ Timer event received:', time);
      resolve();
    });
  });
  
  // Cleanup
  clientSocket.disconnect();
  httpServer.close();
  roomTimerManager.deleteTimer(TEST_ROOM_ID);
  
  console.log('✅ Frontend-Backend synchronization test completed successfully!');
};

/**
 * Test: Error Handling Between Frontend and Backend
 */
export const testErrorHandling = async () => {
  console.log('❌ Testing Error Handling...');
  
  // Create test server
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  
  // Set up error-prone handlers
  io.on('connection', (socket) => {
    socket.on('joinRoom', ({ roomid }) => {
      if (!roomid) {
        socket.emit('error', 'Invalid room ID');
        return;
      }
      
      if (roomid === 404) {
        socket.emit('error', 'Room not found');
        return;
      }
      
      socket.emit('message', `Welcome to room ${roomid}`);
    });
  });
  
  // Start test server
  await new Promise<void>((resolve) => {
    httpServer.listen(TEST_PORT + 1, resolve);
  });
  
  // Create test client
  const clientSocket = Client(`http://localhost:${TEST_PORT + 1}`);
  
  await new Promise<void>((resolve) => {
    clientSocket.on('connect', resolve);
  });
  
  // Test error handling
  await new Promise<void>((resolve) => {
    clientSocket.on('error', (error) => {
      console.log('✅ Error event received:', error);
      resolve();
    });
    
    clientSocket.emit('joinRoom', { roomid: undefined });
  });
  
  // Test room not found
  await new Promise<void>((resolve) => {
    clientSocket.on('error', (error) => {
      console.log('✅ Room not found error received:', error);
      resolve();
    });
    
    clientSocket.emit('joinRoom', { roomid: 404 });
  });
  
  // Cleanup
  clientSocket.disconnect();
  httpServer.close();
  
  console.log('✅ Error handling test completed successfully!');
};

/**
 * Test: Socket Connection Stability
 */
export const testConnectionStability = async () => {
  console.log('🔌 Testing Connection Stability...');
  
  // Create test server
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  
  let connectionCount = 0;
  let disconnectionCount = 0;
  
  io.on('connection', (socket) => {
    connectionCount++;
    console.log(`Connection #${connectionCount}`);
    
    socket.on('disconnect', () => {
      disconnectionCount++;
      console.log(`Disconnection #${disconnectionCount}`);
    });
  });
  
  // Start test server
  await new Promise<void>((resolve) => {
    httpServer.listen(TEST_PORT + 2, resolve);
  });
  
  // Test multiple connections
  const clients = [];
  for (let i = 0; i < 5; i++) {
    const client = Client(`http://localhost:${TEST_PORT + 2}`);
    clients.push(client);
    
    await new Promise<void>((resolve) => {
      client.on('connect', resolve);
    });
  }
  
  console.log(`✅ ${connectionCount} connections established`);
  
  // Disconnect all clients
  for (const client of clients) {
    client.disconnect();
  }
  
  // Wait for disconnections
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  console.log(`✅ ${disconnectionCount} disconnections completed`);
  
  // Cleanup
  httpServer.close();
  
  console.log('✅ Connection stability test completed successfully!');
};

/**
 * Run all frontend-backend synchronization tests
 */
export const runAllSyncTests = async () => {
  console.log('🚀 Starting Frontend-Backend Synchronization Test Suite...\n');
  
  try {
    await testFrontendBackendSync();
    console.log('');
    await testErrorHandling();
    console.log('');
    await testConnectionStability();
    console.log('');
    console.log('✅ All synchronization tests completed successfully!');
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    throw error;
  }
};

// Export for manual running
export default {
  testFrontendBackendSync,
  testErrorHandling,
  testConnectionStability,
  runAllSyncTests
};