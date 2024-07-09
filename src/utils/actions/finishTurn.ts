import { getRoomData, getTeamData } from '../../helpers/database';
import supabaseQuery from '../../helpers/supabaseQuery';
import RoomTimerManager from '../../services/RoomTimerManager';
import { Database } from '../../types/supabase';
import { selectChampion } from '../../utils/actions/selectChampion';
import { updateTurn } from '../../utils/handlers/draftHandler';

type Hero = Database["public"]["CompositeTypes"]["hero"];
type Team = Database['public']['Tables']['teams']['Row'] & {
  heroes_ban: Hero[];
  heroes_selected: Hero[];
};

const finishTurn = async (
  roomID: number,
  roomTimerManager: RoomTimerManager
) => {
  await supabaseQuery<Team[]>(
    'teams',
    (q) => q.update({ can_select: false }).eq('room_id', roomID),
    'Error updating can_select in endActionTrigger.ts'
  );

  roomTimerManager.cancelTargetAchieved(roomID);
  if (roomTimerManager.isLocked(roomID)) {
    console.log('Room is locked');
    return;
  }

  roomTimerManager.lockRoom(roomID);
  roomTimerManager.stopTimer(roomID);

  try {

    const data = {
      room: await getRoomData(roomID),
      team: await getTeamData(roomID),
    }

    if (!data) {
      console.log('No active team found');
      return;
    }

    await selectChampion(data.room, data.team);
    await updateTurn(data.room);

    roomTimerManager.unlockRoom(roomID);

  } catch (error) {
    console.error('Error in EndActionTrigger:', (error as Error).message);
  }
};

export default finishTurn;
