import { createSeasonCloud } from "../shared/season-cloud";
import {
  listChallengerSeasons,
  fetchChallengerSeason,
  writeChallengerSeason,
} from "../../data/repositories/challenger-seasons";
import {
  validChallenger,
  challengerComplete,
} from "../../domain/challenger/index";
import {
  model,
  persist,
  readScope,
  recordOf,
  selected,
  backup,
  validRecord,
} from "./model";
export const challengerCloud = createSeasonCloud({
  model,
  tab: "challenger",
  prefix: "volleyworld-challenger",
  label: "Challenger",
  persist,
  readScope,
  recordOf,
  selected,
  backup,
  validRecord,
  validState: validChallenger,
  complete: challengerComplete,
  list: listChallengerSeasons,
  fetch: fetchChallengerSeason,
  write: writeChallengerSeason,
});
