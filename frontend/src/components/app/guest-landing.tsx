import Image from "next/image";
import Link from "next/link";

import { LogoMark } from "@/components/app/logo-mark";
import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";
import { STAMP_IMAGES, type StampKey } from "@/components/spru/spru-assets";
import { SpruFigure } from "@/components/spru/spru-figure";
import { SpruHouse } from "@/components/spru/spru-house";

const SAMPLE_COUNTRIES: { code: StampKey; name: string }[] = [
  { code: "jp", name: "日本" },
  { code: "us", name: "アメリカ" },
  { code: "gb", name: "イギリス" },
  { code: "fr", name: "フランス" },
];

/**
 * 未ログインのトップ(docs/design/2026-09-28-top-profiles-design.md 3章)。
 * 時間帯の空の上に、スプルの家と手を振るスプル、はじめる・ログイン・お試しクイズ
 */
export function GuestLanding() {
  return (
    <SkyPage className="items-center px-4 pt-10 pb-24">
      <div className="flex items-center gap-2">
        <LogoMark size={40} />
        <SkyTitle className="text-[32px] tracking-wide">SpraGo</SkyTitle>
      </div>
      <SkyText className="mt-1 text-sm">学ぶほど、世界が広がる。</SkyText>

      <div className="relative mt-6 flex w-full max-w-[300px] justify-center">
        <SpruHouse width={300} eager />
        <SpruFigure
          image="wave"
          standHeight={104}
          eager
          className="animate-character-bounce absolute -bottom-2 left-2"
        />
      </div>

      <div className="mt-8 flex w-full max-w-[340px] flex-col items-center">
        <Link
          href="/register"
          className="flex h-[54px] w-full items-center justify-center rounded-2xl border-b-4 border-[#285a19] bg-[#3b7f26] text-lg font-black text-white hover:bg-[#438b2d] focus-visible:ring-4 focus-visible:ring-[#9fd8ff] focus-visible:outline-none active:translate-y-0.5 active:border-b-0"
        >
          はじめる
        </Link>
        <Link
          href="/login"
          className="mt-3 rounded-full bg-[#fffaf0] px-4 py-1.5 text-sm font-black text-[#2b6fa3] shadow-[0_2px_6px_rgba(59,50,38,0.15)] hover:bg-white"
        >
          アカウントをお持ちの方はログイン
        </Link>

        <SkyText muted className="mt-5 text-xs">
          登録なしでお試しクイズ
        </SkyText>
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
                <SkyText as="span" className="text-[11px]">
                  {name}
                </SkyText>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </SkyPage>
  );
}
