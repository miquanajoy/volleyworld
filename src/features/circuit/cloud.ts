import { createSeasonCloud } from "../shared/season-cloud";
import * as M from "./model";
import { validCircuit, complete } from "../../domain/circuit/index";
import {
  listCircuitSeasons,
  fetchCircuitSeason,
  writeCircuitSeason,
  deleteCircuitSeasons,
} from "../../data/repositories/circuit-seasons";
export const circuitCloud = createSeasonCloud({
  model: M.model,
  tab: "circuit",
  prefix: M.prefix,
  label: "Tour régional",
  persist: M.persist,
  readScope: M.readScope,
  recordOf: M.recordOf,
  selected: M.selected,
  backup: M.backup,
  validRecord: M.validRecord,
  validState: validCircuit,
  complete,
  list: listCircuitSeasons,
  fetch: fetchCircuitSeason,
  write: writeCircuitSeason,
  deleteAll: deleteCircuitSeasons,
  parentId: (s) => s.previousSeasonId,
});
