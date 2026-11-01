import * as V from "../domain/index";
import { initializeStore } from "./store";
import { registerRenderer } from "./ports";
import { render } from "./application";
import { initializeForms } from "./form-bindings";
export function bootstrap() {
  // Shared score-editor cursor only; never persists an independent League save.
  initializeStore(V.fresh());
  registerRenderer(render);
  initializeForms();
  render();
}
