import supabase from '../../supabase';
import { setDonePhase } from './phaseHandler';
import sleep from '../../helpers/sleep';

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

type Room = {
  room_id: string;
  cycle: number;
};

export async function updateTurn(room: Room) {
  try {
    if (room.cycle === 16) {
      sleep(3000);
      await setDonePhase(room.room_id);
      return
    }
    const turn = turnSequence.find(turn => { return turn.cycle === room.cycle + 1 });

    if (turn) {
      // Begin transaction for updating room and teams
      const { error: updateRoomError } = await supabase
        .from('rooms')
        .update({ status: turn.phase, cycle: turn.cycle })
        .eq('id', room.room_id)

      if (updateRoomError) {
        throw new Error(`Error updating room: ${updateRoomError.message}`);
      }

      const { error: updateTurnError } = await supabase
        .from('teams')
        .update({ isturn: true, nb_turn: 1, canSelect: true })
        .eq('room', room.room_id)
        .eq('color', turn.teamColor);

      if (updateTurnError) {
        throw new Error(`Error updating team turn: ${updateTurnError.message}`);
      }
    }
  } catch (error) {
    console.error("Error in updateTurn:", error);
  }
}
