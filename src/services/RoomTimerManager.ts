/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Timer } from "easytimer.js";
import { Server, Socket } from "socket.io";
import { selectUserChampion } from "../utils/champions";
import { updateRoomCycle } from "../utils/roomCycle";
import { switchTurn } from "../utils/switchTeam";
import { delay } from '../utils/delay';
import supabase from "../supabase";

interface RoomTimer {
  countdownTimer: Timer;
  countdownTimerLobby: Timer;
  id: number | string;
  lock: boolean;
  timerId?: NodeJS.Timeout;
  isTimeUp: boolean;
}

export class RoomTimerManager {
  private static instance: RoomTimerManager;
  private roomTimers: Record<string, RoomTimer> = {};
  static isTimeUp: false;

  private constructor() { }
  

  async monitorRoomStatus(roomid: string) {
    // Assume that a null status indicates that the room does not exist or has been done.
    let status = await this.getRoomStatus(roomid);

    while (status !== null && status !== 'done') {
        await delay(5000);  // Wait for 5 seconds.
        status = await this.getRoomStatus(roomid);
    }

    // When the room does not exist or has been done, stop and delete the timer.
    if (status === null || status === 'done') {
        console.log(`Deleting timer for room ${roomid}`);
        this.stopTimer(roomid);
        this.deleteTimer(roomid);
    }
}

private async getRoomStatus(roomid: string) {
    const { data: room } = await supabase.from('rooms').select('status').eq('id', roomid).single();
    return room ? room.status : null;
}

  static getInstance(): RoomTimerManager {
    if (!RoomTimerManager.instance) {
      RoomTimerManager.instance = new RoomTimerManager();
    }

    return RoomTimerManager.instance;
  }

  // List all the current timers
  listTimers() {
    return this.roomTimers;
  }

  // Cleanup room timers
  async cleanUpRoomTimers() {
    const { data: rooms } = await supabase.from("rooms").select("id");
    if (!rooms) return;

    const validRoomIds = new Set(rooms.map((room) => room.id));

    for (const roomId in this.roomTimers) {
      if (!validRoomIds.has(roomId)) {
        console.log(`Deleting timer for room ${roomId}`);
        this.deleteTimer(roomId);
      }
    }
    console.log(this.roomTimers);
  }

  // Common event listener for timers
  private addTimerEventListeners(
    timer: Timer,
    roomid: string,
    io: Server,
    onTargetAchieved?: () => Promise<void>
  ) {
    
    timer.addEventListener("secondsUpdated", () => {
      const timeValues = timer.getTimeValues();

      // Only emit event if the second value has changed
        // Format time as "MM:SS"
        const formattedTime = `${timeValues.minutes
          .toString()
          .padStart(2, "0")}:${timeValues.seconds.toString().padStart(2, "0")}`;
      io.to(roomid).emit("TIMER", formattedTime);
      
      // Delete the timer if it doesn't exist in roomTimers anymore
      if (!this.roomTimers[roomid]) {
        this.deleteTimer(roomid);
      }
    });

    if (onTargetAchieved) {
      timer.addEventListener("targetAchieved", async () => {
        this.roomTimers[roomid].isTimeUp = true;
        setTimeout(async () => {
          if (!this.roomTimers[roomid].lock) {
            onTargetAchieved();
          }
        }, 2000);
      });
    }
  }

  hasTimer(roomid: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.roomTimers, roomid);
  }

  // Initialize timer
  initTimer(roomid: string, io: Server, socket: Socket) {
    if (this.roomTimers[roomid]) return;

    const timer = new Timer();
    const timerLobby = new Timer();

    this.roomTimers[roomid] = {
      countdownTimer: timer,
      countdownTimerLobby: timerLobby,
      id: roomid,
      lock: false,
      isTimeUp: false,
    };

    this.addTimerEventListeners(timerLobby, roomid, io, async () => {
      this.roomTimers[roomid].isTimeUp = false;
      this.startTimer(roomid);
      await updateRoomCycle(roomid);
    });

    this.addTimerEventListeners(timer, roomid, io, async () => {
      this.stopTimer(roomid);
      io.to(roomid).emit("CHAMPION_SELECTED", true);
      await selectUserChampion(roomid, null);
      const cycle = await updateRoomCycle(roomid);

      await switchTurn(roomid, cycle);
      this.resetTimer(roomid);
    });

    this.monitorRoomStatus(roomid);
  }

  // Remaining functions such as startLobbyTimer, startTimer, deleteTimer, stopTimer, resetTimer, etc.
  startLobbyTimer(roomid: string) {
    if (!this.roomTimers[roomid]) return;
    this.roomTimers[roomid].countdownTimerLobby.start({
      countdown: true,
      startValues: { seconds: Number(process.env.LOBBY_TIME) || 20 },
    });
  }

  startTimer(roomid: string) {
    if (!this.roomTimers[roomid]) return;
    this.roomTimers[roomid].countdownTimer.start({
      countdown: true,
      startValues: { seconds: Number(process.env.START_TIME) || 15 },
    });
  }

  deleteTimer(roomid: string) {
    if (this.roomTimers[roomid]?.countdownTimer) {
      this.roomTimers[roomid].countdownTimer.stop();
      delete this.roomTimers[roomid];
    }
  }

  stopTimer(roomid: string) {
    if (!this.roomTimers[roomid]) return;
    this.roomTimers[roomid].countdownTimer.stop();
  }

  resetTimer(roomid: string) {
    if (!this.roomTimers[roomid]) return;
    this.roomTimers[roomid].countdownTimer.reset();
    this.roomTimers[roomid].isTimeUp = false;
  }

  isTimeUp(roomid: string) {
    if (!this.roomTimers[roomid]) return false;
    return this.roomTimers[roomid].isTimeUp;
  }

  lockRoomTimer(roomid: string) {
    if (this.roomTimers[roomid]) {
      this.roomTimers[roomid].lock = true;
    }
  }

  unlockRoomTimer(roomid: string) {
    if (this.roomTimers[roomid]) {
      this.roomTimers[roomid].lock = false;
    }
  }

  cancelServerSelection(roomid: string) {
    console.log("cancelServerSelection - roomid:", roomid);
    if (this.roomTimers[roomid]?.timerId) {
      clearTimeout(this.roomTimers[roomid].timerId);
    }
  }
}
