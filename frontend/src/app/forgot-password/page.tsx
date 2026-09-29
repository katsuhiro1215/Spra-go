"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { AUTH_INPUT_CLASS, AUTH_LABEL_CLASS, AUTH_LINK_CLASS, AuthCard } from "@/components/auth/auth-card";
import { apiFetch } from "@/lib/api";

/** パスワードを忘れたとき(docs/design/2026-09-29-email-verify-reset-design.md 3-2)。登録のないアドレスでも同じ「送りました」を出す */
export default function Page() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await apiFetch("/forgot-password", { method: "POST", body: JSON.stringify({ email }) });

      if (res.ok) {
        setSent(true);
        return;
      }

      if (res.status === 422) {
        const data = await res.json();
        setError(data.errors?.email?.[0] ?? "メールアドレスを確かめてね");
      } else {
        setError("メールを送れませんでした。時間をおいて、もう一度試してね");
      }
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      icon="letter"
      title="パスワードを忘れたとき"
      lead={
        sent ? undefined : (
          <AutoFurigana text="登録したメールアドレスを入れてね。パスワードを決め直すためのメールを送ります" />
        )
      }
      footer={
        <Link href="/login" className={AUTH_LINK_CLASS}>
          ログインにもどる
        </Link>
      }
    >
      {sent ? (
        <p role="status" className="text-center text-sm font-bold text-[#3b3226]">
          <AutoFurigana text="メールを送りました。届いたメールのリンクから、新しいパスワードを決めてね。メールが届かないときは、迷惑メールのフォルダも見てね" />
        </p>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className={AUTH_LABEL_CLASS}>
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={AUTH_INPUT_CLASS}
            />
          </div>

          {error && <p className="text-sm font-medium text-[#c2402c]">{error}</p>}

          <AppButton type="submit" variant="primary" size="lg" disabled={submitting} className="mt-2 w-full normal-case">
            {submitting ? "送っています..." : "メールを送る"}
          </AppButton>
        </form>
      )}
    </AuthCard>
  );
}
