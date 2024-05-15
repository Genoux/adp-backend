import RoomTimerManager from '../services/RoomTimerManager';
import { Server } from 'socket.io';
import supabase from '../supabase';
import { selectChampion } from './actions/selectChampion';
import { handlePhase, nextTurn } from './actions/turnHandler';

const EndUserTurn = async (roomId: string, io: Server, roomTimerManager: RoomTimerManager, trigger: boolean) => {
  try {
    roomTimerManager.lockRoomTimer(roomId);
    roomTimerManager.stopTimer(roomId);
    await selectChampion(roomId, trigger);
    // await supabase.from('teams').update({ clicked_hero: null, isturn: false, nb_turn: 0 }).eq('room', roomId);
    await nextTurn(roomId);
    await handlePhase(roomId, io, roomTimerManager);
    roomTimerManager.resetTimer(roomId);
    io.to(roomId).emit('TIMER_RESET', true);

    roomTimerManager.unlockRoomTimer(roomId);

  } catch (error) {
    console.error('Error in performTimerActions:', error);
    throw error; // Ensure the caller knows an error occurred
  }
};

export { EndUserTurn };
