"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { AUTH_INPUT_CLASS, AUTH_LABEL_CLASS, AUTH_LINK_CLASS, AuthCard } from "@/components/auth/auth-card";
import { resetPasswordErrors } from "@/components/auth/auth-flow";
import { apiFetch } from "@/lib/api";

type Errors = { link: string | null; password: string | null };

/** 新しいパスワード(docs/design/2026-09-29-email-verify-reset-design.md 3-3)。メールのリンク(/password-reset/{token}?email=…)から来る */
export default function Page(props: PageProps<"/password-reset/[token]">) {
  const { token } = use(props.params);
  const query = use(props.searchParams);
  const router = useRouter();
  const [email, setEmail] = useState(typeof query.email === "string" ? query.email : "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<Errors>({ link: null, password: null });
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({ link: null, password: null });
    setFailure(null);
    setSubmitting(true);

    try {
      const res = await apiFetch("/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, email, password, password_confirmation: confirmation }),
      });

      if (res.ok) {
        router.push("/login?reset=1");
        return;
      }

      if (res.status === 422) {
        const data = await res.json();
        setErrors(resetPasswordErrors(data.errors));
      } else {
        setFailure("パスワードを決められませんでした。時間をおいて、もう一度試してね");
      }
    } catch {
      setFailure("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      icon="key"
      title="新しいパスワード"
      footer={
        <Link href="/login" className={AUTH_LINK_CLASS}>
          ログインにもどる
        </Link>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {errors.link && (
          <div role="alert" className="flex flex-col gap-2 rounded-xl bg-[#fdecea] p-3 text-sm font-bold text-[#c2402c]">
            <p>
              <AutoFurigana text={errors.link} />
            </p>
            <Link href="/forgot-password" className="self-start text-[#2b5d7a] underline">
              もう一度メールを送る
            </Link>
          </div>
        )}

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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className={AUTH_LABEL_CLASS}>
            新しいパスワード
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={AUTH_INPUT_CLASS}
          />
          <p className="text-xs font-bold text-[#6b5d45]">8文字以上</p>
          {errors.password && <p className="text-sm font-medium text-[#c2402c]">{errors.password}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password_confirmation" className={AUTH_LABEL_CLASS}>
            もう一度入れる
          </label>
          <input
            id="password_confirmation"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className={AUTH_INPUT_CLASS}
          />
        </div>

        {failure && <p className="text-sm font-medium text-[#c2402c]">{failure}</p>}

        <AppButton type="submit" variant="primary" size="lg" disabled={submitting} className="mt-2 w-full normal-case">
          {submitting ? "決めています..." : "パスワードを決める"}
        </AppButton>
      </form>
    </AuthCard>
  );
}
