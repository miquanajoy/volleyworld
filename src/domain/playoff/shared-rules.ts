import type {
  StageDefinition,
  StageKey,
  StageOutcome,
  StageSource,
} from "../types";
export const source = (
  outcome: StageOutcome,
  key: StageKey,
  i: number,
): StageSource => [outcome, key, i];
export const pairRound = (
  key: StageKey,
  label: string,
  from: StageKey,
  count: number,
  prefix: string,
  outcome: StageOutcome = "w",
  kind: StageDefinition["kind"] = "upper",
): StageDefinition => ({
  key,
  label,
  count,
  prefix,
  kind,
  pairs: Array.from({ length: count }, (_, i) => [
    source(outcome, from, i * 2),
    source(outcome, from, i * 2 + 1),
  ]),
});
