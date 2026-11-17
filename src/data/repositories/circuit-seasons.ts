import type { SupabaseClient } from "@supabase/supabase-js";
import type { CircuitSeason } from "../../domain/circuit/types";
export const listCircuitSeasons = (
  c: SupabaseClient,
  uid: string,
  page: number,
) =>
  c
    .from("volleyworld_circuit_seasons")
    .select(
      "season_id,season_number,created_at,status,played,podium,revision,updated_at",
    )
    .eq("user_id", uid)
    .order("season_number")
    .range(page * 100, page * 100 + 99);
export const fetchCircuitSeason = (
  c: SupabaseClient,
  uid: string,
  id: string,
) =>
  c
    .from("volleyworld_circuit_seasons")
    .select("state,revision,updated_at")
    .eq("user_id", uid)
    .eq("season_id", id)
    .maybeSingle();
export const writeCircuitSeason = (
  c: SupabaseClient,
  s: CircuitSeason,
  revision: number,
) =>
  c.rpc("save_volleyworld_circuit_season", {
    p_state: s,
    p_expected_revision: revision,
  });
export const deleteCircuitSeasons = (c: SupabaseClient, uid: string) =>
  c.from("volleyworld_circuit_seasons").delete().eq("user_id", uid);
