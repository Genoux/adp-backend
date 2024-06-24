import { createServer } from 'http';
import cors from 'cors';
import express from 'express';
import { Server, Socket } from 'socket.io';
import { handleRoomEvents } from './events/roomEvents';
import { handleUserEvents } from './events/userEvents';
import api from './api';

export const startServer = () => {
  const app = express();

  // Apply CORS middleware before any other middleware or routes
  app.use(
    cors({
      origin: '*', // Allow all origins
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allowed methods
      credentials: true, // Allow credentials (cookies, authorization headers, etc.)
      optionsSuccessStatus: 204, // Some legacy browsers choke on 204
    })
  );

  // Add headers to every response for CORS handling
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
  });

  app.use(express.json());
  app.use('/api', api);

  const server = createServer(app);

  const io = new Server(server, {
    cors: {
      origin: '*', // Accept all origins
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    handleRoomEvents(socket, io);
    handleUserEvents(socket);
  });

  // Handle the root route
  app.get('/', (req, res) => {
    res.sendStatus(200); // Send a 200 status code (OK)
  });

  server.listen(process.env.PORT || 4000, async () => {
    console.log(`Listening on port ${process.env.PORT || 4000}`);
  });
};
