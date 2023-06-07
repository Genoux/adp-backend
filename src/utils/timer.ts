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

export function initTimer(roomid: string, io: Server) {
  if (roomTimers[roomid]) return;

  const timer = new Timer();

  timer.addEventListener('secondsUpdated', async function (e: any) { 
    console.log("roomid:", roomid);

  io.to(roomid).emit('TIMER', timer.getTimeValues().toString());
    if (!roomTimers[roomid]) {
      deleteTimer(roomid)
    }
  });

  timer.addEventListener('targetAchieved', async function (e: any) {
    setTimeout(async () => {
      await selectUserChampion(roomid, null);
      await switchTurnAndUpdateCycle(roomid);
    }, 500);
  });


  roomTimers[roomid] = {
    countdownTimer: timer,
    id: roomid
  };

  console.log("initTimer - roomid:", roomid);
  roomTimers[roomid].countdownTimer.start({ countdown: true, startValues: { seconds: 12 } });
}

export function deleteTimer(roomid: string) {
  roomTimers[roomid].countdownTimer.stop();
  delete roomTimers[roomid];
  console.log("deleteTimer - roomTimers:", roomTimers);
}


export function resetTimer(roomid: string) {
  if (!roomTimers[roomid]) return;
  roomTimers[roomid].countdownTimer.reset();
}