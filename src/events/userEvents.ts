import { Server, Socket } from 'socket.io';
import supabase from '../supabase';
import { selectUserChampion } from '../utils/champions';
import { switchTurnAndUpdateCycle } from '../utils/roomCycle';
import { updateRoomCycle } from '../utils/roomCycle';
import { initTimer, startTimer } from '../utils/timer';

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


  socket.on('TEAM_READY', async ({ roomid, teamid }) => {
    const { data: teams } = await supabase
      .from('teams')
      .select('*')
      .eq('room', roomid);

    if(!teams) return;
    
    console.log(`Team ${teamid} is ready!`)

    if (teams.every(team => team.ready)) {
      await supabase.from('rooms').update({ ready: true }).eq('id', roomid);

      startTimer(roomid);
      updateRoomCycle(roomid);
     // io.in(roomid).emit('ROOM_READY', 'Room is ready to start!');
      
    }
  });
};
