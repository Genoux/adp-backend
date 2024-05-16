import { Server, Socket } from 'socket.io';
import RoomTimerManager from '../services/RoomTimerManager';
import supabase from '../supabase';
import { syncTimers } from '../utils/handlers/phaseHandler';

export const handleRoomEvents = (socket: Socket, io: Server) => {
  const roomTimerManager = RoomTimerManager.getInstance();

  socket.on('joinRoom', async ({ roomid }) => {
    socket.join(roomid);

    const { data: room, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomid)
      .single();

    if (error || !room) {
      console.log(`Room ${roomid} does not exist. Deleting timer if it exists.`);
      roomTimerManager.deleteTimer(roomid);
      return;
    }

    console.log(`User ${socket.id} joined room ${roomid}`);
    socket.emit('message', `Welcome to room ${roomid}`);

    roomTimerManager.initTimer(roomid, io);
    roomTimerManager.unlockRoom(roomid);
    await syncTimers(roomid, room.status);
    if (room.ready) {
      await syncTimers(roomid, room.status);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`User ${socket.id} disconnected because ${reason}`);
  });
};
