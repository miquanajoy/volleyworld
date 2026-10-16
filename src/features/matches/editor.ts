import { getPorts } from "../../app/ports";
import { store } from "../../app/store";
import { formHtml, team } from "../../components/team";
import * as V from "../../domain/index";
import { $, input as scoreInput } from "../../shared/dom";
import { findMatch, isLocked } from "./selectors";

export function editMatch(id: string) {
  if (!getPorts().seasons.editable()) return;
  let m = findMatch(id);
  if (!m || isLocked(m)) return;
  store.editId = id;
  store.editorSubmitted = false;
  $("editorTitle").textContent = "Nhập kết quả trận đấu";
  $("editorScoreboard").innerHTML = [m.a, m.b]
    .map(
      (id, i) =>
        `<div class="editor-team-row"><span class="match-team-info">${team(id, true, store.state)}${formHtml(id, store.state)}</span><b class="live-set-score" id="liveScore${i}" hidden></b></div>`,
    )
    .join("");
  $("setInputs").innerHTML =
    `<div class="score-column-labels"><span>SET</span><span>${m.a}</span><span></span><span>${m.b}</span></div>` +
    Array.from(
      { length: 5 },
      (_, i) =>
        `<div class="set-block" id="setBlock${i}"><div class="set-row"><label for="a${i}">Set ${i + 1}</label><input aria-label="${V.get(m.a).name} set ${i + 1}" aria-describedby="setError${i}" id="a${i}" type="number" min="0" step="1" inputmode="numeric" data-action="updateScoreEditor" data-trigger="input" value="${m.sets?.[i]?.[0] ?? ""}"><span>:</span><input aria-label="${V.get(m.b).name} set ${i + 1}" aria-describedby="setError${i}" id="b${i}" type="number" min="0" step="1" inputmode="numeric" data-action="updateScoreEditor" data-trigger="input" value="${m.sets?.[i]?.[1] ?? ""}"></div><p class="set-error" id="setError${i}" role="alert" hidden></p></div>`,
    ).join("");
  updateScoreEditor();
  $("editor").showModal();
}
export function readScoreInputs() {
  return Array.from({ length: 5 }, (_, i) =>
    ["a", "b"].map((side) => {
      const input = scoreInput(side + i);
      return input.validity?.badInput ? "invalid-number" : input.value;
    }),
  );
}
export function updateScoreEditor() {
  const result = V.inspectScoreInputs(readScoreInputs());
  for (let side = 0; side < 2; side++) {
    $("liveScore" + side).hidden = !result.hasPair;
    $("liveScore" + side).textContent = result.hasPair
      ? String(result.score[side])
      : "";
  }
  for (let i = 0; i < 5; i++) {
    const message = store.editorSubmitted ? result.errors[i] : "";
    $("setError" + i).textContent = message;
    $("setError" + i).hidden = !message;
    $("setBlock" + i).classList.toggle("set-invalid", !!message);
    for (const side of ["a", "b"])
      $(side + i).setAttribute("aria-invalid", message ? "true" : "false");
  }
  return result;
}
