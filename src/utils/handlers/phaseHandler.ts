import supabase from '../../supabase';
import RoomTimerManager from '../../services/RoomTimerManager';

export const getRoomPhase = async (roomId: string) => {
  const { data } = await supabase
    .from('rooms')
    .select('status')
    .eq('id', roomId)
    .single();

  return data?.status;
}

export const syncTimers = async (roomId: string, phase: string) => {
  console.log('Syncing timers for room:', roomId);
  if (phase === 'planning') {
    RoomTimerManager.getInstance().startLobbyTimer(roomId);
  }
  if (phase === 'ban' || phase === 'select') {
    RoomTimerManager.getInstance().stopLobbyTimer(roomId);
    RoomTimerManager.getInstance().startTimer(roomId);
  }
  if (phase === 'done') {
    console.log('Deleting timer for room:', roomId);
    RoomTimerManager.getInstance().deleteTimer(roomId);
  }
}

export const setPlanningPhase = async (roomId: string) => {
  const { error } = await supabase
  .from('rooms')
  .update({ status: 'planning' })
    .eq('id', roomId);
  
    if (error) {
      console.error('Error updating room phase:', error);
      throw error;
    }
  
  RoomTimerManager.getInstance().startLobbyTimer(roomId);
  console.log(`Room ${roomId} status updated to planning.`);
}

export async function setDraft(roomId: string): Promise<void> {
  RoomTimerManager.getInstance().stopLobbyTimer(roomId);
  await supabase
    .from('rooms')
    .update({ status: 'ban', cycle: 1 }).eq('id', roomId);
    RoomTimerManager.getInstance().startTimer(roomId);
}

export const setDonePhase = async (roomId: string) => {
  const { error } = await supabase
    .from('rooms')
    .update({ status: 'done' })
    .eq('id', roomId);

  if (error) {
    console.error('Error updating room phase:', error);
    throw error;
  }
  RoomTimerManager.getInstance().stopTimer(roomId);
  console.log(`Room ${roomId} status updated to done.`);
}
