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

  roomTimerManager.lockRoom(roomId);
  roomTimerManager.stopTimer(roomId);
  await supabase.from('teams').update({ canSelect: false }).eq('room', roomId)
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

    await supabase.from('teams').update({ isturn: false, nb_turn: 0, clicked_hero: null }).eq('room', roomId)

    // Will update the turn and cycle and user actions
    const turn = await updateTurn(roomId);
    console.log("EndActionTrigger - turn:", turn);
    if (turn === undefined) {
      await sleep(3000);
      await setDonePhase(roomId);
      return;
    }

    roomTimerManager.resetTimer(roomId);
    roomTimerManager.unlockRoom(roomId);

  } catch (error) {
    console.error('Error in performTimerActions:', error);
    throw error; // Ensure the caller knows an error occurred
  }
};

export { EndActionTrigger };
