import supabase from "../supabase";

async function updateRoomCycle(roomId: string): Promise<number | undefined> {
  // Fetch the current cycle value from the database
  const { data: room, error } = await supabase
    .from('rooms')
    .select('cycle')
    .eq('id', roomId)
    .single();

  if (error) {
    console.error('Error fetching room:', error);
    return;
  }

  if (!room) {
    console.error('No room found with id:', roomId);
    return;
  }

  const currentCycle = room.cycle;

  // Calculate the new cycle value
  const newCycle = (currentCycle + 1) % 8;

  // Update the cycle value in your database.
  const { error: updateError } = await supabase
    .from('rooms')
    .update({ cycle: newCycle })
    .eq('id', roomId);

  if (updateError) {
    console.error('Error updating room:', updateError);
    return;
  }

  return newCycle;
}

export { updateRoomCycle };
