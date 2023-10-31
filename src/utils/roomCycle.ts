import supabase from "../supabase";
import { RoomTimerManager } from '../services/RoomTimerManager';

const RoomStatus = {
  BAN: 'ban',
  SELECT: 'select',
  DONE: 'done'
};

/**
 * Updates the room cycle and status based on the current cycle.
 * @param {string} roomId - The ID of the room to update.
 * @returns {Promise<number | undefined>} The previous cycle number, or undefined if an error occurred.
 */
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

  if (room.status === RoomStatus.DONE) {
    roomTimerManager.deleteTimer(roomId);
    return;
  }

  const { cycle: currentCycle, status } = room;
  const newCycle = currentCycle + 1;
  let newStatus = status;

  if (newCycle === 1) newStatus = RoomStatus.BAN;
  if (newCycle === 7) newStatus = RoomStatus.SELECT;

  const { error: updateError } = await supabase
    .from('rooms')
    .update({ cycle: newCycle, status: newStatus })
    .eq('id', roomId);

  if (updateError) {
    console.error('Error updating room:', updateError);
    return;
  }

  return currentCycle;
}
