import supabaseQuery from '../helpers/supabaseQuery';
import RoomTimerManager from '../services/RoomTimerManager';
import { TeamData } from '../types/global';
import finishTurn from '../utils/actions/finishTurn';
import { setPlanningPhase } from '../utils/handlers/phaseHandler';
import { Socket } from 'socket.io';

const handleUserEvents = (socket: Socket) => {
  const roomTimerManager = RoomTimerManager.getInstance();

  socket.on('SELECT_CHAMPION', async ({ roomid }: { roomid: string }) => {
    roomTimerManager.cancelTargetAchieved(roomid);
    await finishTurn(roomid, roomTimerManager);
  });

  socket.on('TEAM_READY', async ({ roomid, teamid }: { roomid: string; teamid: string }) => {
    try {
      const teams = await supabaseQuery<TeamData[]>(
        'teams',
        (q) => q.select('id, ready').eq('room', roomid),
        'Error fetching teams data'
      );

      console.log(`Team ${teamid} is ready!`);

      if (teams.every((team) => team.ready)) {
        await supabaseQuery<TeamData[]>(
          'rooms',
          (q) => q.update({ ready: true }).eq('id', roomid),
          'Error fetching rooms data'
        );

        console.log(`Room ${roomid} is ready!`);

        await setPlanningPhase(roomid);
      }
    } catch (error) {
      console.error('Error in handleTeamReady:', error);
    }
  });
};

export default handleUserEvents;
