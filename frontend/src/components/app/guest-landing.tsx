import Link from "next/link";

import { Button as AppButton } from "@/components/app/button";
import { CharacterPlaceholder } from "@/components/app/character-placeholder";
import { SceneBackground } from "@/components/app/scene-background";

const SAMPLE_COUNTRIES = [
  { code: "jp", name: "日本" },
  { code: "us", name: "アメリカ" },
  { code: "gb", name: "イギリス" },
  { code: "fr", name: "フランス" },
];

/** 未ログイン時のトップ(LP)。app/page.tsx から切り出し、内容は変えていない */
export function GuestLanding() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <SceneBackground />

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
        <div>
          <h1 className="text-4xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
            SpraGo
          </h1>
          <p className="mt-2 text-sm text-white/85 drop-shadow">
            興味が世界を広げ、世界が言葉を教えてくれる。
          </p>
        </div>

        <CharacterPlaceholder className="h-40 w-40" />

        <div className="flex flex-col items-center gap-3">
          <Link href="/register">
            <AppButton variant="primary" size="lg" className="shadow-lg">
              はじめる
            </AppButton>
          </Link>
          <Link
            href="/login"
            className="text-sm text-white/85 drop-shadow hover:underline"
          >
            すでにアカウントをお持ちの方はこちら
          </Link>
        </div>

        <div className="mt-2 flex flex-col items-center gap-2">
          <p className="text-xs text-white/70">
            登録なしでミニクイズを試す
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {SAMPLE_COUNTRIES.map((country) => (
              <Link key={country.code} href={`/world/${country.code}`}>
                <AppButton variant="ghost" size="sm" className="text-white">
                  {country.name}
                </AppButton>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
