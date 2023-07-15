import supabase from "../supabase";
import { Database } from "../types/supabase";

type Hero = { name: string | null; selected?: boolean };

type Team = Database["public"]["Tables"]["teams"]["Row"] & {
  room: {
    status: string;
    heroes_pool: Hero["name" | "selected"];
  }[];
  heroes_ban: Hero[];
  heroes_selected: Hero[];
  clicked_hero: string | null;
};

const actionFunctionMapping = {
  ban: "heroes_ban",
  select: "heroes_selected",
};


//TODO FIX IDEXING OF HERO BAN ( IF HERO SKIP THE NNEXT TIME HERO SLOT IS + (NB HERO PICK))
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

  await supabase
    .from("teams")
    .update({ clicked_hero: null })
    .eq("id", team.id);

    const typedTeam = team as unknown as {
      id: number;
      heroes_selected: { name: string, selected?: boolean }[];
      heroes_ban: { name: string, selected?: boolean }[];
      clicked_hero: string;
      room: {
        status: string;
        heroes_pool: Hero[];
      };
    };
  
  const action = typedTeam.room.status === 'ban' ? 'ban' : 'select';
  const heroes_action = action === 'ban' ? team.heroes_ban : team.heroes_selected;

  if (action !== 'ban') {
    selectedChampion = selectedChampion || typedTeam.clicked_hero;
  }

  console.log("selectedChampion:", selectedChampion);

  let hero: Hero | undefined;
  if (selectedChampion) {
    hero = typedTeam.room.heroes_pool.find((hero: Hero) => hero.name === selectedChampion);
    if (hero?.selected) throw new Error("Hero already selected");
  } else if (!selectedChampion && action === 'select') {
    hero = getRandomUnselectedHero(typedTeam.room.heroes_pool);
    if (!hero) throw new Error("No unselected hero found");
  }

  if (action === 'ban') {
    const currentBanIndex = heroes_action.findIndex((hero: {name: string, selected?: boolean}) => !hero.selected);
    if (currentBanIndex !== -1) {
      if (hero) {
        heroes_action[currentBanIndex] = { name: hero.name, selected: true };
      } else {
        heroes_action[currentBanIndex] = { name: null, selected: true };
      }
    }
  } else if (hero) {
    const nullSlotIndex = heroes_action.findIndex((hero: {name: string, selected?: boolean}) => !hero.selected);
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
      [actionFunctionMapping[action]]: heroes_action.map(({ name, selected }: { name: string, selected?: boolean }) => ({ name, selected })),
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

/* ------------------------------------------------ */

// export async function banUserChampion(
//   roomid: string,
//   selectedChampion: string | null
// ) {
//   const { data: team } = await supabase
//     .from("teams")
//     .select("id, heroes_ban, room(status, heroes_pool), clicked_hero")
//     .eq("room", roomid)
//     .eq("isTurn", true)
//     .single();

//   if (!team) return;
//   const { heroes_ban, clicked_hero } = team as unknown as Team;
//   selectedChampion = selectedChampion || clicked_hero;

//   const typedTeam = team as unknown as {
//     id: number;
//     heroes_selected: { name: string }[];
//     heroes_ban: { name: string }[];
//     clicked_hero: string;
//     room: {
//       status: string;
//       heroes_pool: Hero[];
//     };
//   };

//   let hero;
//   if (selectedChampion) {
//     hero = typedTeam.room.heroes_pool.find(
//       (hero: Hero) => hero.name === selectedChampion
//     );
//   }

//   if (!hero) throw new Error("No hero found");

//   const nullSlotIndex = heroes_ban.findIndex(
//     (hero: Hero) => hero.name === null
//   );
//   if (nullSlotIndex !== -1) {
//     heroes_ban[nullSlotIndex] = { name: hero.name };
//   }

//   const updatedHeroesPool = typedTeam.room.heroes_pool.map((hero: Hero) =>
//     hero.name === selectedChampion ? { ...hero, selected: true } : hero
//   );

//   await supabase
//     .from("teams")
//     .update({
//       heroes_ban: heroes_ban.map(({ name }) => ({ name })),
//       clicked_hero: null,
//     })
//     .eq("id", team.id);

//   await supabase
//     .from("rooms")
//     .update({ heroes_pool: updatedHeroesPool })
//     .eq("id", roomid);
// }

// export async function selectUserChampion(
//   roomid: string,
//   selectedChampion: string | null
// ) {
//   const { data: team } = await supabase
//     .from("teams")
//     .select("id, heroes_selected, room(status, heroes_pool), clicked_hero")
//     .eq("room", roomid)
//     .eq("isTurn", true)
//     .single();

//   if (!team) return;

//   const typedTeam = team as unknown as {
//     id: number;
//     heroes_selected: { name: string }[];
//     heroes_ban: { name: string }[];
//     clicked_hero: string;
//     room: {
//       status: string;
//       heroes_pool: Hero[];
//     };
//   };

//   const { heroes_selected, clicked_hero, room } = team as unknown as Team;
//   selectedChampion = selectedChampion || clicked_hero;

//   let hero;
//   if (selectedChampion) {
//     hero = typedTeam.room.heroes_pool.find(
//       (hero: Hero) => hero.name === selectedChampion
//     );
//   } else {
//     const unselectedHeroes = typedTeam.room.heroes_pool.filter(
//       (hero: Hero) => !hero.selected
//     );
//     if (unselectedHeroes.length === 0)
//       throw new Error("No unselected heroes left");
//     hero =
//       unselectedHeroes[Math.floor(Math.random() * unselectedHeroes.length)];
//   }

//   if (!hero) throw new Error("No hero found");

//   const nullSlotIndex = heroes_selected.findIndex(
//     (hero: Hero) => hero.name === null
//   );
//   if (nullSlotIndex !== -1) {
//     heroes_selected[nullSlotIndex] = { name: hero.name };
//   }

//   const updatedHeroesPool = typedTeam.room.heroes_pool.map((hero: Hero) =>
//     hero.name === selectedChampion ? { ...hero, selected: true } : hero
//   );

//   await supabase
//     .from("teams")
//     .update({
//       heroes_selected: heroes_selected.map(({ name }) => ({ name })),
//       clicked_hero: null,
//     })
//     .eq("id", team.id);

//   await supabase
//     .from("rooms")
//     .update({ heroes_pool: updatedHeroesPool })
//     .eq("id", roomid);
// }
