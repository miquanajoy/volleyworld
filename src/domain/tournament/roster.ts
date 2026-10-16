import { defaultIds, get, limits } from "../../data/teams";
import type { Region, RegionQuotas, Team, TeamId, Tournament } from "../types";

export const ids = (s: Tournament): TeamId[] => s.teamIds || defaultIds;

export const participants = (s: Tournament): Team[] => ids(s).map(get);

export const quotas = (list: TeamId[]): RegionQuotas =>
  Object.fromEntries(
    (Object.keys(limits) as Region[]).map((r) => [
      r,
      list.filter((id) => get(id)?.region === r).length,
    ]),
  ) as RegionQuotas;

export function validRoster(list: string[]): boolean {
  if (
    !Array.isArray(list) ||
    list.length !== 32 ||
    new Set(list).size !== 32 ||
    !list.every((id) => get(id))
  )
    return false;
  let q = quotas(list);
  return (Object.keys(limits) as Region[]).every(
    (r) => q[r] >= limits[r].min && q[r] <= limits[r].max,
  );
}
