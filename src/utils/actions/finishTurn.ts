import { getActiveTeamWithRoom } from '../../helpers/database';
import supabaseQuery from '../../helpers/supabaseQuery';
import RoomTimerManager from '../../services/RoomTimerManager';
import { Data, DraftAction, TeamData } from '../../types/global';
import { selectChampion } from '../../utils/actions/selectChampion';
import { updateTurn } from '../../utils/handlers/draftHandler';

const endAction = async (activeTeam: Data) => {
  await selectChampion(activeTeam, activeTeam.status as DraftAction);
};

const finishTurn = async (
  roomID: string,
  roomTimerManager: RoomTimerManager
) => {
  await supabaseQuery<TeamData[]>(
    'teams',
    (q) => q.update({ can_select: false }).eq('room', roomID),
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
    const activeTeam = await getActiveTeamWithRoom(roomID);
    if (!activeTeam) {
      console.log('No active team found');
      return;
    }

    await endAction(activeTeam);
    const turn = await updateTurn(activeTeam);
    roomTimerManager.unlockRoom(roomID);

    if (turn) {
      const otherColor = turn.teamColor === 'blue' ? 'red' : 'blue';
      await supabaseQuery<TeamData[]>(
        'teams',
        (q) =>
          q
            .update({ is_turn: true, can_select: true, clicked_hero: null })
            .eq('room', roomID)
            .eq('color', turn.teamColor),
        'Error updating turn for active team in updateTurnAndRestartTimer.ts'
      );
      await supabaseQuery<TeamData[]>(
        'teams',
        (q) =>
          q
            .update({ is_turn: false, clicked_hero: null })
            .eq('room', roomID)
            .eq('color', otherColor),
        'Error updating turn for inactive team in updateTurnAndRestartTimer.ts'
      );
    }
  } catch (error) {
    console.error('Error in EndActionTrigger:', (error as Error).message);
  }
};

export default finishTurn;
