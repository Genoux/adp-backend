import supabase from "../supabase";

interface Hero {
  name: string;
  selected: boolean;
}

export async function selectUserChampion(roomid: string, selectedChampion: string | null) {
    const { data: team } = await supabase
      .from("teams")
      .select("id, heroes_pool, heroes_selected, room(status), clicked_hero")
      .eq("room", roomid)
      .eq("isTurn", true)
      .single();

    if (!team) return;
    const { heroes_pool, heroes_selected, clicked_hero } = team;
  
    selectedChampion = selectedChampion || clicked_hero;

    let hero;
    if (selectedChampion) {
      hero = heroes_pool.find((hero: Hero) => hero.name === selectedChampion);
    } else {
      const unselectedHeroes = heroes_pool.filter(
        (hero: Hero) => !hero.selected
      );
      if (unselectedHeroes.length === 0)
        throw new Error("No unselected heroes left");
      hero =
        unselectedHeroes[Math.floor(Math.random() * unselectedHeroes.length)];
    }

    hero.selected = true;

    const nullSlotIndex = heroes_selected.findIndex(
      (hero: Hero) => hero.name === null
    );
    if (nullSlotIndex !== -1) {
      heroes_selected[nullSlotIndex] = hero;
    }
  
    const updatedHeroesPool = heroes_pool.map((hero: Hero) =>
      hero.name === selectedChampion ? { ...hero, selected: true } : hero
    );
    
    await supabase
    .from('teams')
    .update({ heroes_selected: heroes_selected, heroes_pool: updatedHeroesPool, pick: false })
    .eq('id', team.id);

    await Promise.all([
      supabase
        .from("teams")
        .update({ heroes_pool: updatedHeroesPool, clicked_hero: null })
        .eq("room", roomid),
    ]);
}