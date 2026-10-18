import { createSeasonCloud } from "../shared/season-cloud";
import {
  listFullSeasons,
  fetchFullSeason,
  writeFullSeason,
} from "../../data/repositories/full-seasons";
import { validFullSeason, worldComplete } from "../../domain/full-season/index";
import {
  fullModel,
  persistFull,
  readScope,
  recordOf,
  selectedFull,
  fullBackup,
  validFullRecord,
  type FullRecord,
} from "./model";
const cloud = createSeasonCloud({
  model: fullModel,
  tab: "full-season",
  prefix: "volleyworld-full",
  label: "World Cup",
  persist: persistFull,
  readScope,
  recordOf,
  selected: selectedFull,
  backup: fullBackup,
  validRecord: (r: unknown): r is FullRecord =>
    validFullRecord(r as FullRecord),
  validState: validFullSeason,
  complete: worldComplete,
  list: listFullSeasons,
  fetch: fetchFullSeason,
  write: writeFullSeason,
});
export const {
  initialize: initializeFullScope,
  switchAccount: switchFullAccount,
  queue: queueFull,
  reload: reloadFullCloud,
  load: loadFullSnapshot,
  resolve: resolveFullConflict,
  saveNow: saveFullNow,
  pending: fullCloudPending,
} = cloud;
