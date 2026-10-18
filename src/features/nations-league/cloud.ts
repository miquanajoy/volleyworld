import { createSeasonCloud } from "../shared/season-cloud";
import {
  listNationsSeasons,
  fetchNationsSeason,
  writeNationsSeason,
} from "../../data/repositories/nations-seasons";
import {
  validNationsSeason,
  nationsComplete,
} from "../../domain/nations-league/index";
import {
  nationsModel,
  persist,
  readScope,
  recordOf,
  selected,
  backup,
  validRecord,
} from "./model";
export const nationsCloud = createSeasonCloud({
  model: nationsModel,
  tab: "nations-league",
  prefix: "volleyworld-nations",
  label: "Nations League",
  persist,
  readScope,
  recordOf,
  selected,
  backup,
  validRecord,
  validState: validNationsSeason,
  complete: nationsComplete,
  list: listNationsSeasons,
  fetch: fetchNationsSeason,
  write: writeNationsSeason,
  sameSlot: (a, b) =>
    a.campaign_id === b.campaign_id && a.cycle_number === b.cycle_number,
  parentId: (s) => s.previousSeasonId,
});
