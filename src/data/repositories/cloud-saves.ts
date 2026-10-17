import type { SupabaseClient } from "@supabase/supabase-js";
import type { SeasonRecord, Tournament } from "../../domain/types";
/** Keep endpoint names, filters, selections and CAS payloads stable across the refactor. */
export const readCloudSave = (client: SupabaseClient, userId: string) =>
  client
    .from("volleyworld_saves")
    .select("state,revision,updated_at")
    .eq("user_id", userId)
    .maybeSingle();
export const writeCloudSave = (
  client: SupabaseClient,
  state: Tournament,
  revision: number,
  archives: SeasonRecord[],
) =>
  client.rpc("save_volleyworld_with_history", {
    p_state: state,
    p_expected_revision: revision,
    p_archives: archives,
  });
export const readHistoryPage = (
  client: SupabaseClient,
  userId: string,
  page: number,
) =>
  client
    .from("volleyworld_seasons")
    .select(
      "season_id,season_number,status,created_at,ended_at,podium,played,playoff_format:snapshot->>playoffFormat",
    )
    .eq("user_id", userId)
    .order("season_number", { ascending: true })
    .range(page * 100, page * 100 + 99);
export const readSeasonSnapshot = (
  client: SupabaseClient,
  userId: string,
  seasonId: string,
) =>
  client
    .from("volleyworld_seasons")
    .select("snapshot")
    .eq("user_id", userId)
    .eq("season_id", seasonId)
    .maybeSingle();
