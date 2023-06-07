import { Server, Socket } from 'socket.io';
import supabase from '../supabase';
import { selectUserChampion } from '../utils/champions';
import { switchTurnAndUpdateCycle } from '../utils/roomCycle';
import { updateRoomCycle } from '../utils/roomCycle';
import { initTimer } from '../utils/timer';

export const handleUserEvents = (socket: Socket, io: Server) => {
  socket.on('SELECT_CHAMPION', async (data) => {
    try {
      const { roomid, selectedChampion } = data;
      await selectUserChampion(roomid, selectedChampion);
      await switchTurnAndUpdateCycle(roomid);
      io.to(roomid).emit('message', `User ${socket.id} has selected ${selectedChampion}`);
    } catch (error: any) {
      console.error(`Error handling SELECT_CHAMPION event: ${error.message}`);
    }
  });


  socket.on('TEAM_READY', async ({ roomid }) => {

    const { data: teams } = await supabase
      .from('teams')
      .select('*')
      .eq('room', roomid);

    if(!teams) return;
    
    if (teams.every(team => team.ready)) {
      await supabase.from('rooms').update({ ready: true }).eq('id', roomid);

      updateRoomCycle(roomid);
      initTimer(roomid, io);

     // io.in(roomid).emit('ROOM_READY', 'Room is ready to start!');
      
    }
  });
};
