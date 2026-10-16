import type { StageDefinition } from "../../types";
import { pairRound, source } from "../shared-rules";
export function doubleStages(upper: StageDefinition[]): StageDefinition[] {
  const lower1 = pairRound(
    "lower1",
    "Nhánh thua · Vòng 1",
    "r16",
    4,
    "D1-",
    "l",
    "lower",
  );
  const lower2: StageDefinition = {
    key: "lower2",
    label: "Nhánh thua · Vòng 2",
    count: 4,
    prefix: "D2-",
    kind: "lower",
    pairs: Array.from({ length: 4 }, (_, i) => [
      source("w", "lower1", i),
      source("l", "qf", i ^ 1),
    ]),
  };
  const lower3 = pairRound(
    "lower3",
    "Nhánh thua · Vòng 3",
    "lower2",
    2,
    "D3-",
    "w",
    "lower",
  );
  const lower4: StageDefinition = {
    key: "lower4",
    label: "Nhánh thua · Vòng 4",
    count: 2,
    prefix: "D4-",
    kind: "lower",
    pairs: Array.from({ length: 2 }, (_, i) => [
      source("w", "lower3", i),
      source("l", "sf", i ^ 1),
    ]),
  };
  const lower5 = pairRound(
    "lower5",
    "Nhánh thua · Vòng 5",
    "lower4",
    1,
    "D5-",
    "w",
    "lower",
  );
  const lower6: StageDefinition = {
    key: "lower6",
    label: "Chung kết nhánh thua",
    count: 1,
    prefix: "D6-",
    kind: "lower",
    pairs: [[source("w", "lower5", 0), source("l", "final", 0)]],
  };
  const gf: StageDefinition = {
    key: "gf",
    label: "Chung kết tổng · Trận 1",
    count: 1,
    prefix: "G",
    kind: "grand",
    pairs: [[source("w", "final", 0), source("w", "lower6", 0)]],
  };
  const reset: StageDefinition = {
    key: "reset",
    label: "Chung kết tổng · Trận quyết định",
    count: 1,
    prefix: "G",
    offset: 1,
    kind: "grand",
    pairs: [[source("a", "gf", 0), source("b", "gf", 0)]],
    reset: true,
  };
  return [
    upper[0],
    lower1,
    upper[1],
    lower2,
    lower3,
    upper[2],
    lower4,
    lower5,
    upper[3],
    lower6,
    gf,
    reset,
  ];
}
