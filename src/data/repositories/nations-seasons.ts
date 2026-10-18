import type { SupabaseClient } from "@supabase/supabase-js";
import type { NationsSeason } from "../../domain/nations-league/types";
export const listNationsSeasons = (
  client: SupabaseClient,
  uid: string,
  page: number,
) =>
  client
    .from("volleyworld_nations_seasons")
    .select(
      "season_id,season_number,created_at,status,played,podium,revision,updated_at,campaign_id,cycle_number,previous_id,total_matches",
    )
    .eq("user_id", uid)
    .order("season_number", { ascending: true })
    .range(page * 100, page * 100 + 99);
export const fetchNationsSeason = (
  client: SupabaseClient,
  uid: string,
  id: string,
) =>
  client
    .from("volleyworld_nations_seasons")
    .select("state,revision,updated_at")
    .eq("user_id", uid)
    .eq("season_id", id)
    .maybeSingle();
export const writeNationsSeason = (
  client: SupabaseClient,
  state: NationsSeason,
  revision: number,
) =>
  client.rpc("save_volleyworld_nations_season", {
    p_state: state,
    p_expected_revision: revision,
  });
