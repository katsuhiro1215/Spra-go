"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { AUTH_PRIMARY_LINK_CLASS, AuthCard } from "@/components/auth/auth-card";
import { verifyResultView } from "@/components/auth/auth-flow";
import { ResendVerificationButton } from "@/components/auth/resend-verification";
import { apiFetch } from "@/lib/api";

/** メール確認の結果(docs/design/2026-09-29-email-verify-reset-design.md 3-4)。確認のリンクを押すと、サーバーが確かめたあとここに来る */
export default function Page(props: PageProps<"/verify-email">) {
  const { status } = use(props.searchParams);
  const view = verifyResultView(typeof status === "string" ? status : null);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch("/api/user")
      .then((res) => {
        if (active) setLoggedIn(res.ok);
      })
      .catch(() => {
        if (active) setLoggedIn(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <AuthCard icon="letter" title={view.title} lead={<AutoFurigana text={view.body} />}>
      {loggedIn === null ? null : view.ok ? (
        <Link href={loggedIn ? "/profiles" : "/login"} className={AUTH_PRIMARY_LINK_CLASS}>
          {loggedIn ? "つづける" : "ログイン"}
        </Link>
      ) : loggedIn ? (
        <ResendVerificationButton className="items-center text-center" />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className="text-center text-sm font-bold text-[#6b5d45]">
            <AutoFurigana text="ログインすると、もう一度送れます" />
          </p>
          <Link href="/login" className={AUTH_PRIMARY_LINK_CLASS}>
            ログイン
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
