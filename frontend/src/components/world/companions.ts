import type { WorldCompanion, WorldReview } from "./types";

/** 子どもが付ける名前の長さ(サーバーの config/companions.php の nickname_max と同じ) */
export const NICKNAME_MAX = 8;

/** ハートの並び。♥が今の数、♡が残り(設計書5-2) */
export function heartsText(hearts: number): string {
  const filled = Math.max(0, Math.min(5, hearts));
  return "♥".repeat(filled) + "♡".repeat(5 - filled);
}

/** 仲間のカードの「次のハートまで」(設計書5-2) */
export function nextHeartText(companion: Pick<WorldCompanion, "hearts" | "bond" | "next_heart_bond">): string {
  if (companion.next_heart_bond === null) return "しんゆう！";
  return `ハート${companion.hearts + 1}つまで あと${companion.next_heart_bond - companion.bond}`;
}

/** 町でタップしたときのひとこと。覚えたひとことからランダムに1つ(random は0以上1未満。設計書3-4) */
export function pickLine(lines: string[], random: number): string {
  return lines[Math.floor(random * lines.length)] ?? "";
}

export type NicknameCheck = { ok: true; value: string | null } | { ok: false; message: string };

const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/;

/** 名前の入力チェック。サーバーと同じ決まり(設計書3-2)。空なら元の名前に戻す(null) */
export function checkNickname(input: string): NicknameCheck {
  const value = input.replace(/^[\s\u3000]+|[\s\u3000]+$/g, "");
  if (value === "") return { ok: true, value: null };
  if (CONTROL_CHARS.test(value)) return { ok: false, message: "使えない文字が入っているよ" };
  if (Array.from(value).length > NICKNAME_MAX) return { ok: false, message: `${NICKNAME_MAX}文字までにしてね` };
  return { ok: true, value };
}

/** スプルをタップしたときの動き。寝ているときは、その前に起きる(設計書3-6) */
export function pickSpruTap({ canSow, review }: { canSow: boolean; review: WorldReview }): "sow" | "review" | "chat" {
  if (canSow) return "sow";
  if (review.available && review.giver.kind === "spru") return "review";
  return "chat";
}

/** スプルのふだんのひとこと。畑の案内が無いときに言う(設計書3-6) */
export function reviewPrompt(review: WorldReview): string | null {
  if (!review.available) return null;
  return review.giver.kind === "companion" ? `${review.giver.name}が復習を用意してるよ` : "この前の問題、いっしょに復習しよう！";
}

/** 仲間のカードと、スプルの復習カードの誘い(設計書3-5) */
export function reviewInvite(count: number): string {
  return `この前まちがえた問題、いっしょにやってみよう！（${count}問）`;
}

/** 復習の「！」を出す相手。スプルなら "spru"、仲間ならそのキー、出さない日は null */
export function reviewGiverKey(review: WorldReview): string | null {
  if (!review.available) return null;
  return review.giver.kind === "spru" ? "spru" : review.giver.key;
}
