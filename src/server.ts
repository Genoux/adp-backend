import { createServer } from 'http';
import cors from 'cors';
import express from 'express';
import { Server, Socket } from 'socket.io';
import { handleRoomEvents } from './events/roomEvents';
import { handleUserEvents } from './events/userEvents';

export const startServer = () => {
  const app = express();

  app.use(
    cors({
      origin: '*', // Accept all origins
      credentials: true,
    })
  );

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
    handleUserEvents(socket, io);
  });

  // Handle the root route
  app.get('/', (req, res) => {
    res.sendStatus(200); // Send a 200 status code (OK)
  });

  server.listen(process.env.PORT || 4000, async () => {
    console.log(`Listening on port ${process.env.PORT || 4000}`);
  });
};
