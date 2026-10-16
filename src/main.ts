import { initializeActions } from "./app/actions";
import { bootstrap } from "./app/bootstrap";
import { init, initializeAccountEvents } from "./features/account/controller";
import "./styles/app.css";
bootstrap();
initializeActions();
initializeAccountEvents();
void init();
