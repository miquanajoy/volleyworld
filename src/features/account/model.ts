import type { SupabaseClient, User } from "@supabase/supabase-js";
import { CloudWriter } from "../../data/cloud/write-queue";
import type { CloudPhase, CloudSaveRow } from "../../data/contracts";
import { $ } from "../../shared/dom";
export const accountState = {
  client: null as SupabaseClient | null,
  user: null as User | null,
  writer: null as CloudWriter | null,
  ready: false,
  remote: null as CloudSaveRow | null,
  phase: "loading" as CloudPhase,
  detail: "",
  epoch: 0,
  loadedAt: null as string | null,
  manualBusy: false,
};
export const el = $;
export const text = (id: string, value: string) => {
  if (el(id)) el(id).textContent = value;
};
export const cfg = __VOLLEY_CONFIG__;
export const configured = !!(cfg.supabaseUrl && cfg.supabaseKey);
