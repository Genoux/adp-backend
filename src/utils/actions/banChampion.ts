import { updateDatabase } from '../database';
import { getHeroFromPool, updateHeroSelectionInPool, updateTeamHeroSelection } from '../heroes';
import { Data, Hero } from '../../types/global';

/**
 * Bans a champion for the team in the specified room.
 * @param roomId - The ID of the room.
 * @param userTrigger - The trigger flag indicating whether to ban the clicked hero.
 */
const banChampion = async (data: Data, userTrigger?: boolean) => {
  try {
    
    let finalSelectedHero: Hero | undefined | null = null;
    if (!userTrigger && !data.clicked_hero) {
      finalSelectedHero = null;
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
