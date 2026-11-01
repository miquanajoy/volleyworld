import type { SupabaseClient } from "@supabase/supabase-js";
import type { TourSeason } from "../../domain/tour/index";
export const listTourSeasons = (
  client: SupabaseClient,
  uid: string,
  page: number,
) =>
  client
    .from("volleyworld_tour_seasons")
    .select(
      "season_id,season_number,created_at,status,played,podium,revision,updated_at",
    )
    .eq("user_id", uid)
    .order("season_number", { ascending: true })
    .range(page * 100, page * 100 + 99);
export const fetchTourSeason = (
  client: SupabaseClient,
  uid: string,
  id: string,
) =>
  client
    .from("volleyworld_tour_seasons")
    .select("state,revision,updated_at")
    .eq("user_id", uid)
    .eq("season_id", id)
    .maybeSingle();
export const writeTourSeason = (
  client: SupabaseClient,
  state: TourSeason,
  revision: number,
) =>
  client.rpc("save_volleyworld_tour_season", {
    p_state: state,
    p_expected_revision: revision,
  });
