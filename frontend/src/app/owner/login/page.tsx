"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button as AppButton } from "@/components/app/button";
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
      const res = await apiFetch("/owner/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.push("/owner/dashboard");
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
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-950 via-indigo-950 to-slate-900 px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-indigo-400/20 bg-slate-900/80 p-6 shadow-xl">
        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-2.5 py-1 text-xs font-semibold text-indigo-300">
          🛡 オーナー
        </div>
        <h1 className="text-xl font-bold text-white">オーナーログイン</h1>
        <p className="mt-1 text-sm text-slate-400">
          運営者専用の管理画面です
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-300">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-white outline-none focus-visible:border-indigo-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-slate-300"
            >
              パスワード
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-white outline-none focus-visible:border-indigo-400"
            />
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <AppButton
            type="submit"
            variant="default"
            disabled={submitting}
            className="mt-2 w-full normal-case"
          >
            {submitting ? "ログイン中..." : "ログイン"}
          </AppButton>
        </form>
      </div>
    </div>
  );
}
