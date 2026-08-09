"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Adventure", icon: "🌎" },
  { href: "/passport", label: "Passport", icon: "🧳" },
  { href: "/shop", label: "Items", icon: "🎒" },
] as const;

/**
 * 画面下部の常設ナビゲーション(Owner構想: 「旅をしている感覚」を残すため、
 * 一般的なアプリのような5項目タブではなく3項目に絞る)。親指が届く画面下に
 * 主要操作を集める狙いで、スクロールに関係なく画面下端に固定表示する。
 * 各ページ側で下端がこのナビに隠れないよう余白(pb-*)を確保すること。
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/10 bg-black/40 backdrop-blur-sm"
      aria-label="メインナビゲーション"
    >
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition-colors ${
              active ? "text-amber-300" : "text-white/70 hover:text-white"
            }`}
          >
            <span className="text-xl" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
