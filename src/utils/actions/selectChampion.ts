import { updateDatabase } from '../../helpers/database';
import { Database } from '../../types/supabase';

type Hero = Database["public"]["CompositeTypes"]["hero"];

type Room = Database['public']['Tables']['rooms']['Row'] & {
  heroes_pool: Hero[];
};

type Team = Database['public']['Tables']['teams']['Row'] & {
  heroes_ban: Hero[];
  heroes_selected: Hero[];
};

const getRandomUnselectedHero = (heroesPool: Hero[]): Hero | null => {
  const unselectedHeroes = heroesPool.filter(hero => hero && !hero.selected);
  return unselectedHeroes.length ? unselectedHeroes[Math.floor(Math.random() * unselectedHeroes.length)] : null;
};

const updateHeroLists = (room: Room, team: Team): { updatedRoom: Room, updatedTeam: Team } | null => {
  const heroList = room.status === 'ban' ? team.heroes_ban : team.heroes_selected;
  const index = heroList.findIndex((h: Hero) => h && !h.selected);

  if (index === -1) return null;

  const currentHero = heroList[index];
  if (!currentHero) return null;

  let updatedHero: Hero;

  if (room.status === 'ban') {
    updatedHero = {
      id: currentHero.id,
      name: currentHero.name,
      selected: true
    };
  } else {
    if (currentHero.id) {
      updatedHero = {
        id: currentHero.id,
        name: currentHero.name,
        selected: true
      };
    } else {
      const randomHero = getRandomUnselectedHero(room.heroes_pool);
      if (!randomHero) return null;
      updatedHero = {
        id: randomHero.id,
        name: randomHero.name,
        selected: true
      };
    }
  }

  const updatedHeroesPool = room.heroes_pool.map(hero =>
    (hero && hero.id === updatedHero.id) ? { ...hero, selected: true } : hero
  );

  heroList[index] = updatedHero;

  return {
    updatedRoom: { ...room, heroes_pool: updatedHeroesPool },
    updatedTeam: {
      ...team,
      [room.status === 'ban' ? 'heroes_ban' : 'heroes_selected']: heroList
    }
  };
};

export const selectChampion = async (room: Room, team: Team): Promise<void> => {
  try {
    const result = updateHeroLists(room, team);
    if (result) {
      const { updatedRoom, updatedTeam } = result;
      await updateDatabase(updatedRoom, updatedTeam);
    } else {
      console.log('No hero updated');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};