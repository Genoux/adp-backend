import { updateDatabase } from '../database';
import { getHeroFromPool, updateHeroSelectionInPool, updateTeamHeroSelection } from '../heroes';
import { Data } from '../../types/global';

const pickChampion = async (data: Data) => {
  try {

    const finalSelectedHero = getHeroFromPool(data.heroes_pool, data.clicked_hero);

    updateTeamHeroSelection(data.heroes_selected, finalSelectedHero);
    const updatedHeroesPool = updateHeroSelectionInPool(data.heroes_pool, finalSelectedHero);

    await updateDatabase(data.room_id, data.team_id, data.heroes_selected, data.heroes_ban, updatedHeroesPool);
  } catch (error) {
    console.error('Error in pickChampion:', error);
  }
};

export { pickChampion };
