// 遊んだ時間の送り出しの判断(docs/design/2026-10-03-analytics-design.md 5-2)。画面を描かない部分だけをここに置く

/** 送る間隔(秒)と、1回で送る秒数 */
export const BEAT_SECONDS = 30;

/** 最後の操作から、この時間(ミリ秒)を過ぎたら、遊んでいないとみなす */
export const IDLE_LIMIT_MS = 60_000;

/** 送るか。プレイヤーがいて、画面が見えていて、直近60秒以内に操作があるときだけ */
export function shouldSendBeat(input: {
  hasProfile: boolean;
  visible: boolean;
  lastActivityAt: number;
  now: number;
}): boolean {
  return input.hasProfile && input.visible && input.now - input.lastActivityAt <= IDLE_LIMIT_MS;
}
