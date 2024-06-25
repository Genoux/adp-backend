import { updateDatabase } from '../../helpers/database';
import { Data, DraftAction, Hero } from '../../types/global';

// Helper Functions
const getRandomUnselectedHero = (heroesPool: Hero[]): Hero | null => {
  const unselectedHeroes = heroesPool.filter((hero) => hero && !hero.selected);
  if (unselectedHeroes.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * unselectedHeroes.length);
  return unselectedHeroes[randomIndex];
};

const getHeroFromPool = (
  heroesPool: Hero[],
  heroName: string | null
): Hero | null => {
  if (!heroName) return null;
  const hero = heroesPool.find((h) => h && h.id === heroName);
  return hero?.selected ? null : hero ?? null;
};

const updateHeroSelectionInPool = (
  heroesPool: Hero[],
  hero: Hero | null
): Hero[] =>
  heroesPool.map((h) => {
    if (h === null) return null;
    return {
      ...h,
      selected: h.id === hero?.id ? true : h.selected,
      id: h.id === hero?.id ? hero?.id ?? null : h.id,
      name: h.name,
    };
  });

const updateTeamHeroSelection = (heroes: Hero[], hero?: Hero): void => {
  const index = heroes.findIndex((h) => h !== null && !h.selected);
  if (index !== -1) {
    heroes[index] = {
      id: hero?.id || null,
      name: hero?.name || null,
      selected: true,
    };
  }
};

// Main Function
export const selectChampion = async (
  data: Data,
  action: DraftAction
): Promise<void> => {
  try {
    let finalSelectedHero: Hero | null = null;

    if (data.clicked_hero) {
      finalSelectedHero = getHeroFromPool(data.heroes_pool, data.clicked_hero);
    } else if (action === 'select') {
      finalSelectedHero = getRandomUnselectedHero(data.heroes_pool);
    }

    const heroList = action === 'ban' ? data.heroes_ban : data.heroes_selected;
    updateTeamHeroSelection(heroList, finalSelectedHero);

    const updatedHeroesPool = updateHeroSelectionInPool(
      data.heroes_pool,
      finalSelectedHero
    );
    await updateDatabase(
      data.room_id,
      data.team_id,
      data.heroes_selected,
      data.heroes_ban,
      updatedHeroesPool
    );
  } catch (error) {
    console.error(`Error in ${action.toLowerCase()}Champion:`, error);
  }
};
