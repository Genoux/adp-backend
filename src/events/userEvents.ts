import { Server, Socket } from 'socket.io';
import supabase from '../supabase';
import { selectUserChampion } from '../utils/champions';
import { switchTurnAndUpdateCycle, updateRoomCycle } from '../utils/roomCycle';
import { resetTimer, startLobbyTimer } from '../utils/timer';

export const handleUserEvents = (socket: Socket, io: Server) => {
  socket.on('SELECT_CHAMPION', async (data) => {
    const { roomid, selectedChampion } = data;
    await selectUserChampion(roomid, selectedChampion);
    await switchTurnAndUpdateCycle(roomid);
    resetTimer(roomid);
    io.to(roomid).emit('message', `User ${socket.id} has selected ${selectedChampion}`);
  });

  socket.on('TEAM_READY', async ({ roomid, teamid }) => {
    const { data: teams } = await supabase
      .from('teams')
      .select('*')
      .eq('room', roomid);

    if(!teams) return;
    
    console.log(`Team ${teamid} is ready!`);

    if (teams.every(team => team.ready)) {
      await supabase.from('rooms').update({ ready: true }).eq('id', roomid);
      console.log(`Room ${roomid} is ready!`);
      startLobbyTimer(roomid);
      updateRoomCycle(roomid);
    }
  });
};
