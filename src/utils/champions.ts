import supabase from "../supabase";

type Hero = { name: string | null; selected?: boolean };

type Team = {
  id: number;
  heroes_selected: { name: string; selected?: boolean }[];
  heroes_ban: { name: string; selected?: boolean }[];
  clicked_hero: string;
  room: {
    status: string;
    heroes_pool: Hero[];
  };
};

const actionFunctionMapping = {
  ban: "heroes_ban",
  select: "heroes_selected",
};

export default async function selectChampion(
  roomid: string,
  selectedChampion: string | null
) {
  const { data: team } = await supabase
    .from("teams")
    .select(
      "id, heroes_selected, heroes_ban, room(status, heroes_pool), clicked_hero"
    )
    .eq("room", roomid)
    .eq("isTurn", true)
    .single();

  if (!team) return;

  await supabase.from("teams").update({ clicked_hero: null }).eq("id", team.id);

  const typedTeam = team as unknown as Team

  const action = typedTeam.room.status === "ban" ? "ban" : "select";
  const heroes_action =
    action === "ban" ? team.heroes_ban : team.heroes_selected;

  if (action !== "ban") {
    selectedChampion = selectedChampion || typedTeam.clicked_hero;
  }

  let hero: Hero | undefined;
  if (selectedChampion) {
    hero = typedTeam.room.heroes_pool.find(
      (hero: Hero) => hero.name === selectedChampion
    );
    if (hero?.selected) throw new Error("Hero already selected");
  } else if (!selectedChampion && action === "select") {
    hero = getRandomUnselectedHero(typedTeam.room.heroes_pool);
    if (!hero) throw new Error("No unselected hero found");
  }

  if (action === "ban") {
    const currentBanIndex = heroes_action.findIndex(
      (hero: { name: string; selected?: boolean }) => !hero.selected
    );
    if (currentBanIndex !== -1) {
      if (hero) {
        heroes_action[currentBanIndex] = { name: hero.name, selected: true };
      } else {
        heroes_action[currentBanIndex] = { name: null, selected: true };
      }
    }
  } else if (hero) {
    const nullSlotIndex = heroes_action.findIndex(
      (hero: { name: string; selected?: boolean }) => !hero.selected
    );
    if (nullSlotIndex !== -1) {
      heroes_action[nullSlotIndex] = { name: hero.name, selected: true };
    }
  }

  const updatedHeroesPool = typedTeam.room.heroes_pool.map((poolHero: Hero) =>
    poolHero.name === hero?.name ? { ...poolHero, selected: true } : poolHero
  );

  await supabase
    .from("teams")
    .update({
      [actionFunctionMapping[action]]: heroes_action.map(
        ({ name, selected }: { name: string; selected?: boolean }) => ({
          name,
          selected,
        })
      ),
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
