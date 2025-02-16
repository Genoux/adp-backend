import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { Timer } from 'easytimer.js';
import { Server } from 'socket.io';
import supabaseQuery from '../helpers/supabaseQuery';
import supabase from '../supabase';
import { Database } from '../types/supabase';
import finishTurn from '../utils/actions/finishTurn';
import { setDraftPhase } from '../utils/handlers/phaseHandler';
import RoomLogger from '../helpers/logger';

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
  private logger = RoomLogger.getInstance();

  private constructor() {
    this.logger.system('RoomTimerManager instance created');
  }

  public static getInstance(): RoomTimerManager {
    if (!RoomTimerManager.instance) {
      RoomTimerManager.instance = new RoomTimerManager();
    }
    return RoomTimerManager.instance;
  }

  public setIo(io: Server): void {
    this.logger.system('Setting Socket.IO instance');
    this.io = io;
  }

  public getInspectorState(): Array<{
    roomId: number;
    countdownTimer: { isRunning: boolean; timeLeft: string };
    countdownTimerLobby: { isRunning: boolean; timeLeft: string };
    isLocked: boolean;
    id: string;
  }> {
    const states = Array.from(this.roomStates).map(([roomId, state]) => ({
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
    
    return states;
  }

  public async initializeAllRoomTimers(): Promise<void> {
    this.logger.system('Initializing all room timers...');
    
    const rooms = await supabaseQuery<Room[]>(
      'rooms',
      (q) => q.select('*'),
      'Error fetching all rooms in initializeAllRoomTimers'
    );

    if (rooms?.length) {
      this.logger.system(`Found ${rooms.length} rooms to initialize`);
      rooms.forEach(this.initializeRoomTimer.bind(this));
    } else {
      this.logger.warn(0, 'No rooms found to initialize');
    }
  }

  private initializeRoomTimer(room: Room): void {
    this.initTimer(room.id);
    this.handleRoomStatusChange(room);
    this.logger.success(room.id, 'Room timer initialized');
  }

  public subscribeToRoomChanges(): void {
    this.logger.system('Setting up Supabase room changes subscription');
    
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
            this.logger.info(room.id, 'New room created');
            this.initializeRoomTimer(room);
          } else if (payload.eventType === 'UPDATE') {
            this.logger.info(room.id, `Room updated: ${room.status}`);
            this.handleRoomStatusChange(room);
          } else if (payload.eventType === 'DELETE') {
            this.logger.info(payload.old.id as number, 'Room deleted');
            this.deleteTimer(payload.old.id as number);
          }
          this.emitTimerUpdate();
        }
      )
      .subscribe((status) => {
        this.logger.system(`Supabase subscription status: ${status}`);
      });
  }

  private emitTimerUpdate(): void {
    if (!this.io) {
      this.logger.warn(0, 'No Socket.IO instance available for timer update');
      return;
    }
    const roomStates = this.getInspectorState();
    this.io.emit('timerUpdate', { roomStates });
  }

  private handleRoomStatusChange(room: Room): void {
    this.logger.start(room.id, `Status changing to: ${room.status}`);
    
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

  public deleteTimer(roomId: number): void {
    this.logger.start(roomId, 'Deleting timer');
    this.roomStates.delete(roomId);
    this.logger.success(roomId, 'Timer deleted');
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
    if (!this.io) {
      this.logger.warn(roomId, 'No Socket.IO instance available');
      return;
    }
    
    const timeValues = timer.getTimeValues();
    const formattedTime = `${String(timeValues.minutes).padStart(2,'0')}:${String(timeValues.seconds).padStart(2,'0')}`;
    
    this.io.to(roomId.toString()).emit('TIMER', formattedTime);
    this.emitTimerUpdate();
  }

  private async handleTargetAchieved(
    roomId: number,
    onTimerTargetAchieved?: () => Promise<void>
  ): Promise<void> {
    this.logger.info(roomId, 'Timer target achieved');
    
    const roomState = this.roomStates.get(roomId);
    if (!roomState || !onTimerTargetAchieved) {
      this.logger.warn(roomId, 'No room state or target achieved handler');
      return;
    }

    roomState.targetAchievedTimeout = setTimeout(onTimerTargetAchieved, 2000);
  }

  public initTimer(roomId: number): void {
    if (this.hasTimer(roomId)) {
      this.logger.warn(roomId, 'Timer already exists, skipping initialization');
      return;
    }

    this.logger.start(roomId, 'Initializing timer');
    
    const timer = new Timer();
    const timerLobby = new Timer();
    const newState = {
      countdownTimer: timer,
      countdownTimerLobby: timerLobby,
      id: randomUUID(),
      isLocked: false,
    };
    
    this.roomStates.set(roomId, newState);
    this.logger.info(roomId, `Timer ID: ${newState.id}`);

    this.addTimerEventListeners(timerLobby, roomId, () =>
      setDraftPhase(roomId)
    );
    this.addTimerEventListeners(timer, roomId, () => finishTurn(roomId, this));
    
    this.logger.success(roomId, 'Timer initialized');
  }

  public startLobbyTimer(roomId: number): void {
    this.logger.start(roomId, 'Starting lobby timer');
    
    const roomState = this.roomStates.get(roomId);
    if (roomState) {
      roomState.countdownTimerLobby.start({
        countdown: true,
        startValues: { seconds: Number(process.env.LOBBY_TIME) || 20 },
      });
      this.logger.success(roomId, 'Lobby timer started');
    } else {
      this.logger.error(roomId, 'No room state found');
    }
  }

  public startTimer(roomId: number): void {
    const roomState = this.roomStates.get(roomId);
    if (roomState) {
      roomState.countdownTimer.start({
        countdown: true,
        startValues: { seconds: Number(process.env.START_TIME) || 30 },
      });
    } else {
      this.logger.error(roomId, 'No room state found');
    }
  }

  public cancelTargetAchieved(roomId: number): void {
    this.logger.start(roomId, 'Canceling target achieved timeout');
    
    const roomState = this.roomStates.get(roomId);
    if (roomState?.targetAchievedTimeout) {
      clearTimeout(roomState.targetAchievedTimeout);
      this.logger.success(roomId, 'Target achieved timeout canceled');
    } else {
      this.logger.warn(roomId, 'No target achieved timeout found');
    }
  }

  public resetTimer(roomId: number): void {
    this.roomStates.get(roomId)?.countdownTimer.reset();
    this.updateInspector();
    this.logger.success(roomId, 'Game timer reset');
  }

  public resetLobbyTimer(roomId: number): void {
    this.roomStates.get(roomId)?.countdownTimerLobby.reset();
    this.updateInspector();
    this.logger.success(roomId, 'Lobby timer reset');
  }

  public stopTimer(roomId: number): void {
    this.roomStates.get(roomId)?.countdownTimer.stop();
    this.updateInspector();
  }

  public stopLobbyTimer(roomId: number): void {
    this.roomStates.get(roomId)?.countdownTimerLobby.stop();
    this.updateInspector();
  }

  public hasTimer(roomId: number): boolean {
    return this.roomStates.has(roomId);
  }

  public getTimer(roomId: number): RoomState | undefined {
    return this.roomStates.get(roomId);
  }

  public lockRoom(roomId: number): void {
    this.logger.start(roomId, 'Locking room');
    const roomState = this.roomStates.get(roomId);
    if (roomState) {
      roomState.isLocked = true;
      this.updateInspector();
      this.logger.success(roomId, 'Room locked');
    } else {
      this.logger.error(roomId, 'No room state found');
    }
  }

  public unlockRoom(roomId: number): void {
    this.logger.start(roomId, 'Unlocking room');
    const roomState = this.roomStates.get(roomId);
    if (roomState) {
      roomState.isLocked = false;
      this.updateInspector();
      this.logger.success(roomId, 'Room unlocked');
    } else {
      this.logger.error(roomId, 'No room state found');
    }
  }

  public isLocked(roomId: number): boolean {
    const isLocked = this.roomStates.get(roomId)?.isLocked || false;
    this.logger.info(roomId, `Lock status: ${isLocked}`);
    return isLocked;
  }

  public updateInspector(): void {
    this.emitTimerUpdate();
  }
}

export default RoomTimerManager;