import { accountState } from "../../src/features/account/model";
import * as Tour from "../../src/features/tour/controller";
import { tourCloud } from "../../src/features/tour/cloud";
import * as Challenger from "../../src/features/challenger/controller";
import { challengerCloud } from "../../src/features/challenger/cloud";
import * as Full from "../../src/features/full-season/controller";
import { nextLeagueRound } from "../../src/features/league/navigation";
import {
  selectRegion,
  selectTeam,
  selectView,
  selectWorldwide,
} from "../../src/features/achievements/controller";
import type { PlayoffFormat, Region, StageKey } from "../../src/domain/types";
import * as league from "../../src/features/league/controller";
import {
  renderLeague,
  showTeamLeague,
  selectStandingsRound,
} from "../../src/features/league/views";
import {
  editMatch,
  updateScoreEditor,
  simulateEditorSet,
  clearEditorSets,
  generateScore,
} from "../../src/features/matches/editor";
import * as playoffController from "../../src/features/playoff/controller";
import { $ } from "../../src/shared/dom";
import { exportSave, navigate } from "./legacy-application";
import { getPorts } from "../../src/app/ports";
import type { AppTab } from "../../src/app/store";
import { store } from "../../src/app/store";

type Action = (element: HTMLElement) => unknown;
const arg = (e: HTMLElement) => e.dataset.arg || "";
/** Explicit command table: markup carries data, never executable JavaScript. */
const actions: Record<string, Action> = {
  "Tour.achievements": () => Tour.achievements(),
  "Tour.achievementRegion": (e) => Tour.achievementRegion(arg(e)),
  "Tour.achievementTeam": (e) => Tour.achievementTeam(arg(e)),
  "Tour.achievementCompetition": (e) => Tour.achievementCompetition(arg(e)),
  "Tour.competition": (e) => Tour.competition(arg(e)),
  "Tour.resume": () => Tour.resume(),
  "Tour.enter": () => Tour.enter(),
  "Tour.create": () => Tour.create(),
  "Tour.start": () => Tour.start(),
  "Tour.cancelSetup": () => Tour.cancelSetup(),
  "Tour.toggleTeam": (e) => Tour.toggleTeam(arg(e)),
  "Tour.setupRegion": (e) => Tour.setupRegion(arg(e)),
  "Tour.resetRoster": () => Tour.resetRoster(),
  "Tour.open": (e) => Tour.open(arg(e)),
  "Tour.section": (e) => Tour.section(arg(e)),
  "Tour.viewStage": (e) => Tour.viewStage(arg(e), e.dataset.section),
  "Tour.round": (e) =>
    Tour.round(e.dataset.arg ?? (e as HTMLSelectElement).value),
  "Tour.region": (e) => Tour.region(arg(e)),
  "Tour.group": (e) => Tour.group(arg(e), e.dataset.section),
  "Tour.swissView": (e) => Tour.swissView(arg(e)),
  "Tour.next": () => Tour.next(),
  "Tour.simRound": () => Tour.simRound(),
  "Tour.stage": (e) => Tour.stage(arg(e)),
  "Tour.qualifierStage": (e) => Tour.qualifierStage(arg(e)),
  "Tour.finishStage": () => Tour.finishStage(),
  "Tour.finish": () => Tour.finish(),
  "Tour.match": (e) => Tour.showMatch(arg(e)),
  "Tour.simMatch": (e) => Tour.simMatch(arg(e)),
  "Tour.edit": (e) => Tour.edit(arg(e)),
  "Tour.dialogSim": () => Tour.actDialog(),
  "Tour.dialogEdit": () => Tour.actDialog(true),
  "Tour.team": (e) => Tour.showTeam(arg(e)),
  "Tour.export": () => Tour.exportSeasons(),
  "Tour.exportOne": () => Tour.exportSeasons(true),
  "Tour.import": () => $("tourImport").click(),
  "Tour.importFile": (e) =>
    Tour.importSeasons((e as HTMLInputElement).files?.[0]),
  "Tour.restore": () => Tour.restore(),
  "Tour.sync": () => tourCloud.reload(),
  "Tour.remote": () => tourCloud.resolve(true),
  "Tour.local": () => tourCloud.resolve(false),
  "Challenger.enter": () => Challenger.enter(),
  "Challenger.create": () => Challenger.create(),
  "Challenger.editRoster": () => Challenger.editRoster(),
  "Challenger.start": () => Challenger.start(),
  "Challenger.cancelSetup": () => Challenger.cancelSetup(),
  "Challenger.setupRegion": (e) => Challenger.setupRegion(arg(e)),
  "Challenger.toggleTeam": (e) => Challenger.toggleTeam(arg(e)),
  "Challenger.resetRoster": () => Challenger.resetRoster(),
  "Challenger.swissView": (e) => Challenger.swissView(arg(e)),
  "Challenger.open": (e) => Challenger.open(arg(e)),
  "Challenger.section": (e) => Challenger.section(arg(e)),
  "Challenger.round": (e) => Challenger.round(arg(e)),
  "Challenger.next": () => Challenger.next(),
  "Challenger.simRound": () => Challenger.simRound(),
  "Challenger.simMatch": (e) => Challenger.simMatch(arg(e)),
  "Challenger.draw": () => Challenger.draw(),
  "Challenger.stage": (e) => Challenger.stage(arg(e)),
  "Challenger.finish": () => Challenger.finish(),
  "Challenger.edit": (e) => Challenger.edit(arg(e)),
  "Challenger.match": (e) => Challenger.showMatch(arg(e)),
  "Challenger.dialogSim": () => Challenger.actDialog(),
  "Challenger.dialogEdit": () => Challenger.actDialog(true),
  "Challenger.team": (e) =>
    Challenger.showTeam(
      arg(e),
      e.dataset.arg1 === undefined ? undefined : Number(e.dataset.arg1),
    ),
  "Challenger.export": () => Challenger.exportSeasons(),
  "Challenger.exportOne": () => Challenger.exportSeasons(true),
  "Challenger.import": () => $("challengerImport").click(),
  "Challenger.importFile": (e) =>
    Challenger.importSeasons((e as HTMLInputElement).files?.[0]),
  "Challenger.restore": () => Challenger.restore(),
  "Challenger.sync": () => challengerCloud.reload(),
  "Challenger.remote": () => challengerCloud.resolve(true),
  "Challenger.local": () => challengerCloud.resolve(false),
  "Full.enter": () => Full.enterFull(),
  "Full.library": () => Full.enterFull(),
  "Full.create": () => Full.createFull(),
  "Full.open": (e) => Full.openFull(arg(e)),
  "Full.section": (e) => Full.sectionFull(arg(e)),
  "Full.round": (e) => Full.setFullRound((e as HTMLSelectElement).value),
  "Full.next": () => Full.nextFullRound(),
  "Full.simMatch": (e) => Full.simulateFullMatch(arg(e)),
  "Full.simRound": () => Full.simulateFullRound(),
  "Full.simLeague": () => Full.simulateFullRound(true),
  "Full.drawIntercontinental": () => Full.drawFullIntercontinental(),
  "Full.qualifierStage": (e) => Full.simulateFullQualifierStage(arg(e)),
  "Full.drawWorld": () => Full.drawFullWorld(),
  "Full.drawPlayoff": () => Full.drawFullPlayoff(),
  "Full.stage": (e) => Full.simulateFullStage(arg(e)),
  "Full.finish": () => Full.finishFull(),
  "Full.edit": (e) => Full.editFullMatch(arg(e)),
  "Full.match": (e) => Full.showFullMatch(arg(e)),
  "Full.dialogSim": () => Full.actFullMatchDialog(),
  "Full.dialogEdit": () => Full.actFullMatchDialog(true),
  "Full.team": (e) =>
    Full.showFullTeam(
      arg(e),
      e.dataset.arg1 === undefined ? undefined : Number(e.dataset.arg1),
    ),
  "Full.export": () => Full.exportFull(),
  "Full.exportOne": () => Full.exportFull(true),
  "Full.import": () => $("fullImport").click(),
  "Full.importFile": (e) => Full.importFull((e as HTMLInputElement).files?.[0]),
  "Full.restore": () => Full.restoreFull(),
  "Full.honours": () => Full.showFullHonours(),
  "Full.honourTeam": (e) =>
    Full.showFullHonours((e as HTMLSelectElement).value),
  "Full.sync": () => Full.reloadFullCloud(),
  "Full.remote": () => Full.resolveFullConflict(true),
  "Full.local": () => Full.resolveFullConflict(false),
  achievementView: (e) => selectView(arg(e)),
  achievementWorld: () => selectWorldwide(),
  achievementRegion: (e) => selectRegion(arg(e) as Region),
  achievementTeam: (e) => selectTeam(arg(e)),
  nextLeagueRound: () => nextLeagueRound(),
  navigate: (e) => navigate(arg(e) as AppTab),
  exportSave: () => exportSave(),
  importFile: () =>
    $(
      store.tab === "challenger"
        ? "challengerImport"
        : store.tab === "full-season"
          ? "fullImport"
          : "import",
    ).click(),
  closeDialog: (e) => ($(arg(e)) as HTMLDialogElement).close(),
  changeRound: (e) => {
    store.round += Number(arg(e));
    renderLeague();
  },
  selectRound: (e) => {
    store.round = Number((e as HTMLSelectElement).value);
    renderLeague();
  },
  editMatch: (e) => editMatch(arg(e)),
  updateScoreEditor: () => updateScoreEditor(),
  simulateEditorSet: (e) => simulateEditorSet(Number(arg(e))),
  clearEditorSets: (e) => clearEditorSets(Number(arg(e))),
  generateScore: () => generateScore(),
  selectStandingsRound: (e) =>
    selectStandingsRound((e as HTMLSelectElement).value),
  showTeamLeague: (e) =>
    showTeamLeague(
      arg(e),
      e.dataset.arg1 === undefined ? undefined : Number(e.dataset.arg1),
    ),
  simOne: (e) => league.simOne(arg(e)),
  simRound: () => league.simRound(),
  simLeague: () => league.simLeague(),
  startPlayin: () => league.startPlayin(),
  drawBracket: () => league.drawBracket(),
  simPlayin: () => league.simPlayin(),
  simStage: (e) => league.simStage(arg(e) as StageKey),
  openPlayoffMatch: (e) => playoffController.openPlayoffMatch(arg(e)),
  playoffSimOne: (e) => playoffController.playoffSimOne(arg(e)),
  playoffEditMatch: (e) => playoffController.playoffEditMatch(arg(e)),
  setPlayoffLayout: (e) =>
    playoffController.setPlayoffLayout(arg(e) as "tree" | "branches"),
  setDoubleView: (e) =>
    playoffController.setDoubleView(arg(e) as "upper" | "lower" | "grand"),
  "Seasons.start": () => getPorts().seasons.start(),
  "Seasons.customize": () => getPorts().seasons.customize(),
  "Seasons.requestNew": () =>
    store.tab === "tour"
      ? Tour.create()
      : store.tab === "challenger"
        ? Challenger.create()
        : store.tab === "full-season"
          ? Full.createFull()
          : getPorts().seasons.requestNew(),
  "Seasons.view": (e) => getPorts().seasons.view(arg(e)),
  "Seasons.resolve": (e) =>
    getPorts().seasons.resolve(arg(e), e.dataset.arg1 === "true"),
  "Settings.setPlayoffFormat": (e) =>
    getPorts().settings.setPlayoffFormat(arg(e) as PlayoffFormat),
  "Settings.setQuota": (e) =>
    getPorts().settings.setQuota(
      arg(e) as Region,
      (e as HTMLInputElement).value,
    ),
  "Settings.adjust": (e) =>
    getPorts().settings.adjust(arg(e) as Region, Number(e.dataset.arg1)),
  "Settings.toggle": (e) =>
    getPorts().settings.toggle(arg(e), (e as HTMLInputElement).checked),
  "Settings.top": (e) => getPorts().settings.top(arg(e) as Region),
  "Settings.defaults": () => getPorts().settings.defaults(),
  "Settings.next": () => getPorts().settings.next(),
  "Settings.back": () => getPorts().settings.back(),
  "Settings.review": () => getPorts().settings.review(),
  "Settings.apply": () => getPorts().settings.apply(),
  "Cloud.manualSave": () => getPorts().cloud.manualSave(),
  "Cloud.open": () => getPorts().cloud.open(),
  "Cloud.acceptLocal": () => getPorts().cloud.acceptLocal(),
  "Cloud.acceptOnline": () => getPorts().cloud.acceptOnline(),
  "Cloud.logout": () => getPorts().cloud.logout(),
  "Cloud.restoreBackup": () => getPorts().cloud.restoreBackup(),
  "Cloud.retry": () => getPorts().cloud.retry(),
  "Cloud.syncNow": () => getPorts().cloud.syncNow(),
};

export function initializeActions(): () => void {
  const handle = (event: Event) => {
    const element = (event.target as Element | null)?.closest<HTMLElement>(
      "[data-action]",
    );
    if (
      !element ||
      (element instanceof HTMLButtonElement && element.disabled) ||
      (element.dataset.trigger || "click") !== event.type
    )
      return;
    if (
      accountState.resetPending &&
      !["closeDialog", "Cloud.retry", "Cloud.logout", "Cloud.open"].includes(
        element.dataset.action || "",
      )
    )
      return;
    const action = actions[element.dataset.action || ""];
    if (!action) return;
    event.preventDefault();
    void action(element);
  };
  for (const name of ["click", "input", "change"])
    document.addEventListener(name, handle);
  return () => {
    for (const name of ["click", "input", "change"])
      document.removeEventListener(name, handle);
  };
}
