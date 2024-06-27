export type Hero = {
  id: string | null;
  name: string | null;
  selected: boolean;
} | null;

export type Data = {
  room_id: string;
  status: string;
  cycle: number;
  heroes_pool: Hero[];
  team_id: number;
  is_turn: boolean;
  heroes_selected: Hero[];
  heroes_ban: Hero[];
  clicked_hero: string | null;
};

export type RoomData = {
  id: string;
  status: string;
  cycle: number;
  heroes_pool: Hero[];
  ready: boolean;
};

export type TeamData = {
  id: number;
  is_turn: boolean;
  heroes_selected: Hero[];
  heroes_ban: Hero[];
  clicked_hero: string | null;
  ready: boolean;
};

export type DraftAction = 'ban' | 'select';
