import { Timer } from 'easytimer.js';
import { Server } from 'socket.io';
import { setDraft } from '../utils/handlers/phaseHandler';
import { EndActionTrigger } from '../utils';

interface RoomTimer {
  countdownTimer: Timer;
  countdownTimerLobby: Timer;
  id: string;
  targetAchievedTimeout?: NodeJS.Timeout;
}

class RoomTimerManager {
  private static instance: RoomTimerManager;
  private roomTimers: Record<string, RoomTimer> = {};
  private roomLocks: Record<string, boolean> = {};

  private constructor() {
    // Private constructor, singleton
  }

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
      delete this.roomLocks[roomId];
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
      this.handleTargetAchieved(roomId, onTimerTargetAchieved, io)
    );
  }

  private handleSecondsUpdated(timer: Timer, roomId: string, io: Server): void {
    const timeValues = timer.getTimeValues();
    const formattedTime = `${String(timeValues.minutes).padStart(2, '0')}:${String(timeValues.seconds).padStart(2, '0')}`;
    io.to(roomId).emit('TIMER', formattedTime);
  }

  private async handleTargetAchieved(
    roomId: string,
    onTimerTargetAchieved?: () => Promise<void>,
    io?: Server
  ): Promise<void> {
    const roomTimer = this.roomTimers[roomId];
    if (!roomTimer) return;

    io?.to(roomId).emit('TIMER_FALSE', true);
    if (onTimerTargetAchieved) {
      await onTimerTargetAchieved();
    }
  }

  public hasTimer(roomId: string): boolean {
    return roomId in this.roomTimers;
  }

  public initTimer(roomId: string, io: Server): void {
    if (this.hasTimer(roomId)) {
      console.log(`Timer for room ${roomId} already exists. Skipping initialization.`);
      return;
    }

    const timer = new Timer();
    const timerLobby = new Timer();
    this.roomTimers[roomId] = {
      countdownTimer: timer,
      countdownTimerLobby: timerLobby,
      id: roomId,
    };

    this.addTimerEventListeners(timerLobby, roomId, io, async () => {
      await setDraft(roomId);
    });

    this.addTimerEventListeners(timer, roomId, io, async () => {
      await EndActionTrigger(roomId, this, false);
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

  public resetLobbyTimer(roomId: string): void {
    const roomTimer = this.roomTimers[roomId];
    if (roomTimer) {
      roomTimer.countdownTimerLobby.reset();
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
    }
  }

  public startTimer(roomId: string): void {
    const roomTimer = this.roomTimers[roomId];
    if (roomTimer) {
      this.stopLobbyTimer(roomId); // Ensure the main timer is stopped before starting the lobby timer
      roomTimer.countdownTimer.start({
        countdown: true,
        startValues: { seconds: Number(process.env.START_TIME) || 30 },
      });
    }
  }

  public lockRoom(roomId: string): void {
    this.roomLocks[roomId] = true;
  }

  public unlockRoom(roomId: string): void {
    this.roomLocks[roomId] = false;
  }

  public isLocked(roomId: string): boolean {
    return this.roomLocks[roomId];
  }
}

export default RoomTimerManager;
