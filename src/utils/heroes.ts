type Hero = {
  id: string | null;
  name: string | null;
  selected?: boolean;
} | null;

const getRandomUnselectedHero = (heroesPool: Hero[]): Hero | undefined => {
  const unselectedHeroes = heroesPool.filter(hero => hero && !hero.selected);
  if (unselectedHeroes.length === 0) return undefined;
  const randomIndex = Math.floor(Math.random() * unselectedHeroes.length);
  return unselectedHeroes[randomIndex];
};

const getHeroFromPool = (heroesPool: Hero[], heroName: string | null): Hero | undefined => {
  if (!heroName) return getRandomUnselectedHero(heroesPool);
  const hero = heroesPool.find(h => h && h.id === heroName);
  if (hero?.selected) {
    console.log("Hero already selected, returning random hero");
    return getRandomUnselectedHero(heroesPool);
  }
  return hero;
};

const updateHeroSelectionInPool = (heroesPool: Hero[], hero?: Hero): Hero[] =>
  heroesPool.map(h => {
    if (h === null) return null;
    return {
      ...h,
      selected: h.id === hero?.id ? true : h.selected,
      id: h.id === hero?.id ? (hero?.id || null) : h.id || null,
    };
  });

const updateTeamHeroSelection = (heroes: Hero[], hero?: Hero): void => {
  const index = heroes.findIndex(h => h !== null && !h.selected);
  if (index !== -1) {
    heroes[index] = {
      id: hero?.id || null,
      name: hero?.name || null,
      selected: true,
    };
  }
};

export { Hero, getRandomUnselectedHero, getHeroFromPool, updateHeroSelectionInPool, updateTeamHeroSelection };
