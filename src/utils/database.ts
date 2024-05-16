import supabase from '../supabase';
import { Hero } from './heroes';

const fetchTeamAndRoomData = async (roomId: string) => {
  const [teamResponse, roomResponse] = await Promise.all([
    supabase
      .from('teams')
      .select('id, isturn, heroes_selected, heroes_ban, clicked_hero, nb_turn')
      .eq('room', roomId)
      .eq('isturn', true)
      .single(),
    supabase
      .from('rooms')
      .select('id, heroes_pool')
      .eq('id', roomId)
      .single(),
  ]);

  if (teamResponse.error || roomResponse.error) {
    console.error('Error fetching data:', teamResponse.error || roomResponse.error);
    return null;
  }

  return {
    team: teamResponse.data,
    room: roomResponse.data,
  };
};

const updateDatabase = async (
  roomId: string,
  teamId: string,
  heroesSelected: Hero[],
  heroesBan: Hero[],
  updatedHeroesPool: Hero[],
) => {
  const { error: teamError } = await supabase
    .from('teams')
    .update({
      heroes_selected: heroesSelected,
      heroes_ban: heroesBan,
      nb_turn: 0,
      isturn: false,
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

export { fetchTeamAndRoomData, updateDatabase };

