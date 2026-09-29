import type { ReactNode } from "react";

import { AssetImage } from "@/components/app/asset-image";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { SkyPage } from "@/components/app/sky-page";
import { SPRU_ICONS, type SpruIconKey } from "@/components/spru/spru-assets";

// メール確認・パスワード再設定の画面の共通の形(docs/design/2026-09-29-email-verify-reset-design.md 3章)。
// ログイン画面と同じ、空の背景・スプルの絵・クリーム色のカード
export const AUTH_LABEL_CLASS = "text-sm font-black text-[#3b3226]";
export const AUTH_INPUT_CLASS =
  "h-11 rounded-xl border-2 border-[#e8dfcf] bg-white px-3 text-sm text-[#3b3226] outline-none focus-visible:border-[#2b6fa3]";
export const AUTH_LINK_CLASS =
  "rounded-full bg-[#fffaf0] px-3 py-1.5 text-sm font-black text-[#2b5d7a] shadow-[0_2px_6px_rgba(59,50,38,0.15)] hover:bg-white";
export const AUTH_PRIMARY_LINK_CLASS =
  "flex h-12 w-full items-center justify-center rounded-2xl bg-[#3b7f26] px-6 text-base font-black text-white shadow-[0_4px_0_#285a19] hover:bg-[#438b2d]";

export function AuthCard({
  icon,
  title,
  lead,
  children,
  footer,
}: {
  icon: SpruIconKey;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <SkyPage className="items-center justify-center px-6 py-12">
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-4">
        <AssetImage asset={SPRU_ICONS[icon]} size={104} alt="" />
        {/* カードの中の日本語は文節で折り返す(「確かめまし／た」のように折れないように) */}
        <div className="w-full rounded-3xl bg-[#fffaf0] p-6 text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)] [word-break:auto-phrase]">
          <h1 className="text-center text-2xl font-black text-[#3b3226]">
            <AutoFurigana text={title} />
          </h1>
          {lead && <p className="mt-1 text-center text-sm font-bold text-[#6b5d45]">{lead}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer}
      </div>
    </SkyPage>
  );
}
