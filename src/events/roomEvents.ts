import { Socket } from 'socket.io';
import RoomTimerManager from '@/services/RoomTimerManager';
import { syncUserTurn } from '@/utils/handlers/draftHandler';
import supabaseQuery from '@/helpers/supabaseQuery';
import { RoomData } from '@/types/global';

const handleRoomEvents = (socket: Socket) => {
  const roomTimerManager = RoomTimerManager.getInstance();

  socket.on('joinRoom', async ({ roomid, teamid }: { roomid: string; teamid: string }) => {
    socket.join(roomid);

    const room = await supabaseQuery<RoomData>(
      'rooms',
      (q) => q.select('*').eq('id', roomid).single(),
      'Error fetching room data in roomEvents.ts'
    );

    if (!room) {
      console.log(`Room ${roomid} does not exist. Deleting timer if it exists.`);
      roomTimerManager.deleteTimer(roomid);
      return;
    }

    socket.emit('message', `Welcome to room ${roomid}`);

    if (!room.ready) return
    //await syncTimers(roomid, room.status);
    await syncUserTurn(roomid, teamid);
  });

  socket.on('disconnect', (reason) => {
    console.log(`User ${socket.id} disconnected because ${reason}`);
  });
};

export default handleRoomEvents;