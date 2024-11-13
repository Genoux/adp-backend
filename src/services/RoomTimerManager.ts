import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { Timer } from 'easytimer.js';
import { Server } from 'socket.io';
import supabaseQuery from '../helpers/supabaseQuery';
import supabase from '../supabase';
import { Database } from '../types/supabase';
import finishTurn from '../utils/actions/finishTurn';
import { setDraftPhase } from '../utils/handlers/phaseHandler';

type RoomPayload = RealtimePostgresChangesPayload<Room>;
type Room = Database['public']['Tables']['rooms']['Row'];

interface RoomState {
  countdownTimer: Timer;
  countdownTimerLobby: Timer;
  targetAchievedTimeout?: NodeJS.Timeout;
  id: string;
  isLocked: boolean;
}

function randomUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class RoomTimerManager {
  private static instance: RoomTimerManager;
  private roomStates: Map<number, RoomState> = new Map();
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

  public getInspectorState(): Array<{
    roomId: number;
    countdownTimer: { isRunning: boolean; timeLeft: string };
    countdownTimerLobby: { isRunning: boolean; timeLeft: string };
    isLocked: boolean;
  }> {
    return Array.from(this.roomStates).map(([roomId, state]) => ({
      roomId,
      countdownTimer: {
        isRunning: state.countdownTimer.isRunning(),
        timeLeft: state.countdownTimer.getTimeValues().toString()
      },
      countdownTimerLobby: {
        isRunning: state.countdownTimerLobby.isRunning(),
        timeLeft: state.countdownTimerLobby.getTimeValues().toString()
      },
      isLocked: state.isLocked,
      id: state.id
    }));
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

  public subscribeToRoomChanges(): void {
    supabase
      .channel('room_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
        },
        (payload: RoomPayload) => {
          const room = payload.new as Room;
          if (payload.eventType === 'INSERT') {
            this.initializeRoomTimer(room);
            console.log(`Initialized timer for new room ${room.id}`);
          } else if (payload.eventType === 'UPDATE') {
            this.handleRoomStatusChange(room);
          } else if (payload.eventType === 'DELETE') {
            this.deleteTimer(payload.old.id as number);
            console.log(`Room ${payload.old.id} deleted`);
          }
          this.emitTimerUpdate();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to room changes');
        } else {
          console.error('Error subscribing to room changes:', status);
        }
      });
  }

  private emitTimerUpdate(): void {
    if (!this.io) return;
    const roomStates = this.getInspectorState();
    this.io.emit('timerUpdate', { roomStates });
  }

  private handleRoomStatusChange(room: Room): void {
    switch (room.status) {
      case 'planning':
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

  public listTimers(): Map<number, RoomState> {
    return new Map(this.roomStates);
  }

  public deleteTimer(roomId: number): void {
    this.roomStates.delete(roomId);
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
    const formattedTime = `${String(timeValues.minutes).padStart(
      2,
      '0'
    )}:${String(timeValues.seconds).padStart(2, '0')}`;
    this.io.to(roomId.toString()).emit('TIMER', formattedTime);

    this.emitTimerUpdate();
  }

  public updateInspector(): void {
    this.emitTimerUpdate();
  }

  private async handleTargetAchieved(
    roomId: number,
    onTimerTargetAchieved?: () => Promise<void>
  ): Promise<void> {
    const roomState = this.roomStates.get(roomId);
    if (!roomState || !onTimerTargetAchieved) return;

    roomState.targetAchievedTimeout = setTimeout(onTimerTargetAchieved, 2000);
  }

  public hasTimer(roomId: number): boolean {
    return this.roomStates.has(roomId);
  }

  public getTimer(roomId: number): RoomState | undefined {
    return this.roomStates.get(roomId);
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
    this.roomStates.set(roomId, {
      countdownTimer: timer,
      countdownTimerLobby: timerLobby,
      id: randomUUID(),
      isLocked: false,
    });

    this.addTimerEventListeners(timerLobby, roomId, () =>
      setDraftPhase(roomId)
    );
    this.addTimerEventListeners(timer, roomId, () => finishTurn(roomId, this));
  }

  public startLobbyTimer(roomId: number): void {
    const roomState = this.roomStates.get(roomId);
    if (roomState) {
      roomState.countdownTimerLobby.start({
        countdown: true,
        startValues: { seconds: Number(process.env.LOBBY_TIME) || 20 },
      });
    }
  }

  public startTimer(roomId: number): void {
    const roomState = this.roomStates.get(roomId);
    if (roomState) {
      roomState.countdownTimer.start({
        countdown: true,
        startValues: { seconds: Number(process.env.START_TIME) || 30 },
      });
    }
  }

  public cancelTargetAchieved(roomId: number): void {
    const roomState = this.roomStates.get(roomId);
    if (roomState?.targetAchievedTimeout) {
      clearTimeout(roomState.targetAchievedTimeout);
    }
  }

  public resetTimer(roomId: number): void {
    this.roomStates.get(roomId)?.countdownTimer.reset();
    this.updateInspector();
  }

  public resetLobbyTimer(roomId: number): void {
    this.roomStates.get(roomId)?.countdownTimerLobby.reset();
    this.updateInspector();
  }

  public stopTimer(roomId: number): void {
    this.roomStates.get(roomId)?.countdownTimer.stop();
    this.updateInspector();
  }

  public stopLobbyTimer(roomId: number): void {
    this.roomStates.get(roomId)?.countdownTimerLobby.stop();
    this.updateInspector();
  }

  public lockRoom(roomId: number): void {
    const roomState = this.roomStates.get(roomId);
    if (roomState) {
      roomState.isLocked = true;
      this.updateInspector();
    }
  }

  public unlockRoom(roomId: number): void {
    const roomState = this.roomStates.get(roomId);
    if (roomState) {
      roomState.isLocked = false;
      this.updateInspector();
    }
  }

  public isLocked(roomId: number): boolean {
    return this.roomStates.get(roomId)?.isLocked || false;
  }
}

export default RoomTimerManager;