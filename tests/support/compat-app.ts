// Test-only facade for the main branch's historical VM regressions.
import { bootstrap } from "../../src/app/bootstrap";
import * as app from "../../src/app/application";
import * as settings from "../../src/features/setup/controller";
import * as seasons from "../../src/features/seasons/controller";
import * as cloud from "../../src/features/account/controller";
import * as league from "../../src/features/league/controller";
import * as leagueViews from "../../src/features/league/views";
import * as qualificationViews from "../../src/features/league/qualification-view";
import * as playoff from "../../src/features/playoff/views";
import * as playoffController from "../../src/features/playoff/controller";
import * as editor from "../../src/features/matches/editor";
import * as selectors from "../../src/features/matches/selectors";
import * as display from "../../src/app/selectors";
import * as teams from "../../src/components/team";
import * as cards from "../../src/components/match-card";
import { store } from "../../src/app/store";
const target = globalThis as unknown as Record<string, unknown>;
const previousCloud = target.Cloud;
bootstrap(
  (previousCloud || { ...cloud, backupCurrent: cloud.backup }) as Parameters<
    typeof bootstrap
  >[0],
);
Object.assign(
  target,
  app,
  league,
  leagueViews,
  qualificationViews,
  playoff,
  playoffController,
  editor,
  selectors,
  display,
  teams,
  cards,
  { Seasons: seasons, Settings: settings },
);
for (const key of [
  "state",
  "tab",
  "round",
  "search",
  "editId",
  "seasonView",
  "editorSubmitted",
  "playoffLayout",
  "doubleView",
] as const)
  Object.defineProperty(target, key, {
    configurable: true,
    get: () => store[key],
    set: (value) => Reflect.set(store, key, value),
  });
target.__initializeCloud = (client?: Parameters<typeof cloud.init>[0]) =>
  cloud.init(client);
target.__account = { ...cloud, backupCurrent: cloud.backup };
target.__installAccount = () => {
  const ports = getPorts();
  registerPorts({ ...ports, cloud: target.__account as typeof ports.cloud });
  target.Cloud = target.__account;
};
import { getPorts, registerPorts } from "../../src/app/ports";

import { initializeActions } from "../../src/app/actions";
target.__initializeActions = initializeActions;

target.__ports = getPorts;
