import { getPorts } from "../../app/ports";
import { store } from "../../app/store";
import * as V from "../../domain/index";
import type { TeamId } from "../../domain/types";
import { $ } from "../../shared/dom";
import { toast } from "../../shared/feedback";
import { all, archive, copy, key, persist, scope, seasonsState } from "./model";
import { showDecision } from "./views";
export function canCustomize() {
  return !V.started(store.state) && !store.seasonView && !seasonsState.busy;
}
export function editable() {
  return !store.seasonView && !V.complete(store.state) && !seasonsState.busy;
}
export function customize() {
  if (seasonsState.busy) return;
  if (store.seasonView) {
    store.seasonView = null;
    store.tab = "home";
  }
  if (!V.started(store.state)) {
    getPorts().settings.discard();
    getPorts().commands.navigate("settings");
    return;
  }
  if (V.complete(store.state)) {
    createNext("completed", true);
    return;
  }
  showDecision(true);
}
export async function resolve(choice: string, customizing = true) {
  if (
    seasonsState.busy ||
    !V.started(store.state) ||
    V.complete(store.state) ||
    !["finish", "cancel"].includes(choice)
  )
    return;
  seasonsState.busy = true;
  $("seasonDecision").close();
  try {
    getPorts().cloud?.backupCurrent();
    if (choice === "finish") V.finishAll(store.state);
    seasonsState.busy = false;
    createNext(choice === "finish" ? "completed" : "cancelled", customizing);
  } finally {
    seasonsState.busy = false;
  }
}
export function createNext(
  status: "completed" | "cancelled",
  customizing: boolean,
) {
  scope();
  V.ensureSeason(store.state);
  if (!archive(store.state, status)) return;
  const n =
      Math.max(
        store.state.seasonNumber,
        ...seasonsState.records.map((r) => r.season_number),
      ) + 1,
    roster = V.ids(store.state);
  store.state = V.fresh(roster, store.state.playoffFormat || "single");
  store.state.seasonNumber = n;
  store.seasonView = null;
  getPorts().settings.discard();
  store.round = 0;
  store.tab =
    customizing || !store.state.setupConfirmed ? "settings" : "league";
  getPorts().commands.save();
  getPorts().commands.render();
  toast(`Mùa ${n} đã sẵn sàng!`);
}
export function requestNew() {
  if (!V.started(store.state)) {
    customize();
    return;
  }
  if (V.complete(store.state)) createNext("completed", false);
  else showDecision(false);
}
export function start() {
  if (seasonsState.busy) return;
  store.seasonView = null;
  if (V.complete(store.state)) {
    createNext("completed", false);
    return;
  }
  if (!V.started(store.state) && !store.state.setupConfirmed) {
    customize();
    return;
  }
  store.round = Math.max(
    0,
    store.state.rounds.findIndex((r) => r.some((m) => !m.sets)),
  );
  getPorts().commands.navigate(
    V.leagueDone(store.state) ? "playoff" : "league",
  );
}
export function replaceRoster(
  selected: TeamId[],
  playoffFormat = store.state.playoffFormat || "single",
) {
  if (!["single", "double"].includes(playoffFormat)) return false;
  if (!canCustomize()) return false;
  const meta = {
    seasonId: store.state.seasonId,
    seasonNumber: store.state.seasonNumber,
    seasonCreatedAt: store.state.seasonCreatedAt,
  };
  store.state = {
    ...V.fresh(selected, playoffFormat),
    ...meta,
    setupConfirmed: true,
  };
  getPorts().settings.discard();
  store.round = 0;
  store.tab = "league";
  getPorts().commands.save();
  getPorts().commands.render();
  toast("Đã xác nhận thể thức. Mùa giải đã sẵn sàng!");
  return true;
}
export async function view(id: string) {
  scope();
  if (id === store.state.seasonId && !V.complete(store.state)) {
    start();
    return;
  }
  const scopeKey = key(),
    row = all().find((r) => r.season_id === id);
  if (!row) return;
  let snap = row.snapshot;
  if (!snap) {
    try {
      snap = await getPorts().cloud?.fetchSeason(id);
    } catch {}
    if (scopeKey !== key()) return;
    if (!snap || !V.validState(snap)) {
      toast("Cần kết nối mạng để tải kết quả mùa này.");
      return;
    }
    const found = seasonsState.records.find((r) => r.season_id === id);
    if (found) found.snapshot = copy(snap);
    persist();
  }
  store.seasonView = { ...row, snapshot: copy(snap) };
  store.tab = "season-results";
  getPorts().commands.render();
}
export {
  acceptRemote,
  ack,
  adopt,
  capture,
  exportAll,
  historyFailed,
  importAll,
  localRecords,
  mergeRemote,
  pendingFor,
  progress,
  restoreRecords,
} from "./model";
export { history, home, results } from "./views";

/** Scoped read for both archive viewing and honours; stale account responses are discarded. */
export async function loadSnapshot(id: string) {
  scope();
  const expected = key(),
    row = all().find((r) => r.season_id === id);
  if (!row) return;
  if (row.snapshot) return row.snapshot;
  const snapshot = await getPorts().cloud.fetchSeason(id);
  if (
    expected !== key() ||
    !snapshot ||
    !V.validState(snapshot) ||
    snapshot.seasonId !== id ||
    snapshot.seasonNumber !== row.season_number
  )
    return;
  const found = seasonsState.records.find((r) => r.season_id === id);
  if (found) {
    found.snapshot = copy(snapshot);
    persist();
  }
  return snapshot;
}
export { all as listSeasons } from "./model";
