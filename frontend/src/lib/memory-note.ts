/** 復習の一言(docs/design/2026-10-09-review-variety-design.md 5章)。答えのAPIの memory から、画面に出す文を作る */
export type MemoryEvent = { event: string; days: number | null };

export function memoryNoteText(memory: MemoryEvent | null | undefined): string | null {
  if (!memory) return null;
  switch (memory.event) {
    case "mastered":
      return "この問題を おぼえたよ！";
    case "recovered":
      return "前は まちがえたけど、今度は できたね！";
    case "almost":
      return "あと1回で マスター！";
    case "returned":
      return `${memory.days ?? 3}日ぶりに 正解！`;
    default:
      return null;
  }
}
