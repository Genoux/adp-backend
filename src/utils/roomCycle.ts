import supabase from "../supabase";
import { resetTimer, deleteTimer } from "./timer";

export async function updateRoomCycle(roomId: string) {
  console.log("updateRoomCycle - roomId:", roomId);
  console.log('Updating room cycle...for room:', roomId);
  const { data: room, error: fetchError } = await supabase
  .from("rooms")
  .select("*")
  .eq("id", roomId)
  .single();

  if (fetchError || !room) {
    console.error('Error fetching room:', fetchError);
    return;
  }

  console.log("Fetched room cycle:", room.cycle);

  const currentCycle = room.cycle;
  const newCycle = currentCycle + 1;
  console.log("updateRoomCycle - newCycle:", newCycle);

  const { error: updateError } = await supabase
  .from('rooms')
  .update({ cycle: newCycle })
  .eq('id', roomId);

  if (updateError) {
    console.error('Error updating room:', updateError);
    return;
  }

  console.log('Room cycle updated:', { currentCycle, newCycle });

  return { currentCycle, newCycle };
}

export async function switchTurnAndUpdateCycle(roomId: string) {
  console.log('Switching turn and updating cycle...');

  const roomCycle = await updateRoomCycle(roomId);

  if (!roomCycle) {
    console.error("Room cycle not available");
    return;
  }

  console.log('Room cycle:', roomCycle);

  const { currentCycle } = roomCycle;

  const { data: teams, error: teamFetchError } = await supabase
  .from("teams")
  .select("*, room(id, cycle, status)")
  .eq("room", roomId);

  if (teamFetchError || !teams || teams.length === 0) {
    console.error('Error fetching teams or no teams found:', teamFetchError);
    return 'No teams found';
  }

  resetTimer(roomId);

  const value = shouldSwitchTurn(currentCycle);

  if (!value) {
    console.log('Continuing same team turn');
    return 'continue same team turn';
  } else if (value === 'done') {
    // set room status to done
    console.log('All rounds completed');
    deleteTimer(roomId);
    await supabase
      .from('rooms')
      .update({ status: 'done' })
      .eq('id', roomId);
    
    return 'done';
  }

  const updatePromises = teams.map((team: any) => 
    supabase
      .from("teams")
      .update({ isTurn: !team.isTurn })
      .eq("id", team.id)
  );

  await Promise.all(updatePromises);

  console.log('Turns switched');
}

function shouldSwitchTurn(cycle: number) {
  console.log("Checking if should switch turn - cycle:", cycle);
  if (cycle === 1 || cycle === 3 || cycle === 5 || cycle === 7 || cycle === 9) {
    console.log('Switching turns');
    return true; // Switch turns
  } else if (cycle >= 10) {
    return 'done'; // All rounds completed
  } else {
    console.log('Continuing same team turn');
    return false; // Continue with the same team's turn
  }
}
