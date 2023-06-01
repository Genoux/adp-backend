import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { handleRoomEvents } from './events/roomEvents';

export const startServer = () => {
  const app = express();
  const server = createServer(app);
  const io = new Server(server);

  io.on('connection', (socket: Socket) => {
    handleRoomEvents(socket);
  });

  server.listen(3000, () => console.log('Listening on port 3000'));
};
