/**
 * ミニゲームで使う問題の形(docs/design/2026-09-29-spru-catch-design.md 8章)。
 * 1本目のスプルキャッチのほか、2本目以降のゲームも同じ形で受け取る
 */
export type GameChoice = { id: number; label: string };

export type GameQuestion = {
  id: number;
  prompt: string;
  choices: GameChoice[];
  correctChoiceId: number;
};

/** 問題文を、大きく見せる所(「」の中)と小さく見せる所(残り)に分ける。「」で始まらなければ全部を大きく(設計書3-6) */
export function splitPrompt(prompt: string): { focus: string; rest: string } {
  const match = prompt.match(/^「(.+?)」([\s\S]*)$/);
  if (!match) return { focus: prompt, rest: "" };
  return { focus: match[1], rest: match[2] };
}
