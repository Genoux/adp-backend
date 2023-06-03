import { Server, Socket } from 'socket.io';
import { selectUserChampion } from '../utils/champions';
import { switchTurnAndUpdateCycle } from '../utils/roomCycle';

export const handleUserEvents = (socket: Socket, io: Server) => {
  socket.on('SELECT_CHAMPION', async (data) => {
    try {
      const { roomid, selectedChampion } = data;
      console.log("socket.on - roomid:", roomid);
      console.log("socket.on - selectedChampion:", selectedChampion);
      await selectUserChampion(roomid, selectedChampion);
      await switchTurnAndUpdateCycle(roomid);
      io.to(roomid).emit('message', `User ${socket.id} has selected ${selectedChampion}`);
    } catch (error: any) {
      console.error(`Error handling SELECT_CHAMPION event: ${error.message}`);
    }
  });
};
