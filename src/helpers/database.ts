import supabaseQuery from '../helpers/supabaseQuery';
import { Database } from '../types/supabase';

type Hero = Database['public']['CompositeTypes']['hero'];

type Room = Database['public']['Tables']['rooms']['Row'] & {
  heroes_pool: Hero[];
};

type Team = Database['public']['Tables']['teams']['Row'] & {
  heroes_ban: Hero[];
  heroes_selected: Hero[];
};

export const getRoomData = async (roomID: number) => {
  const rooms = await supabaseQuery<Room[]>(
    'rooms',
    (q) => q.select('id, status, cycle, heroes_pool').eq('id', roomID),
    'Error fetching room data'
  );
  
  if (!rooms || rooms.length === 0) {
    throw new Error(`Room ${roomID} not found`);
  }
  
  if (rooms.length > 1) {
    console.warn(`Found ${rooms.length} rooms with ID ${roomID}. Using the first one.`);
  }
  
  return rooms[0];
};

export const getTeamData = async (roomID: number) => {
  const teams = await supabaseQuery<Team[]>(
    'teams',
    (q) =>
      q
        .select('id, is_turn, heroes_selected, heroes_ban')
        .eq('room_id', roomID)
        .eq('is_turn', true),
    'Error fetching team data'
  );
  
  if (!teams || teams.length === 0) {
    throw new Error(`No team with turn found for room ${roomID}`);
  }
  
  if (teams.length > 1) {
    console.warn(`Found ${teams.length} teams with turn for room ${roomID}. Using the first one.`);
  }
  
  return teams[0];
};

const updateDatabase = async (room: Room, team: Team): Promise<void> => {
  await supabaseQuery<Room>(
    'rooms',
    (q) => q.update({ heroes_pool: room.heroes_pool }).eq('id', room.id),
    'Error updating rooms data in database.ts'
  );

  await supabaseQuery<Team>(
    'teams',
    (q) =>
      q
        .update({
          heroes_ban: team.heroes_ban,
          heroes_selected: team.heroes_selected,
        })
        .eq('id', team.id),
    'Error updating teams data in database.ts'
  );
};

export { updateDatabase };
