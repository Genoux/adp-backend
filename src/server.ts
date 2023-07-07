import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { handleRoomEvents } from './events/roomEvents';
import { handleUserEvents } from './events/userEvents';
import { cleanUpRoomTimers } from './utils/timer';
import cors from 'cors';

export const startServer = () => {
  const app = express();
  
  app.use(cors({
    origin: process.env.SOCKET_CLIENT_URL || 'https://draft.tournoishaq.ca/', // this should be your client's origin
    credentials: true,
  })); 

  const server = createServer(app);
  
  const io = new Server(server, {
    cors: {
      origin: process.env.SOCKET_CLIENT_URL || 'https://draft.tournoishaq.ca/', // this should be your client's origin
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket: Socket) => {
    handleRoomEvents(socket, io);
    handleUserEvents(socket, io);
  });

  // Handle the root route
  app.get('/', (req, res) => {
    res.sendStatus(200);  // Send a 200 status code (OK)
  });

  server.listen(process.env.PORT || 4000, async() => {
    await cleanUpRoomTimers();
    console.log(`Listening on port ${process.env.PORT || 4000}`);
  });
};
