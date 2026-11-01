import { saveScoreEditor } from "../features/matches/editor";
import { $ } from "../shared/dom";
export function initializeForms() {
  $("scoreForm").onsubmit = (e) => {
    e.preventDefault();
    saveScoreEditor();
  };
}
