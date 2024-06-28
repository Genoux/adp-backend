import supabaseQuery from '../helpers/supabaseQuery';
import supabase from '../supabase';
import { Database } from '../types/supabase';
import finishTurn from '../utils/actions/finishTurn';
import { setDraftPhase } from '../utils/handlers/phaseHandler';
import { Timer } from 'easytimer.js';
import { Server } from 'socket.io';

type Room = Database['public']['Tables']['rooms']['Row'];

interface RoomTimer {
  countdownTimer: Timer;
  countdownTimerLobby: Timer;
  targetAchievedTimeout?: NodeJS.Timeout;
}

class RoomTimerManager {
  private static instance: RoomTimerManager;
  private roomTimers: Map<number, RoomTimer> = new Map();
  private roomLocks: Map<number, boolean> = new Map();
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
    const rooms = await supabaseQuery<Room[]>(
      'rooms',
      (q) => q.select('*'),
      'Error fetching all rooms in initializeAllRoomTimers'
    );

    rooms?.forEach(this.initializeRoomTimer.bind(this));
  }

  private initializeRoomTimer(room: Room): void {
    this.initTimer(room.id);
    this.handleRoomStatusChange(room);
  }

  public subscribeToNewRooms(): void {
    supabase
      .channel('room_insertions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rooms' },
        (payload: { new: Room }) => {
          const newRoom = payload.new;
          console.log('New room', newRoom.id);
          this.initializeRoomTimer(newRoom);
          console.log(`Initialized timer for new room ${newRoom.id}`);
        }
      )
      .subscribe();
  }

  public subscribeToRoomUpdates(): void {
    supabase
      .channel('room_updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms' },
        (payload: { new: Room }) => {
          const updatedRoom = payload.new;
          this.handleRoomStatusChange(updatedRoom);
        }
      )
      .subscribe();
  }

  private handleRoomStatusChange(room: Room): void {
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

  public listTimers(): Map<number, RoomTimer> {
    return new Map(this.roomTimers);
  }

  public deleteTimer(roomId: number): void {
    this.roomTimers.delete(roomId);
    this.roomLocks.delete(roomId);
  }

  private addTimerEventListeners(
    timer: Timer,
    roomId: number,
    onTimerTargetAchieved?: () => Promise<void>
  ): void {
    timer.addEventListener('secondsUpdated', () =>
      this.handleSecondsUpdated(timer, roomId)
    );
    timer.addEventListener('targetAchieved', () =>
      this.handleTargetAchieved(roomId, onTimerTargetAchieved)
    );
  }

  private handleSecondsUpdated(timer: Timer, roomId: number): void {
    if (!this.io) return;
    const timeValues = timer.getTimeValues();
    const formattedTime = `${String(timeValues.minutes).padStart(2, '0')}:${String(
      timeValues.seconds
    ).padStart(2, '0')}`;
    this.io.to(roomId.toString()).emit('TIMER', formattedTime);
  }

  private async handleTargetAchieved(
    roomId: number,
    onTimerTargetAchieved?: () => Promise<void>
  ): Promise<void> {
    const roomTimer = this.roomTimers.get(roomId);
    if (!roomTimer || !onTimerTargetAchieved) return;

    roomTimer.targetAchievedTimeout = setTimeout(onTimerTargetAchieved, 2000);
  }

  public hasTimer(roomId: number): boolean {
    return this.roomTimers.has(roomId);
  }

  public initTimer(roomId: number): void {
    if (this.hasTimer(roomId)) {
      console.log(
        `Timer for room ${roomId} already exists. Skipping initialization.`
      );
      return;
    }

    const timer = new Timer();
    const timerLobby = new Timer();
    this.roomTimers.set(roomId, {
      countdownTimer: timer,
      countdownTimerLobby: timerLobby,
    });

    this.addTimerEventListeners(timerLobby, roomId, () => setDraftPhase(roomId));
    this.addTimerEventListeners(timer, roomId, () => finishTurn(roomId, this));
  }

  public startLobbyTimer(roomId: number): void {
    const roomTimer = this.roomTimers.get(roomId);
    if (roomTimer) {
      roomTimer.countdownTimerLobby.start({
        countdown: true,
        startValues: { seconds: Number(process.env.LOBBY_TIME) || 20 },
      });
    }
  }

  public startTimer(roomId: number): void {
    const roomTimer = this.roomTimers.get(roomId);
    if (roomTimer) {
      roomTimer.countdownTimer.start({
        countdown: true,
        startValues: { seconds: Number(process.env.START_TIME) || 30 },
      });
    }
  }

  public cancelTargetAchieved(roomId: number): void {
    const roomTimer = this.roomTimers.get(roomId);
    if (roomTimer?.targetAchievedTimeout) {
      clearTimeout(roomTimer.targetAchievedTimeout);
    }
  }

  public resetTimer(roomId: number): void {
    this.roomTimers.get(roomId)?.countdownTimer.reset();
  }

  public resetLobbyTimer(roomId: number): void {
    this.roomTimers.get(roomId)?.countdownTimerLobby.reset();
  }

  public stopTimer(roomId: number): void {
    this.roomTimers.get(roomId)?.countdownTimer.stop();
  }

  public stopLobbyTimer(roomId: number): void {
    this.roomTimers.get(roomId)?.countdownTimerLobby.stop();
  }

  public lockRoom(roomId: number): void {
    this.roomLocks.set(roomId, true);
  }

  public unlockRoom(roomId: number): void {
    this.roomLocks.set(roomId, false);
  }

  public isLocked(roomId: number): boolean {
    return this.roomLocks.get(roomId) || false;
  }
}

export default RoomTimerManager;