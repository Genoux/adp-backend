import { Timer } from "easytimer.js";
import { Server } from 'socket.io';
import { selectUserChampion } from "./champions";
import { switchTurnAndUpdateCycle } from "./roomCycle";
import supabase from "../supabase";

interface RoomTimer {
  countdownTimer: Timer;
  countdownTimerLobby: Timer;
  id: number | string;
  selecteChampion: boolean;
}

const roomTimers: Record<string, RoomTimer> = {};

// List all the current timers
export function listTimers() {
  return roomTimers;
}

// Cleanup room timers
export async function cleanUpRoomTimers() {
  const { data: rooms } = await supabase.from('rooms').select('id');
  if (!rooms) return;

  const validRoomIds = new Set(rooms.map(room => room.id));

  for (const roomId in roomTimers) {
    if (!validRoomIds.has(roomId)) {
      console.log(`Deleting timer for room ${roomId}`);
      deleteTimer(roomId);
    }
  }
  console.log(roomTimers);
}

// Common event listener for timers
function addTimerEventListeners(timer: Timer, roomid: string, io: Server, onTargetAchieved?: () => Promise<void>) {
  timer.addEventListener('secondsUpdated', () => {
    io.to(roomid).emit('TIMER', timer.getTimeValues().toString());
    //console.log(timer.isPaused());
    if (!roomTimers[roomid]) {
      deleteTimer(roomid);
    }
  });

  if (onTargetAchieved) {
    timer.addEventListener('targetAchieved', onTargetAchieved);
  }

}


// Initialize timer
export function initTimer(roomid: string, io: Server) {
  if (roomTimers[roomid]) return;

  const timer = new Timer();
  const timerLobby = new Timer();

  addTimerEventListeners(timerLobby, roomid, io, async () => {
    startTimer(roomid);
    await switchTurnAndUpdateCycle(roomid);
  });

  addTimerEventListeners(timer, roomid, io, async () => {
    const { data } = await supabase.from('teams').select('pick').eq('room', roomid).eq('isTurn', true).single()
    if (!data) return;
    if (data.pick) {
      console.log(`Pick ${data.pick}`);
      return
    }
    stopTimer(roomid);
    await selectUserChampion(roomid, null);
    await switchTurnAndUpdateCycle(roomid);
    resetTimer(roomid);
  });

  roomTimers[roomid] = {
    countdownTimer: timer,
    countdownTimerLobby: timerLobby,
    id: roomid,
    selecteChampion: false
  };
}

export function startLobbyTimer(roomid: string) {
  if (!roomTimers[roomid]) return;
  roomTimers[roomid].countdownTimerLobby.start({ countdown: true, startValues: { seconds: Number(process.env.LOBBY_TIME) || 20 } });
}

export function startTimer(roomid: string) {
  if (!roomTimers[roomid]) return;
  roomTimers[roomid].countdownTimer.start({ countdown: true, startValues: { seconds: Number(process.env.START_TIME) || 15 } });
}

export function deleteTimer(roomid: string) {
  if (roomTimers[roomid]?.countdownTimer) {
    roomTimers[roomid].countdownTimer.stop();
    delete roomTimers[roomid];
  }
}

export function stopTimer(roomid: string) {
  if (!roomTimers[roomid]) return;
  roomTimers[roomid].countdownTimer.stop();
}

export function resetTimer(roomid: string) {
  if (!roomTimers[roomid]) return;
  roomTimers[roomid].countdownTimer.reset();
}
