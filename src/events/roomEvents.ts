import { Socket } from 'socket.io';
import supabaseQuery from '../helpers/supabaseQuery';
import RoomTimerManager from '../services/RoomTimerManager';
import { Database } from '../types/supabase';
import { syncUserTurn } from '../utils/handlers/draftHandler';
import RoomLogger from '../helpers/logger';

type Room = Database['public']['Tables']['rooms']['Row'];

const handleRoomEvents = (socket: Socket) => {
  const roomTimerManager = RoomTimerManager.getInstance();
  const logger = RoomLogger.getInstance();

  socket.on('joinRoom', async ({ roomid }: { roomid: number | undefined }) => {
    if (roomid === undefined) {
      logger.error(null, 'Received undefined roomid in joinRoom event');
      socket.emit('error', 'Invalid room ID');
      return;
    }

    logger.info(roomid, `User ${socket.id} joined room`);
    socket.join(JSON.stringify(roomid));

    const roomTimer = roomTimerManager.getTimer(roomid);
    if (roomTimer) {
      logger.info(roomid, `Timer ID: ${roomTimer.id}`);
    }

    try {
      const room = await supabaseQuery<Room>(
        'rooms',
        (q) => q.select('*').eq('id', roomid).single(),
        'Error fetching room data in roomEvents.ts'
      );

      if (!room) {
        logger.warn(roomid, 'Room does not exist. Deleting timer if it exists.');
        roomTimerManager.deleteTimer(roomid);
        socket.emit('error', 'Room not found');
        return;
      }

      socket.emit('message', `Welcome to room ${roomid}`);

      if (!room.ready) {
        logger.info(roomid, 'Room not ready, skipping turn sync');
        return;
      }

      await syncUserTurn(roomid);
      logger.success(roomid, 'User turn synchronized');
    } catch (error) {
      logger.error(roomid, 'Error in joinRoom event:', error);
      socket.emit('error', 'Server error occurred');
    }
  });

  socket.on('disconnect', (reason) => {
    logger.system(`User ${socket.id} disconnected because ${reason}`);
  });
};

export default handleRoomEvents;