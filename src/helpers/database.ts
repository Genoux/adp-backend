import { Database } from '../types/supabase';
import supabaseQuery from '../helpers/supabaseQuery';

type Hero = Database["public"]["CompositeTypes"]["hero"];

type Room = Database['public']['Tables']['rooms']['Row'] & {
    heroes_pool: Hero[];
};

type Team = Database['public']['Tables']['teams']['Row'] & {
    heroes_ban: Hero[];
    heroes_selected: Hero[];
};

export const getRoomData = async (roomID: number) => {
    return await supabaseQuery<Room>(
        'rooms',
        (q) => q.select('id, status, cycle, heroes_pool').eq('id', roomID).single(),
        'Error fetching room data'
    );
};

export const getTeamData = async (roomID: number) => {
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

const updateDatabase = async (room: Room, team: Team): Promise<void> => {
  await supabaseQuery<Room>(
    'rooms',
    (q) => q.update({ heroes_pool: room.heroes_pool }).eq('id', room.id),
    'Error updating rooms data in database.ts'
  );

  await supabaseQuery<Team>(
    'teams',
    (q) => q.update({ 
      heroes_ban: team.heroes_ban, 
      heroes_selected: team.heroes_selected 
    }).eq('id', team.id),
    'Error updating teams data in database.ts'
  );
};

export { updateDatabase };