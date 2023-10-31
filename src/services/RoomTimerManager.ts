import { Timer } from "easytimer.js";
import { Server } from "socket.io";
import selectChampion from "../utils/champions";
import { updateRoomCycle } from "../utils/roomCycle";
import { switchTurn } from "../utils/switchTeam";
import { delay } from '../utils/delay';
import supabase from "../supabase";

interface RoomTimer {
  countdownTimer: Timer;
  countdownTimerLobby: Timer;
  id: string;
  lock: boolean;
  timerId?: NodeJS.Timeout;
  isTimeUp: boolean;
  targetAchievedTimeout?: NodeJS.Timeout;
}

class RoomTimerManager {
  private static instance: RoomTimerManager;
  private roomTimers: Record<string, RoomTimer> = {};

  public static getInstance(): RoomTimerManager {
    if (!RoomTimerManager.instance) {
      RoomTimerManager.instance = new RoomTimerManager();
    }
    return RoomTimerManager.instance;
  }

  public async monitorRoomStatus(roomId: string): Promise<void> {
    let status = await this.getRoomStatus(roomId);
    while (status !== null && status !== 'done') {
      await delay(5000);
      status = await this.getRoomStatus(roomId);
    }
    if (status === null || status === 'done') {
      console.log(`Deleting timer for room ${roomId}`);
      this.stopTimer(roomId);
      this.deleteTimer(roomId);
    }
  }

  private async getRoomStatus(roomId: string): Promise<string | null> {
    const { data: room } = await supabase
      .from('rooms')
      .select('status')
      .eq('id', roomId)
      .single();
    return room ? room.status : null;
  }

  public listTimers(): Record<string, RoomTimer> {
    return this.roomTimers;
  }

  private addTimerEventListeners(
    timer: Timer,
    roomId: string,
    io: Server,
    onTimerTargetAchieved?: () => Promise<void>,
  ): void {
    
    timer.addEventListener("secondsUpdated", () => {
      const timeValues = timer.getTimeValues();
      const formattedTime = `${String(timeValues.minutes).padStart(2, '0')}:${String(timeValues.seconds).padStart(2, '0')}`;
      io.to(roomId).emit("TIMER", formattedTime);
    });

    timer.addEventListener("targetAchieved", async () => {
      const roomTimer = this.roomTimers[roomId];
      if (!roomTimer) return;

      roomTimer.targetAchievedTimeout = setTimeout(async () => {
        roomTimer.isTimeUp = true;
        if (!roomTimer.lock && onTimerTargetAchieved) {
          await onTimerTargetAchieved();
        }
      }, 2000);
    });
  }

  public hasTimer(roomId: string): boolean {
    return roomId in this.roomTimers;
  }

  public initTimer(roomId: string, io: Server): void {
    if (this.roomTimers[roomId]) {
      console.log(`Timer for room ${roomId} already exists. Skipping initialization.`);
      return;
    }

    const timer = new Timer();
    const timerLobby = new Timer();

    this.roomTimers[roomId] = {
      countdownTimer: timer,
      countdownTimerLobby: timerLobby,
      id: roomId,
      lock: false,
      isTimeUp: false,
    };

    this.addTimerEventListeners(this.roomTimers[roomId].countdownTimerLobby, roomId, io, async () => {
      this.roomTimers[roomId].isTimeUp = false;
      console.log(`Lobby timer target achieved for room ${roomId}`);
      await this.startTimer(roomId);
      await updateRoomCycle(roomId);
      this.roomTimers[roomId].countdownTimerLobby.stop();
    });

    this.addTimerEventListeners(this.roomTimers[roomId].countdownTimer, roomId, io, async () => {
      this.stopTimer(roomId);
      io.to(roomId).emit("CHAMPION_SELECTED", true);
      await selectChampion(null, roomId, null);
      const cycle = await updateRoomCycle(roomId);
      await switchTurn(roomId, cycle);
      this.resetTimer(roomId);
    });

    this.monitorRoomStatus(roomId);
  }

  public async startLobbyTimer(roomId: string): Promise<void> {
    const roomStatus = await this.getRoomStatus(roomId);
    if (roomStatus !== 'planning') {
      console.log(`Room ${roomId} is not in planning status. Skipping lobby timer start.`);
      return;
    }

    const roomTimer = this.roomTimers[roomId];
    if (roomTimer) {
      this.stopTimer(roomId); // Ensure the main timer is stopped before starting the lobby timer
      roomTimer.countdownTimerLobby.start({
        countdown: true,
        startValues: { seconds: Number(process.env.LOBBY_TIME) || 20 },
      });
      console.log(`Lobby timer started for room ${roomId}`);
    }
  }

  public async startTimer(roomId: string): Promise<void> {
    const roomTimer = this.roomTimers[roomId];
    if (roomTimer) {
      this.stopLobbyTimer(roomId); // Ensure the lobby timer is stopped before starting the main timer
      roomTimer.countdownTimer.start({
        countdown: true,
        startValues: { seconds: Number(process.env.START_TIME) || 15 },
      });
      console.log(`Main timer started for room ${roomId}`);
    }
  }

  public deleteTimer(roomId: string): void {
    const roomTimer = this.roomTimers[roomId];
    if (roomTimer) {
      roomTimer.countdownTimer.stop();
      delete this.roomTimers[roomId];
    }
  }

  public stopTimer(roomId: string): void {
    const roomTimer = this.roomTimers[roomId];
    if (roomTimer) {
      roomTimer.countdownTimer.stop();
    }
  }

  public stopLobbyTimer(roomId: string): void {
    const roomTimer = this.roomTimers[roomId];
    if (roomTimer) {
      roomTimer.countdownTimerLobby.stop();
      console.log(`Lobby timer stopped for room ${roomId}`);
    }
  }

  public resetTimer(roomId: string): void {
    const roomTimer = this.roomTimers[roomId];
    if (roomTimer) {
      roomTimer.countdownTimer.reset();
      roomTimer.isTimeUp = false;
    }
  }

  public isTimeUp(roomId: string): boolean {
    const roomTimer = this.roomTimers[roomId];
    return roomTimer ? roomTimer.isTimeUp : false;
  }

  public lockRoomTimer(roomId: string): void {
    const roomTimer = this.roomTimers[roomId];
    if (roomTimer) {
      roomTimer.lock = true;
    }
  }
  
  public unlockRoomTimer(roomId: string): void {
    const roomTimer = this.roomTimers[roomId];
    if (roomTimer) {
      roomTimer.lock = false;
    }
  }

  public cancelServerSelection(roomId: string): void {
    console.log('cancelServerSelection - roomId:', roomId);
    const roomTimer = this.roomTimers[roomId];
    if (roomTimer?.timerId) {
      clearTimeout(roomTimer.timerId);
    }
  }

  public cancelTargetAchieved(roomId: string): void {
    const roomTimer = this.roomTimers[roomId];
    if (roomTimer && roomTimer.targetAchievedTimeout) {
      clearTimeout(roomTimer.targetAchievedTimeout);
      roomTimer.isTimeUp = false;  // Reset the time-up flag if necessary
      console.log(`Target achieved cancelled for room ${roomId}`);
    }
  }
}

export { RoomTimerManager };
