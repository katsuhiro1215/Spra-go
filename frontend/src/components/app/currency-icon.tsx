import { BadgeImage } from "@/components/app/badge-image";

const CURRENCIES = {
  points: { badge: "points", label: "学習ポイント" },
  coins: { badge: "coins", label: "コイン" },
} as const;

/**
 * ヘッダーの学習ポイント・コインは、絵だけにして場所を取らない(docs/design/2026-10-07-header-level-design.md 3章)。
 * 数字は「じぶんの状態」とショップで見る。パソコンではホバーの説明(title)が出る。読み上げには名前を付ける
 */
export function CurrencyIcon({ kind }: { kind: keyof typeof CURRENCIES }) {
  const { badge, label } = CURRENCIES[kind];

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fffaf0] shadow-[0_2px_6px_rgba(59,50,38,0.15)]"
    >
      <BadgeImage badge={badge} size={18} />
    </span>
  );
}
