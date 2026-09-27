import type { TimeOfDay } from "@/components/world/time-of-day";

// 町以外の画面の見た目の決めごと(docs/design/2026-09-28-ui-palette-design.md 3章・4章)。
// Tailwind が読み取れるよう、クラス名は省略せずに書く

export type SkyInk = "ink" | "white";

/** 空の上に直接置く文字の色の種類。白い文字は昼の水色の空ではコントラストが足りないので、夜だけ白 */
export function skyInk(time: TimeOfDay): SkyInk {
  return time === "night" ? "white" : "ink";
}

export type SkyTextKind = "title" | "text" | "muted";

const SKY_TEXT: Record<SkyInk, Record<SkyTextKind, string>> = {
  ink: { title: "text-[#3b3226]", text: "text-[#3b3226]", muted: "text-[#4a3f30]" },
  white: { title: "text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]", text: "text-white", muted: "text-white/85" },
};

export function skyTextClass(time: TimeOfDay, kind: SkyTextKind): string {
  return SKY_TEXT[skyInk(time)][kind];
}

export type ChoiceTone = "default" | "secondary" | "danger" | "locked";

/** 選択肢のボタンの色(AppButton の variant)。答えたあとは、正解・選んだ不正解・ほか */
export function choiceTone({ answered, isCorrect, isSelected }: { answered: boolean; isCorrect: boolean; isSelected: boolean }): ChoiceTone {
  if (!answered) return "default";
  if (isCorrect) return "secondary";
  return isSelected ? "danger" : "locked";
}

/** 答えのあとのカードの見出し。まちがえても落ち込まないよう「おしい！」 */
export function answerHeadline(correct: boolean): string {
  return correct ? "せいかい！" : "おしい！";
}

export type StampTier = "none" | "bronze" | "silver" | "gold";

type StampBadge = { badge: "medal-bronze" | "medal-silver" | "medal-gold" | null; ring: string; label: string };

// 銅・銀・金のメダル(mascot-11のスプル入り、設計書4-2)。丸のふちもメダルの色
const STAMP_BADGES: Record<StampTier, StampBadge> = {
  gold: { badge: "medal-gold", ring: "border-[#d4a72c]", label: "全難易度クリア" },
  silver: { badge: "medal-silver", ring: "border-[#9aa3ab]", label: "中級までクリア" },
  bronze: { badge: "medal-bronze", ring: "border-[#c47a45]", label: "初級クリア" },
  none: { badge: null, ring: "border-[#e8dfcf]", label: "未訪問" },
};

/** パスポートの国スタンプの段位から、バッジ(未訪問は null)・丸のふちの色・文言を返す */
export function stampBadge(tier: StampTier): StampBadge {
  return STAMP_BADGES[tier];
}

const DIFFICULTY_BADGES: Record<string, "beginner" | "intermediate" | "advanced"> = {
  初級: "beginner",
  中級: "intermediate",
  上級: "advanced",
};

/** 難易度のバッジ(芽・つぼみ・花、設計書4-2)。知らない難易度は出さない */
export function difficultyBadge(difficulty: string): "beginner" | "intermediate" | "advanced" | null {
  return DIFFICULTY_BADGES[difficulty] ?? null;
}
