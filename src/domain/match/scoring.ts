import type { Match, ScoreInput, ScoreInspection, SetScore } from "../types";

export function score(m: Match): SetScore {
  let a = 0,
    b = 0;
  for (const [x, y] of m.sets || []) x > y ? a++ : b++;
  return [a, b];
}

export const winner = (m: Match) =>
  m.sets ? (score(m)[0] === 3 ? m.a : m.b) : null;

export const loser = (m: Match) =>
  m.sets ? (winner(m) === m.a ? m.b : m.a) : null;

export function validate(sets: SetScore[]): boolean {
  if (!Array.isArray(sets) || sets.length < 3 || sets.length > 5) return false;
  let w = 0,
    l = 0;
  for (let i = 0; i < sets.length; i++) {
    if (w === 3 || l === 3) return false;
    let [a, b] = sets[i],
      t = i === 4 ? 15 : 25;
    if (
      !Number.isInteger(a) ||
      !Number.isInteger(b) ||
      a < 0 ||
      b < 0 ||
      Math.max(a, b) < t ||
      Math.abs(a - b) < 2
    )
      return false;
    if (Math.max(a, b) > t && Math.abs(a - b) !== 2) return false;
    a > b ? w++ : l++;
  }
  return w === 3 || l === 3;
}

export function inspectScoreInputs(rows: ScoreInput[][]): ScoreInspection {
  const errors = Array(5).fill(""),
    focusSides = Array(5).fill(0),
    sets: SetScore[] = [],
    pair = (x: ScoreInput) => x !== "" && x !== null && x !== undefined;
  let aw = 0,
    bw = 0,
    gap = false,
    prefix = true,
    hasPair = false,
    lastFilled = -1;
  for (let i = 0; i < 5; i++)
    if (pair(rows[i]?.[0]) || pair(rows[i]?.[1])) lastFilled = i;
  for (let i = 0; i < 5; i++) {
    const a = rows[i]?.[0] ?? "",
      b = rows[i]?.[1] ?? "",
      pa = pair(a),
      pb = pair(b),
      target = i === 4 ? 15 : 25;
    if (pa && pb) hasPair = true;
    if (aw === 3 || bw === 3) {
      if (pa || pb)
        errors[i] =
          `Trận đã kết thúc trước Set ${i + 1}. Hãy xóa điểm set này.`;
      continue;
    }
    if (!pa && !pb) {
      if (i <= lastFilled) {
        errors[i] =
          `Nhập đủ điểm Set ${i + 1}; không bỏ trống trước set tiếp theo.`;
        gap = true;
        prefix = false;
      } else if (prefix && aw < 3 && bw < 3) {
        errors[i] =
          lastFilled < 0
            ? "Nhập điểm cho Set 1."
            : `Trận chưa kết thúc. Nhập Set ${i + 1} để có đội thắng 3 set.`;
        prefix = false;
      }
      continue;
    }
    if (!pa || !pb) {
      errors[i] = `Set ${i + 1}: nhập đủ điểm của cả hai đội.`;
      focusSides[i] = pa ? 1 : 0;
      prefix = false;
      continue;
    }
    const x = Number(a),
      y = Number(b);
    if (
      !Number.isSafeInteger(x) ||
      !Number.isSafeInteger(y) ||
      x < 0 ||
      y < 0
    ) {
      errors[i] = "Điểm phải là số nguyên không âm.";
      focusSides[i] = !Number.isSafeInteger(x) || x < 0 ? 0 : 1;
      prefix = false;
      continue;
    }
    if (x === y) errors[i] = `Set ${i + 1} không thể kết thúc với tỷ số hòa.`;
    else if (Math.max(x, y) < target)
      errors[i] = `Set ${i + 1}: đội thắng phải đạt ít nhất ${target} điểm.`;
    else if (Math.abs(x - y) < 2)
      errors[i] = `Set ${i + 1}: cần cách biệt ít nhất 2 điểm.`;
    else if (Math.max(x, y) > target && Math.abs(x - y) !== 2)
      errors[i] =
        `Set ${i + 1}: sau mốc ${target}, phải kết thúc ngay khi hơn 2 điểm (ví dụ ${target + 1}–${target - 1}).`;
    if (errors[i]) {
      prefix = false;
      continue;
    }
    if (gap) {
      prefix = false;
      continue;
    }
    sets.push([x, y]);
    if (prefix) {
      x > y ? aw++ : bw++;
    }
  }
  return {
    errors,
    focusSides,
    sets,
    score: [aw, bw],
    hasPair,
    valid: !errors.some(Boolean) && validate(sets),
  };
}
