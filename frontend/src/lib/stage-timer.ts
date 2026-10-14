// ステージの制限時間(docs/design/2026-10-15-stage-rules-design.md 6章)。画面を描かない部分だけをここに置く

/** ふつう・ゆっくり(2倍)・なし。表示設定で選ぶ(端末ごとに保存) */
export type TimerMode = "normal" | "slow" | "off";

export const TIMER_MODES: TimerMode[] = ["normal", "slow", "off"];

/** 残りこの秒数になったら、数字と注意の音を出す */
export const WARNING_SECONDS = 5;
/** 残りこの秒数までは、数字を出さない(バーだけ) */
export const NUMBER_SECONDS = 10;

/** サーバーが決めた1問の秒数を、設定に合わせた秒数にする。計らないときは null */
export function timerSeconds(base: number | null | undefined, mode: TimerMode): number | null {
  if (!base || base <= 0 || mode === "off") return null;
  return mode === "slow" ? base * 2 : base;
}

/** 計った時間(ミリ秒)に、経った分を足す。止めているとき・画面が裏に回っているときは足さない */
export function advanceElapsed(elapsedMs: number, deltaMs: number, running: boolean): number {
  return running ? elapsedMs + Math.max(0, deltaMs) : elapsedMs;
}

/** 残りの秒数(切り上げ。0以下は0) */
export function secondsLeft(totalSeconds: number, elapsedMs: number): number {
  return Math.max(0, Math.ceil(totalSeconds - elapsedMs / 1000));
}

export type TimerTone = "ok" | "warn" | "danger";

/** バーの色。残りが半分より多ければ緑、半分以下はオレンジ、残り5秒以下は赤 */
export function timerTone(left: number, total: number): TimerTone {
  if (left <= WARNING_SECONDS) return "danger";
  return left <= total / 2 ? "warn" : "ok";
}

/** ステージの始まりのカードの文(3行)。seconds が null のときは時間の行を出さない */
export function ruleLines({
  playCount,
  required,
  isBoss,
  seconds,
}: {
  playCount: number;
  required: number;
  isBoss: boolean;
  seconds: number | null;
}): string[] {
  const lines = [`${playCount}もん ちゅう ${required}もん せいかい で クリア！`];
  if (seconds !== null) lines.push(`1もん ${seconds}びょう`);
  lines.push("まちがえると HP −1");
  if (isBoss) lines.unshift("ボスステージ！");
  return lines;
}
