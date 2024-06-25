import supabaseQuery from '@/helpers/supabaseQuery';
import RoomTimerManager from '@/services/RoomTimerManager';
import supabase from '@/supabase';
import { RoomData, TeamData } from '@/types/global';

export const setWaitingPhase = async (roomId: string) => {
  await supabaseQuery<RoomData[]>(
    'rooms',
    (q) => q.update({ status: 'waiting', ready: false }).eq('id', roomId),
    'Error fetching rooms data in phaseHandler.ts'
  );

  await supabaseQuery<TeamData[]>(
    'teams',
    (q) => q.update({ canSelect: false }).eq('room', roomId),
    'Error fetching teams data in phaseHandler.ts'
  );
};

export const setPlanningPhase = async (roomId: string) => {
  RoomTimerManager.getInstance().stopTimer(roomId);

  await supabaseQuery<RoomData[]>(
    'rooms',
    (q) => q.update({ status: 'planning', ready: true }).eq('id', roomId),
    'Error fetching rooms data in phaseHandler.ts'
  );

  await supabaseQuery<TeamData[]>(
    'teams',
    (q) =>
      q.update({ canSelect: false, clicked_hero: null }).eq('room', roomId),
    'Error fetching teams data in phaseHandler.ts'
  );
};

export async function setDraftPhase(roomId: string): Promise<void> {
  RoomTimerManager.getInstance().stopLobbyTimer(roomId);

  await supabaseQuery<RoomData[]>(
    'rooms',
    (q) => q.update({ status: 'ban', cycle: 1, ready: true }).eq('id', roomId),
    'Error fetching rooms data in phaseHandler.ts'
  );

  await supabaseQuery<TeamData[]>(
    'teams',
    (q) =>
      q
        .update({ isturn: true, canSelect: true })
        .eq('room', roomId)
        .eq('color', 'blue'),
    'Error fetching teams data blue in phaseHandler.ts'
  );

  await supabaseQuery<TeamData[]>(
    'teams',
    (q) =>
      q
        .update({ isturn: false, canSelect: false })
        .eq('room', roomId)
        .eq('color', 'red'),
    'Error fetching teams data red in phaseHandler.ts'
  );
}

export const setDonePhase = async (roomId: string) => {
  const { error } = await supabase
    .from('rooms')
    .update({ status: 'done', ready: false })
    .eq('id', roomId);

  if (error) {
    console.error('Error updating room phase:', error);
    throw error;
  }
  //RoomTimerManager.getInstance().deleteTimer(roomId);
};
