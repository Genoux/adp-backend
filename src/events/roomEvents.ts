import { Server, Socket } from 'socket.io';

export const handleRoomEvents = (socket: Socket) => {
  socket.on('joinRoom', (roomid, teamid) => {
    socket.join(roomid);
    socket.to(roomid).emit('welcome', `Welcome to room ${roomid}`);
    socket.broadcast.to(roomid).emit('message', `Team ${teamid} has joined the room`);

    console.log(`Team ${teamid} has joined room ${roomid}`)
  });

  socket.on('leaveRoom', (roomid, teamid) => {
    socket.leave(roomid);
    socket.broadcast.to(roomid).emit('message', `User ${socket.id} has left the room`);

    console.log(`Team ${teamid} has left room ${roomid}`)
  });

  socket.on('sendMessage', (roomid, message) => {
    socket.to(roomid).emit('message', `User ${socket.id}: ${message}`);
  });

  // Emit a message to the room when a user connects
  socket.emit('message', 'A new user has connected to the room');
};
