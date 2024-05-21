import { updateDatabase } from '../database';
import { getHeroFromPool, updateHeroSelectionInPool, updateTeamHeroSelection, getRandomUnselectedHero } from '../heroes';

type Hero = {
  id: string;
  name: string | null;
  selected?: boolean;
};

type Data = {
  room_id: number;
  status: string;
  cycle: number;
  heroes_pool: Hero[];
  team_id: number;
  isturn: boolean;
  heroes_selected: Hero[];
  heroes_ban: Hero[];
  clicked_hero: string | null;
};

/**
 * Bans a champion for the team in the specified room.
 * @param roomId - The ID of the room.
 * @param userTrigger - The trigger flag indicating whether to ban the clicked hero.
 */
const banChampion = async (data: Data, userTrigger?: boolean) => {
  try {
  //  const data = await fetchTeamAndRoomData(roomId);
  //  if (!data) return;

    // const { team, room } = data;
    
    console.log('banChampion data:', data);

    let finalSelectedHero: Hero | undefined;
    if (!data.clicked_hero || !userTrigger) {
      finalSelectedHero = getRandomUnselectedHero(data.heroes_pool);
    } else {
      finalSelectedHero = getHeroFromPool(data.heroes_pool, data.clicked_hero);
    }

    updateTeamHeroSelection(data.heroes_ban, finalSelectedHero);
    const updatedHeroesPool = updateHeroSelectionInPool(data.heroes_pool, finalSelectedHero);

    await updateDatabase(data.room_id, data.team_id, data.heroes_selected, data.heroes_ban, updatedHeroesPool);
  } catch (error) {
    console.error('Error in banChampion:', error);
  }
};

export { banChampion };
