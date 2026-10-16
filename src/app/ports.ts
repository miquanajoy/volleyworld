import type { ManualSaveResult } from "../data/contracts";
import type {
  PlayoffFormat,
  SaveBundle,
  SeasonRecord,
  SeasonTournament,
  Tournament,
} from "../domain/types";
import type { AppTab } from "./store";

export interface SetupController {
  render(): void;
  discard(): void;
  setPlayoffFormat(mode: PlayoffFormat): void;
  setQuota(
    region: import("../domain/types").Region,
    value: number | string,
  ): void;
  adjust(region: import("../domain/types").Region, delta: number): void;
  defaults(): void;
  next(): void;
  back(): void;
  toggle(id: string, checked: boolean): void;
  top(region: import("../domain/types").Region): void;
  review(): void;
  apply(): void;
}
export interface HistoryController {
  capture(s: Tournament): void;
  pendingFor(s: Tournament): SeasonRecord[];
  ack(batch: SeasonRecord[], scope: string): void;
  mergeRemote(list: SeasonRecord[], scope: string): void;
  adopt(list: SeasonRecord[] | null): void;
  historyFailed(scope: string): void;
  restoreRecords(list: SeasonRecord[]): boolean;
  acceptRemote(): void;
  canCustomize(): boolean;
  editable(): boolean;
  customize(): void;
  resolve(choice: string, customizing?: boolean): Promise<void>;
  requestNew(): void;
  start(): void;
  replaceRoster(
    selected: string[],
    playoffFormat?: PlayoffFormat,
  ): boolean | undefined;
  home(): void;
  history(): void;
  view(id: string): Promise<void>;
  results(): void;
  localRecords(): SeasonRecord[];
  exportAll(): Promise<SaveBundle>;
  importAll(bundle: SaveBundle): SeasonTournament;
  progress(s: Tournament): string;
}
export interface AccountController {
  manualSave(): Promise<ManualSaveResult>;
  fetchSeason(id: string): Promise<SeasonTournament | undefined>;
  loadHistory(): Promise<void>;
  backupCurrent(): void;
  open(): void;
  changed(s: Tournament): void;
  storageKey(): string;
  acceptOnline(): Promise<void>;
  acceptLocal(): Promise<void>;
  retry(): Promise<void>;
  syncNow(): Promise<void>;
  logout(): Promise<void>;
  restoreBackup(): void;
}
export interface ApplicationCommands {
  save(): boolean;
  render(): void;
  navigate(tab: AppTab): void;
  toast(text: string): void;
  exportSave(): Promise<void>;
  editMatch(id: string): void;
  renderTable(): void;
  renderPlayoff(): void;
}
export interface RuntimePorts {
  commands: ApplicationCommands;
  seasons: HistoryController;
  settings: SetupController;
  cloud: AccountController;
}
let ports: RuntimePorts | undefined;
export function registerPorts(value: RuntimePorts): void {
  ports = value;
}
export function getPorts(): RuntimePorts {
  if (!ports) throw Error("Application ports have not been registered");
  return ports;
}
