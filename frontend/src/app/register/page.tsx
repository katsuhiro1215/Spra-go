"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button as AppButton } from "@/components/app/button";
import { CharacterPlaceholder } from "@/components/app/character-placeholder";
import { Furigana } from "@/components/app/furigana";
import { SkyPage } from "@/components/app/sky-page";
import { apiFetch } from "@/lib/api";

export default function Page() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await apiFetch("/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      if (res.ok) {
        router.push("/profiles");
        return;
      }

      if (res.status === 422) {
        const data = await res.json();
        const firstError = Object.values(data.errors ?? {})[0] as
          | string[]
          | undefined;
        setError(firstError?.[0] ?? data.message ?? "登録に失敗しました");
      } else {
        setError("登録に失敗しました。時間をおいて再度お試しください。");
      }
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SkyPage className="items-center justify-center px-6 py-12">

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-4">
        <CharacterPlaceholder className="h-24 w-24" />

        <div className="w-full rounded-3xl bg-[#fffaf0] p-6 text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)]">
          <h1 className="text-center text-2xl font-black text-[#3b3226]">
            はじめての<Furigana text="冒険者登録" reading="ぼうけんしゃとうろく" />
          </h1>
          <p className="mt-1 text-center text-sm font-bold text-[#6b5d45]">
            世界図鑑を完成させる旅をはじめよう
          </p>

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-black text-[#3b3226]">
                お名前
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl border-2 border-[#e8dfcf] bg-white px-3 text-sm text-[#3b3226] outline-none focus-visible:border-[#2b6fa3]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-black text-[#3b3226]">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl border-2 border-[#e8dfcf] bg-white px-3 text-sm text-[#3b3226] outline-none focus-visible:border-[#2b6fa3]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-sm font-black text-[#3b3226]"
              >
                パスワード
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl border-2 border-[#e8dfcf] bg-white px-3 text-sm text-[#3b3226] outline-none focus-visible:border-[#2b6fa3]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password_confirmation"
                className="text-sm font-black text-[#3b3226]"
              >
                パスワード（確認）
              </label>
              <input
                id="password_confirmation"
                type="password"
                required
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                className="h-11 rounded-xl border-2 border-[#e8dfcf] bg-white px-3 text-sm text-[#3b3226] outline-none focus-visible:border-[#2b6fa3]"
              />
            </div>

            {error && (
              <p className="text-sm font-medium text-[#c2402c]">{error}</p>
            )}

            <AppButton
              type="submit"
              variant="primary"
              size="lg"
              disabled={submitting}
              className="mt-2 w-full normal-case"
            >
              {submitting ? (
                "登録中..."
              ) : (
                <>
                  <Furigana text="冒険" reading="ぼうけん" />をはじめる
                </>
              )}
            </AppButton>
          </form>
        </div>

        <Link
          href="/login"
          className="rounded-full bg-[#fffaf0] px-3 py-1.5 text-sm font-black text-[#2b5d7a] shadow-[0_2px_6px_rgba(59,50,38,0.15)] hover:bg-white"
        >
          すでにアカウントをお持ちの方はこちら
        </Link>
      </div>
    </SkyPage>
  );
}
