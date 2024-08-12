import supabaseQuery from '../../helpers/supabaseQuery';
import RoomTimerManager from '../../services/RoomTimerManager';
import { setDonePhase } from '../../utils/handlers/phaseHandler';
import { Database } from '../../types/supabase';

type Room = Database['public']['Tables']['rooms']['Row'];
type Team = Database['public']['Tables']['teams']['Row'];

export const turnSequence = [
  { phase: 'ban', teamColor: 'blue', cycle: 1 },
  { phase: 'ban', teamColor: 'red', cycle: 2 },
  { phase: 'ban', teamColor: 'blue', cycle: 3 },
  { phase: 'ban', teamColor: 'red', cycle: 4 },
  { phase: 'ban', teamColor: 'blue', cycle: 5 },
  { phase: 'ban', teamColor: 'red', cycle: 6 },
  { phase: 'select', teamColor: 'blue', cycle: 7 },
  { phase: 'select', teamColor: 'red', cycle: 8 },
  { phase: 'select', teamColor: 'red', cycle: 9 },
  { phase: 'select', teamColor: 'blue', cycle: 10 },
  { phase: 'select', teamColor: 'blue', cycle: 11 },
  { phase: 'select', teamColor: 'red', cycle: 12 },
  { phase: 'select', teamColor: 'red', cycle: 13 },
  { phase: 'select', teamColor: 'blue', cycle: 14 },
  { phase: 'select', teamColor: 'blue', cycle: 15 },
  { phase: 'select', teamColor: 'red', cycle: 16 },
];

export async function syncUserTurn(roomid: number) {
  try {
    await supabaseQuery<Room[]>(
      'teams',
      (q) => q.update({ can_select: true }).eq('room_id', roomid).eq('is_turn', true),
      'Error fetching teams data in draftHandler.ts'
    );

    if (RoomTimerManager.getInstance().isLocked(roomid)) {
      console.log('Room is locked, unlocking...');
      RoomTimerManager.getInstance().unlockRoom(roomid);
    }
  } catch (error) {
    console.error('Error in syncTurn:', error);
  }
}

export async function updateTurn(room: Room) {
  try {
    if (room.cycle === 16) {
      // Using cycle 17 to change the UI when the game ends but it's not done view yet
      await supabaseQuery<Room[]>(
        'rooms',
        (q) => q.update({ cycle: '17'}).eq('id', room.id),
        'Error updating room cycle in updateTurn.ts'
      );
      await setDonePhase(room.id);
      return;
    }
    const turn = turnSequence.find((turn) => {
      return turn.cycle === room.cycle + 1;
    });

    if (turn) {
      await supabaseQuery<Room[]>(
        'rooms',
        (q) =>
          q
            .update({ status: turn.phase, cycle: turn.cycle })
            .eq('id', room.id),
        'Error fetching rooms data in draftHandler.ts'
      );

      const otherColor = turn.teamColor === 'blue' ? 'red' : 'blue';
      await supabaseQuery<Team[]>(
        'teams',
        (q) =>
          q
            .update({ is_turn: true, can_select: true })
            .eq('room_id', room.id)
            .eq('color', turn.teamColor),
        'Error updating turn for active team in updateTurnAndRestartTimer.ts'
      );
      await supabaseQuery<Team[]>(
        'teams',
        (q) =>
          q
            .update({ is_turn: false })
            .eq('room_id', room.id)
            .eq('color', otherColor),
        'Error updating turn for inactive team in updateTurnAndRestartTimer.ts'
      );
    }
  } catch (error) {
    console.error('Error in updateTurn:', error);
  }
}
