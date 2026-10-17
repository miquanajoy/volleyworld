import * as V from "../domain/index";
import { saveScoreEditor } from "../features/matches/editor";
import { $ } from "../shared/dom";
import { toast } from "../shared/feedback";
import { render, save, validSave } from "./application";
import { getPorts } from "./ports";
import { store } from "./store";

export function initializeForms() {
  $("scoreForm").onsubmit = (e) => {
    e.preventDefault();
    saveScoreEditor();
  };
  $("import").onchange = async () => {
    let f = $("import").files?.[0];
    if (!f) return;
    try {
      let data = JSON.parse(await f.text()),
        s = data.format === "volleyworld-seasons" ? data.active : data;
      if (!validSave(s)) throw Error();
      if (!confirm("Thay tiến độ hiện tại bằng file đã chọn?")) return;
      getPorts().cloud?.backupCurrent();
      if (data.format === "volleyworld-seasons")
        s = getPorts().seasons.importAll(data);
      store.state = V.ensureSeason(s);
      store.seasonView = null;
      getPorts().settings?.discard();
      store.round = Math.max(
        0,
        store.state.rounds.findIndex((r) => r.some((m) => !m.sets)),
      );
      store.tab = "home";
      save();
      render();
      toast("Đã khôi phục tiến độ");
    } catch {
      toast("File tiến độ không hợp lệ.");
    }
    $("import").value = "";
  };
}
