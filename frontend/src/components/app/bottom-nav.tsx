"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const ICON_PROPS = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const ITEMS: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: "/learn",
    label: "学ぶ",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M3 5.5c3-1.5 6-1.5 9 .5 3-2 6-2 9-.5v13c-3-1.5-6-1.5-9 .5-3-2-6-2-9-.5z M12 6v13" />
      </svg>
    ),
  },
  {
    href: "/passport",
    label: "旅する",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M3 13.5l7.5-2.2L14 4.5c.5-1 2-1 2.3.1l-1.4 6 4.6-1.4c1.4-.4 2.5 1.2 1.3 2.1L5.4 18.2c-.7.4-1.5-.1-1.5-.9z" />
      </svg>
    ),
  },
  {
    href: "/shop",
    label: "ショップ",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M3.5 9l1.5-5h14l1.5 5 M3.5 9c0 1.7 1.3 3 2.8 3s2.9-1.3 2.9-3c0 1.7 1.3 3 2.8 3s2.8-1.3 2.8-3c0 1.7 1.3 3 2.9 3s2.8-1.3 2.8-3 M5.5 12v8h13v-8 M10 20v-4.5h4V20" />
      </svg>
    ),
  },
  {
    href: "/bag",
    label: "バッグ",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M8.5 7V5.5A2.5 2.5 0 0 1 11 3h2a2.5 2.5 0 0 1 2.5 2.5V7 M6 10a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z M9 14h6v3H9z" />
      </svg>
    ),
  },
  {
    href: "/",
    label: "世界",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx={12} cy={12} r={9} />
        <path d="M3 12h18 M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * 画面下部の常設ナビ。「学ぶほど世界が広がる」構成(2026-09-26 Owner決定)で
 * 学ぶ/旅する/ショップ/バッグ/世界の5つにした。各ページは下端の余白(pb-24)を確保すること。
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto grid max-w-[480px] grid-cols-5 rounded-t-[22px] bg-[#fffaf0] shadow-[0_-4px_14px_rgba(59,50,38,0.12)]"
      aria-label="メインナビゲーション"
    >
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex h-[68px] flex-col items-center justify-center gap-0.5 text-[11.5px] ${
              active ? "font-black text-[#3b7f26]" : "font-bold text-[#6b5d45] hover:text-[#3b3226]"
            }`}
          >
            {active && (
              <span className="absolute top-1.5 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-[#5bb33e]" />
            )}
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
