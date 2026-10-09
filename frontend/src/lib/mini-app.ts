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
] as const;

/** GET /api/mini-quizzes の1件 */
export type MiniQuiz = { id: number; name: string; stage_count: number };

export const MINI_QUIZ_EMPTY = "ミニクイズは、じゅんびちゅうだよ";
