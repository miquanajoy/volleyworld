import { readInitialTournament } from "../data/local/tournament-storage";
import * as domain from "../domain/index";
import * as cloud from "../features/account/controller";
import { renderTable } from "../features/league/views";
import { editMatch } from "../features/matches/editor";
import { renderPlayoff } from "../features/playoff/views";
import * as seasons from "../features/seasons/controller";
import * as settings from "../features/setup/controller";
import { toast } from "../shared/feedback";
import * as commands from "./application";
import { initializeForms } from "./form-bindings";
import type { AccountController } from "./ports";
import { registerPorts } from "./ports";
import { initializeStore } from "./store";

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
