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
  if (roomTimerManager.isLocked(roomId)) {
    console.log(`EndActionTrigger already in progress for room ${roomId}`);
    return;
  }

  roomTimerManager.lockRoom(roomId);
  roomTimerManager.cancelTargetAchieved(roomId);
  roomTimerManager.stopTimer(roomId);
  await supabase.from('teams').update({ canSelect: false }).eq('room', roomId);
  
  try {
    const { data: room, error } = await supabase.from('rooms').select('status, cycle').eq('id', roomId).single();

    if (error) {
      console.error('Error fetching room data:', error);
      return;
    }
    if (!room) {
      console.error('Room not found:', roomId);
      return;
    }

    await sleep(2000);

    if (room.status === 'ban') {
      await banChampion(roomId, userTrigger);
    } else {
      await pickChampion(roomId);
    }

    await supabase.from('teams').update({ isturn: false, nb_turn: 0, clicked_hero: null }).eq('room', roomId);

    const turn = await updateTurn(roomId);
    console.log("EndActionTrigger - turn:", turn);
    if (turn === undefined) {
      await sleep(3000);
      await setDonePhase(roomId);
      return;
    }

    roomTimerManager.resetTimer(roomId);
  } catch (error) {
    console.error('Error in EndActionTrigger:', error);
  } finally {
    roomTimerManager.unlockRoom(roomId);
  }
};

export { EndActionTrigger };
