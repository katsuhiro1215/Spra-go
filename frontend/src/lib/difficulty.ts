export const DIFFICULTY_READINGS: Record<string, string> = {
  初級: "しょきゅう",
  中級: "ちゅうきゅう",
  上級: "じょうきゅう",
  最高難易度: "さいこうなんいど",
};

const BASE_DIFFICULTIES = ["初級", "中級", "上級"];

/** コース画面に並べる級。3級に加えて、最高難易度のステージがあるコースだけ4つ目を足す(docs/design/2026-10-06-prefecture-master-design.md 2章) */
export function difficultiesFor(groups: { difficulty: string }[] | null | undefined): string[] {
  const extras = DIFFICULTY_EXTRAS.filter((difficulty) => groups?.some((g) => g.difficulty === difficulty));
  return [...BASE_DIFFICULTIES, ...extras];
}

const DIFFICULTY_EXTRAS = ["最高難易度"];
