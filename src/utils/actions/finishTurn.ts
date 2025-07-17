import { getRoomData, getTeamData } from '../../helpers/database';
import supabaseQuery from '../../helpers/supabaseQuery';
import RoomTimerManager from '../../services/RoomTimerManager';
import { Database } from '../../types/supabase';
import { selectChampion } from '../../utils/actions/selectChampion';
import { updateTurn } from '../../utils/handlers/draftHandler';

type Hero = Database['public']['CompositeTypes']['hero'];
type Team = Database['public']['Tables']['teams']['Row'] & {
  heroes_ban: Hero[];
  heroes_selected: Hero[];
};

const finishTurn = async (
  roomID: number,
  roomTimerManager: RoomTimerManager
) => {
  // Cancel any pending timeout first
  roomTimerManager.cancelTargetAchieved(roomID);
  
  // Try to atomically lock the room - if it fails, another operation is in progress
  if (!roomTimerManager.tryLockRoom(roomID)) {
    console.log('Room is locked or being processed, skipping turn finish');
    return;
  }

  try {
    // Disable selection for all teams in this room
    await supabaseQuery<Team[]>(
      'teams',
      (q) => q.update({ can_select: false }).eq('room_id', roomID),
      'Error updating can_select in endActionTrigger.ts'
    );

    roomTimerManager.stopTimer(roomID);

    const data = {
      room: await getRoomData(roomID),
      team: await getTeamData(roomID),
    };

    if (!data) {
      console.log('No active team found');
      return;
    }

    const championSelected = await selectChampion(data.room, data.team);
    if (championSelected) {
      await updateTurn(data.room);
    }

  } catch (error) {
    console.error('Error in EndActionTrigger:', (error as Error).message);
  } finally {
    // Always unlock the room, even if there was an error
    roomTimerManager.unlockRoom(roomID);
  }
};

export default finishTurn;
