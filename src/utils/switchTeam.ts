import RoomTimerManager from '../services/RoomTimerManager';
import supabase from '../supabase';

type Team = {
  id: number;
  isturn: boolean;
  nb_turn: number;
  clicked_hero: string | null;
  room: string;
};

export async function switchTurn(
  roomId: string,
  roomCycle: number
): Promise<{ status: boolean; message?: string }> {
  if (!roomCycle) {
    console.error('Room cycle not available');
    return { status: false, message: 'Room cycle not available' };
  }

  const teams = await fetchTeams(roomId);
  if (!teams || teams.length === 0)
    return { status: false, message: 'No teams found' };

  const currentTeam = teams.find((team) => team.isturn);
  if (!currentTeam) {
    return { status: false, message: 'No team currently has the turn' };
  }

  const shouldSwitch = await shouldSwitchTurn(currentTeam, roomCycle);
  if (!shouldSwitch) return { status: false };

  if (shouldSwitch === 'done') {
    await setRoomStatusToDone(roomId);
    return { status: true, message: 'done' };
  }

  await toggleTeamsTurn(teams);
  await assignNumberOfTurn(roomCycle + 1, roomId);

  return { status: true };
}

async function fetchTeams(roomId: string): Promise<Team[] | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('id, isturn, nb_turn, clicked_hero')
    .eq('room', roomId);

  if (error) {
    console.error('Error fetching teams:', error);
    return null;
  }

  return (data as Team[]) || null;
}

async function shouldSwitchTurn(
  team: Team,
  cycle: number
): Promise<boolean | 'done'> {
  if (cycle >= 16) return 'done'; // Game is done if cycle is 16 or more
  if (team.nb_turn > 0) return false; // If the current team still has turns left, don't switch
  return true; // Switch turns by default if the current team has no turns left
}

async function setRoomStatusToDone(roomId: string) {
  try {
    // Immediately update teams' isturn status to false
    await supabase.from('teams').update({ isturn: false }).eq('room', roomId);

    // Delete the timer immediately
    RoomTimerManager.getInstance().deleteTimer(roomId);
    console.log(`Room ${roomId} is done. Timer deleted.`);

    // Wait for 20 seconds before updating the room's status to "done"
    setTimeout(async () => {
      try {
        // Update room status to "done"
        await supabase
          .from('rooms')
          .update({ status: 'done' })
          .eq('id', roomId);
        console.log(`Room ${roomId} status updated to done.`);
      } catch (error) {
        console.error('Error updating room status to done:', error);
      }
    }, 2000);
  } catch (error) {
    console.error(
      'Error setting room status to done and deleting timer:',
      error
    );
  }
}

async function toggleTeamsTurn(teams: Team[]) {
  const updatePromises = teams.map((team) =>
    supabase
      .from('teams')
      .update({ isturn: !team.isturn, clicked_hero: null })
      .eq('id', team.id)
  );
  await Promise.all(updatePromises);
}

async function assignNumberOfTurn(cycle: number, roomId: string) {
  const nb_turn = determineNumberOfTurns(cycle);

  const { error } = await supabase
    .from('teams')
    .update({ nb_turn })
    .eq('room', roomId)
    .eq('isturn', true);

  if (error) {
    console.error('Error updating number of turns:', error);
  }
}

function determineNumberOfTurns(cycle: number): number {
  const doublePickCycle = [8, 9, 10, 12, 14];
  return doublePickCycle.includes(cycle) ? 2 : 1;
}
