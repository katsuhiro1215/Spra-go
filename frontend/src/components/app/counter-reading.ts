/**
 * 数字の後の「日」「人」「月」の読み(自動ふりがなで使う)。「日」は何日間の読み(7日=なのか)、
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

const MONTHS: Record<number, string> = {
  1: "いちがつ",
  2: "にがつ",
  3: "さんがつ",
  4: "しがつ",
  5: "ごがつ",
  6: "ろくがつ",
  7: "しちがつ",
  8: "はちがつ",
  9: "くがつ",
  10: "じゅうがつ",
  11: "じゅういちがつ",
  12: "じゅうにがつ",
};

/** 暦の月の読み(10月=じゅうがつ)。1〜12以外は null(「3か月」の「月」は数字の直後でないので、ここに来ない) */
export function monthReading(n: number): string | null {
  return MONTHS[n] ?? null;
}

/** 漢数字(一〜九十九)を数にする。それ以外は null */
export function kanjiNumber(text: string): number | null {
  const digit = "一二三四五六七八九";
  const m = /^([一二三四五六七八九]?)(十?)([一二三四五六七八九]?)$/.exec(text);
  if (!m || text === "") return null;
  const [, head, ten, tail] = m;
  if (ten === "") return head !== "" && tail === "" ? digit.indexOf(head) + 1 : null;
  return (head === "" ? 1 : digit.indexOf(head) + 1) * 10 + (tail === "" ? 0 : digit.indexOf(tail) + 1);
}

/** 「つ」で数える読み(一つ=ひとつ。1〜9だけ) */
const TSU = ["", "ひとつ", "ふたつ", "みっつ", "よっつ", "いつつ", "むっつ", "ななつ", "やっつ", "ここのつ"];

/**
 * 数によって、数のほうが促音・数え方のほうが濁音・半濁音に変わる数え方。
 * base: ふつうの読み。sokuon: 数が「いっ・ろっ・はっ・じゅっ」になる一の位。
 * voiced: 濁る一の位(3本=さんぼん)。semi: 半濁音になる一の位(1本=いっぽん)。1〜99まで
 */
type Voicing = { base: string; semi?: string; voiced?: string; sokuon: number[]; semiDigits?: number[]; voicedDigits?: number[] };

const SOKUON_HEAD: Record<number, string> = { 1: "いっ", 6: "ろっ", 8: "はっ" };

const VOICING: Record<string, Voicing> = {
  本: { base: "ほん", semi: "ぽん", voiced: "ぼん", sokuon: [1, 6, 8, 0], semiDigits: [1, 6, 8, 0], voicedDigits: [3] },
  匹: { base: "ひき", semi: "ぴき", voiced: "びき", sokuon: [1, 6, 8, 0], semiDigits: [1, 6, 8, 0], voicedDigits: [3] },
  杯: { base: "はい", semi: "ぱい", voiced: "ばい", sokuon: [1, 6, 8, 0], semiDigits: [1, 6, 8, 0], voicedDigits: [3] },
  分: { base: "ふん", semi: "ぷん", sokuon: [1, 6, 8, 0], semiDigits: [1, 3, 4, 6, 8, 0] },
  階: { base: "かい", voiced: "がい", sokuon: [1, 6, 8, 0], voicedDigits: [3] },
  回: { base: "かい", sokuon: [1, 6, 8, 0] },
  個: { base: "こ", sokuon: [1, 6, 8, 0] },
  冊: { base: "さつ", sokuon: [1, 8, 0] },
  歳: { base: "さい", sokuon: [1, 8, 0] },
  頭: { base: "とう", sokuon: [1, 8, 0] },
};

/** 数 n(1〜99)+数え方 counter の読み。対応しない数え方・数は null */
export function voicedReading(n: number, counter: string): string | null {
  const rule = VOICING[counter];
  if (!rule || !Number.isInteger(n) || n < 1 || n > 99) return null;
  if (counter === "歳" && n === 20) return "はたち";
  const d = n % 10;
  const tens = n - d;
  const sokuon = rule.sokuon.includes(d);
  let head: string;
  if (d === 0) {
    // 10・20…は、「じゅう」が「じゅっ」になる(10本=じゅっぽん)。sokuon に 0 がないときは、そのまま
    const kana = numberKana(tens) ?? "";
    head = sokuon ? kana.replace(/じゅう$/, "じゅっ") : kana;
  } else {
    const ones = sokuon ? SOKUON_HEAD[d] : undefined;
    head = numberKana(n, ones ? { [d]: ones } : {}) ?? "";
  }
  const tail = rule.semiDigits?.includes(d) ? rule.semi : rule.voicedDigits?.includes(d) ? rule.voiced : rule.base;
  return `${head}${tail}`;
}

/** 数字(1〜9)+つの読み */
export function tsuReading(n: number): string | null {
  return n >= 1 && n <= 9 ? TSU[n] : null;
}

/** 数字(アラビア数字)の後ろで、数によって読みが変わる数え方 */
const DIGIT_COUNTERS = "つ日人月本匹杯分階";
/** 漢数字の後ろで読む数え方。「十分」(じゅうぶん)があるので、分は含めない */
const KANJI_COUNTERS = "つ日人月本匹杯階回個冊歳頭";

/**
 * text の i 文字目から「数+数え方」なら、その長さと読み。違えば null。
 * 日付(「1月1日」)の1日は「ついたち」。漢数字は一〜九十九、アラビア数字は 9999 まで
 */
export function counterAt(text: string, i: number): { length: number; reading: string } | null {
  const rest = text.slice(i);
  const digits = /^(\d+)([つ日人月本匹杯分階])/.exec(rest);
  const kanji = digits ? null : /^([一二三四五六七八九十]+)([つ日人月本匹杯階回個冊歳頭])/.exec(rest);
  const match = digits ?? kanji;
  if (!match) return null;
  const counter = match[2];
  if (!(digits ? DIGIT_COUNTERS : KANJI_COUNTERS).includes(counter)) return null;
  const n = digits ? Number(match[1]) : kanjiNumber(match[1]);
  if (n === null) return null;
  // 漢数字の「一月」は、ひとつき・いちがつのどちらもあるので、読みを付けない
  if (kanji && counter === "月" && n === 1) return null;

  let reading: string | null;
  if (counter === "日") {
    const afterMonth = text[i - 1] === "月";
    reading = afterMonth && n === 1 ? "ついたち" : dayReading(n);
  } else if (counter === "月") reading = monthReading(n);
  else if (counter === "人") reading = peopleReading(n);
  else if (counter === "つ") reading = tsuReading(n);
  else reading = voicedReading(n, counter);

  return reading === null ? null : { length: match[0].length, reading };
}
