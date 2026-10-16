import { getPorts } from "../../app/ports";
import { store } from "../../app/store";
import { formHtml, team } from "../../components/team";
import * as V from "../../domain/index";
import { $, input as scoreInput } from "../../shared/dom";
import { findMatch, isLocked } from "./selectors";

let draftSeason: string | undefined;
let draftScope: string | undefined;

export function editMatch(id: string) {
  if (!getPorts().seasons.editable()) return;
  let m = findMatch(id);
  if (!m || isLocked(m)) return;
  draftSeason = store.state.seasonId;
  draftScope = getPorts().cloud?.storageKey();
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
    `<details class="score-generator"><summary>Tạo kết quả theo ý bạn</summary><p class="sub">Chọn đội thắng và tỷ số. Điểm tạo mới sẽ thay toàn bộ điểm nháp; chỉ ghi nhận khi bấm Lưu kết quả.</p><div class="score-generator-controls"><label>Đội thắng<select id="generatedWinner"><option value="0">${V.get(m.a).name}</option><option value="1">${V.get(m.b).name}</option></select></label><label>Tỷ số<select id="generatedLosses"><option value="0">3–0</option><option value="1">3–1</option><option value="2">3–2</option></select></label><button type="button" data-action="generateScore">Tạo điểm set</button></div></details><p class="score-draft-status sub" id="scoreDraftStatus" role="status"></p><div class="score-column-labels"><span>SET</span><span>${m.a}</span><span></span><span>${m.b}</span></div>` +
    Array.from(
      { length: 5 },
      (_, i) =>
        `<div class="set-block" id="setBlock${i}"><div class="set-row"><div class="set-label"><label for="a${i}">Set ${i + 1}</label><button type="button" class="set-play" id="setPlay${i}" data-action="simulateEditorSet" data-arg="${i}" aria-label="Mô phỏng Set ${i + 1}" title="Mô phỏng Set ${i + 1}">▶</button><button type="button" class="set-clear" id="setClear${i}" data-action="clearEditorSets" data-arg="${i}" aria-label="Xóa từ Set ${i + 1}" title="Xóa set này và các set sau">↺</button></div><input aria-label="${V.get(m.a).name} set ${i + 1}" aria-describedby="setError${i}" id="a${i}" type="number" min="0" step="1" inputmode="numeric" data-action="updateScoreEditor" data-trigger="input" value="${m.sets?.[i]?.[0] ?? ""}"><span>:</span><input aria-label="${V.get(m.b).name} set ${i + 1}" aria-describedby="setError${i}" id="b${i}" type="number" min="0" step="1" inputmode="numeric" data-action="updateScoreEditor" data-trigger="input" value="${m.sets?.[i]?.[1] ?? ""}"></div><p class="set-error" id="setError${i}" role="alert" hidden></p></div>`,
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
  let prefix = 0,
    aw = 0,
    bw = 0;
  const rows = readScoreInputs();
  while (prefix < 5 && aw < 3 && bw < 3) {
    const pair = rows[prefix];
    if (pair.some((v) => v === "") || result.errors[prefix]) break;
    Number(pair[0]) > Number(pair[1]) ? aw++ : bw++;
    prefix++;
  }
  const finished = aw === 3 || bw === 3;
  $("scoreDraftStatus").textContent = finished
    ? "Đã đủ kết quả · bấm Lưu kết quả để ghi nhận trận đấu."
    : `Nhập điểm hoặc bấm ▶ để mô phỏng Set ${Math.min(prefix + 1, 5)}.`;
  for (let i = 0; i < 5; i++) {
    const filled = rows[i].some((v) => v !== "");
    $("setBlock" + i).hidden = !filled && (i > prefix || finished);
    $("setPlay" + i).hidden = i !== prefix || finished || filled;
    $("setClear" + i).hidden = !filled;
    const message = store.editorSubmitted ? result.errors[i] : "";
    $("setError" + i).textContent = message;
    $("setError" + i).hidden = !message;
    $("setBlock" + i).classList.toggle("set-invalid", !!message);
    for (const side of ["a", "b"])
      $(side + i).setAttribute("aria-invalid", message ? "true" : "false");
  }
  return result;
}

function editableMatch() {
  if (
    !$("editor").open ||
    !getPorts().seasons.editable() ||
    store.state.seasonId !== draftSeason ||
    getPorts().cloud?.storageKey() !== draftScope
  )
    return null;
  const m = findMatch(store.editId);
  return m && !isLocked(m) ? m : null;
}
export function clearEditorSets(index: number) {
  if (!editableMatch() || !Number.isInteger(index) || index < 0 || index > 4)
    return;
  for (let i = index; i < 5; i++)
    for (const side of ["a", "b"]) scoreInput(side + i).value = "";
  store.editorSubmitted = false;
  updateScoreEditor();
}
export function simulateEditorSet(index: number) {
  const m = editableMatch();
  if (!m || !Number.isInteger(index) || index < 0 || index > 4) return;
  updateScoreEditor();
  if ($("setPlay" + index).hidden) return;
  const pair = V.simulateSet(m, index);
  pair.forEach((value, side) => {
    scoreInput((side ? "b" : "a") + index).value = String(value);
  });
  store.editorSubmitted = false;
  updateScoreEditor();
}
export function generateScore() {
  const m = editableMatch();
  if (!m) return;
  const winner = Number(($("generatedWinner") as HTMLSelectElement).value),
    losses = Number(($("generatedLosses") as HTMLSelectElement).value);
  if (
    (winner !== 0 && winner !== 1) ||
    (losses !== 0 && losses !== 1 && losses !== 2)
  )
    return;
  const sets = V.simulateChosenResult(m, winner, losses);
  for (let i = 0; i < 5; i++)
    for (const [side, key] of ["a", "b"].entries())
      scoreInput(key + i).value = sets[i] ? String(sets[i][side]) : "";
  store.editorSubmitted = false;
  updateScoreEditor();
}
