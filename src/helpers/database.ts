import supabase from '../supabase';
import { Data, Hero, RoomData, TeamData } from '../types/global';
import supabaseQuery from '../helpers/supabaseQuery';

const getRoomData = async (roomID: string) => {
  return await supabaseQuery<RoomData>(
    'rooms',
    (q) => q.select('id, status, cycle, heroes_pool').eq('id', roomID).single(),
    'Error fetching room data'
  );
};

const getActiveTeamData = async (roomID: string) => {
  return await supabaseQuery<TeamData>(
    'teams',
    (q) =>
      q
        .select('id, isturn, heroes_selected, heroes_ban, clicked_hero')
        .eq('room', roomID)
        .eq('isturn', true)
        .single(),
    'Error fetching team data'
  );
};

export const getActiveTeamWithRoom = async (
  roomID: string
): Promise<Data | null> => {
  try {
    const roomData = await getRoomData(roomID);
    const teamData = await getActiveTeamData(roomID);

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

const updateDatabase = async (
  roomId: string,
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
