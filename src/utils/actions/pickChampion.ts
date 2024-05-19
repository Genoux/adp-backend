import { updateDatabase } from '../database';
import { getHeroFromPool, updateHeroSelectionInPool, updateTeamHeroSelection } from '../heroes';

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
  nb_turn: number;
};

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
