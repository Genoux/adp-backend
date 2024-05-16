import { fetchTeamAndRoomData, updateDatabase } from '../database';
import { getHeroFromPool, updateHeroSelectionInPool, updateTeamHeroSelection } from '../heroes';

const pickChampion = async (roomId: string) => {
  try {
    const data = await fetchTeamAndRoomData(roomId);
    if (!data) return;

    const { team, room } = data;

    const finalSelectedHero = getHeroFromPool(room.heroes_pool, team.clicked_hero);

    updateTeamHeroSelection(team.heroes_selected, finalSelectedHero);
    const updatedHeroesPool = updateHeroSelectionInPool(room.heroes_pool, finalSelectedHero);

    await updateDatabase(roomId, team.id, team.heroes_selected, team.heroes_ban, updatedHeroesPool);
  } catch (error) {
    console.error('Error in pickChampion:', error);
  }
};

export { pickChampion };
