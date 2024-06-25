import sleep from '@/helpers/sleep';
import supabaseQuery from '@/helpers/supabaseQuery';
import RoomTimerManager from '@/services/RoomTimerManager';
import { RoomData, TeamData } from '@/types/global';
import { setDonePhase } from '@/utils/handlers/phaseHandler';

export const turnSequence = [
  { phase: 'ban', teamColor: 'blue', cycle: 1 },
  { phase: 'ban', teamColor: 'red', cycle: 2 },
  { phase: 'ban', teamColor: 'blue', cycle: 3 },
  { phase: 'ban', teamColor: 'red', cycle: 4 },
  { phase: 'ban', teamColor: 'blue', cycle: 5 },
  { phase: 'ban', teamColor: 'red', cycle: 6 },
  { phase: 'select', teamColor: 'blue', cycle: 7 },
  { phase: 'select', teamColor: 'red', cycle: 8 },
  { phase: 'select', teamColor: 'red', cycle: 9 },
  { phase: 'select', teamColor: 'blue', cycle: 10 },
  { phase: 'select', teamColor: 'blue', cycle: 11 },
  { phase: 'select', teamColor: 'red', cycle: 12 },
  { phase: 'select', teamColor: 'red', cycle: 13 },
  { phase: 'select', teamColor: 'blue', cycle: 14 },
  { phase: 'select', teamColor: 'blue', cycle: 15 },
  { phase: 'select', teamColor: 'red', cycle: 16 },
];

type Room = {
  room_id: string;
  cycle: number;
};

// from the team where room is isturn set conSelect
export async function syncUserTurn(roomid: string, teamid: string) {
  try {
    await supabaseQuery<TeamData[]>(
      'teams',
      (q) => q.update({ canSelect: true }).eq('id', teamid).eq('isturn', true),
      'Error fetching teams data in draftHandler.ts'
    );

    if (RoomTimerManager.getInstance().isLocked(roomid)) {
      console.log('Room is locked, unlocking...');
      RoomTimerManager.getInstance().unlockRoom(roomid);
    }
  } catch (error) {
    console.error('Error in syncTurn:', error);
  }
}

export async function updateTurn(room: Room) {
  try {
    if (room.cycle === 16) {
      await sleep(2000);
      await setDonePhase(room.room_id);
      return;
    }
    const turn = turnSequence.find((turn) => {
      return turn.cycle === room.cycle + 1;
    });

    if (turn) {
      await supabaseQuery<RoomData[]>(
        'rooms',
        (q) =>
          q
            .update({ status: turn.phase, cycle: turn.cycle })
            .eq('id', room.room_id),
        'Error fetching rooms data in draftHandler.ts'
      );

      return turn;
    }
  } catch (error) {
    console.error('Error in updateTurn:', error);
  }
}
