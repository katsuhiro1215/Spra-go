"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { AuthCard } from "@/components/auth/auth-card";
import { resetTermsGate } from "@/components/legal/terms-gate";
import { apiFetch } from "@/lib/api";

const CHANGES = [
  "Spra Go と Tane（べつのアプリ）で、おなじアカウントを つかえるようになります",
  "どのアプリを つかっているか、いつ つかいはじめたかを きろくします",
  "あそんだ きろくは、アプリごとに べつべつに ほぞんします",
  "アカウントを けすと、すべてのアプリの きろくが きえます",
];

/** 規約の版が変わったときの、同意のしなおしの画面(docs/design/2026-10-23-shared-account-legal-design.md 4-3) */
export default function Page() {
  const router = useRouter();
  const [version, setVersion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch("/api/user")
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) {
          router.replace("/login");
          return;
        }
        const user = await res.json();
        if (user.terms_outdated === true) setVersion(user.terms_version_current);
        else router.replace("/profiles");
      })
      .catch(() => {
        if (active) setError("つながりませんでした。もういちど ひらいてね");
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function accept() {
    if (!version) return;
    setBusy(true);
    setError(null);
    const res = await apiFetch("/api/terms/accept", { method: "POST", body: JSON.stringify({ version }) });
    if (res.ok) {
      resetTermsGate(true);
      router.replace("/profiles");
      return;
    }
    // 版が合わない(ページを開いている間に更新された)ときは、読み込み直す
    setError(res.status === 422 ? "きまりが あたらしくなりました。ページを ひらきなおしてね" : "うまく いきませんでした。もういちど ためしてね");
    setBusy(false);
  }

  async function decline() {
    setBusy(true);
    await apiFetch("/logout", { method: "POST" });
    resetTermsGate(false);
    router.replace("/login");
  }

  return (
    <AuthCard
      icon="letter"
      title="きまりが かわります"
      lead={<AutoFurigana text="つづけるには、あたらしい きまりを よんで、同意してください" />}
    >
      <p className="text-sm font-bold text-[#6b5d45]">
        <AutoFurigana text="保護者のかたへ: 利用規約とプライバシーポリシーが、次のとおり変わります。" />
      </p>
      <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm font-bold text-[#3b3226]">
        {CHANGES.map((change) => (
          <li key={change}>
            <AutoFurigana text={change} />
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm font-bold text-[#3b3226]">
        <Link href="/terms" target="_blank" className="font-black text-[#2b5d7a] underline">
          利用規約
        </Link>
        と
        <Link href="/privacy" target="_blank" className="font-black text-[#2b5d7a] underline">
          プライバシーポリシー
        </Link>
        を、ぜんぶ よめます
      </p>

      {error && <p className="mt-3 text-sm font-medium text-[#c2402c]">{error}</p>}

      <div className="mt-5 flex flex-col gap-2">
        <AppButton variant="primary" size="lg" disabled={busy || !version} onClick={accept} className="w-full normal-case">
          同意する
        </AppButton>
        <button
          type="button"
          disabled={busy}
          onClick={decline}
          className="mx-auto text-sm font-black text-[#6b5d45] underline underline-offset-2 disabled:opacity-50"
        >
          <AutoFurigana text="同意しない（ログアウト）" />
        </button>
      </div>
      <p className="mt-4 text-center text-xs font-bold text-[#6b5d45]">
        <AutoFurigana text="アカウントの削除は、info@spra.jp へ連絡してください" />
      </p>
    </AuthCard>
  );
}
