import { Timer, } from "easytimer.js";
import { Server } from 'socket.io';
import { selectUserChampion } from "./champions";
import { switchTurnAndUpdateCycle } from "./roomCycle";

interface RoomTimer {
  countdownTimer: any;
}

const roomTimers: Record<string, RoomTimer> = {};

export function initTimer(roomid: string, io: Server) {
  if (roomTimers[roomid]) return;

  const timer = new Timer();

  timer.addEventListener('secondsUpdated', async function () { 
    io.in(roomid).emit('TIMER', timer.getTimeValues().toString());
  });

  timer.addEventListener('targetAchieved', async function (e: any) {
    console.log("targetAchieved - e:", e);
    setTimeout(async () => {
      await selectUserChampion(roomid, null);
      await switchTurnAndUpdateCycle(roomid);
    }, 500);
    
  });


  roomTimers[roomid] = {
    countdownTimer: timer,
  };

  roomTimers[roomid].countdownTimer.start({ countdown: true, startValues: { seconds: 12 } });

}


export function resetTimer(roomid: string) {
  if (!roomTimers[roomid]) return;
  roomTimers[roomid].countdownTimer.reset();
}