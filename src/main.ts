import {
  renderCircuit,
  initializeCircuit,
  cloud,
  restore,
} from "./features/circuit/controller";
import { registerAccountArchive } from "./features/account/controller";
import { initializeActions } from "./app/actions";
import { bootstrap } from "./app/bootstrap";
import { init, initializeAccountEvents } from "./features/account/controller";
import "./styles/app.css";
import "./styles/enhancements.css";
import "./styles/tour.css";
import "./styles/circuit.css";
registerAccountArchive(cloud, restore);
initializeCircuit();
bootstrap(renderCircuit);
initializeActions();
initializeAccountEvents();
void init();
