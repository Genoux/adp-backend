import supabase from "../supabase";
import { resetTimer, deleteTimer } from "./timer";

export async function updateRoomCycle(roomId: string) {
  const { data: room, error: fetchError } = await supabase
  .from("rooms")
  .select("*")
  .eq("id", roomId)
  .single();

  if (fetchError || !room) {
    console.error('Error fetching room:', fetchError);
    return;
  }

  if (room.status === 'done') {
    deleteTimer(roomId);
    return;
  }

  const currentCycle = room.cycle;
  const newCycle = currentCycle + 1;

  const { error: updateError } = await supabase
  .from('rooms')
  .update({ cycle: newCycle })
  .eq('id', roomId);

  if (updateError) {
    console.error('Error updating room:', updateError);
    return;
  }

  return currentCycle;
}
