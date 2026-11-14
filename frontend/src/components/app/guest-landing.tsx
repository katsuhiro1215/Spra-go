import Image from "next/image";
import Link from "next/link";

import { LegalLinks } from "@/components/legal/legal-links";

import { APP_VERSION } from "@/lib/app-version";
import { AssetImage } from "@/components/app/asset-image";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { LogoMark } from "@/components/app/logo-mark";
import { SkyPage } from "@/components/app/sky-page";
import { SPRU_ICONS, STAMP_IMAGES, type StampKey } from "@/components/spru/spru-assets";

const SAMPLE_COUNTRIES: { code: StampKey; name: string }[] = [
  { code: "jp", name: "日本" },
  { code: "us", name: "アメリカ" },
  { code: "gb", name: "イギリス" },
  { code: "fr", name: "フランス" },
];

/**
 * 未ログインのトップ(docs/design/2026-09-28-top-profiles-design.md 3章)。
 * 各アプリのトップ画面の統一レイアウト(company/spra/CLAUDE.md 2026-11-14): 左上ロゴ・右上バージョン・
 * 中央にアプリ名と入口ボタン・下部に規約リンク。背景はOwner用意の壁紙(旅立つスプラ)
 */
export function GuestLanding() {
  return (
    <SkyPage backdrop="/landing/guest-bg.webp" className="items-center px-5 pt-5 pb-8">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-36 bg-gradient-to-b from-black/35 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-64 bg-gradient-to-t from-black/50 to-transparent" />

      <div className="relative z-10 flex w-full items-start justify-between">
        <LogoMark size={40} />
        <span className="rounded-full bg-black/30 px-2.5 py-1 text-xs font-bold text-white/90">{APP_VERSION}</span>
      </div>

      <div className="relative z-10 mt-10 flex w-full max-w-[340px] flex-col items-center">
        <div className="flex w-full flex-col items-center rounded-3xl bg-black/20 px-5 py-5 backdrop-blur-sm">
          <h1 className="text-[34px] font-black tracking-wide text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">Spra Go</h1>
          <p className="mt-1 text-sm font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]">
            <AutoFurigana text="学ぶほど、世界が広がる。" />
          </p>

          <Link
            href="/register"
            className="mt-6 flex h-[54px] w-full items-center justify-center rounded-2xl border-b-4 border-[#285a19] bg-[#3b7f26] text-lg font-black text-white shadow-lg hover:bg-[#438b2d] focus-visible:ring-4 focus-visible:ring-[#9fd8ff] focus-visible:outline-none active:translate-y-0.5 active:border-b-0"
          >
            はじめる
          </Link>
        </div>
        <Link
          href="/login"
          className="mt-3 flex items-center gap-1.5 rounded-full bg-[#fffaf0] py-1 pr-4 pl-1.5 text-sm font-black text-[#2b6fa3] shadow-[0_2px_6px_rgba(59,50,38,0.15)] hover:bg-white"
        >
          <AssetImage asset={SPRU_ICONS.login} size={28} />
          <AutoFurigana text="アカウントをお持ちの方はログイン" />
        </Link>
      </div>

      <div className="relative z-10 mt-auto flex w-full max-w-[340px] flex-col items-center">
        <p className="text-xs font-bold text-white/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
          <AutoFurigana text="登録なしでお試しクイズ" />
        </p>
        <ul className="mt-2 flex justify-center gap-3">
          {SAMPLE_COUNTRIES.map(({ code, name }) => (
            <li key={code}>
              <Link
                href={`/world/${code}`}
                aria-label={`${name}のお試しクイズ`}
                className="flex flex-col items-center gap-0.5 rounded-xl focus-visible:ring-4 focus-visible:ring-[#9fd8ff] focus-visible:outline-none"
              >
                <Image
                  src={STAMP_IMAGES[code].src}
                  alt=""
                  width={60}
                  height={60}
                  className="h-[60px] w-[60px] -rotate-6 object-contain transition-transform hover:rotate-0"
                />
                <span className="text-[11px] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]">{name}</span>
              </Link>
            </li>
          ))}
        </ul>
        <LegalLinks className="mt-6 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]" />
      </div>
    </SkyPage>
  );
}
