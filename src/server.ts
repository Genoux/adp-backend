import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { handleRoomEvents } from './events/roomEvents';
import cors from 'cors';

export const startServer = () => {
  const app = express();
  app.use(cors()); // Enable CORS

  const server = createServer(app);
  const io = new Server(server);

  io.on('connection', (socket: Socket) => {
    console.log(`New connection: ${socket.id}`);
    handleRoomEvents(socket);
  });

  server.listen(3000, () => console.log('Listening on port 3000'));
};
