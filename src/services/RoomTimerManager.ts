import { Timer } from 'easytimer.js';
import { Server } from 'socket.io';
import { setDraftPhase } from '@/utils/handlers/phaseHandler';
import finisTurn from '@/utils/actions/finishTurn';
import supabaseQuery from '@/helpers/supabaseQuery';
import { RoomData } from '@/types/global';
import supabase from '@/supabase';

interface RoomTimer {
  countdownTimer: Timer;
  countdownTimerLobby: Timer;
  id: string;
  targetAchievedTimeout?: NodeJS.Timeout;
  actionTriggered: boolean;
}

class RoomTimerManager {
  private static instance: RoomTimerManager;
  private roomTimers: Record<string, RoomTimer> = {};
  private roomLocks: Record<string, boolean> = {};
  private io: Server | null = null;

  private constructor() {
    // Private constructor, singleton.
  }

  public static getInstance(): RoomTimerManager {
    if (!RoomTimerManager.instance) {
      RoomTimerManager.instance = new RoomTimerManager();
    }
    return RoomTimerManager.instance;
  }

  public setIo(io: Server): void {
    this.io = io;
  }

  public async initializeAllRoomTimers(): Promise<void> {
    const rooms = await supabaseQuery<RoomData[]>(
      'rooms',
      (q) => q.select('*'),
      'Error fetching all rooms in initializeAllRoomTimers'
    );

    if (rooms) {
      for (const room of rooms) {
        this.initializeRoomTimer(room);
      }
    }
  }

  private initializeRoomTimer(room: RoomData): void {
    this.initTimer(room.id);
    this.handleRoomStatusChange(room);
  }

  public subscribeToNewRooms(): void {
    supabase
      .channel('room_insertions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'aram_draft_pick',
          table: 'rooms',
        },
        (payload) => {
          const newRoom = payload.new as RoomData;
          console.log('New room', newRoom.id);
          this.initializeRoomTimer(newRoom);
          console.log(`Initialized timer for new room ${newRoom.id}`);
        }
      )
      .subscribe();

    console.log('Subscribed to new room insertions');
  }

  public subscribeToRoomUpdates(): void {
    supabase
      .channel('room_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'aram_draft_pick',
          table: 'rooms',
        },
        (payload) => {
          const updatedRoom = payload.new as RoomData;
          this.handleRoomStatusChange(updatedRoom);
        }
      )
      .subscribe();

    console.log('Subscribed to room status updates');
  }

  private handleRoomStatusChange(room: RoomData): void {
    console.log('Room status changed');
    switch (room.status) {
      case 'planning':
        this.stopTimer(room.id);
        this.startLobbyTimer(room.id);
        break;
      case 'ban':
      case 'select':
        this.stopLobbyTimer(room.id);
        this.startTimer(room.id);
        break;
      default:
        this.stopLobbyTimer(room.id);
        this.stopTimer(room.id);
    }
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
    onTimerTargetAchieved?: () => Promise<void>
  ): void {
    timer.addEventListener('secondsUpdated', () =>
      this.handleSecondsUpdated(timer, roomId)
    );
    timer.addEventListener('targetAchieved', () =>
      this.handleTargetAchieved(roomId, onTimerTargetAchieved)
    );
  }

  private handleSecondsUpdated(timer: Timer, roomId: string): void {
    if (!this.io) return;
    const timeValues = timer.getTimeValues();
    const formattedTime = `${String(timeValues.minutes).padStart(2, '0')}:${String(timeValues.seconds).padStart(2, '0')}`;
    this.io.to(roomId.toString()).emit('TIMER', formattedTime);
  }

  private async handleTargetAchieved(
    roomId: string,
    onTimerTargetAchieved?: () => Promise<void>,
  ): Promise<void> {
    const roomTimer = this.roomTimers[roomId];
    if (!roomTimer) return;

    if (onTimerTargetAchieved && !roomTimer.actionTriggered) {
      roomTimer.targetAchievedTimeout = setTimeout(async () => {
        await onTimerTargetAchieved();
      }, 2000);
    }
  }

  public hasTimer(roomId: string): boolean {
    return roomId in this.roomTimers;
  }

  public initTimer(roomId: string): void {
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
      actionTriggered: false,
    };

    this.addTimerEventListeners(timerLobby, roomId, async () => {
      await setDraftPhase(roomId);
    });

    this.addTimerEventListeners(timer, roomId, async () => {
      const roomTimer = this.roomTimers[roomId];
      if (roomTimer) {
        roomTimer.actionTriggered = true;
      }
      await finisTurn(roomId, this);
    });
  }

  public startLobbyTimer(roomId: string): void {
    const roomTimer = this.roomTimers[roomId];
    if (roomTimer) {
      roomTimer.countdownTimerLobby.start({
        countdown: true,
        startValues: { seconds: Number(process.env.LOBBY_TIME) || 20 },
      });
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

  public cancelTargetAchieved(roomId: string): void {
    const roomTimer = this.roomTimers[roomId];
    if (roomTimer) {
      clearTimeout(roomTimer.targetAchievedTimeout);
      roomTimer.actionTriggered = false;
    }
  }

  public resetTimer(roomId: string): void {
    const roomTimer = this.roomTimers[roomId];
    if (roomTimer) {
      roomTimer.countdownTimer.reset();
      roomTimer.actionTriggered = false;
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