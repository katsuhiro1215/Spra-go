/** 単語帳(docs/design/2026-10-07-word-book-design.md) */

export type WordStatus = "weak" | "learned" | null;

export type WordMeaning = { pos: string; ja: string[] };

/** 一覧の1語 */
export type WordListItem = {
  id: number;
  word: string;
  pos: string | null;
  importance: number;
  meaning: string;
  status: WordStatus;
  saved: boolean;
};

export type WordList = { data: WordListItem[]; page: number; last_page: number; total: number };

/** 詳細。似た語の id は、出会った語だけ(null の語は、詳細へ行けない) */
export type WordDetail = {
  id: number;
  word: string;
  level: number;
  pos: string | null;
  cefr: string | null;
  importance: number;
  ipa: string | null;
  meanings: WordMeaning[];
  usage: string | null;
  examples: { text: string; translation?: string }[];
  synonyms: { term: string; note: string; id: number | null }[];
  status: WordStatus;
  saved: boolean;
};

export type WordFilter = "all" | "saved" | "weak" | "learned";

export const WORD_FILTERS: { key: WordFilter; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "saved", label: "単語帳" },
  { key: "weak", label: "苦手" },
  { key: "learned", label: "覚えた" },
];

/** 重要度の★(1〜3に丸める) */
export function starsText(importance: number): string {
  const count = Math.min(3, Math.max(1, Math.round(importance)));
  return "★".repeat(count) + "☆".repeat(3 - count);
}

/** 意味を、品詞ごとの行にする(例: 【名】理由、根拠)。意味のない品詞は出さない */
export function meaningLines(meanings: WordMeaning[]): { label: string; text: string }[] {
  return meanings.filter((m) => m.ja.length > 0).map((m) => ({ label: `【${m.pos}】`, text: m.ja.join("、") }));
}

/** 一覧の並びで、次の語の番号。最後・一覧にない語は null */
export function nextWordId(ids: number[], current: number): number | null {
  const index = ids.indexOf(current);
  return index >= 0 && index + 1 < ids.length ? ids[index + 1] : null;
}

/** 苦手・覚えたのボタンを押したあとの状態。同じボタンをもう一度押すと外れる */
export function statusAfterToggle(current: WordStatus, pressed: "weak" | "learned"): WordStatus {
  return current === pressed ? null : pressed;
}

/** 「使われる場面」があるか(空白だけは、ない) */
export function hasContext(word: Pick<WordDetail, "usage">): boolean {
  return (word.usage ?? "").trim() !== "";
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const LIST_KEY = "spra:word-list";

function sessionStore(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** いま見ている一覧の語の番号の列を覚えておく(詳細の「次へ」で使う)。保存できない端末では何もしない */
export function saveWordList(ids: number[], storage: StorageLike | null = sessionStore()): void {
  try {
    storage?.setItem(LIST_KEY, JSON.stringify(ids));
  } catch {
    // 保存できなくても、「次へ」が出ないだけ
  }
}

export function loadWordList(storage: StorageLike | null = sessionStore()): number[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(LIST_KEY) ?? "[]");
    return Array.isArray(parsed) && parsed.every((id) => typeof id === "number") ? parsed : [];
  } catch {
    return [];
  }
}
