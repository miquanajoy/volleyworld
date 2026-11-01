import { readInitialTournament } from "../../src/data/local/tournament-storage";
import * as domain from "../../src/domain/index";
import * as cloud from "./legacy-account";
import { renderTable } from "../../src/features/league/views";
import { editMatch } from "../../src/features/matches/editor";
import { renderPlayoff } from "../../src/features/playoff/views";
import * as seasons from "../../src/features/seasons/controller";
import * as settings from "../../src/features/setup/controller";
import { toast } from "../../src/shared/feedback";
import * as commands from "./legacy-application";
import { initializeForms } from "./legacy-form-bindings";
import type { AccountController } from "../../src/app/ports";
import { registerPorts } from "../../src/app/ports";
import { initializeStore } from "../../src/app/store";

export function bootstrap(
  account: AccountController = { ...cloud, backupCurrent: cloud.backup },
) {
  initializeStore(
    domain.ensureSeason(
      readInitialTournament(localStorage, () => domain.fresh()),
    ),
  );
  registerPorts({
    commands: { ...commands, editMatch, renderTable, renderPlayoff, toast },
    seasons,
    settings,
    cloud: account,
  });
  initializeForms();
  commands.save();
  commands.render();
}
