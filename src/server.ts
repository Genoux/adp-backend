import { readFileSync } from 'fs';
import { createServer } from 'http';
import path from 'path';
import { join } from 'path';
import cors from 'cors';
import express from 'express';
import { Server, Socket } from 'socket.io';
import api from './api';
import handleRoomEvents from './events/roomEvents';
import handleUserEvents from './events/userEvents';
import { startRoomCleanupService } from './helpers/cleanupRoomsCron';
import RoomTimerManager from './services/RoomTimerManager';

export const startServer = () => {
  
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.get('/inspector', (req, res) => {
    const roomTimerManager = RoomTimerManager.getInstance();
    const roomStates = roomTimerManager.getInspectorState();
    res.render('timerInspector', { roomStates });
  });

  // Apply CORS middleware
  app.use(
    cors({
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      optionsSuccessStatus: 204,
    })
  );

  // Add headers to every response for CORS handling
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    next();
  });

  app.use(express.json());
  app.use('/api', api);

  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Initialize TimersManager
  const roomTimerManager = RoomTimerManager.getInstance();
  roomTimerManager.setIo(io);

  // Initialize timers for all existing rooms
  roomTimerManager.initializeAllRoomTimers().catch(console.error);

  // Subscribe to new room creations and updates
  roomTimerManager.subscribeToRoomChanges();

  startRoomCleanupService()

  io.on('connection', (socket: Socket) => {
    console.log(`Connection established: ${socket.id}`);
    handleRoomEvents(socket);
    handleUserEvents(socket);

    const initialState = roomTimerManager.getInspectorState();
    socket.emit('timerUpdate', { roomStates: initialState });
  

    socket.on('timerAction', ({ action, roomId, isLobby }) => {
      const roomTimerManager = RoomTimerManager.getInstance();
      switch (action) {
        case 'reset':
          isLobby ? roomTimerManager.resetLobbyTimer(roomId) : roomTimerManager.resetTimer(roomId);
          break;
        case 'pause':
          isLobby ? roomTimerManager.getTimer(roomId)?.countdownTimerLobby.pause() : roomTimerManager.getTimer(roomId)?.countdownTimer.pause();
          break;
        case 'start':
          isLobby ? roomTimerManager.startLobbyTimer(roomId) : roomTimerManager.startTimer(roomId);
          break;
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

  const packageJson = JSON.parse(
    readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
  );
  const version = packageJson.version;

  app.get('/', (req, res) => {
    res.json({ version });
  });

  server.listen(process.env.PORT || 4000, async () => {
    console.log(`Listening on port ${process.env.PORT || 4000}`);
  });
};
