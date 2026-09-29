/**
 * 数字の後の「日」「人」の読み(自動ふりがなで使う)。「日」は何日間の読み(7日=なのか)、
 * 「人」は人数の読み(1人=ひとり)。9999より大きい数は読みを作らない(null)
 */

const DIGITS = ["", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう"];
const HUNDREDS: Record<number, string> = { 1: "ひゃく", 3: "さんびゃく", 6: "ろっぴゃく", 8: "はっぴゃく" };
const THOUSANDS: Record<number, string> = { 1: "せん", 3: "さんぜん", 8: "はっせん" };

/** 数の読み。ones は一の位の読みを替えるとき(17日の「しち」など) */
export function numberKana(n: number, ones: Partial<Record<number, string>> = {}): string | null {
  if (!Number.isInteger(n) || n < 1 || n > 9999) return null;
  const [th, h, t, o] = [Math.floor(n / 1000), Math.floor(n / 100) % 10, Math.floor(n / 10) % 10, n % 10];
  return [
    th ? (THOUSANDS[th] ?? `${DIGITS[th]}せん`) : "",
    h ? (HUNDREDS[h] ?? `${DIGITS[h]}ひゃく`) : "",
    t ? `${t === 1 ? "" : DIGITS[t]}じゅう` : "",
    o ? (ones[o] ?? DIGITS[o]) : "",
  ].join("");
}

const DAYS: Record<number, string> = {
  1: "いちにち",
  2: "ふつか",
  3: "みっか",
  4: "よっか",
  5: "いつか",
  6: "むいか",
  7: "なのか",
  8: "ようか",
  9: "ここのか",
  10: "とおか",
  20: "はつか",
};

/** 何日間の読み。14日・24日などは「よっか」、ほかは「〜にち」(17日=じゅうしちにち、19日=じゅうくにち) */
export function dayReading(n: number): string | null {
  if (DAYS[n]) return DAYS[n];
  if (n > 10 && n % 10 === 4) {
    const head = numberKana(n - 4);
    return head === null ? null : `${head}よっか`;
  }
  const kana = numberKana(n, { 7: "しち", 9: "く" });
  return kana === null ? null : `${kana}にち`;
}

/** 人数の読み(1人=ひとり、2人=ふたり、4人=よにん) */
export function peopleReading(n: number): string | null {
  if (n === 1) return "ひとり";
  if (n === 2) return "ふたり";
  const kana = numberKana(n, { 4: "よ" });
  return kana === null ? null : `${kana}にん`;
}

/** text の i 文字目から「数字＋日/人」なら、その長さと読み。違えば null */
export function counterAt(text: string, i: number): { length: number; reading: string } | null {
  const match = /^(\d+)([日人])/.exec(text.slice(i));
  if (!match) return null;
  const n = Number(match[1]);
  const reading = match[2] === "日" ? dayReading(n) : peopleReading(n);
  return reading === null ? null : { length: match[0].length, reading };
}
