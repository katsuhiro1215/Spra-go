// ミニアプリの引き出しの中身(docs/design/2026-10-04-mini-app-tidy-design.md 5章)。画面を描かない部分だけをここに置く

/** ミニゲームの一覧。ゲームを増やすときは、ここに1行足す */
export const MINI_GAMES = [
  {
    key: "catch",
    title: "スプルキャッチ（えいたんご）",
    description: "落ちてくる英語の答えを、スプルがキャッチ！",
    href: "/games/catch",
  },
  {
    key: "flag-catch",
    title: "スプルキャッチ（こっき）",
    description: "流れてくる国旗を、スプルがキャッチ！",
    href: "/games/flag-catch",
  },
  {
    key: "space-trip",
    title: "うちゅう旅行",
    description: "ロケットで隕石をよけて、答えの門をくぐろう！",
    href: "/games/space-trip",
  },
  {
    key: "puzzle-flag",
    title: "スライドパズル（こっき）",
    description: "バラバラの国旗を、スライドして完成させよう！",
    href: "/games/puzzle-flag",
  },
  {
    key: "puzzle-space",
    title: "スライドパズル（うちゅう）",
    description: "バラバラの宇宙の絵を、スライドして完成させよう！",
    href: "/games/puzzle-space",
  },
] as const;

/** GET /api/games の1件(docs/design/2026-10-09-minigame-rollout-design.md 3-3)。出ているゲームだけが返る */
export type RolloutGame = { key: string; new: boolean; featured: boolean; seasonal: boolean };

export type ListedGame = (typeof MINI_GAMES)[number] & { new: boolean; featured: boolean; seasonal: boolean };

/** 出ているゲームだけを、一覧の順に、札つきで返す。API にないゲーム(出す日の前・季節の外)は出さない */
export function listedGames(rollout: RolloutGame[] | null): ListedGame[] {
  if (!rollout) return [];

  return MINI_GAMES.flatMap((game) => {
    const flags = rollout.find((item) => item.key === game.key);
    return flags ? [{ ...game, new: flags.new, featured: flags.featured, seasonal: flags.seasonal }] : [];
  });
}

const DISMISSED_KEY = "spra:dismissed-new-games";

/** 「新しいミニゲーム」のお知らせを閉じたゲームのキー(端末に覚える。読めなければ空) */
export function readDismissed(storage: Pick<Storage, "getItem"> | null): string[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(DISMISSED_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === "string") : [];
  } catch {
    return [];
  }
}

export function writeDismissed(storage: Pick<Storage, "setItem"> | null, keys: string[]): void {
  try {
    storage?.setItem(DISMISSED_KEY, JSON.stringify(keys));
  } catch {
    // 端末に書けなくても、お知らせが残るだけ
  }
}

/** 学ぶ画面に出す「新しいミニゲーム」のお知らせ: NEW で、まだ閉じていないゲーム */
export function newGameNotices(games: ListedGame[], dismissed: string[]): ListedGame[] {
  return games.filter((game) => game.new && !dismissed.includes(game.key));
}

/** GET /api/mini-quizzes の1件 */
export type MiniQuiz = { id: number; name: string; stage_count: number };

export const MINI_QUIZ_EMPTY = "ミニクイズは、じゅんびちゅうだよ";
