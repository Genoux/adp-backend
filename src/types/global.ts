export type Hero = {
  id: string;
  name: string | null;
  selected?: boolean;
};

export type Data = {
  room_id: string;
  status: string;
  cycle: number;
  heroes_pool: Hero[];
  team_id: number;
  isturn: boolean;
  heroes_selected: Hero[];
  heroes_ban: Hero[];
  clicked_hero: string | null;
};
