import supabase from "../supabase";

export async function switchTurn(roomId: string, roomCycle: number) {
  if (!roomCycle) {
    console.error("Room cycle not available");
    return;
  }

  const { data: teams, error: teamFetchError } = await supabase
  .from("teams")
  .select("*, room(id, cycle, status)")
  .eq("room", roomId);

  if (teamFetchError || !teams || teams.length === 0) {
    console.error('Error fetching teams or no teams found:', teamFetchError);
    return 'No teams found';
  }

  //resetTimer(roomId);

  const value = shouldSwitchTurn(roomCycle);

  if (!value) {
    return false;
  } else if (value === 'done') {
    // set room status to done
    await supabase
      .from('rooms')
      .update({ status: 'done' })
      .eq('id', roomId);
    
    await supabase.from('teams').update({ isTurn: false }).eq('room', roomId);
    
    return 'done';
  }

  const updatePromises = teams.map((team: any) => 
    supabase
      .from("teams")
      .update({ isTurn: !team.isTurn })
      .eq("id", team.id)
  );

  await Promise.all(updatePromises);

  return true
}

function shouldSwitchTurn(cycle: number) {
  if (cycle === 1 || cycle === 3 || cycle === 5 || cycle === 7 || cycle === 9) {
    return true; // Switch turns
  } else if (cycle >= 10) {
    return 'done'; // All rounds completed
  } else {
    return false; // Continue with the same team's turn
  }
}