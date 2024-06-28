import supabaseQuery from '../helpers/supabaseQuery';
import RoomTimerManager from '../services/RoomTimerManager';
import { Database } from '../types/supabase';
import finishTurn from '../utils/actions/finishTurn';
import { setPlanningPhase } from '../utils/handlers/phaseHandler';
import { Socket } from 'socket.io';

type Team = Database['public']['Tables']['teams']['Row'];

const handleUserEvents = (socket: Socket) => {
  const roomTimerManager = RoomTimerManager.getInstance();

  socket.on('SELECT_CHAMPION', async ({ roomid }: { roomid: number }) => {
    roomTimerManager.cancelTargetAchieved(roomid);
    await finishTurn(roomid, roomTimerManager);
  });

  socket.on('TEAM_READY', async ({ roomid, teamid }: { roomid: number; teamid: string }) => {
    try {
      const teams = await supabaseQuery<Team[]>(
        'teams',
        (q) => q.select('id, ready').eq('room_id', roomid),
        'Error fetching teams data in userEvents.ts'
      );

      console.log(teams)
      console.log(`Team ${teamid} is ready!`);

      if (teams.every((team: Team) => team.ready)) {
        await supabaseQuery(
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
