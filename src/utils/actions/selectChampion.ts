import { updateDatabase } from '../../helpers/database';
import { Data, DraftAction, Hero } from '../../types/global';

const getRandomUnselectedHero = (heroesPool: Hero[]): Hero | null => {
  const unselectedHeroes = heroesPool.filter((hero) => hero && !hero.selected);
  if (unselectedHeroes.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * unselectedHeroes.length);
  return unselectedHeroes[randomIndex];
};

const updateHeroInList = (heroList: Hero[], action: DraftAction, heroesPool: Hero[]): Hero | null => {
  const index = heroList.findIndex((h) => h !== null && !h.selected);
  if (index === -1) return null;

  const currentHero = heroList[index];
  if (!currentHero) return null;

  let updatedHero: Hero = { ...currentHero, selected: true };

  if (action === 'ban') {
    updatedHero = {
      id: currentHero.id,
      name: currentHero.name,
      selected: true
    };
  } else if (action === 'select' && heroList[index]?.id === null) {
    const randomHero = getRandomUnselectedHero(heroesPool);
    if (randomHero) {
      updatedHero = { ...randomHero, selected: true };
    }
  }

  heroList[index] = updatedHero;
  return updatedHero;
};

const updateHeroSelectionInPool = (heroesPool: Hero[], selectedHero: Hero | null): Hero[] => {
  return heroesPool.map((hero) =>
    hero && hero.id === selectedHero?.id
      ? { ...hero, selected: true }
      : hero
  );
};

export const selectChampion = async (
  data: Data,
  action: DraftAction
): Promise<void> => {
  try {
    const heroList = action === 'ban' ? data.heroes_ban : data.heroes_selected;
    const updatedHero = updateHeroInList(heroList, action, data.heroes_pool);

    if (updatedHero) {
      const updatedHeroesPool = updateHeroSelectionInPool(data.heroes_pool, updatedHero);

      await updateDatabase(
        data.room_id,
        data.team_id,
        data.heroes_selected,
        data.heroes_ban,
        updatedHeroesPool
      );
      
    } else {
      console.log(`No hero updated for ${action} action`);
    }
  } catch (error) {
    console.error(`Error in ${action.toLowerCase()}Champion:`, error);
  }
};