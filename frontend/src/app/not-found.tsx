import Link from "next/link";

import { AssetImage } from "@/components/app/asset-image";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";
import { SPRU_PAGES } from "@/components/spru/spru-assets";

/**
 * 見つからないページ(docs/design/2026-09-29-spru-icons-design.md 4-8)。
 * not-found は metadata を書き出せないので、題名は React の <title> で付ける(head に移る)
 */
export default function NotFound() {
  return (
    <SkyPage>
      <title>ページが見つかりません | Spra Go</title>
      <main className="relative z-10 mx-auto flex w-full max-w-[480px] flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <AssetImage asset={SPRU_PAGES.lost} size={200} />
        <SkyTitle className="text-2xl">
          <AutoFurigana text="ページが見つからないよ" />
        </SkyTitle>
        <SkyText>さがしているページは、ここにはないみたい</SkyText>
        <Link
          href="/"
          className="mt-3 rounded-full bg-[#3b7f26] px-6 py-3 text-base font-black text-white shadow-[0_5px_0_#285a19]"
        >
          <AutoFurigana text="町にもどる" />
        </Link>
      </main>
    </SkyPage>
  );
}
