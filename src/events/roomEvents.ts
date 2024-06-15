import { Server, Socket } from 'socket.io';
import RoomTimerManager from '../services/RoomTimerManager';
import supabase from '../supabase';
import { syncTimers } from '../utils/handlers/phaseHandler';
import { syncUserTurn } from '../utils/handlers/draftHandler';
interface Ids {
  roomid: string;
  teamid: string;
}

export const handleRoomEvents = (socket: Socket, io: Server) => {
  const roomTimerManager = RoomTimerManager.getInstance();

  socket.on('joinRoom', async ({ roomid, teamid }: Ids) => {
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

    socket.emit('message', `Welcome to room ${roomid}`);

    if (!roomTimerManager.hasTimer(roomid)) {
      roomTimerManager.initTimer(roomid, io, socket);
    }

    if (!room.ready) return
    await syncTimers(roomid, room.status);
    await syncUserTurn(roomid, teamid);
  });

  socket.on('disconnect', (reason) => {
    console.log(`User ${socket.id} disconnected because ${reason}`);
  });
};
