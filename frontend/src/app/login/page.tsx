"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button as AppButton } from "@/components/app/button";
import { CharacterPlaceholder } from "@/components/app/character-placeholder";
import { SceneBackground } from "@/components/app/scene-background";
import { apiFetch } from "@/lib/api";

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await apiFetch("/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.push("/profiles");
        return;
      }

      if (res.status === 422) {
        const data = await res.json();
        setError(data.errors?.email?.[0] ?? data.message ?? "ログインに失敗しました");
      } else {
        setError("ログインに失敗しました。時間をおいて再度お試しください。");
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
            ぼうけんへ出発
          </h1>
          <p className="mt-1 text-center text-sm text-white/80">
            ログインして世界図鑑の続きへ
          </p>

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
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
              {submitting ? "ログイン中..." : "ログイン"}
            </AppButton>
          </form>
        </div>

        <Link
          href="/register"
          className="text-sm text-white/85 drop-shadow hover:underline"
        >
          はじめての方はこちら
        </Link>
      </div>
    </div>
  );
}
