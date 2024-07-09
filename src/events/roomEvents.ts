import supabaseQuery from '../helpers/supabaseQuery';
import RoomTimerManager from '../services/RoomTimerManager';
import { syncUserTurn } from '../utils/handlers/draftHandler';
import { Socket } from 'socket.io';
import { Database } from '../types/supabase';

type Room = Database['public']['Tables']['rooms']['Row'];

const handleRoomEvents = (socket: Socket) => {
  const roomTimerManager = RoomTimerManager.getInstance();

  socket.on(
    'joinRoom',
    async ({ roomid }: { roomid: number; teamid: number }) => {
      console.log(`User ${socket.id} joined room ${roomid}`);
      socket.join(JSON.stringify(roomid));

      const room = await supabaseQuery<Room>(
        'rooms',
        (q) => q.select('*').eq('id', roomid).single(),
        'Error fetching room data in roomEvents.ts'
      );

      if (!room) {
        console.log(
          `Room ${roomid} does not exist. Deleting timer if it exists.`
        );
        roomTimerManager.deleteTimer(roomid);
        return;
      }

      socket.emit('message', `Welcome to room ${roomid}`);

      if (!room.ready) return;
      //await syncTimers(roomid, room.status);
      await syncUserTurn(roomid);
    }
  );

  socket.on('disconnect', (reason) => {
    console.log(`User ${socket.id} disconnected because ${reason}`);
  });
};

export default handleRoomEvents;
