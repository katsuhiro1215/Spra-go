"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { AssetImage } from "@/components/app/asset-image";
import { ProfileAvatar } from "@/components/app/avatar-badge";
import { BadgeImage } from "@/components/app/badge-image";
import { DisplaySettings } from "@/components/app/display-settings";
import { useProfile } from "@/components/app/profile-provider";
import { SPRU_ICONS } from "@/components/spru/spru-assets";
import { apiFetch } from "@/lib/api";

/**
 * 下のメニューの「じぶん」で開く、下から出るパネル(設計書4-4)。外側のタップ・Escで閉じ、
 * 開いている間はパネルの中だけをキーボードで行き来できる(radix-ui の Dialog)
 */
export function MeSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { profile, refresh } = useProfile();
  const close = () => onOpenChange(false);

  async function handleLogout() {
    close();
    await apiFetch("/logout", { method: "POST" });
    // 前のプレイヤーの表示を消し、ログイン画面で右下の「文A」が出るようにする
    await refresh();
    router.replace("/login");
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(38,48,28,0.45)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85vh] w-full max-w-[480px] overflow-y-auto rounded-t-[22px] bg-[#fffaf0] px-4 pt-3 pb-8 text-[#3b3226] shadow-[0_-8px_24px_rgba(0,0,0,0.2)] outline-none duration-200 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom"
        >
          <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#e0d6c2]" />
          <div className="mb-2 flex items-center gap-3">
            <ProfileAvatar profile={profile} size={44} />
            <div className="min-w-0">
              <DialogPrimitive.Title className="truncate text-base font-black">
                {profile?.name ?? "じぶん"}
              </DialogPrimitive.Title>
              {profile && <p className="text-xs font-bold text-[#6b5d45]">Lv.{profile.level}</p>}
            </div>
          </div>

          <ul className="flex flex-col">
            <SheetLink href="/bag" icon={<AssetImage asset={SPRU_ICONS.bag} size={28} />} label="バッグ" onNavigate={close} />
            <SheetLink href="/passport" icon={<BadgeImage badge="passport" size={22} />} label="パスポート" onNavigate={close} />
          </ul>

          <div className="my-3 rounded-2xl bg-[#f5efe1] p-3">
            <DisplaySettings />
          </div>

          <ul className="flex flex-col">
            <SheetLink
              href="/profiles"
              icon={<AssetImage asset={SPRU_ICONS["switch-profile"]} size={28} />}
              label="プロフィールを切り替える"
              onNavigate={close}
            />
            <li>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left text-sm font-black text-[#c2402c] hover:bg-[#fdecea]"
              >
                <span className="flex h-7 w-7 items-center justify-center">
                  <AssetImage asset={SPRU_ICONS.logout} size={28} />
                </span>
                ログアウト
              </button>
            </li>
          </ul>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function SheetLink({ href, icon, label, onNavigate }: { href: string; icon: ReactNode; label: string; onNavigate: () => void }) {
  return (
    <li className="border-b border-[#efe5cf]">
      <Link href={href} onClick={onNavigate} className="flex items-center gap-3 rounded-xl px-2 py-3 text-sm font-black hover:bg-[#f5efe1]">
        <span className="flex h-7 w-7 items-center justify-center text-[#6b5d45]">{icon}</span>
        {label}
        <span aria-hidden className="ml-auto text-[#b9ad96]">
          ›
        </span>
      </Link>
    </li>
  );
}
