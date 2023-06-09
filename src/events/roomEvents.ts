import { Socket, Server } from 'socket.io';
import { updateRoomCycle } from '../utils/roomCycle';
import { initTimer, deleteTimer, listTimers, startTimer, cleanUpRoomTimers } from '../utils/timer';
import supabase from '../supabase';



export const handleRoomEvents = async (socket: Socket, io: Server) => {
  // Join room
  socket.on('joinRoom', async ({roomid, teamid}) => {
    socket.join(roomid);
    io.to(socket.id).emit('message', `Welcome to room ${roomid}, Team ${teamid}!`);
   //socket.broadcast.to(roomid).emit('message', `Team ${teamid} has joined the room`);
    initTimer(roomid, io); 
    // If room is ready, initialize timer
    const { data: room } = await supabase.from('rooms').select('*').eq('id', roomid).single();
    if (room !== null && room.ready && room.status !== 'done') {
      startTimer(roomid); 
      //io.in(roomid).emit('ROOM_READY', 'Room is ready to start!');
    }
  });

  // On disconnect, log reason
  socket.on('disconnect', (reason) => {
    console.log(`User ${socket.id} disconnected because ${reason}`);
  });

  // socket.on('ROOM_DONE', (data) => {
  //   const { roomid } = data;
  //   deleteTimer(roomid);
  // });
};
