import { Server, Socket } from 'socket.io';
import RoomTimerManager from '../services/RoomTimerManager';
import supabase from '../supabase';
import { EndActionTrigger } from '../utils';
import { setPlanningPhase } from '../utils/handlers/phaseHandler';

interface SelectChampionMessage {
  teamid: string;
  roomid: string;
  selectedChampion: string;
}

interface RoomMessage {
  roomid: string;
}

interface TeamReadyMessage {
  roomid: string;
  teamid: string;
}

const EVENTS = {
  SELECT_CHAMPION: 'SELECT_CHAMPION',
  RESET_TIMER: 'RESET_TIMER',
  STOP_TIMER: 'STOP_TIMER',
  START_TIMER: 'START_TIMER',
  TEAM_READY: 'TEAM_READY',
  TIMER_RESET: 'TIMER_RESET',
};

export const handleUserEvents = (socket: Socket, io: Server) => {
  const roomTimerManager = RoomTimerManager.getInstance();

  socket.on(EVENTS.SELECT_CHAMPION, async ({ roomid }: SelectChampionMessage) => {
    roomTimerManager.cancelTargetAchieved(roomid);
    console.log('SELECT_CHAMPION');
    await EndActionTrigger(roomid, roomTimerManager, true, socket);
  });

  socket.on(EVENTS.START_TIMER, ({ roomid }: RoomMessage) => {
    roomTimerManager.startTimer(roomid);
  });

  socket.on(EVENTS.TEAM_READY, async ({ roomid, teamid }: TeamReadyMessage) => {
    try {
      const { data: teams, error } = await supabase
        .from('teams')
        .select('id, ready')
        .eq('room', roomid);

      if (error) throw error;
      if (!teams) return;

      console.log(`Team ${teamid} is ready!`);

      if (teams.every((team) => team.ready)) {
        await supabase
          .from('rooms')
          .update({ ready: true })
          .eq('id', roomid);
        console.log(`Room ${roomid} is ready!`);
        
        await setPlanningPhase(roomid);
      }
    } catch (error) {
      console.error('Error in handleTeamReady:', error);
    }
  });
};
