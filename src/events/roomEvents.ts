import { Socket, Server } from 'socket.io';
import { updateRoomCycle } from '../utils/roomCycle';
import { initTimer } from '../utils/timer';
import supabase from '../supabase';

export const handleRoomEvents = (socket: Socket, io: Server) => {
  socket.on('joinRoom', async (roomid, teamid) => {
    console.log("socket.on - roomid:", roomid);
    socket.join(roomid);

    socket.to(roomid).emit('message', `Welcome to room ${roomid}`);
    socket.broadcast.to(roomid).emit('message', `Team ${teamid} has joined the room`);

    const { data: room } = await supabase.from('rooms').select('*').eq('id', roomid).single();
    if (room !== null && room.ready) {
      initTimer(roomid, io); 
      io.in(roomid).emit('ROOM_READY', 'Room is ready to start!');
    }
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
