import { Socket } from 'socket.io';
import { updateRoomCycle } from '../utils/roomCycle';

export const handleRoomEvents = (socket: Socket) => {
  socket.on('joinRoom', (roomid, teamid) => {
    socket.join(roomid);
    socket.to(roomid).emit('message', `Welcome to room ${roomid}`);
    socket.broadcast.to(roomid).emit('message', `Team ${teamid} has joined the room`);

    console.log(`Team ${teamid} has joined room ${roomid}`)
  });

  socket.on('disconnect', (reason) => {
    console.log(`User ${socket.id} disconnected because ${reason}`);
  });

  socket.on('leaveRoom', (roomid, teamid) => {
    socket.leave(roomid);
    socket.broadcast.to(roomid).emit('message', `User ${socket.id} has left the room`);

    console.log(`Team ${teamid} has left room ${roomid}`)
  });

  socket.on('sendMessage', (roomid, message) => {
    socket.to(roomid).emit('message', `User ${socket.id}: ${message}`);
  });

  socket.on('ROOM_READY', (roomid) => {
    updateRoomCycle(roomid);
    socket.to(roomid).emit('message', `Room ${roomid} is ready!`);
  });
};
