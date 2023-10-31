import supabase from "../supabase";

type Hero = { 
  id: string;
  name: string | null; 
  selected?: boolean;
};

type Team = {
  id: number;
  heroes_selected: { id: string; name: string; selected?: boolean }[];
  heroes_ban: { id: string; name: string; selected?: boolean }[];
  clicked_hero: string;
};

const actionFunctionMapping = {
  ban: "heroes_ban",
  select: "heroes_selected",
};

async function selectChampion(
  roomid: string,
  selectedChampion: string | null
) {
  const { data: team } = await supabase
    .from("teams")
    .select(
      "id, isturn, heroes_selected, heroes_ban, clicked_hero, nb_turn"
    )
    .eq("room", roomid).eq("isturn", true).single();
  
  const { data: room } = await supabase
      .from("rooms")
      .select("id, status, heroes_pool")
      .eq("id", roomid)
      .single();
  
    if (!team || !room ) return;
  
  await supabase.from("teams").update({ clicked_hero: null }).eq("id", team.id);

  const typedTeam = team as unknown as Team

  const action = room.status === "ban" ? "ban" : "select";
  const heroes_action =
    action === "ban" ? team.heroes_ban : team.heroes_selected;

  if (action !== "ban") {
    selectedChampion = selectedChampion || typedTeam.clicked_hero;
  }

  let hero: Hero | undefined;
  if (selectedChampion) {
    hero = room.heroes_pool.find(
      (hero: Hero) => hero.name === selectedChampion
    );
    if (hero?.selected) throw new Error("Hero already selected");
  } else if (!selectedChampion && action === "select") {
    hero = getRandomUnselectedHero(room.heroes_pool);
    if (!hero) throw new Error("No unselected hero found");
  }

  if (action === "ban") {
    const currentBanIndex = heroes_action.findIndex(
      (hero: { id: string, name: string; selected?: boolean }) => !hero.selected
    );
    if (currentBanIndex !== -1) {
      if (hero) {
        heroes_action[currentBanIndex] = { id: hero.id, name: hero.name, selected: true };
      } else {
        heroes_action[currentBanIndex] = { id: null, name: null, selected: true };
      }
    }
  } else if (hero) {
    const nullSlotIndex = heroes_action.findIndex(
      (hero: { id: string, name: string; selected?: boolean }) => !hero.selected
    );
    if (nullSlotIndex !== -1) {
      heroes_action[nullSlotIndex] = { id: hero.id, name: hero.name, selected: true };
    }
  }

  const updatedHeroesPool = room.heroes_pool.map((poolHero: Hero) =>
    poolHero.name === hero?.name ? { ...poolHero, selected: true } : poolHero
  );

  await supabase
    .from("teams")
    .update({
      [actionFunctionMapping[action]]: heroes_action.map(
        ({ id, name, selected }: { id: string, name: string; selected?: boolean }) => ({
          id,
          name,
          selected,
        })
      ),
      nb_turn: team.nb_turn - 1 
    })
    .eq("id", team.id);

  await supabase
    .from("rooms")
    .update({ heroes_pool: updatedHeroesPool })
    .eq("id", roomid);
}

function getRandomUnselectedHero(heroes_pool: Hero[]): Hero | undefined {
  const unselectedHeroes = heroes_pool.filter((hero) => !hero.selected);
  if (unselectedHeroes.length === 0) return;

  const randomIndex = Math.floor(Math.random() * unselectedHeroes.length);
  return unselectedHeroes[randomIndex];
}

export { selectChampion }
