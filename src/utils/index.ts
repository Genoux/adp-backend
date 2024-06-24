import RoomTimerManager from '../services/RoomTimerManager';
import supabase from '../supabase';
import { pickChampion } from './actions/pickChampion';
import { banChampion } from './actions/banChampion';
import { updateTurn } from './handlers/draftHandler';
import { Data } from '../types/global';

const fetchRoomData = async (roomID: string) => {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, status, cycle, heroes_pool')
    .eq('id', roomID)
    .single();
  if (error) throw new Error(`Error fetching room data: ${error.message}`);
  return data;
};

const fetchActiveTeamData = async (roomID: string) => {
  const { data, error } = await supabase
    .from('teams')
    .select('id, isturn, heroes_selected, heroes_ban, clicked_hero')
    .eq('room', roomID)
    .eq('isturn', true)
    .single();
  if (error) throw new Error(`Error fetching team data: ${error.message}`);
  return data;
};

const getActiveTeamWithRoom = async (roomID: string): Promise<Data | null> => {
  try {
    const roomData = await fetchRoomData(roomID);
    const teamData = await fetchActiveTeamData(roomID);

    return {
      room_id: roomData.id,
      status: roomData.status,
      cycle: roomData.cycle,
      heroes_pool: roomData.heroes_pool,
      team_id: teamData.id,
      isturn: teamData.isturn,
      heroes_selected: teamData.heroes_selected,
      heroes_ban: teamData.heroes_ban,
      clicked_hero: teamData.clicked_hero,
    };
  } catch (error) {
    console.error('Error in getActiveTeamWithRoom:', (error as Error).message);
    return null;
  }
};

const endAction = async (activeTeam: Data, userTrigger?: boolean) => {
  switch (activeTeam.status) {
    case 'ban':
      await banChampion(activeTeam, userTrigger);
      break;
    case 'select':
      await pickChampion(activeTeam);
      break;
    default:
      break;
  }
  await supabase.from('teams').update({ clicked_hero: null }).eq('room', activeTeam.room_id);
};

const updateTurnAndRestartTimer = async (roomID: string, turn: { teamColor: string }, roomTimerManager: RoomTimerManager) => {
  const otherColor = turn.teamColor === 'blue' ? 'red' : 'blue';

  await supabase.from('teams').update({ isturn: true, canSelect: true }).eq('room', roomID).eq('color', turn.teamColor);
  await supabase.from('teams').update({ isturn: false }).eq('room', roomID).eq('color', otherColor);

  roomTimerManager.startTimer(roomID);
  roomTimerManager.resetTimer(roomID);
};

const EndActionTrigger = async (roomID: string, roomTimerManager: RoomTimerManager, userTrigger?: boolean) => {
  await supabase.from('teams').update({ canSelect: false }).eq('room', roomID);

  roomTimerManager.cancelTargetAchieved(roomID);

  if (roomTimerManager.isLocked(roomID)) {
    console.log('Room is locked');
    return;
  }

  roomTimerManager.lockRoom(roomID);
  roomTimerManager.stopTimer(roomID);

  try {
    const activeTeam = await getActiveTeamWithRoom(roomID);

    if (!activeTeam) {
      console.log('No active team found');
      return;
    }

    await endAction(activeTeam, userTrigger);

    const turn = await updateTurn(activeTeam);
    roomTimerManager.unlockRoom(roomID);

    if (turn) {
      await updateTurnAndRestartTimer(roomID, turn, roomTimerManager);
    }
  } catch (error) {
    console.error('Error in EndActionTrigger:', (error as Error).message);
  }
};

export { EndActionTrigger };
