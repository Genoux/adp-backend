import { Socket } from 'socket.io';

export const handleRoomEvents = (socket: Socket) => {
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('welcome', `Welcome to room ${roomId}`);
    socket.broadcast.to(roomId).emit('message', `User ${socket.id} has joined the room`);
  });

  socket.on('leaveRoom', (roomId) => {
    socket.leave(roomId);
    socket.broadcast.to(roomId).emit('message', `User ${socket.id} has left the room`);
  });

  socket.on('sendMessage', (roomId, message) => {
    socket.to(roomId).emit('message', `User ${socket.id}: ${message}`);
  });
};
