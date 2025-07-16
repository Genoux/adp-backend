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
import RoomLogger from './helpers/logger';

export const startServer = () => {
  const logger = RoomLogger.getInstance();
  logger.system('Starting server initialization...');

  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.get('/inspector', (req, res) => {
    const roomTimerManager = RoomTimerManager.getInstance();
    const roomStates = roomTimerManager.getInspectorState();
    logger.system('Inspector endpoint accessed');
    logger.info(null, `Current states: ${JSON.stringify(roomStates)}`);
    res.render('timerInspector', { roomStates });
  });

  app.use(
    cors({
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      optionsSuccessStatus: 204,
    })
  );

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
      origin: process.env.FRONTEND_URL || "*",
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  logger.system(`CORS configuration: ${process.env.FRONTEND_URL || "*"}`);

  const roomTimerManager = RoomTimerManager.getInstance();
  roomTimerManager.setIo(io);

  roomTimerManager.initializeAllRoomTimers().catch(error => {
    logger.error(null, 'Error initializing room timers:', error);
  });

  roomTimerManager.subscribeToRoomChanges();
  startRoomCleanupService();

  io.on('connection', (socket: Socket) => {
    logger.system(`New socket connection: ${socket.id}`);

    handleRoomEvents(socket);
    handleUserEvents(socket);

    const initialState = roomTimerManager.getInspectorState();
    socket.emit('timerUpdate', { roomStates: initialState });

    socket.on('timerAction', ({ action, roomId, isLobby }) => {
      logger.info(roomId, `Timer action received: ${action} (${isLobby ? 'lobby' : 'game'})`);

      switch (action) {
        case 'reset':
          isLobby ? roomTimerManager.resetLobbyTimer(roomId) : roomTimerManager.resetTimer(roomId);
          break;
        case 'pause':
          if (isLobby) {
            roomTimerManager.getTimer(roomId)?.countdownTimerLobby.pause();
            logger.info(roomId, 'Lobby timer paused');
          } else {
            roomTimerManager.getTimer(roomId)?.countdownTimer.pause();
            logger.info(roomId, 'Game timer paused');
          }
          break;
        case 'start':
          isLobby ? roomTimerManager.startLobbyTimer(roomId) : roomTimerManager.startTimer(roomId);
          break;
      }
    });

    socket.on('disconnect', () => {
      logger.system(`Socket disconnected: ${socket.id}`);
    });
  });

  const packageJson = JSON.parse(
    readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
  );

  app.get('/', (req, res) => {
    res.json({ 
      version: packageJson.version,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  });

  server.listen(process.env.PORT || 4000, async () => {
    logger.system(`Server listening on port ${process.env.PORT || 4000}`);
  });
};