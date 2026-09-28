"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { AlertDialog as AlertDialogPrimitive, Popover as PopoverPrimitive } from "radix-ui";

import { DisplaySettings } from "@/components/app/display-settings";
import { HpGauge } from "@/components/app/hp-gauge";
import { useRegisterMenu } from "@/components/app/menu-presence";
import { useProfile } from "@/components/app/profile-provider";

import { quizQuitTarget } from "./quit";

const ROUND_BUTTON =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fffaf0] text-[#6b5d45] shadow-[0_2px_6px_rgba(59,50,38,0.15)] outline-none focus-visible:ring-2 focus-visible:ring-[#2b6fa3]";

/** クイズに答えている間のヘッダー(設計書4-2)。やめる(✕)・文A(ふりがな・文字の大きさ)・体力ゲージだけ */
export function GameHeader() {
  const router = useRouter();
  const { profile } = useProfile();
  useRegisterMenu();

  function quit() {
    if (quizQuitTarget(window.history.length) === "back") router.back();
    else router.push("/learn");
  }

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-2 px-3 sm:px-6">
      <AlertDialogPrimitive.Root>
        <AlertDialogPrimitive.Trigger asChild>
          <button type="button" aria-label="クイズをやめる" className={ROUND_BUTTON}>
            <X aria-hidden className="h-5 w-5" />
          </button>
        </AlertDialogPrimitive.Trigger>
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(38,48,28,0.45)]" />
          <AlertDialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-[340px] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-3xl bg-[#fffaf0] p-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.25)] outline-none">
            <AlertDialogPrimitive.Title className="text-lg font-black">クイズをやめる？</AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="text-sm font-bold text-[#6b5d45]">
              ここまでのポイントやコインはそのまま残るよ
            </AlertDialogPrimitive.Description>
            <div className="mt-1 flex gap-2">
              <AlertDialogPrimitive.Cancel className="h-12 flex-1 rounded-2xl border-b-4 border-[#285a19] bg-[#3b7f26] text-base font-black text-white">
                つづける
              </AlertDialogPrimitive.Cancel>
              <AlertDialogPrimitive.Action
                onClick={quit}
                className="h-12 flex-1 rounded-2xl border-2 border-b-4 border-[#e8dfcf] bg-white text-base font-black text-[#3b3226]"
              >
                やめる
              </AlertDialogPrimitive.Action>
            </div>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>

      <PopoverPrimitive.Root>
        <PopoverPrimitive.Trigger asChild>
          <button type="button" aria-label="表示設定(文字サイズ・ふりがな)を開く" className={`${ROUND_BUTTON} text-sm font-black`}>
            文A
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={8}
            className="z-50 w-72 rounded-2xl bg-[#fffaf0] p-4 shadow-[0_8px_22px_rgba(40,70,90,0.2)] outline-none"
          >
            <DisplaySettings />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      <HpGauge value={profile?.hp ?? 0} max={profile?.max_hp ?? 20} className="min-w-0 flex-1" />
    </header>
  );
}
