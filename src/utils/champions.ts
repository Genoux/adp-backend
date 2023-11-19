import supabase from '../supabase';

type Hero = {
  id: string;
  name: string | null;
  selected?: boolean;
};

const actionFunctionMapping = {
  ban: 'heroes_ban',
  select: 'heroes_selected',
};

const getHeroFromPool = (heroes_pool: Hero[], heroName: string | null) => {
  const hero = heroName
    ? heroes_pool.find((h) => h.name === heroName)
    : undefined;
  if (hero?.selected) throw new Error('Hero already selected');
  return hero;
};

const updateHeroSelectionInPool = (heroes_pool: Hero[], hero?: Hero) =>
  heroes_pool.map((h) =>
    h.name === hero?.name ? { ...h, selected: true } : h
  );

const updateTeamHeroSelection = (heroes: Hero[], hero?: Hero) => {
  const index = heroes.findIndex((h) => !h.selected);
  if (index !== -1)
    heroes[index] = {
      id: hero?.id || '',
      name: hero?.name || null,
      selected: true,
    };
};

async function selectChampion(roomid: string, selectedChampion: string | null) {
  const teamResponse = await supabase
    .from('teams')
    .select('id, isturn, heroes_selected, heroes_ban, clicked_hero, nb_turn')
    .eq('room', roomid)
    .eq('isturn', true)
    .single();
  const roomResponse = await supabase
    .from('rooms')
    .select('id, status, heroes_pool')
    .eq('id', roomid)
    .single();

  if (!teamResponse.data || !roomResponse.data) return;
  const team = teamResponse.data;
  const room = roomResponse.data;

  const action = room.status === 'ban' ? 'ban' : 'select';
  const heroesAction =
    action === 'ban' ? team.heroes_ban : team.heroes_selected;

  // Update clicked_hero to null right after retrieving the data
  await supabase.from('teams').update({ clicked_hero: null }).eq('id', team.id);

  // If action is 'select' and no champion is selected, pick a random one
  const hero = selectedChampion
    ? getHeroFromPool(room.heroes_pool, selectedChampion)
    : action === 'select'
      ? getRandomUnselectedHero(room.heroes_pool)
      : undefined;

  // Update hero selection in the team
  updateTeamHeroSelection(heroesAction, hero);

  // Update heroes pool
  const updatedHeroesPool = updateHeroSelectionInPool(room.heroes_pool, hero);

  // Update team in the database
  await supabase
    .from('teams')
    .update({
      [actionFunctionMapping[action]]: heroesAction,
      nb_turn: team.nb_turn - 1,
    })
    .eq('id', team.id);

  // Update room in the database
  await supabase
    .from('rooms')
    .update({ heroes_pool: updatedHeroesPool })
    .eq('id', roomid);
}

function getRandomUnselectedHero(heroes_pool: Hero[]): Hero | undefined {
  const unselectedHeroes = heroes_pool.filter((hero) => !hero.selected);
  if (unselectedHeroes.length === 0) return undefined;
  const randomIndex = Math.floor(Math.random() * unselectedHeroes.length);
  return unselectedHeroes[randomIndex];
}

export { selectChampion };
