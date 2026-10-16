import { defaultIds } from "../../data/teams";
import { match } from "../match/factory";
import { shuffle } from "../shared/random";
import type { PlayoffFormat, SeasonTournament } from "../types";
import { ensureSeason } from "./metadata";
import { validRoster } from "./roster";

export function fresh(
  selected: string[] = defaultIds,
  playoffFormat: PlayoffFormat = "single",
): SeasonTournament {
  if (!["single", "double"].includes(playoffFormat))
    throw Error("Thể thức playoff không hợp lệ.");
  if (!validRoster(selected))
    throw Error("Danh sách cần đủ 32 đội, không trùng, đúng giới hạn khu vực.");
  let ring = shuffle(selected),
    rounds = [];
  for (let r = 0; r < 31; r++) {
    let ms = [];
    for (let i = 0; i < 16; i++)
      ms.push(match(ring[i], ring[31 - i], `L${r}-${i}`));
    rounds.push(ms);
    ring.splice(1, 0, ring.pop()!);
  }
  return ensureSeason(
    {
      version: 1,
      playoffFormat,
      teamIds: [...selected],
      rounds,
      tie: shuffle(selected),
      playin: null,
      bracket: null,
    },
    true,
  );
}
