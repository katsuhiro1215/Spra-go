"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, HouseHeart } from "lucide-react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import type { FamilyMember } from "@/components/world/types";
import { apiFetch } from "@/lib/api";

/** 家族の町の一覧(設計書5-5) */
export default function FamilyPage() {
  const router = useRouter();
  const [members, setMembers] = useState<FamilyMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/family")
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (res.status === 422) {
          router.replace("/profiles");
          return;
        }
        if (!res.ok) {
          setError("通信エラーが発生しました。");
          return;
        }
        setMembers(await res.json());
      })
      .catch(() => setError("通信エラーが発生しました。"));
  }, [router]);

  return (
    <div className="min-h-screen bg-[#8fd4e9]">
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col pb-28 text-[#3b3226]">
        <header className="flex items-center justify-between gap-2 rounded-b-[22px] bg-[#fffaf0] px-3.5 py-3 shadow-[0_4px_14px_rgba(59,50,38,0.14)]">
          <h1 className="flex items-center gap-1.5 text-lg font-black text-[#2f4a22]">
            <HouseHeart className="h-5 w-5 text-[#d0467a]" aria-hidden />
            {/* ふりがなの部品は漢字の所で分かれるので、横並びのすき間が入らないよう span で包む */}
            <span>
              <AutoFurigana text="家族の町" />
            </span>
          </h1>
          <Link href="/" className="shrink-0 rounded-full bg-[#efe5cf] px-3 py-1.5 text-sm font-black">
            <AutoFurigana text="自分の町にもどる" />
          </Link>
        </header>

        {error && (
          <p role="alert" className="mx-4 mt-4 rounded-xl bg-[#fdebe5] px-3 py-2 text-sm font-bold text-[#a33a22]">
            {error}
          </p>
        )}

        {members === null && !error && <p className="mt-16 text-center text-sm">読み込み中...</p>}

        {members !== null && members.length === 0 && (
          <div className="mx-4 mt-6 flex flex-col items-center gap-3 rounded-2xl bg-[#fffaf0] p-5 text-center">
            <p className="text-sm font-bold">
              <AutoFurigana text="家族のプレイヤーを増やすと、町を見に行けるよ" />
            </p>
            <Link href="/profiles" className="rounded-full bg-[#3b7f26] px-4 py-2 text-sm font-black text-white">
              <AutoFurigana text="プロフィールへ" />
            </Link>
          </div>
        )}

        {members !== null && members.length > 0 && (
          <ul className="mx-4 mt-4 flex flex-col gap-2">
            {members.map((member) => (
              <li key={member.id}>
                <Link
                  href={`/family/${member.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-[#fffaf0] p-3 shadow-[0_2px_8px_rgba(59,50,38,0.12)]"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-base font-black break-all">{member.name}</span>
                    <span className="text-xs font-bold text-[#6b5d45]">
                      Lv.{member.level}
                      {member.greeted_today && (
                        <>
                          {" ・ "}
                          <AutoFurigana text="あいさつしたよ" />
                        </>
                      )}
                    </span>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-[#8a7a5c]" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
