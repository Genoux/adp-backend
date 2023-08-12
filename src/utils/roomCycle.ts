import supabase from "../supabase";
import { RoomTimerManager } from '../services/RoomTimerManager';

export async function updateRoomCycle(roomId: string) {
  const roomTimerManager = RoomTimerManager.getInstance();

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
    roomTimerManager.deleteTimer(roomId);
    return;
  }

  const currentCycle = room.cycle;
  const newCycle = currentCycle + 1;
  let phase = room.status;

  if (newCycle === 1) {
    phase = 'ban';
  } 
  if (newCycle === 7) {
    phase = 'select';
  } 

  const { error: updateError } = await supabase
  .from('rooms')
  .update({ cycle: newCycle, status: phase })
  .eq('id', roomId);

  if (updateError) {
    console.error('Error updating room:', updateError);
    return;
  }

  return currentCycle;
}
