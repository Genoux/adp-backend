import sleep from '../../helpers/sleep';
import supabaseQuery from '../../helpers/supabaseQuery';
import RoomTimerManager from '../../services/RoomTimerManager';
import { Data } from '../../types/global';
import { setDonePhase } from '../../utils/handlers/phaseHandler';
import { Database } from '../../types/supabase';

type Room = Database['public']['Tables']['rooms']['Row'];

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

export async function updateTurn(room: Data) {
  try {
    if (room.cycle === 16) {
      await setDonePhase(room.room_id);
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
            .eq('id', room.room_id),
        'Error fetching rooms data in draftHandler.ts'
      );

      return turn;
    }
  } catch (error) {
    console.error('Error in updateTurn:', error);
  }
}
