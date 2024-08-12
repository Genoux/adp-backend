import sleep from '../../helpers/sleep';
import supabaseQuery from '../../helpers/supabaseQuery';
import RoomTimerManager from '../../services/RoomTimerManager';
import supabase from '../../supabase';
import { Database } from '../../types/supabase';

type Team = Database['public']['Tables']['teams']['Row'];
type Room = Database['public']['Tables']['rooms']['Row'];

export const setWaitingPhase = async (roomId: number) => {
  await supabaseQuery<Room[]>(
    'rooms',
    (q) => q.update({ status: 'waiting', ready: false }).eq('id', roomId),
    'Error fetching rooms data in phaseHandler.ts'
  );

  await supabaseQuery<Team[]>(
    'teams',
    (q) => q.update({ can_select: false }).eq('room_id', roomId),
    'Error fetching teams data in phaseHandler.ts'
  );
};

export const setPlanningPhase = async (roomId: number) => {
  RoomTimerManager.getInstance().stopTimer(roomId);

  await supabaseQuery<Room[]>(
    'rooms',
    (q) => q.update({ status: 'planning', ready: true }).eq('id', roomId),
    'Error fetching rooms data in phaseHandler.ts'
  );

  await supabaseQuery<Team[]>(
    'teams',
    (q) => q.update({ can_select: false }).eq('room_id', roomId),
    'Error fetching teams data in phaseHandler.ts'
  );
};

export async function setDraftPhase(roomId: number): Promise<void> {
  RoomTimerManager.getInstance().stopLobbyTimer(roomId);

  await supabaseQuery<Room[]>(
    'rooms',
    (q) => q.update({ status: 'ban', cycle: 1, ready: true }).eq('id', roomId),
    'Error fetching rooms data in phaseHandler.ts'
  );

  await supabaseQuery<Team[]>(
    'teams',
    (q) =>
      q
        .update({ is_turn: true, can_select: true })
        .eq('room_id', roomId)
        .eq('color', 'blue'),
    'Error fetching teams data blue in phaseHandler.ts'
  );

  await supabaseQuery<Team[]>(
    'teams',
    (q) =>
      q
        .update({ is_turn: false, can_select: false })
        .eq('room_id', roomId)
        .eq('color', 'red'),
    'Error fetching teams data red in phaseHandler.ts'
  );
}

export const setDonePhase = async (roomId: number) => {
  RoomTimerManager.getInstance().stopTimer(roomId);

  await supabase
    .from('teams')
    .update({ is_turn: false, can_select: false, ready: false })
    .eq('room_id', roomId);

  await sleep(3000);

  const { error } = await supabase
    .from('rooms')
    .update({ status: 'done', ready: false })
    .eq('id', roomId);

  if (error) {
    console.error('Error updating room phase:', error);
    throw error;
  }
};
