import supabase from "../supabase";

export async function selectUserChampion(roomid: string, selectedChampion: string | null) {
    const { data: team } = await supabase
      .from("teams")
      .select("id, heroes_pool, number_of_pick, heroes_selected, pick")
      .eq("room", roomid)
      .eq("isTurn", true)
      .single();

    if (!team) return;

    const { heroes_pool, heroes_selected, pick } = team;
    
    if (pick) {
      return true
    }
  
  await supabase.from('teams').update({ pick: true }).eq('id', team.id);

    let hero;
    if (selectedChampion) {
      hero = heroes_pool.find((hero: any) => hero.name === selectedChampion);
    } else {
      const unselectedHeroes = heroes_pool.filter(
        (hero: any) => !hero.selected
      );
      if (unselectedHeroes.length === 0)
        throw new Error("No unselected heroes left");
      hero =
        unselectedHeroes[Math.floor(Math.random() * unselectedHeroes.length)];
    }

    hero.selected = true;

    const nullSlotIndex = heroes_selected.findIndex(
      (hero: any) => hero.name === null
    );
    if (nullSlotIndex !== -1) {
      heroes_selected[nullSlotIndex] = hero;
    }

    const updatedHeroesPool = heroes_pool.map((hero: any) =>
      hero.name === selectedChampion ? { ...hero, selected: true } : hero
    );
    
    await supabase
    .from('teams')
    .update({ heroes_selected: heroes_selected })
      .eq('id', team.id);


    await Promise.all([
      supabase
        .from("teams")
        .update({ heroes_pool: updatedHeroesPool, pick: false })
        .eq("room", roomid),
    ]);
  
  return false
}