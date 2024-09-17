import { Socket } from 'socket.io';
import supabaseQuery from '../helpers/supabaseQuery';
import RoomTimerManager from '../services/RoomTimerManager';
import { Database } from '../types/supabase';
import { syncUserTurn } from '../utils/handlers/draftHandler';

type Room = Database['public']['Tables']['rooms']['Row'];

const handleRoomEvents = (socket: Socket) => {
  const roomTimerManager = RoomTimerManager.getInstance();

  socket.on('joinRoom', async ({ roomid }: { roomid: number | undefined }) => {
    if (roomid === undefined) {
      console.error('Received undefined roomid in joinRoom event');
      socket.emit('error', 'Invalid room ID');
      return;
    }

    console.log(`User ${socket.id} joined room ${roomid}`);
    socket.join(JSON.stringify(roomid));

    const roomTimer = roomTimerManager.getTimer(roomid);
    if(roomTimer) {
      console.log('Timer ID: ', roomTimer.id);
    }

    try {
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
        socket.emit('error', 'Room not found');
        return;
      }

      socket.emit('message', `Welcome to room ${roomid}`);

      if (!room.ready) return;

      await syncUserTurn(roomid);
    } catch (error) {
      console.error('Error in joinRoom event:', error);
      socket.emit('error', 'Server error occurred');
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`User ${socket.id} disconnected because ${reason}`);
  });
};

export default handleRoomEvents;
