import { Server, Socket } from 'socket.io';
import RoomTimerManager from '../services/RoomTimerManager';
import supabase from '../supabase';
import { selectChampion } from '../utils/champions';
import { updateRoomCycle } from '../utils/roomCycle';
import { switchTurn } from '../utils/switchTeam';

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

  socket.on(EVENTS.SELECT_CHAMPION, handleSelectChampion);
  socket.on(EVENTS.RESET_TIMER, handleResetTimer);
  socket.on(EVENTS.STOP_TIMER, handleStopTimer);
  socket.on(EVENTS.START_TIMER, handleStartTimer);
  socket.on(EVENTS.TEAM_READY, handleTeamReady);

  async function handleSelectChampion({
    roomid,
    selectedChampion,
  }: SelectChampionMessage) {
    console.log("handleUserEvents - roomid:", roomid);
    console.log("handleUserEvents - selectedChampion:", selectedChampion);
    if (!roomTimerManager.isTimeUp(roomid)) {
      roomTimerManager.lockRoomTimer(roomid);
      await selectChampion(roomid, selectedChampion);
    }
    await handleTurn(roomid);
    //io.to(roomid.toString()).emit('CHAMPION_SELECTED', true);
  }

  function delay(milliseconds: number) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  async function handleTurn(roomid: string) {
    const cycle = await updateRoomCycle(roomid);
    if (!cycle) return;

    await delay(1000);

    const turnSwitched = await switchTurn(roomid, cycle);
    if (turnSwitched) {
      roomTimerManager.cancelTargetAchieved(roomid);
      roomTimerManager.resetTimer(roomid);
      roomTimerManager.unlockRoomTimer(roomid);
      io.to(roomid).emit(EVENTS.TIMER_RESET, true);
      await supabase.from('teams').update({ clicked_hero: null }).eq('room', roomid);
    }
  }

  function handleResetTimer({ roomid }: RoomMessage) {
    roomTimerManager.resetTimer(roomid);
  }

  function handleStopTimer({ roomid }: RoomMessage) {
    roomTimerManager.stopTimer(roomid);
  }

  function handleStartTimer({ roomid }: RoomMessage) {
    roomTimerManager.startTimer(roomid);
  }

  async function handleTeamReady({ roomid, teamid }: TeamReadyMessage) {
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
        await updateRoomCycle(roomid);
        roomTimerManager.startLobbyTimer(roomid);
      }
    } catch (error) {
      console.error('Error in handleTeamReady:', error);
    }
  }
};
