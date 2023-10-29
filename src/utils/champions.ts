import supabase from "../supabase";

type Hero = {
  id: string;
  name: string | null;
  selected?: boolean;
};

type Team = {
  id: number;
  heroes_selected: Hero[];
  heroes_ban: Hero[];
  clicked_hero: string;
  nb_turn: number;
  isturn: boolean;
};

type Room = {
  id: string;
  status: 'ban' | 'select';
  heroes_pool: Hero[];
};

const TEAM_QUERY_FIELDS = "id, isturn, heroes_selected, heroes_ban, clicked_hero, nb_turn";
const ROOM_QUERY_FIELDS = "id, status, heroes_pool";

const actionFunctionMapping: { [key in Room['status']]: keyof Pick<Team, 'heroes_ban' | 'heroes_selected'> } = {
  ban: "heroes_ban",
  select: "heroes_selected",
};

export default async function selectChampion(
  teamId: string | null,
  roomId: string,
  selectedChampion: string | null
) {
  const team = await fetchTeam(roomId);
  const room = await fetchRoom(roomId);
  
  if (!team || !room || !teamId) return;
  
  await resetClickedHero(team.id);

  const action = room.status;
  const heroesAction = team[actionFunctionMapping[action]];

  if (action !== 'ban') {
    selectedChampion = selectedChampion || team.clicked_hero;
  }

  let hero: Hero | undefined;
  if (selectedChampion) {
    hero = findHeroByName(room.heroes_pool, selectedChampion);
    if (hero?.selected) throw new Error('Hero already selected');
  } else if (action === 'select') {
    hero = getRandomUnselectedHero(room.heroes_pool);
    if (!hero) throw new Error('No unselected hero found');
  }

  updateHeroesAction(hero, heroesAction);

  const updatedHeroesPool = updateHeroesPool(hero, room.heroes_pool);

  await updateTeam(hero, heroesAction, team);
  await updateRoom(updatedHeroesPool, roomId);
}

async function fetchTeam(roomId: string): Promise<Team | null> {
  const { data: team } = await supabase
    .from('teams')
    .select(TEAM_QUERY_FIELDS)
    .eq('room', roomId)
    .eq('isturn', true)
    .single();
  
  return team as Team | null;
}

async function fetchRoom(roomId: string): Promise<Room | null> {
  const { data: room } = await supabase
    .from('rooms')
    .select(ROOM_QUERY_FIELDS)
    .eq('id', roomId)
    .single();

  return room as Room | null;
}

async function resetClickedHero(teamId: number) {
  await supabase.from('teams').update({ clicked_hero: null }).eq('id', teamId);
}

function findHeroByName(heroes: Hero[], heroName: string) {
  return heroes.find(hero => hero.name === heroName);
}

function updateHeroesAction(hero: Hero | undefined, heroesAction: Hero[]) {
  const heroIndex = heroesAction.findIndex(h => !h.selected);
  if (heroIndex !== -1) {
    heroesAction[heroIndex] = hero
      ? { ...hero, selected: true }
      : { id: 'null', name: null, selected: true };
  }
}

function updateHeroesPool(hero: Hero | undefined, heroesPool: Hero[]) {
  return heroesPool.map(poolHero =>
    poolHero.name === hero?.name ? { ...poolHero, selected: true } : poolHero
  );
}

async function updateTeam(hero: Hero | undefined, heroesAction: Hero[], team: Team) {
  const updateData = { 
    [actionFunctionMapping['ban']]: heroesAction,
    nb_turn: team.nb_turn - 1,
  };

  await supabase
    .from('teams')
    .update(updateData)
    .eq('id', team.id);
}

async function updateRoom(updatedHeroesPool: Hero[], roomId: string) {
  await supabase
    .from('rooms')
    .update({ heroes_pool: updatedHeroesPool })
    .eq('id', roomId);
}

function getRandomUnselectedHero(heroesPool: Hero[]): Hero | undefined {
  const unselectedHeroes = heroesPool.filter(hero => !hero.selected);
  if (unselectedHeroes.length === 0) return undefined;

  const randomIndex = Math.floor(Math.random() * unselectedHeroes.length);
  return unselectedHeroes[randomIndex];
}
