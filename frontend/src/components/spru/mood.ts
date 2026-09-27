import { getTimeOfDay, isSpruSleepTime, type TimeOfDay } from "@/components/world/time-of-day";

import { SPRU_FACES, type SpruFaceKey, type SpruImageKey } from "./spru-assets";

export type TownEvent =
  | { kind: "greet"; at: number }
  | { kind: "placed" | "stored"; at: number; itemName: string }
  | { kind: "error" | "welcome" | "woke"; at: number }
  | { kind: "tap"; at: number; image: "shy" | "laugh" | "cheer"; hint: string }
  | { kind: "sow" | "water"; at: number }
  | { kind: "say"; at: number; image: SpruImageKey; line: string };

export type SpruView = { image: SpruImageKey; face: SpruFaceKey; line: string; sleeping: boolean };

export type TownMoodInput = {
  now: number;
  lastInteractionAt: number;
  event: TownEvent | null;
  nightWokenAt: number | null;
  placing: boolean;
  // 畑の案内(components/world/garden.ts の gardenPrompt)。ふだんのあいさつの代わりに言う
  prompt?: string | null;
};

export const IDLE_SIT_MS = 30_000;
export const IDLE_SLEEP_MS = 90_000;
export const NIGHT_AWAKE_MS = 60_000;
// 吹き出しはできごとから8秒間そのできごとの言葉を出し、その後ふだんの言葉に戻る
export const EVENT_LINE_MS = 8_000;

const EVENT_IMAGE_MS: Record<TownEvent["kind"], number> = {
  greet: 2_500,
  placed: 2_600,
  stored: 2_600,
  error: 2_600,
  welcome: 2_600,
  tap: 2_600,
  woke: 1_500,
  sow: 2_400,
  water: 2_600,
  say: 2_600,
};

// 種まきは「頭を振る」を見せてから「種が飛ぶ」に変える
const SOW_SHAKE_MS = 1_200;

const GREETINGS: Record<TimeOfDay, string> = {
  morning: "おはよう！今日もいっしょに学ぼう",
  day: "こんにちは！今日もいっしょに学ぼう",
  evening: "おかえり！もうひとがんばりしよう",
  night: "こんばんは！寝る前にちょっとだけ学ぼう",
};

// アクションの画像には対応する表情が無いため、吹き出しの顔アイコンを対応づける
const FACE_FOR_IMAGE: Partial<Record<SpruImageKey, SpruFaceKey>> = {
  front: "normal",
  "three-quarter": "normal",
  wave: "happy",
  jump: "happy",
  cheer: "happy",
  palms: "smile",
  sit: "smile",
  sleep: "normal",
  startled: "surprised",
  water: "smile",
  "sow-shake": "happy",
  "sow-fly": "laugh",
};

function faceFor(image: SpruImageKey): SpruFaceKey {
  return FACE_FOR_IMAGE[image] ?? (image in SPRU_FACES ? (image as SpruFaceKey) : "normal");
}

function eventImage(event: TownEvent, age: number): SpruImageKey {
  switch (event.kind) {
    case "greet":
      return "wave";
    case "placed":
    case "welcome":
      return "jump";
    case "stored":
      return "palms";
    case "error":
      return "sad";
    case "woke":
      return "startled";
    case "tap":
      return event.image;
    case "sow":
      return age < SOW_SHAKE_MS ? "sow-shake" : "sow-fly";
    case "water":
      return "water";
    case "say":
      return event.image;
  }
}

function eventLine(event: TownEvent, date: Date): string {
  switch (event.kind) {
    case "greet":
      return GREETINGS[getTimeOfDay(date)];
    case "placed":
      return `${event.itemName}を置いたよ！町がにぎやかになったね`;
    case "stored":
      return `${event.itemName}をバッグにしまったよ`;
    case "error":
      return "うまくいかなかった…もう一度ためしてね";
    case "welcome":
      return "ポイントでショップのアイテムを買ってみよう！";
    case "woke":
      return isSpruSleepTime(date) ? "ふぁ…まだ起きてたの？" : "わっ、びっくりした！";
    case "tap":
      return event.hint;
    case "sow":
      return "種をまいたよ！毎日水をあげて育てよう";
    case "water":
      return "大きくなあれ！";
    case "say":
      return event.line;
  }
}

/** 町のスプルの画像・顔・吹き出し。優先順位は できごと → 夜の眠り → さわらない時間 → ふだん(設計書5-1) */
export function pickTownMood({ now, lastInteractionAt, event, nightWokenAt, placing, prompt = null }: TownMoodInput): SpruView {
  const date = new Date(now);
  const idleMs = now - lastInteractionAt;
  const nightAwake = nightWokenAt !== null && idleMs < NIGHT_AWAKE_MS;
  const nightSleeping = isSpruSleepTime(date) && !nightAwake;
  // 夜は最初から寝ているため、町を開いたときのあいさつだけは夜の眠りより弱い
  const activeEvent = event && !(event.kind === "greet" && nightSleeping) ? event : null;
  const eventAge = activeEvent ? now - activeEvent.at : Infinity;

  if (activeEvent && eventAge < EVENT_IMAGE_MS[activeEvent.kind]) {
    const image = eventImage(activeEvent, eventAge);
    return { image, face: faceFor(image), line: eventLine(activeEvent, date), sleeping: false };
  }
  if (nightSleeping || (!placing && idleMs >= IDLE_SLEEP_MS)) {
    return { image: "sleep", face: "normal", line: "すやすや…", sleeping: true };
  }
  if (!placing && idleMs >= IDLE_SIT_MS) {
    return { image: "sit", face: "smile", line: "ひと休み…", sleeping: false };
  }
  if (placing) {
    return { image: "three-quarter", face: "excited", line: "どこに置く？光っているマスをタップしてね", sleeping: false };
  }
  const line = activeEvent && eventAge < EVENT_LINE_MS ? eventLine(activeEvent, date) : (prompt ?? GREETINGS[getTimeOfDay(date)]);
  return { image: "three-quarter", face: "normal", line, sleeping: false };
}

/** クイズの正解・不正解の画面のスプル(設計書5-3。不正解に泣き顔は使わない) */
export function pickAnswerImage({
  correct,
  combo,
  comboBonus,
}: {
  correct: boolean;
  combo: number;
  comboBonus: number;
}): SpruImageKey {
  if (!correct) return "sad";
  if (comboBonus > 0) return "cheer";
  if (combo >= 2) return "laugh";
  return "happy";
}

export function pickResult(score: number, total: number): { image: SpruImageKey; line: string | null } {
  if (total > 0 && score === total) return { image: "jump", line: null };
  if (score * 2 >= total) return { image: "smile", line: null };
  return { image: "effort", line: "次はもっとできるよ！" };
}
