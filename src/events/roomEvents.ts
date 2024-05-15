import { Server, Socket } from 'socket.io';
import RoomTimerManager from '../services/RoomTimerManager';
import supabase from '../supabase';
import { handleDonePhase } from '../utils/actions/turnHandler';

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

    if (room.status === 'done' || room.cycle >= 18) {
      console.log(`Room ${roomid} is already done. Deleting timer if it exists.`);
      roomTimerManager.deleteTimer(roomid);
      await handleDonePhase(roomid, io, roomTimerManager);
      return;
    }

    console.log(`User ${socket.id} joined room ${roomid}`);
    socket.emit('message', `Welcome to room ${roomid}`);

    roomTimerManager.initTimer(roomid, io);
    //handlePhase(room.status, roomid, io, roomTimerManager);
    if (room.ready) {
     // handleTurn(roomid, io, roomTimerManager);
      room.status === 'planning'
        ? roomTimerManager.startLobbyTimer(roomid)
        : roomTimerManager.startTimer(roomid);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`User ${socket.id} disconnected because ${reason}`);
  });
};
