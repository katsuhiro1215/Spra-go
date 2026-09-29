import { AssetImage } from "@/components/app/asset-image";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { SPRU_ICONS } from "@/components/spru/spru-assets";

import { ResendVerificationButton } from "./resend-verification";

/** 確認していないときのお知らせ(docs/design/2026-09-29-email-verify-reset-design.md 3-5)。プロフィール選びとショップのコイン購入の欄にだけ出す */
export function EmailVerifyNotice({ className }: { className?: string }) {
  return (
    <div
      className={`flex w-full max-w-md items-start gap-3 rounded-2xl bg-[#fffaf0] p-4 text-left text-[#3b3226] shadow-lg ${className ?? ""}`}
    >
      <AssetImage asset={SPRU_ICONS.letter} size={48} alt="" className="shrink-0" />
      <div className="flex flex-1 flex-col gap-2">
        <p className="text-sm font-black">
          <AutoFurigana text="メールアドレスを確かめてね" />
        </p>
        <p className="text-xs font-bold text-[#6b5d45]">
          <AutoFurigana text="登録したメールアドレスに届いたメールのリンクを押すと、コインを買えるようになります" />
        </p>
        <ResendVerificationButton className="items-start" />
      </div>
    </div>
  );
}
