"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BackLink } from "@/components/app/back-link";
import { BottomNav } from "@/components/app/bottom-nav";
import { Button as AppButton } from "@/components/app/button";
import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";
import { LoadingScreen, SpruLoading } from "@/components/app/spru-loading";
import { apiFetch } from "@/lib/api";
import { saveWordList, starsText, WORD_FILTERS, type WordFilter, type WordList, type WordListItem } from "@/lib/words";

const STATUS_MARK: Record<string, string> = { weak: "✖", learned: "💡" };

/** 単語帳(docs/design/2026-10-07-word-book-design.md 6-2)。出会った語と、保存した語だけ */
export default function Page() {
  const router = useRouter();
  const [filter, setFilter] = useState<WordFilter>("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<WordListItem[] | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0);

  // 検索の入力は、少し待ってから反映する(1文字ごとに問い合わせない)
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(
    async (nextPage: number, replace: boolean) => {
      const id = ++requestId.current;
      const params = new URLSearchParams({ filter, page: String(nextPage) });
      if (query) params.set("q", query);
      try {
        const res = await apiFetch(`/api/words?${params}`);
        if (id !== requestId.current) return;
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (!res.ok) {
          setFailed(true);
          return;
        }
        const data: WordList = await res.json();
        setFailed(false);
        setItems((prev) => (replace || !prev ? data.data : [...prev, ...data.data]));
        setPage(data.page);
        setLastPage(data.last_page);
        setTotal(data.total);
      } catch {
        if (id === requestId.current) setFailed(true);
      } finally {
        if (id === requestId.current) setLoadingMore(false);
      }
    },
    [filter, query, router],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 絞り込み・検索が変わったら、最初のページから読み直す
    void load(1, true);
  }, [load]);

  // いま見ている並びを覚えておく(詳細の「次へ」が使う)
  useEffect(() => {
    if (items) saveWordList(items.map((item) => item.id));
  }, [items]);

  if (items === undefined && !failed) return <LoadingScreen />;

  return (
    <SkyPage>
      <AppHeader />

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8 pb-24">
        <div>
          <BackLink href="/learn" label="学ぶにもどる" />
        </div>

        <div className="text-center">
          <SkyTitle className="text-3xl">
            <AutoFurigana text="単語帳" />
          </SkyTitle>
          <SkyText muted className="mt-1 text-sm">
            <AutoFurigana text="出会った単語を、見かえせるよ" />
          </SkyText>
        </div>

        <div role="tablist" aria-label="絞り込み" className="grid grid-cols-4 gap-1 rounded-2xl bg-white/70 p-1">
          {WORD_FILTERS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={filter === tab.key}
              onClick={() => setFilter(tab.key)}
              className={`h-10 rounded-xl text-sm font-black ${filter === tab.key ? "bg-[#3b7f26] text-white" : "text-[#3b3226]"}`}
            >
              <AutoFurigana text={tab.label} />
            </button>
          ))}
        </div>

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="さがす（英語・日本語）"
          aria-label="単語をさがす"
          className="h-11 w-full rounded-2xl border-2 border-[#e8dfcf] bg-white px-4 text-base font-bold text-[#3b3226] outline-none focus:border-[#2b6fa3]"
        />

        <div className="rounded-3xl border-4 border-[#e8dfcf] bg-[#fffaf0] p-2 text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)]">
          {failed ? (
            <p className="p-6 text-center text-sm font-bold"><AutoFurigana text="読み込みに失敗しました。" /></p>
          ) : !items || items.length === 0 ? (
            <p className="p-6 text-center text-sm font-bold text-[#6b5d45]">
              <AutoFurigana
                text={
                  query || filter !== "all"
                    ? "ここには、まだないよ"
                    : "まだ単語に出会っていないよ。英語のクイズに答えると、ここに集まるよ"
                }
              />
            </p>
          ) : (
            <>
              <p className="px-3 pt-2 pb-1 text-xs font-bold text-[#8a7a5a]">{total}語</p>
              <ul className="flex flex-col">
                {items.map((item) => (
                  <li key={item.id} className="border-t border-[#efe5cf] first:border-t-0">
                    <Link href={`/words/${item.id}`} className="flex items-center gap-3 px-3 py-3 hover:bg-white">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-baseline gap-2">
                          <span lang="en" className="truncate text-lg font-black">
                            {item.word}
                          </span>
                          {item.pos && <span className="shrink-0 text-xs font-bold text-[#8a7a5a]">【{item.pos}】</span>}
                        </p>
                        <p className="truncate text-sm font-bold text-[#6b5d45]">
                          <AutoFurigana text={item.meaning} />
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs">
                        <span aria-label={`重要度 ${item.importance}`} className="font-black text-[#d9a521]">
                          {starsText(item.importance)}
                        </span>
                        <span className="flex gap-1 text-sm">
                          {item.saved && <span aria-label="単語帳に保存">🔖</span>}
                          {item.status && <span aria-label={item.status === "weak" ? "苦手" : "覚えた"}>{STATUS_MARK[item.status]}</span>}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              {page < lastPage && (
                <div className="flex justify-center p-3">
                  <AppButton
                    type="button"
                    variant="default"
                    disabled={loadingMore}
                    onClick={() => {
                      setLoadingMore(true);
                      void load(page + 1, false);
                    }}
                  >
                    {loadingMore ? <SpruLoading /> : "もっと見る"}
                  </AppButton>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <BottomNav />
    </SkyPage>
  );
}
