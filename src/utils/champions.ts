import supabase from "../supabase";

interface Hero {
  name: string;
  selected?: boolean;
}

interface Team {
  id: string;
  heroes_selected: Hero[];
  heroes_ban: Hero[];
  clicked_hero: string;
  room: {
    status: string;
    heroes_pool: Hero[];
  };
}

export async function banUserChampion(
  roomid: string,
  selectedChampion: string | null
) {
  const { data: team } = await supabase
    .from("teams")
    .select(
      "id, heroes_ban, room(status, heroes_pool), clicked_hero"
    )
    .eq("room", roomid)
    .eq("isTurn", true)
    .single();

  if (!team) return;
  const { heroes_ban, clicked_hero, room } = team as unknown as Team;
  selectedChampion = selectedChampion || clicked_hero;

  let hero;
  if (selectedChampion) {
    hero = room.heroes_pool.find((hero: Hero) => hero.name === selectedChampion);
  }

  if (!hero) throw new Error("No hero found");

  const nullSlotIndex = heroes_ban.findIndex((hero: Hero) => hero.name === null);
  if (nullSlotIndex !== -1) {
    heroes_ban[nullSlotIndex] = { name: hero.name };
  }

  const updatedHeroesPool = room.heroes_pool.map((hero: Hero) =>
    hero.name === selectedChampion ? { ...hero, selected: true } : hero
  );

  await supabase
    .from("teams")
    .update({
      heroes_ban: heroes_ban.map(({ name }) => ({ name })),
      clicked_hero: null,
    })
    .eq("id", team.id);

  await supabase
    .from("rooms")
    .update({ heroes_pool: updatedHeroesPool })
    .eq("id", roomid);
}

export async function selectUserChampion(
  roomid: string,
  selectedChampion: string | null
) {
  const { data: team } = await supabase
    .from("teams")
    .select(
      "id, heroes_selected, room(status, heroes_pool), clicked_hero"
    )
    .eq("room", roomid)
    .eq("isTurn", true)
    .single();

  if (!team) return;
  const { heroes_selected, clicked_hero, room } = team as unknown as Team;
  selectedChampion = selectedChampion || clicked_hero;

  let hero;
  if (selectedChampion) {
    hero = room.heroes_pool.find((hero: Hero) => hero.name === selectedChampion);
  } else {
    const unselectedHeroes = room.heroes_pool.filter((hero: Hero) => !hero.selected);
    if (unselectedHeroes.length === 0)
      throw new Error("No unselected heroes left");
    hero = unselectedHeroes[Math.floor(Math.random() * unselectedHeroes.length)];
  }

  if (!hero) throw new Error("No hero found");

  const nullSlotIndex = heroes_selected.findIndex((hero: Hero) => hero.name === null);
  if (nullSlotIndex !== -1) {
    heroes_selected[nullSlotIndex] = { name: hero.name };
  }

  const updatedHeroesPool = room.heroes_pool.map((hero: Hero) =>
    hero.name === selectedChampion ? { ...hero, selected: true } : hero
  );

  await supabase
    .from("teams")
    .update({
      heroes_selected: heroes_selected.map(({ name }) => ({ name })),
      clicked_hero: null,
    })
    .eq("id", team.id);

  await supabase
    .from("rooms")
    .update({ heroes_pool: updatedHeroesPool })
    .eq("id", roomid);
}
