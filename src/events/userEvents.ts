import { Server, Socket } from 'socket.io';
import RoomTimerManager from '../services/RoomTimerManager';
import supabase from '../supabase';
import { handlePhase } from '../utils/actions/turnHandler';
import { EndUserTurn } from '../utils';
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

  socket.on(EVENTS.SELECT_CHAMPION, async ({ roomid, selectedChampion }: SelectChampionMessage) => {
    console.log("handleUserEvents - roomid:", roomid);
      console.log("socket.on - roomTimerManager.isTimeUp(roomid):", roomTimerManager.isTimeUp(roomid));
    console.log("handleUserEvents - selectedChampion:", selectedChampion);

    if (roomTimerManager.isTimeUp(roomid)) {
      console.log('Cannot select champion, time is up.');
     // return;
    }
    EndUserTurn(roomid, io, roomTimerManager, true);
    // roomTimerManager.lockRoomTimer(roomid);
    // roomTimerManager.stopTimer(roomid);
    // await selectChampion(roomid);
    // await handleTurn(roomid, io, roomTimerManager);
    // io.to(roomid).emit('TIMER_RESET', true);
    // await supabase.from('teams').update({ clicked_hero: null }).eq('room', roomid);
    // roomTimerManager.resetTimer(roomid);
  });

  socket.on(EVENTS.RESET_TIMER, ({ roomid }: RoomMessage) => {
    //roomTimerManager.resetTimer(roomid);
  });

  socket.on(EVENTS.STOP_TIMER, ({ roomid }: RoomMessage) => {
    //roomTimerManager.stopTimer(roomid);
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
          .update({ ready: true, status: 'planning' })
          .eq('id', roomid);
        console.log(`Room ${roomid} is ready!`);
       //await updateRoomCycle(roomid);
        await handlePhase(roomid, io, RoomTimerManager.getInstance());
        //roomTimerManager.startLobbyTimer(roomid);
      }
    } catch (error) {
      console.error('Error in handleTeamReady:', error);
    }
  });
};
