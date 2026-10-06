"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BackLink } from "@/components/app/back-link";
import { BottomNav } from "@/components/app/bottom-nav";
import { Button as AppButton } from "@/components/app/button";
import { SkyPage } from "@/components/app/sky-page";
import { LoadingScreen } from "@/components/app/spru-loading";
import { apiFetch } from "@/lib/api";
import {
  hasContext,
  loadWordList,
  meaningLines,
  nextWordId,
  starsText,
  statusAfterToggle,
  type WordDetail,
  type WordStatus,
} from "@/lib/words";

type LoadState = { kind: "ready"; word: WordDetail } | { kind: "missing" } | { kind: "error" };

/** 単語の詳細(docs/design/2026-10-07-word-book-design.md 6-1)。内容のない項目は、見出しごと出さない。🔊は音声の作業のあとで足す */
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [state, setState] = useState<LoadState | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [nextId, setNextId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 語が変わる(次へ)たびに、読み込み中の表示から始める
    setState(undefined);
    setNextId(nextWordId(loadWordList(), Number(id)));

    apiFetch(`/api/words/${id}`)
      .then(async (res) => {
        if (!active) return;
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (res.status === 404) {
          setState({ kind: "missing" });
          return;
        }
        setState(res.ok ? { kind: "ready", word: await res.json() } : { kind: "error" });
      })
      .catch(() => {
        if (active) setState({ kind: "error" });
      });

    return () => {
      active = false;
    };
  }, [id, router]);

  async function mark(changes: { status?: WordStatus; saved?: boolean }) {
    if (state?.kind !== "ready" || busy) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/words/${state.word.id}/mark`, { method: "PUT", body: JSON.stringify(changes) });
      if (res.ok) {
        const data: { status: WordStatus; saved: boolean } = await res.json();
        setState({ kind: "ready", word: { ...state.word, status: data.status, saved: data.saved } });
      }
    } finally {
      setBusy(false);
    }
  }

  if (state === undefined) return <LoadingScreen />;

  if (state.kind !== "ready") {
    return (
      <SkyPage>
        <AppHeader />
        <main className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col items-center gap-4 px-4 py-10 pb-24">
          <div className="self-start">
            <BackLink href="/words" label="単語帳にもどる" />
          </div>
          <p className="rounded-3xl bg-[#fffaf0] p-6 text-center text-sm font-bold text-[#3b3226]">
            <AutoFurigana text={state.kind === "missing" ? "この単語には、まだ出会っていないよ" : "読み込みに失敗しました。"} />
          </p>
        </main>
        <BottomNav />
      </SkyPage>
    );
  }

  const word = state.word;
  const lines = meaningLines(word.meanings);

  return (
    <SkyPage>
      <AppHeader />

      <main className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col gap-3 px-4 py-6 pb-44">
        <div className="flex items-center justify-between gap-2">
          <BackLink href="/words" label="もどる" />
          <span aria-label={`重要度 ${word.importance}`} className="rounded-full bg-white/85 px-3 py-1 text-sm font-black text-[#d9a521]">
            <AutoFurigana text="重要度" /> {starsText(word.importance)}
          </span>
          <AppButton
            type="button"
            variant={word.saved ? "warning" : "default"}
            size="sm"
            aria-pressed={word.saved}
            disabled={busy}
            onClick={() => void mark({ saved: !word.saved })}
          >
            {word.saved ? "🔖 保存ずみ" : "🔖 単語帳へ"}
          </AppButton>
        </div>

        <article className="flex flex-col gap-5 rounded-3xl border-4 border-[#e8dfcf] bg-[#fffaf0] p-5 text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)]">
          <Section title="単語" subtitle="Word">
            <p lang="en" className="text-4xl font-black break-words">
              {word.word}
            </p>
            {word.ipa && <p className="text-base font-bold text-[#6b5d45]">[ {word.ipa} ]</p>}
          </Section>

          {lines.length > 0 && (
            <Section title="意味" subtitle="Meaning">
              <ul className="flex flex-col gap-1">
                {lines.map((line) => (
                  <li key={line.label} className="text-lg font-bold">
                    <span className="mr-1 text-sm text-[#8a7a5a]">{line.label}</span>
                    <AutoFurigana text={line.text} />
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {hasContext(word) && (
            <Section title="使われる場面" subtitle="Context">
              <p className="rounded-2xl bg-[#f5ecd5] px-3 py-2 text-base font-bold leading-relaxed">
                💬 <AutoFurigana text={(word.usage ?? "").trim()} />
              </p>
            </Section>
          )}

          {word.examples.length > 0 && (
            <Section title="例文" subtitle="Example">
              <ul className="flex flex-col gap-3">
                {word.examples.map((example) => (
                  <li key={example.text}>
                    <p lang="en" className="text-base font-bold">
                      “{example.text}”
                    </p>
                    {example.translation && (
                      <p className="text-sm font-bold text-[#6b5d45]">
                        （<AutoFurigana text={example.translation} />）
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {word.synonyms.length > 0 && (
            <Section title="似た単語" subtitle="Synonyms">
              <ul className="flex flex-col gap-2">
                {word.synonyms.map((synonym) => (
                  <li key={synonym.term} className="text-base font-bold">
                    🔗{" "}
                    {synonym.id !== null ? (
                      <Link href={`/words/${synonym.id}`} lang="en" className="text-[#2b6fa3] underline">
                        {synonym.term}
                      </Link>
                    ) : (
                      <span lang="en">{synonym.term}</span>
                    )}{" "}
                    <span className="text-sm text-[#6b5d45]">
                      （<AutoFurigana text={synonym.note} />）
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </article>
      </main>

      {/* 下の固定ボタン(ナビの上)。右の余白は、右下に浮いている仲間のアイコンを避けるため */}
      <div className="fixed inset-x-0 bottom-[68px] z-30 mx-auto grid max-w-[480px] grid-cols-3 gap-2 pr-[72px] pl-3 pb-2">
        <AppButton
          type="button"
          variant={word.status === "weak" ? "danger" : "default"}
          aria-pressed={word.status === "weak"}
          disabled={busy}
          onClick={() => void mark({ status: statusAfterToggle(word.status, "weak") })}
          className="px-1 text-[13px] shadow"
        >
          ✖ <AutoFurigana text="苦手" />
        </AppButton>
        <AppButton
          type="button"
          variant={word.status === "learned" ? "secondary" : "default"}
          aria-pressed={word.status === "learned"}
          disabled={busy}
          onClick={() => void mark({ status: statusAfterToggle(word.status, "learned") })}
          className="px-1 text-[13px] shadow"
        >
          💡 <AutoFurigana text="覚えた！" />
        </AppButton>
        <AppButton
          type="button"
          variant="primary"
          disabled={nextId === null}
          onClick={() => nextId !== null && router.push(`/words/${nextId}`)}
          className="px-1 text-[13px] shadow"
        >
          ➡️ <AutoFurigana text="次へ" />
        </AppButton>
      </div>

      <BottomNav />
    </SkyPage>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="border-b-2 border-[#e8dfcf] pb-1 text-sm font-black text-[#7a6a4a]">
        <AutoFurigana text={title} /> <span className="font-bold text-[#a89a7a]">({subtitle})</span>
      </h2>
      {children}
    </section>
  );
}
