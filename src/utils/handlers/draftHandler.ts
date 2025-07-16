import supabaseQuery from '../../helpers/supabaseQuery';
import { executeTurnUpdateTransaction, TurnUpdateTransaction } from '../../helpers/transactionWrapper';
import RoomTimerManager from '../../services/RoomTimerManager';
import { Database } from '../../types/supabase';
import { setDonePhase } from '../../utils/handlers/phaseHandler';

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
      (q) =>
        q
          .update({ can_select: true })
          .eq('room_id', roomid)
          .eq('is_turn', true),
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
        (q) => q.update({ cycle: '17' }).eq('id', room.id),
        'Error updating room cycle in updateTurn.ts'
      );
      await setDonePhase(room.id);
      return;
    }
    
    const turn = turnSequence.find((turn) => {
      return turn.cycle === room.cycle + 1;
    });

    if (!turn) {
      console.error(`No turn found for cycle ${room.cycle + 1}`);
      return;
    }

    const otherColor = turn.teamColor === 'blue' ? 'red' : 'blue';
    
    // Create transaction object
    const transaction: TurnUpdateTransaction = {
      roomUpdate: {
        id: room.id,
        status: turn.phase,
        cycle: turn.cycle
      },
      activeTeamUpdate: {
        roomId: room.id,
        color: turn.teamColor,
        is_turn: true,
        can_select: true
      },
      inactiveTeamUpdate: {
        roomId: room.id,
        color: otherColor,
        is_turn: false
      }
    };

    // Execute transaction
    await executeTurnUpdateTransaction(transaction);
    console.log(`Turn updated successfully for room ${room.id}, cycle ${turn.cycle}`);
    
  } catch (error) {
    console.error('Error in updateTurn:', error);
    throw error; // Re-throw to let caller handle the error
  }
}
