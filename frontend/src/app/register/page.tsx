"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button as AppButton } from "@/components/app/button";
import { CharacterPlaceholder } from "@/components/app/character-placeholder";
import { Furigana } from "@/components/app/furigana";
import { SceneBackground } from "@/components/app/scene-background";
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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12">
      <SceneBackground />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-4">
        <CharacterPlaceholder className="h-24 w-24" />

        <div className="w-full rounded-2xl border border-white/30 bg-black/30 p-6 shadow-xl backdrop-blur-sm">
          <h1 className="text-center text-2xl font-bold text-white drop-shadow">
            はじめての<Furigana text="冒険者登録" reading="ぼうけんしゃとうろく" />
          </h1>
          <p className="mt-1 text-center text-sm text-white/80">
            世界図鑑を完成させる旅をはじめよう
          </p>

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-medium text-white/90">
                お名前
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl border-2 border-white/40 bg-white/90 px-3 text-sm text-slate-900 outline-none focus-visible:border-sky-400"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-white/90">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl border-2 border-white/40 bg-white/90 px-3 text-sm text-slate-900 outline-none focus-visible:border-sky-400"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-white/90"
              >
                パスワード
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl border-2 border-white/40 bg-white/90 px-3 text-sm text-slate-900 outline-none focus-visible:border-sky-400"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password_confirmation"
                className="text-sm font-medium text-white/90"
              >
                パスワード（確認）
              </label>
              <input
                id="password_confirmation"
                type="password"
                required
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                className="h-11 rounded-xl border-2 border-white/40 bg-white/90 px-3 text-sm text-slate-900 outline-none focus-visible:border-sky-400"
              />
            </div>

            {error && (
              <p className="text-sm font-medium text-rose-200">{error}</p>
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
          className="text-sm text-white/85 drop-shadow hover:underline"
        >
          すでにアカウントをお持ちの方はこちら
        </Link>
      </div>
    </div>
  );
}
