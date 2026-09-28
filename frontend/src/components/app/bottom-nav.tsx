"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { AssetImage } from "@/components/app/asset-image";
import { ProfileAvatar } from "@/components/app/avatar-badge";
import { MeSheet } from "@/components/app/me-sheet";
import { useRegisterMenu } from "@/components/app/menu-presence";
import { isNavActive, NAV_ITEMS } from "@/components/app/nav-items";
import { useProfile } from "@/components/app/profile-provider";
import { SPRU_ICONS } from "@/components/spru/spru-assets";

const ITEM_CLASS = "relative flex h-[68px] flex-col items-center justify-center gap-0.5 text-[11.5px]";
const ACTIVE_TEXT = "font-black text-[#3b7f26]";
const IDLE_TEXT = "font-bold text-[#6b5d45] hover:text-[#3b3226]";

function ActiveBar() {
  return <span className="absolute top-1 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-[#5bb33e]" />;
}

/**
 * 画面下部の常設ナビ(設計書4-5)。学ぶ・せかい・まち(真ん中で大きく)・ショップ・じぶん。
 * 絵はスプルのアイコン、「じぶん」はそのプレイヤーのアバター(docs/design/2026-09-29-spru-icons-design.md 4-1)。
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
          const icon = SPRU_ICONS[item.icon];
          if (item.key === "town") {
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`${ITEM_CLASS} justify-end pb-2 ${active ? ACTIVE_TEXT : IDLE_TEXT}`}
              >
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 drop-shadow-[0_4px_6px_rgba(40,70,90,0.25)]">
                  <AssetImage asset={icon} size={60} />
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
              <AssetImage asset={icon} size={32} />
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
          <ProfileAvatar profile={profile} size={28} />
          じぶん
        </button>
      </nav>
      <MeSheet open={meOpen} onOpenChange={setMeOpen} />
    </>
  );
}
