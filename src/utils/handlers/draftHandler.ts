import supabase from '../../supabase';

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

export async function updateTurn(roomId: string) {
  try {
    // Update teams to reset isturn and nb_turn
    const { error: updateTeamsError } = await supabase
      .from('teams')
      .update({ isturn: false, nb_turn: 0, canSelect: false})
      .eq('room', roomId);
    
    if (updateTeamsError) {
      throw new Error(`Error updating teams: ${updateTeamsError.message}`);
    }

    // Get the current cycle for the room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('cycle')
      .eq('id', roomId)
      .single();

    if (roomError) {
      throw new Error(`Error fetching room: ${roomError.message}`);
    }

    if (room) {
      // Find the next turn in the sequence
      const turn = turnSequence.find(turn => turn.cycle === room.cycle + 1);

      if (turn) {
        // Begin transaction for updating room and teams
        const { error: updateRoomError } = await supabase
          .from('rooms')
          .update({ status: turn.phase, cycle: turn.cycle })
          .eq('id', roomId)
          .single();

        if (updateRoomError) {
          throw new Error(`Error updating room: ${updateRoomError.message}`);
        }

        const { error: updateTurnError } = await supabase
          .from('teams')
          .update({ isturn: true, nb_turn: 1, canSelect: true })
          .eq('room', roomId)
          .eq('color', turn.teamColor);

        if (updateTurnError) {
          throw new Error(`Error updating team turn: ${updateTurnError.message}`);
        }

        return turn;
      }
    }
  } catch (error) {
    console.error("Error in updateTurn:", error);
  }
}
