import { Timer } from 'easytimer.js';
import { Server } from 'socket.io';
import supabase from '../supabase';
import { selectChampion } from '../utils/champions';
import { updateRoomCycle } from '../utils/roomCycle';
import { switchTurn } from '../utils/switchTeam';

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

  public listTimers(): Record<string, RoomTimer> {
    return { ...this.roomTimers };
  }

  public deleteTimer(roomId: string): void {
    if (this.hasTimer(roomId)) {
      delete this.roomTimers[roomId];
    }
  }

  private addTimerEventListeners(
    timer: Timer,
    roomId: string,
    io: Server,
    onTimerTargetAchieved?: () => Promise<void>
  ): void {
    timer.addEventListener('secondsUpdated', () =>
      this.handleSecondsUpdated(timer, roomId, io)
    );
    timer.addEventListener('targetAchieved', () =>
      this.handleTargetAchieved(roomId, onTimerTargetAchieved)
    );
  }

  private handleSecondsUpdated(timer: Timer, roomId: string, io: Server): void {
    const timeValues = timer.getTimeValues();
    const formattedTime = `${String(timeValues.minutes).padStart(
      2,
      '0'
    )}:${String(timeValues.seconds).padStart(2, '0')}`;
    io.to(roomId).emit('TIMER', formattedTime);
  }

  private async handleTargetAchieved(
    roomId: string,
    onTimerTargetAchieved?: () => Promise<void>
  ): Promise<void> {
    const roomTimer = this.roomTimers[roomId];
    if (!roomTimer) return;

    roomTimer.targetAchievedTimeout = setTimeout(async () => {
      roomTimer.isTimeUp = true;
      if (!roomTimer.lock && onTimerTargetAchieved) {
        await onTimerTargetAchieved();
      }
    }, 2000);
  }

  public hasTimer(roomId: string): boolean {
    return roomId in this.roomTimers;
  }

  public initTimer(roomId: string, io: Server): void {
    if (this.hasTimer(roomId)) {
      console.log(
        `Timer for room ${roomId} already exists. Skipping initialization.`
      );
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

    this.addTimerEventListeners(timerLobby, roomId, io, async () => {
      const roomTimer = this.roomTimers[roomId];
      if (roomTimer) {
        roomTimer.isTimeUp = false;
        console.log(`Lobby timer target achieved for room ${roomId}`);
        await this.startTimer(roomId);
        await updateRoomCycle(roomId);
        roomTimer.countdownTimerLobby.stop();
      }
    });

    this.addTimerEventListeners(timer, roomId, io, async () => {
      this.stopTimer(roomId);
      await selectChampion(roomId, null);
      const cycle = await updateRoomCycle(roomId);
      if (!cycle) return;
      await switchTurn(roomId, cycle);
      this.resetTimer(roomId);
    });
  }

  public async startLobbyTimer(roomId: string): Promise<void> {
    const roomTimer = this.roomTimers[roomId];
    if (roomTimer) {
      this.stopTimer(roomId); // Ensure the main timer is stopped before starting the lobby timer
      roomTimer.countdownTimerLobby.start({
        countdown: true,
        startValues: { seconds: Number(process.env.LOBBY_TIME) || 20 },
      });
    }
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

  public isTimeUp(roomId: string): boolean {
    const roomTimer = this.roomTimers[roomId];
    return roomTimer ? roomTimer.isTimeUp : false;
  }

  public cancelTargetAchieved(roomId: string): void {
    const roomTimer = this.roomTimers[roomId];
    if (roomTimer && roomTimer.targetAchievedTimeout) {
      clearTimeout(roomTimer.targetAchievedTimeout);
    }
  }

  public resetTimer(roomId: string): void {
    const roomTimer = this.roomTimers[roomId];
    if (roomTimer) {
      roomTimer.countdownTimer.reset();
    }
  }

  public stopTimer(roomId: string): void {
    const roomTimer = this.roomTimers[roomId];
    if (roomTimer) {
      roomTimer.countdownTimer.stop();
    }
  }

  public startTimer(roomId: string): void {
    const roomTimer = this.roomTimers[roomId];
    if (roomTimer) {
      roomTimer.countdownTimer.start({
        countdown: true,
        startValues: { seconds: Number(process.env.START_TIME) || 30 },
      });
    }
  }
}

export default RoomTimerManager;
