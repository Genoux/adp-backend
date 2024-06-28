//TODO: Clean to not use custom Data type

import supabase from '../supabase';
import { Database } from '../types/supabase';
import { Data } from '../types/global';
import supabaseQuery from '../helpers/supabaseQuery';

type Room = Database['public']['Tables']['rooms']['Row'];
type Team = Database['public']['Tables']['teams']['Row'];
type Hero = Database["public"]["CompositeTypes"]["hero"];

const getRoomData = async (roomID: number) => {
  return await supabaseQuery<Room>(
    'rooms',
    (q) => q.select('id, status, cycle, heroes_pool').eq('id', roomID).single(),
    'Error fetching room data'
  );
};

const getActiveTeamData = async (roomID: number) => {
  return await supabaseQuery<Team>(
    'teams',
    (q) =>
      q
        .select('id, is_turn, heroes_selected, heroes_ban')
        .eq('room_id', roomID)
        .eq('is_turn', true)
        .single(),
    'Error fetching team data'
  );
};

export const getActiveTeamWithRoom = async (
  roomID: number
): Promise<Data | null> => {
  try {
    const roomData = await getRoomData(roomID);
    const teamData = await getActiveTeamData(roomID);

    return {
      room_id: roomData.id,
      status: roomData.status,
      cycle: roomData.cycle,
      team_id: teamData.id,
      is_turn: teamData.is_turn,
      heroes_pool: roomData.heroes_pool as Hero[],
      heroes_selected: teamData.heroes_selected as Hero[],
      heroes_ban: teamData.heroes_ban as Hero[],
    };
  } catch (error) {
    console.error('Error in getActiveTeamWithRoom:', (error as Error).message);
    return null;
  }
};

const updateDatabase = async (
  roomId: number,
  teamId: number,
  heroesSelected: Hero[],
  heroesBan: Hero[],
  updatedHeroesPool: Hero[]
) => {
  const { error: teamError } = await supabase
    .from('teams')
    .update({
      heroes_selected: heroesSelected,
      heroes_ban: heroesBan,
    })
    .eq('id', teamId);

  if (teamError) {
    throw new Error(`Error updating team: ${teamError.message}`);
  }

  const { error: roomError } = await supabase
    .from('rooms')
    .update({ heroes_pool: updatedHeroesPool })
    .eq('id', roomId);

  if (roomError) {
    throw new Error(`Error updating room: ${roomError.message}`);
  }
};

export { updateDatabase };
