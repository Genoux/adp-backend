import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { handleRoomEvents, } from './events/roomEvents';
import { handleUserEvents } from './events/userEvents';
import { cleanUpRoomTimers } from './utils/timer';
import cors from 'cors';

export const startServer = () => {
  const app = express();
  
  app.use(cors({
    origin: "http://localhost:3000", // this should be your client's origin
    credentials: true,
  })); 

  const server = createServer(app);
  
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000", // this should be your client's origin
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket: Socket) => {
    handleRoomEvents(socket, io);
    handleUserEvents(socket, io);
  });

  server.listen(4000, async() => {

    await cleanUpRoomTimers()
    console.log('Listening on port 4000')
  }); // Server is listening on port 4000
};
