import { fetchTeamAndRoomData, updateDatabase } from '../database';
import { getHeroFromPool, updateHeroSelectionInPool, updateTeamHeroSelection, getRandomUnselectedHero } from '../heroes';

type Hero = {
  id: string;
  name: string | null;
  selected?: boolean;
};

/**
 * Bans a champion for the team in the specified room.
 * @param roomId - The ID of the room.
 * @param userTrigger - The trigger flag indicating whether to ban the clicked hero.
 */
const banChampion = async (roomId: string, userTrigger?: boolean) => {
  try {
    const data = await fetchTeamAndRoomData(roomId);
    if (!data) return;

    const { team, room } = data;

    let finalSelectedHero: Hero | undefined;
    if (!team.clicked_hero || !userTrigger) {
      finalSelectedHero = getRandomUnselectedHero(room.heroes_pool);
    } else {
      finalSelectedHero = getHeroFromPool(room.heroes_pool, team.clicked_hero);
    }

    updateTeamHeroSelection(team.heroes_ban, finalSelectedHero);
    const updatedHeroesPool = updateHeroSelectionInPool(room.heroes_pool, finalSelectedHero);

    await updateDatabase(roomId, team.id, team.heroes_selected, team.heroes_ban, updatedHeroesPool);
  } catch (error) {
    console.error('Error in banChampion:', error);
  }
};

export { banChampion };
