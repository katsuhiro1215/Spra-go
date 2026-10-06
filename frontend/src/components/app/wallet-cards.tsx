import { BadgeImage } from "@/components/app/badge-image";

/**
 * 学習ポイントとコインを、絵と名前と数字で見せる2枚のカード(docs/design/2026-10-07-header-level-design.md 5-2章)。
 * ヘッダーは絵だけなので、数字を見たい画面(ショップ・「じぶんの状態」)に出す。
 * 2列で並べ、横幅が足りなければ1列に積む(はみ出して崩れないように、文字は折り返しを許す)
 */
export function WalletCards({ points, coins, className }: { points: number; coins: number; className?: string }) {
  return (
    <div className={`grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2 ${className ?? ""}`}>
      <WalletCard badge="points" label="学習ポイント" value={points} unit="pt" tone="text-[#2e6b1c]" />
      <WalletCard badge="coins" label="コイン" value={coins} tone="text-[#3b3226]" />
    </div>
  );
}

function WalletCard({ badge, label, value, unit, tone }: { badge: "points" | "coins"; label: string; value: number; unit?: string; tone: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-[#fffaf0] px-3 py-2 text-[#3b3226] shadow-[0_2px_6px_rgba(59,50,38,0.15)]">
      <BadgeImage badge={badge} size={28} />
      <div className="min-w-0">
        <p className="text-[11px] leading-tight font-bold text-[#6b5d45]">{label}</p>
        <p className={`text-lg leading-tight font-black ${tone}`}>
          {value.toLocaleString()}
          {unit && <span className="ml-0.5 text-xs">{unit}</span>}
        </p>
      </div>
    </div>
  );
}
