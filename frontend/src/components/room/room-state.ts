/** スプルの家の中(見るだけの部屋)の様子を決める純粋な関数(設計書 2026-10-05-spru-room 5章) */

export type RoomMode = "day" | "night";
export type RoomSpruPose = "idle" | "wave" | "sit";

export const ROOM_WAVE_MS = 1600;
export const ROOM_SIT_AFTER_MS = 8000;

const DAY_LINES = ["やっほー！", "おかえり！", "きょうも いい日だね"];

/** 町のスプルが寝ていれば夜の絵(ベッドで眠る)。時刻は部屋で計算せず、町の様子をそのまま使う */
export function roomMode(sleeping: boolean): RoomMode {
  return sleeping ? "night" : "day";
}

/** タップから1.6秒は手を振る。触らずに8秒(最後のタップ、なければ開いたとき から)たつと座る。それ以外は立つ */
export function roomSpruPose(state: { openedAt: number; lastTapAt: number | null }, now: number): RoomSpruPose {
  if (state.lastTapAt !== null && now - state.lastTapAt < ROOM_WAVE_MS) return "wave";
  const since = now - (state.lastTapAt ?? state.openedAt);
  return since >= ROOM_SIT_AFTER_MS ? "sit" : "idle";
}

/** ふきだしのひとこと。昼はタップのたびに順に回す。夜は、いつも「すやすや…」 */
export function roomLine(mode: RoomMode, tapCount: number): string {
  if (mode === "night") return "すやすや…";
  return DAY_LINES[((tapCount % DAY_LINES.length) + DAY_LINES.length) % DAY_LINES.length];
}
