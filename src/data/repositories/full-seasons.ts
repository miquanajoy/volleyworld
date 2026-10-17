import type { SupabaseClient } from "@supabase/supabase-js";
import type { FullSeason } from "../../domain/full-season/types";
export const listFullSeasons = (
  client: SupabaseClient,
  uid: string,
  page: number,
) =>
  client
    .from("volleyworld_full_seasons")
    .select(
      "season_id,season_number,created_at,status,played,podium,revision,updated_at",
    )
    .eq("user_id", uid)
    .order("season_number", { ascending: true })
    .range(page * 100, page * 100 + 99);
export const fetchFullSeason = (
  client: SupabaseClient,
  uid: string,
  id: string,
) =>
  client
    .from("volleyworld_full_seasons")
    .select("state,revision,updated_at")
    .eq("user_id", uid)
    .eq("season_id", id)
    .maybeSingle();
export const writeFullSeason = (
  client: SupabaseClient,
  state: FullSeason,
  revision: number,
) =>
  client.rpc("save_volleyworld_full_season", {
    p_state: state,
    p_expected_revision: revision,
  });
