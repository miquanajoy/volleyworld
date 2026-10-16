import { seasonMedals } from "./model";
import { getPorts } from "../../app/ports";
import { store } from "../../app/store";
import { catalog } from "../../data/teams";
import type { Region } from "../../domain/types";
import { $, names } from "../../shared/dom";
import { achievementsHtml } from "./views";
let request = 0;
export function selectRegion(region: Region) {
  if (!Object.hasOwn(names, region)) return;
  store.achievementRegion = region;
  store.achievementWorldwide = false;
  store.achievementTeam = null;
  renderAchievements();
}
export function selectTeam(id: string) {
  if (
    !catalog.some(
      (t) =>
        t.id === id &&
        (t.region === store.achievementRegion ||
          (store.achievementView === "ranking" && store.achievementWorldwide)),
    )
  )
    return;
  store.achievementTeam = id;
  renderAchievements();
  document
    .querySelector<HTMLElement>(".achievement-detail")
    ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
export function renderAchievements() {
  const token = ++request,
    scope = getPorts().cloud.storageKey(),
    rows = getPorts().seasons.listSeasons();
  const missing =
    store.achievementView === "ranking"
      ? rows.filter(
          (r) =>
            !r.snapshot &&
            (r.status === "completed" ||
              (store.achievementTeam &&
                !seasonMedals(r).includes(store.achievementTeam))),
        )
      : store.achievementTeam
        ? rows.filter(
            (r) =>
              !r.snapshot &&
              !(
                r.status === "completed" &&
                seasonMedals(r).includes(store.achievementTeam!)
              ),
          )
        : [];
  const valid = () =>
    token === request &&
    store.tab === "achievements" &&
    scope === getPorts().cloud.storageKey();
  $("content").innerHTML = achievementsHtml(rows, missing.length > 0);
  if (!missing.length) return;
  // Bound concurrency when a long history has snapshots outside the local cache.
  let cursor = 0;
  const worker = async () => {
    while (valid() && cursor < missing.length) {
      const row = missing[cursor++];
      try {
        const snapshot = await getPorts().seasons.loadSnapshot(row.season_id);
        if (!valid()) return;
        if (snapshot) row.snapshot = snapshot;
      } catch {
        /* Show retry, never invent a non-participation result. */
      }
    }
  };
  void Promise.all(
    Array.from({ length: Math.min(4, missing.length) }, worker),
  ).then(() => {
    if (valid()) $("content").innerHTML = achievementsHtml(rows, false);
  });
}

export function selectView(view: string) {
  if (view !== "countries" && view !== "ranking") return;
  store.achievementView = view;
  if (view === "countries") {
    store.achievementWorldwide = false;
    if (store.achievementTeam)
      store.achievementRegion = catalog.find(
        (t) => t.id === store.achievementTeam,
      )!.region;
  }
  renderAchievements();
}
export function selectWorldwide() {
  store.achievementWorldwide = true;
  store.achievementTeam = null;
  renderAchievements();
}
