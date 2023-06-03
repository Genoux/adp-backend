import { Socket, Server } from 'socket.io';
import { updateRoomCycle } from '../utils/roomCycle';
import { initTimer } from '../utils/timer';

export const handleRoomEvents = (socket: Socket, io: Server) => {
  socket.on('joinRoom', (roomid, teamid) => {
    console.log("socket.on - roomid:", roomid);
    socket.join(roomid);

    socket.to(roomid).emit('message', `Welcome to room ${roomid}`);
    socket.broadcast.to(roomid).emit('message', `Team ${teamid} has joined the room`);

    console.log(`Team ${teamid} has joined room ${roomid}`)
  });

  socket.on('disconnect', (reason) => {
    console.log(`User ${socket.id} disconnected because ${reason}`);
  });

  socket.on('ROOM_READY', (data) => {
    const { roomid } = data;
    console.log("socket.on - roomid:", roomid);
    updateRoomCycle(roomid);
    initTimer(roomid, io);
  });
};
