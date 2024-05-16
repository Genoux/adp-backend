import RoomTimerManager from '../services/RoomTimerManager';
import supabase from '../supabase';
import { pickChampion } from './actions/pickChampion';
import { banChampion } from './actions/banChampion';
import { updateTurn } from './handlers/draftHandler';
import { setDonePhase } from './handlers/phaseHandler';

const sleep = (milliseconds: number) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};

const EndActionTrigger = async (roomId: string, roomTimerManager: RoomTimerManager, userTrigger?: boolean) => {
  roomTimerManager.cancelTargetAchieved(roomId);
  if (roomTimerManager.isLocked(roomId)) return;
  
  roomTimerManager.lockRoom(roomId);
  roomTimerManager.stopTimer(roomId);
  
  try {
    await supabase.from('teams').update({ canSelect: false }).eq('room', roomId);

    const { data: room, error } = await supabase.from('rooms').select('status, cycle').eq('id', roomId).single();
    if (error) {
      console.error('Error fetching room data:', error);
      return;
    }
    if (!room) {
      console.error('Room not found:', roomId);
      return;
    }

    await sleep(500);

    if (room.status === 'ban') {
      await banChampion(roomId, userTrigger);
    } else {
      await pickChampion(roomId);
    }

    await supabase.from('teams').update({ isturn: false, nb_turn: 0, clicked_hero: null }).eq('room', roomId);

    const turn = await updateTurn(roomId);

    if (turn === 'done') {
      await sleep(3000);
      await setDonePhase(roomId);
      return;
    }

    roomTimerManager.unlockRoom(roomId);
    roomTimerManager.resetTimer(roomId);
   
  } catch (error) {
    console.error('Error in EndActionTrigger:', error);
  }
};

export { EndActionTrigger };
