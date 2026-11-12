/** Icon-only status; text is reserved for assistive technology and hover. */
export function worldPlayoffStatusHtml(status?: {
  qualified: boolean;
  eliminated: boolean;
}) {
  if (!status?.qualified && !status?.eliminated) return "";
  const state = status.qualified ? "qualified" : "eliminated",
    label = status.qualified
      ? "Đã giành vé playoff"
      : "Đã bị loại khỏi playoff";
  return `<span class="world-playoff-status" data-playoff-status="${state}" role="img" aria-label="${label}" title="${label}">${status.qualified ? "✓" : "✕"}</span>`;
}
