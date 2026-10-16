import type { Match, TeamId } from "../types";

export const match = (a: TeamId, b: TeamId, id: string): Match => ({
  id,
  a,
  b,
  sets: null,
});
