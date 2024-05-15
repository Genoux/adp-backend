import supabase from '../../supabase';

type Hero = {
  id: string;
  name: string | null;
  selected?: boolean;
};

type SelectionMode = 'ban' | 'select';

const actionFunctionMapping: Record<SelectionMode, string> = {
  ban: 'heroes_ban',
  select: 'heroes_selected',
};

const getHeroFromPool = (heroesPool: Hero[], heroName: string | null): Hero | undefined => {
  if (!heroName) return getRandomUnselectedHero(heroesPool);
  const hero = heroesPool.find((h) => h.name === heroName);
  if (hero?.selected) {
    console.log("Hero already selected, returning random hero");
    return getRandomUnselectedHero(heroesPool);
  }
  return hero;
};

const updateHeroSelectionInPool = (heroesPool: Hero[], hero?: Hero): Hero[] =>
  heroesPool.map((h) => h.name === hero?.name ? { ...h, selected: true } : h);

const updateTeamHeroSelection = (heroes: Hero[], hero?: Hero) => {
  const index = heroes.findIndex((h) => !h.selected);
  if (index !== -1) {
    heroes[index] = {
      id: hero?.id || '',
      name: hero?.name || null,
      selected: true,
    };
  }
};

const getRandomUnselectedHero = (heroesPool: Hero[]): Hero | undefined => {
  const unselectedHeroes = heroesPool.filter((hero) => !hero.selected);
  if (unselectedHeroes.length === 0) return undefined;
  const randomIndex = Math.floor(Math.random() * unselectedHeroes.length);
  return unselectedHeroes[randomIndex];
};

const fetchTeamAndRoomData = async (roomId: string) => {
  const [teamResponse, roomResponse] = await Promise.all([
    supabase
      .from('teams')
      .select('id, isturn, heroes_selected, heroes_ban, clicked_hero, nb_turn')
      .eq('room', roomId)
      .eq('isturn', true)
      .single(),
    supabase
      .from('rooms')
      .select('id, status, heroes_pool')
      .eq('id', roomId)
      .single(),
  ]);

  if (teamResponse.error || roomResponse.error) {
    console.error('Error fetching data:', teamResponse.error || roomResponse.error);
    return null;
  }

  return {
    team: teamResponse.data,
    room: roomResponse.data,
  };
};

const updateDatabase = async (
  roomId: string,
  teamId: string,
  heroesAction: Hero[],
  updatedHeroesPool: Hero[],
  selectionMode: SelectionMode,
  nbTurn: number
) => {
  await Promise.all([
    supabase
      .from('teams')
      .update({
        [actionFunctionMapping[selectionMode]]: heroesAction,
        nb_turn: nbTurn - 1,
      })
      .eq('id', teamId),
    supabase
      .from('rooms')
      .update({ heroes_pool: updatedHeroesPool })
      .eq('id', roomId),
  ]);
};

const sleep = (milliseconds: number) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};

/**
 * Determines the selected champion based on the clicked hero or sets to a default if none clicked during ban phase.
 * @param clickedHero - The hero clicked by the user.
 * @param heroesPool - The pool of heroes to select from.
 * @param selectionMode - The current selection mode (ban or select).
 * @returns The final selected champion.
 */
const determineSelectedChampion = (clickedHero: string | null, heroesPool: Hero[], selectionMode: SelectionMode, trigger: boolean): Hero | undefined => {
  if (selectionMode === 'ban' && !trigger) {
    return {
      id: '',
      name: null,
      selected: true
    };
  }
  return getHeroFromPool(heroesPool, clickedHero);
};

/**
 * Selects a champion for the team in the specified room.
 * @param roomId - The ID of the room.
 */
const selectChampion = async (roomId: string, trigger: boolean) => {
  try {
    const data = await fetchTeamAndRoomData(roomId);
    
    if (!data) return;

    const { team, room } = data;
    await sleep(1000);
    
    const selectionMode = room.status as SelectionMode;
    const heroesAction = selectionMode === 'ban' ? team.heroes_ban : team.heroes_selected;

    const finalSelectedHero = determineSelectedChampion(team.clicked_hero, room.heroes_pool, selectionMode, trigger);

    // Clear clicked_hero after determining the final selected champion
    await supabase
      .from('teams')
      .update({ clicked_hero: null })
      .eq('id', team.id);

    updateTeamHeroSelection(heroesAction, finalSelectedHero);
    const updatedHeroesPool = updateHeroSelectionInPool(room.heroes_pool, finalSelectedHero);

    await updateDatabase(roomId, team.id, heroesAction, updatedHeroesPool, selectionMode, team.nb_turn);
  } catch (error) {
    console.error('Error in selectChampion:', error);
  }
};

export { selectChampion };
