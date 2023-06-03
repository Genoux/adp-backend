import { Socket } from 'socket.io';
import { selectUserChampion } from '../utils/champions';
import { switchTurnAndUpdateCycle } from '../utils/roomCycle';

export const handleUserEvents = (socket: Socket) => {
  socket.on('SELECT_CHAMPION', async (data) => {
    try {
      const { roomid, selectedChampion } = data;
      await selectUserChampion(roomid, selectedChampion);
      socket.to(roomid).emit('message', `User ${socket.id} has selected ${selectedChampion}`);
      await switchTurnAndUpdateCycle(roomid);
    } catch (error: any) {
      console.error(`Error handling SELECT_CHAMPION event: ${error.message}`);
    }
  });
};
