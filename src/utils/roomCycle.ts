import RoomTimerManager from '../services/RoomTimerManager';
import supabase from '../supabase';

const RoomStatus = {
  BAN: 'ban',
  SELECT: 'select',
  DONE: 'done',
};

export async function updateRoomCycle(roomId: string): Promise<number | undefined> {
  const roomTimerManager = RoomTimerManager.getInstance();
  const defaultCycle = 0;

  const { data: room, error: fetchError } = await supabase
  .from('rooms')
  .select('cycle, status')
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

  const newCycle = room.cycle + 1;
  const newStatus = newCycle === 1 ? RoomStatus.BAN : newCycle === 7 ? RoomStatus.SELECT : room.status;

  const { error: updateError } = await supabase
    .from('rooms')
    .update({ cycle: newCycle, status: newStatus })
    .eq('id', roomId);

  if (updateError) {
    console.error('Error updating room:', updateError);
    return room.cycle || defaultCycle;
  }

  return room.cycle;
}
