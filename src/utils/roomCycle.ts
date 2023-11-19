import { RoomTimerManager } from '../services/RoomTimerManager';
import supabase from '../supabase';

const RoomStatus = {
  BAN: 'ban',
  SELECT: 'select',
  DONE: 'done',
};

export async function updateRoomCycle(
  roomId: string
): Promise<number | undefined> {
  const roomTimerManager = RoomTimerManager.getInstance();
  const defaultCycle = 0;
  const { data: room, error: fetchError } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  if (fetchError || !room) {
    console.error('Error fetching room:', fetchError);
    return defaultCycle;
  }

  if (room.status === RoomStatus.DONE) {
    roomTimerManager.deleteTimer(roomId);
    return defaultCycle;
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
    return currentCycle || defaultCycle;
  }

  return currentCycle;
}
