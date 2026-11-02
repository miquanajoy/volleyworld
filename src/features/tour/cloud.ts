import { createSeasonCloud } from "../shared/season-cloud";
import {
  listTourSeasons,
  fetchTourSeason,
  writeTourSeason,
} from "../../data/repositories/tour-seasons";
import { validTour, complete } from "../../domain/tour/index";
import {
  model,
  tourStoragePrefix,
  persist,
  readScope,
  recordOf,
  selected,
  backup,
  validRecord,
} from "./model";
export const tourCloud = createSeasonCloud({
  model,
  tab: "tour",
  prefix: tourStoragePrefix,
  label: "Tour",
  persist,
  readScope,
  recordOf,
  selected,
  backup,
  validRecord,
  validState: validTour,
  complete: complete,
  list: listTourSeasons,
  fetch: fetchTourSeason,
  write: writeTourSeason,
});
