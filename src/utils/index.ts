import RoomTimerManager from '../services/RoomTimerManager';
import supabase from '../supabase';
import { pickChampion } from './actions/pickChampion';
import { banChampion } from './actions/banChampion';
import { updateTurn } from './handlers/draftHandler';
import sleep from '../helpers/sleep';

interface Team {
  id: number;
  isturn: boolean;
  clicked_hero: string | null;
}

interface Room {
  id: number;
  status: string;
  cycle: number;
  blue: Team;
  red: Team;
}

const EndActionTrigger = async (roomID: string, roomTimerManager: RoomTimerManager, userTrigger?: boolean) => {
  roomTimerManager.cancelTargetAchieved(roomID);

  if (roomTimerManager.isLocked(roomID)) {
    console.log('Room is locked');
    return;
  }

  roomTimerManager.lockRoom(roomID);
  roomTimerManager.stopTimer(roomID);

  await supabase.from('teams').update({ canSelect: false }).eq('room', roomID);

  try {
    const { data, error } = await supabase
      .rpc('get_active_team_with_room', { room_id_param: roomID })

    if (error) {
      console.error('Error fetching room with active team:', error);
      return;
    }

    const activeTeam = data[0]

    switch (activeTeam.status) {
      case 'ban':
        await banChampion(activeTeam, userTrigger);
        break;
      case 'select':
        await pickChampion(activeTeam);
        break;
      default:
        // Do nothing
        break;
    }

    await supabase.from('teams').update({ isturn: false, nb_turn: 0, clicked_hero: null }).eq('id', activeTeam.team_id);

    await sleep(2000);

    await updateTurn(activeTeam);

    await sleep(1000);

    roomTimerManager.unlockRoom(roomID);
    roomTimerManager.startTimer(roomID);
    roomTimerManager.resetTimer(roomID);

  } catch (error) {
    console.error('Error in EndActionTrigger:', error);
  }
};

export { EndActionTrigger };
