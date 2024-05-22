type Hero = {
  id: string;
  name: string | null;
  selected?: boolean;
};

const getRandomUnselectedHero = (heroesPool: Hero[]): Hero | undefined => {
  const unselectedHeroes = heroesPool.filter(hero => !hero.selected);
  if (unselectedHeroes.length === 0) return undefined;
  const randomIndex = Math.floor(Math.random() * unselectedHeroes.length);
  return unselectedHeroes[randomIndex];
};

const getHeroFromPool = (heroesPool: Hero[], heroName: string | null): Hero | undefined => {
  if (!heroName) return getRandomUnselectedHero(heroesPool);
  const hero = heroesPool.find(h => h.name === heroName);
  if (hero?.selected) {
    console.log("Hero already selected, returning random hero");
    return getRandomUnselectedHero(heroesPool);
  }
  return hero;
};

const updateHeroSelectionInPool = (heroesPool: Hero[], hero?: Hero): Hero[] =>
  heroesPool.map(h => h.name === hero?.name ? { ...h, selected: true } : h);

const updateTeamHeroSelection = (heroes: Hero[], hero?: Hero): void => {
  const index = heroes.findIndex(h => !h.selected);
  if (index !== -1) {
    heroes[index] = {
      id: hero?.id || '',
      name: hero?.name || null,
      selected: true,
    };
  }
};

export { Hero, getRandomUnselectedHero, getHeroFromPool, updateHeroSelectionInPool, updateTeamHeroSelection };
