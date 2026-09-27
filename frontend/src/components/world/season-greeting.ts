import type { CostumeKey } from "@/components/spru/spru-assets";

export type SeasonGreeting = { costume: CostumeKey; line: string };

// 期間は端末の日付の「月×100＋日」で持つ(設計書3-3)。あいさつの中の世界のひとことは公開前にOwnerが確かめる
const PERIODS: { costume: CostumeKey; from: number; to: number; line: string }[] = [
  {
    costume: "halloween",
    from: 1001,
    to: 1031,
    line: "ハッピーハロウィン！ハロウィンは、アイルランドなどに昔から伝わるお祭りがもとなんだって",
  },
  { costume: "christmas", from: 1201, to: 1225, line: "メリークリスマス！フィンランドには、サンタクロース村があるんだよ" },
  { costume: "valentine", from: 201, to: 214, line: "ハッピーバレンタイン！海外では、花やカードをおくり合うことも多いんだって" },
  { costume: "summer", from: 720, to: 831, line: "なつやすみだね！沖縄の言葉で「めんそーれ」は「ようこそ」っていう意味だよ" },
];

export function seasonGreeting(date: Date): SeasonGreeting | null {
  const monthDay = (date.getMonth() + 1) * 100 + date.getDate();
  const period = PERIODS.find((p) => monthDay >= p.from && monthDay <= p.to);
  return period ? { costume: period.costume, line: period.line } : null;
}

export function localDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function shouldShowSeasonGreeting(date: Date, lastShown: string | null): boolean {
  return seasonGreeting(date) !== null && lastShown !== localDateString(date);
}

const storageKey = (profileId: number) => `spru-season-greeting:${profileId}`;

/** 「今日はもう出した」はブラウザにプロフィールごとに持つ。読めないときは出す */
export function readSeasonShown(profileId: number): string | null {
  try {
    return window.localStorage.getItem(storageKey(profileId));
  } catch {
    return null;
  }
}

export function writeSeasonShown(profileId: number, date: Date): void {
  try {
    window.localStorage.setItem(storageKey(profileId), localDateString(date));
  } catch {
    // 保存できなくても、次に開いたときにもう一度出るだけ
  }
}
