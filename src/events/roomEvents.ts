import { Server, Socket } from 'socket.io';
import { RoomTimerManager } from '../services/RoomTimerManager';
import supabase from '../supabase';

export const handleRoomEvents = (socket: Socket, io: Server) => {
  const roomTimerManager = RoomTimerManager.getInstance();

  socket.on('joinRoom', async ({ roomid }) => {
    socket.join(roomid);

    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomid)
      .single();

    if (!room) {
      console.log(`Room ${roomid} does not exist. Timer not started.`);
      return;
    }

    if (room.status === 'done') {
      console.log(
        `Room ${roomid} is already done. Deleting timer if it exists.`
      );
      roomTimerManager.deleteTimer(roomid);
      return;
    }

    console.log(`User ${socket.id} joined room ${roomid}`);
    socket.emit('message', `Welcome to room ${roomid}`);

    roomTimerManager.initTimer(roomid, io);

    if (room.ready) {
      if (room.status === 'planning') {
        roomTimerManager.startLobbyTimer(roomid);
      } else {
        roomTimerManager.startTimer(roomid);
      }
    }
  });

  socket.on('disconnect', async (reason) => {
    console.log(`User ${socket.id} disconnected because ${reason}`);
  });
};
