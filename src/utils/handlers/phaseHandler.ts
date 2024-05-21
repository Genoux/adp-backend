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

export const setWaitingPhase = async (roomId: string) => {

    const { error: err_rooms } = await supabase.from('rooms').update({ status: 'waiting', ready: false }).eq('id', roomId);
    const { error: err_teams } = await supabase.from('teams').update({ isturn: false, canSelect: false }).eq('room', roomId)
  
    if (err_rooms || err_teams) {
      console.error('Error updating room and team phases:', err_rooms || err_teams);
      throw err_rooms || err_teams;
    }

  RoomTimerManager.getInstance().stopLobbyTimer(roomId);
  RoomTimerManager.getInstance().stopTimer(roomId);
  console.log(`Room ${roomId} status updated to waiting.`);
}

export const setPlanningPhase = async (roomId: string) => {
  RoomTimerManager.getInstance().stopTimer(roomId);

  const { error: err_rooms } = await supabase.from('rooms').update({ status: 'planning', ready: true }).eq('id', roomId);
  const { error: err_teams } = await supabase.from('teams').update({ canSelect: false }).eq('room', roomId)

  if (err_rooms || err_teams) {
    console.error('Error updating room and team phases:', err_rooms || err_teams);
    throw err_rooms || err_teams;
  }

  RoomTimerManager.getInstance().startLobbyTimer(roomId);
  RoomTimerManager.getInstance().resetLobbyTimer(roomId);
  RoomTimerManager.getInstance().unlockRoom(roomId);

  console.log(`Room ${roomId} status updated to planning!`);
}

export async function setDraftPhase(roomId: string): Promise<void> {
  RoomTimerManager.getInstance().stopLobbyTimer(roomId);

  const { error: err_rooms } = await supabase.from('rooms').update({ status: 'ban', cycle: 1, ready: true }).eq('id', roomId);
  const { error: err_teams } = await supabase.from('teams').update({ isturn: true, canSelect: true }).eq('room', roomId).eq('color', 'blue');

  if (err_rooms || err_teams) {
    console.error('Error updating room and team phases:', err_rooms || err_teams);
    throw err_rooms || err_teams;
  }

  RoomTimerManager.getInstance().startTimer(roomId);
  RoomTimerManager.getInstance().resetTimer(roomId);
  console.log(`Room ${roomId} status updated to draft.`);
}

export const setDonePhase = async (roomId: string) => {
  const { error } = await supabase
    .from('rooms')
    .update({ status: 'done', ready: false})
    .eq('id', roomId);

  if (error) {
    console.error('Error updating room phase:', error);
    throw error;
  }
  RoomTimerManager.getInstance().deleteTimer(roomId);
  console.log(`Room ${roomId} status updated to done.`);
}
