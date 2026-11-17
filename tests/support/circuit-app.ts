import { bootstrap } from "../../src/app/bootstrap";
import { initializeActions } from "../../src/app/actions";
import * as Circuit from "../../src/features/circuit/controller";
import * as Model from "../../src/features/circuit/model";
import { registerAccountArchive } from "../../src/features/account/controller";
registerAccountArchive(Circuit.cloud, Circuit.restore);
Circuit.initializeCircuit();
bootstrap(Circuit.renderCircuit);
initializeActions();
(globalThis as unknown as Record<string, unknown>).__circuit = {
  ...Circuit,
  ...Model,
};
