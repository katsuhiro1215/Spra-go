"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button as AppButton } from "@/components/app/button";
import { Furigana } from "@/components/app/furigana";
import { SkyPage } from "@/components/app/sky-page";
import { SpruFigure } from "@/components/spru/spru-figure";
import { apiFetch } from "@/lib/api";
import { inviteCodeFromSearch, registrationView, type RegistrationInfo } from "@/lib/registration";
import { AutoFurigana } from "@/components/app/auto-furigana";

export default function Page() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  // 招待コードが要るか・おやすみ中か(docs/design/2026-10-03-closed-beta-design.md 3-3)。取れなければ null のまま、サーバーが最後に判断する
  const [info, setInfo] = useState<RegistrationInfo | null>(null);
  const view = registrationView(info);

  useEffect(() => {
    // 問い合わせの答えが来たところで、/register?code=○○ のコードを欄に入れる(入力が始まっていれば、そのまま)。
    // useSearchParams は静的に作るとき Suspense が要るので、window.location.search を読む
    apiFetch("/api/registration")
      .then(async (res) => (res.ok ? ((await res.json()) as RegistrationInfo) : null))
      .catch(() => null)
      .then((data) => {
        setInfo(data);
        setInviteCode((prev) => prev || inviteCodeFromSearch(window.location.search));
      });
  }, []);

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
          invite_code: inviteCode,
        }),
      });

      if (res.ok) {
        router.push("/profiles");
        return;
      }

      if (res.status === 403) {
        const data = await res.json();
        setError(data.message ?? "いまは登録をおやすみしています");
      } else if (res.status === 422) {
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
        <SpruFigure image="excited" standHeight={104} className="animate-character-bounce" eager />

        <div className="w-full rounded-3xl bg-[#fffaf0] p-6 text-[#3b3226] shadow-[0_8px_22px_rgba(40,70,90,0.16)]">
          <h1 className="text-center text-2xl font-black text-[#3b3226]">
            はじめての<Furigana text="冒険者登録" reading="ぼうけんしゃとうろく" />
          </h1>
          <p className="mt-1 text-center text-sm font-bold text-[#6b5d45]">
            <AutoFurigana text="世界図鑑を完成させる旅をはじめよう" />
          </p>

          {view.closed ? (
            <p className="mt-6 text-center text-sm font-bold text-[#6b5d45]">
              <AutoFurigana text="いまは登録をおやすみしています。" />
              <br />
              ひらいたら、またきてね
            </p>
          ) : (
          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
            {view.showCode && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="invite_code" className="text-sm font-black text-[#3b3226]">
                  <AutoFurigana text="招待コード" />
                </label>
                <input
                  id="invite_code"
                  type="text"
                  required
                  autoComplete="off"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="h-11 rounded-xl border-2 border-[#e8dfcf] bg-white px-3 text-sm text-[#3b3226] outline-none focus-visible:border-[#2b6fa3]"
                />
                <p className="text-xs font-bold text-[#6b5d45]"><AutoFurigana text="教えてもらったコードを入れてください" /></p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-black text-[#3b3226]">
                <AutoFurigana text="お名前" />
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
                <AutoFurigana text="パスワード（確認）" />
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
          )}
        </div>

        <Link
          href="/login"
          className="rounded-full bg-[#fffaf0] px-3 py-1.5 text-sm font-black text-[#2b5d7a] shadow-[0_2px_6px_rgba(59,50,38,0.15)] hover:bg-white"
        >
          <AutoFurigana text="すでにアカウントをお持ちの方はこちら" />
        </Link>
      </div>
    </SkyPage>
  );
}
