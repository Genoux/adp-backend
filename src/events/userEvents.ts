import { Socket } from 'socket.io';
import RoomTimerManager from '@/services/RoomTimerManager';
import finishTurn from '@/utils/actions/finishTurn';
import { setPlanningPhase } from '@/utils/handlers/phaseHandler';
import supabaseQuery from '@/helpers/supabaseQuery';
import { TeamData } from '@/types/global';

type RoomMessage = {
  roomid: string;
}

type TeamReadyMessage = {
  roomid: string;
  teamid: string;
}

const EVENTS = {
  SELECT_CHAMPION: 'SELECT_CHAMPION',
  TEAM_READY: 'TEAM_READY',
};

const handleUserEvents = (socket: Socket) => {
  const roomTimerManager = RoomTimerManager.getInstance();

  socket.on(EVENTS.SELECT_CHAMPION, async ({ roomid }: RoomMessage) => {
    roomTimerManager.cancelTargetAchieved(roomid);
    await finishTurn(roomid, roomTimerManager);
  });

  socket.on(EVENTS.TEAM_READY, async ({ roomid, teamid }: TeamReadyMessage) => {
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
            (q) => q.update({ready: true}).eq('id', roomid),
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
