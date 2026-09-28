"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { MeSheet } from "@/components/app/me-sheet";
import { useRegisterMenu } from "@/components/app/menu-presence";
import { isNavActive, NAV_ITEMS, type NavKey } from "@/components/app/nav-items";
import { useProfile } from "@/components/app/profile-provider";

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

// 今は線のアイコン。スプルのアイコン画像が届いたら差し替える(設計書5章)
const ICONS: Record<NavKey, ReactNode> = {
  learn: (
    <svg {...ICON_PROPS}>
      <path d="M3 5.5c3-1.5 6-1.5 9 .5 3-2 6-2 9-.5v13c-3-1.5-6-1.5-9 .5-3-2-6-2-9-.5z M12 6v13" />
    </svg>
  ),
  trip: (
    <svg {...ICON_PROPS}>
      <circle cx={12} cy={12} r={9} />
      <path d="M3 12h18 M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />
    </svg>
  ),
  town: (
    <svg {...ICON_PROPS} width={28} height={28}>
      <path d="M3.5 11 12 4l8.5 7 M5.5 9.5V20h13V9.5 M10 20v-5.5h4V20" />
    </svg>
  ),
  shop: (
    <svg {...ICON_PROPS}>
      <path d="M3.5 9l1.5-5h14l1.5 5 M3.5 9c0 1.7 1.3 3 2.8 3s2.9-1.3 2.9-3c0 1.7 1.3 3 2.8 3s2.8-1.3 2.8-3c0 1.7 1.3 3 2.9 3s2.8-1.3 2.8-3 M5.5 12v8h13v-8 M10 20v-4.5h4V20" />
    </svg>
  ),
};

const ITEM_CLASS = "relative flex h-[68px] flex-col items-center justify-center gap-0.5 text-[11.5px]";
const ACTIVE_TEXT = "font-black text-[#3b7f26]";
const IDLE_TEXT = "font-bold text-[#6b5d45] hover:text-[#3b3226]";

function ActiveBar() {
  return <span className="absolute top-1.5 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-[#5bb33e]" />;
}

/**
 * 画面下部の常設ナビ(設計書4-5)。学ぶ・せかい・まち(真ん中で丸く大きく)・ショップ・じぶん。
 * 「じぶん」はページを移らず、下から出るパネル(MeSheet)を開く。各ページは下端の余白(pb-24)を確保すること
 */
export function BottomNav() {
  const pathname = usePathname();
  const { profile } = useProfile();
  const [meOpen, setMeOpen] = useState(false);
  useRegisterMenu();

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 mx-auto grid max-w-[480px] grid-cols-5 rounded-t-[22px] bg-[#fffaf0] shadow-[0_-4px_14px_rgba(59,50,38,0.12)]"
        aria-label="メインナビゲーション"
      >
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href);
          if (item.key === "town") {
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`${ITEM_CLASS} justify-end pb-2 ${active ? ACTIVE_TEXT : IDLE_TEXT}`}
              >
                <span
                  className={`absolute -top-5 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border-4 border-[#fffaf0] text-white shadow-[0_4px_10px_rgba(40,70,90,0.25)] ${
                    active ? "bg-[#3b7f26]" : "bg-[#5bb33e]"
                  }`}
                >
                  {ICONS.town}
                </span>
                {item.label}
              </Link>
            );
          }
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`${ITEM_CLASS} ${active ? ACTIVE_TEXT : IDLE_TEXT}`}
            >
              {active && <ActiveBar />}
              {ICONS[item.key]}
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMeOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={meOpen}
          className={`${ITEM_CLASS} ${meOpen ? ACTIVE_TEXT : IDLE_TEXT}`}
        >
          {meOpen && <ActiveBar />}
          <span
            aria-hidden
            className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2b6fa3] text-[11px] font-black text-white"
          >
            {profile?.name.slice(0, 1) ?? ""}
          </span>
          じぶん
        </button>
      </nav>
      <MeSheet open={meOpen} onOpenChange={setMeOpen} />
    </>
  );
}
