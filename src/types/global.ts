import { Database } from "./supabase";
export type Hero = Database["public"]["CompositeTypes"]["hero"];

export type Data = {
  room_id: number;
  status: string;
  cycle: number;
  heroes_pool: Hero[] ;
  team_id: number;
  is_turn: boolean;
  heroes_selected: Hero[];
  heroes_ban: Hero[];
};

export type DraftAction = 'ban' | 'select';
