import { Timer, } from "easytimer.js";
import { Server } from 'socket.io';
import { selectUserChampion } from "./champions";
import { switchTurnAndUpdateCycle } from "./roomCycle";
import supabase from "../supabase";

interface RoomTimer {
  countdownTimer: any;
  id: number | string;
}

const roomTimers: Record<string, RoomTimer> = {};

// Create a functon that list all the current timers
export function listTimers() {
  return roomTimers;
}

export async function cleanUpRoomTimers() {
  const { data: rooms } = await supabase.from('rooms').select('id');
  if(!rooms) return;
  // Create a Set of all valid room IDs for efficient lookup
  const validRoomIds = new Set(rooms.map(room => room.id));

  // Check each room timer
  for (const roomId in roomTimers) {
    // If the room ID is not in the set of valid IDs, delete it
    if (!validRoomIds.has(roomId)) {
      console.log(`Deleting timer for room ${roomId}`)
      deleteTimer(roomId);  // deleteTimer is your existing function to stop and delete a timer
    }
  }
  console.log(roomTimers)
}


export function initTimer(roomid: string, io: Server) {
  // If a timer for the room already exists, we simply return
  if (roomTimers[roomid]) return;

  const timer = new Timer();

  // Emit a TIMER event every second with the updated timer values
  timer.addEventListener('secondsUpdated', async function () { 
    io.to(roomid).emit('TIMER', timer.getTimeValues().toString());
    // If the timer was deleted while it was running, stop it
    if (!roomTimers[roomid]) {
      deleteTimer(roomid);
    }
  });

  // When the timer finishes, select the user champion and update the cycle
  timer.addEventListener('targetAchieved', async function () {
    await selectUserChampion(roomid, null);
    await switchTurnAndUpdateCycle(roomid);
  });

  // Start the timer with a countdown of 12 seconds

  // Store the timer and room ID
  roomTimers[roomid] = {
    countdownTimer: timer,
    id: roomid
  };

  //roomTimers[roomid].countdownTimer.start({ countdown: true, startValues: { seconds: 12 } });
}

export function startTimer(roomid: string) {
  if (!roomTimers[roomid]) return;
  roomTimers[roomid].countdownTimer.start({ countdown: true, startValues: { seconds: 5 } });
}

export function deleteTimer(roomid: string) {
  roomTimers[roomid].countdownTimer.stop();
  delete roomTimers[roomid];
}


export function resetTimer(roomid: string) {
  if (!roomTimers[roomid]) return;
  roomTimers[roomid].countdownTimer.start({ countdown: true, startValues: { seconds: 2 } });
}