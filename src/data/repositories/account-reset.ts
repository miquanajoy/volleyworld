import type { SupabaseClient } from "@supabase/supabase-js";
/** Read before any account-scoped cache or writer is activated. */
export async function applyAccountReset(
  client: SupabaseClient,
  uid: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("volleyworld_data_resets")
    .select("reset_at")
    .eq("user_id", uid)
    .maybeSingle();
  if (error)
    throw Error(
      "Chưa kiểm tra được trạng thái dữ liệu tài khoản. Vui lòng thử lại.",
    );
  if (!data?.reset_at) return false;
  const marker = "volleyworld-reset-" + uid;
  if (localStorage.getItem(marker) !== data.reset_at) {
    const keys = Array.from({ length: localStorage.length }, (_, i) =>
      localStorage.key(i),
    ).filter(
      (key): key is string =>
        !!key && key.startsWith("volleyworld") && key.includes(uid),
    );
    for (const key of keys) localStorage.removeItem(key);
    localStorage.setItem(marker, data.reset_at);
  }
  return true;
}
