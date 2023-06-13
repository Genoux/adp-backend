import { Server, Socket } from 'socket.io';
import supabase from '../supabase';
import { selectUserChampion } from '../utils/champions';
import { updateRoomCycle } from '../utils/roomCycle';
import { switchTurn } from '../utils/switchTeam';
import { resetTimer, startLobbyTimer, stopTimer, setHeroSelected } from '../utils/timer';

export const handleUserEvents = (socket: Socket, io: Server) => {
  socket.on('SELECT_CHAMPION', async (data) => {
    const { roomid, selectedChampion } = data;
    //stopTimer(roomid);
    await selectUserChampion(roomid, selectedChampion);
    io.to(roomid).emit('message', `User ${socket.id} has selected ${selectedChampion}`);
    const cycle = await updateRoomCycle(roomid);
    const value = await switchTurn(roomid, cycle);
    console.log("socket.on - value:", value);
    if (!value) {
      socket.emit('CHAMPION_SELECTED', true);
      }
    resetTimer(roomid);
  });

  socket.on('RESET_TIMER', async (data) => {
    console.log("Stop timer for: ", data);
    resetTimer(data.roomid);
  });

  socket.on('STOP_TIMER', async (data) => {
    console.log("Stop timer for: ", data);
    stopTimer(data.roomid);
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
