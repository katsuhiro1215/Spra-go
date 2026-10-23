"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { isTermsExemptPath, shouldAskTerms } from "./terms-gate-logic";

// 同意が済んでいると分かったら、この画面を開いている間は確かめ直さない(ゲストとログイン前は、移動のたびに確かめる)
let confirmedCurrent = false;

/**
 * 利用規約・プライバシーポリシーの版が古い人を、同意の画面(/terms-update)へ送る(docs/design/2026-10-23-shared-account-legal-design.md 4-3)。
 * ログインは止めず、画面で止める。API で止めるのは Tane の記録の入口だけ
 */
export function TermsGate() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (confirmedCurrent || isTermsExemptPath(pathname)) return;
    let active = true;

    apiFetch("/api/user")
      .then(async (res) => {
        if (!active || !res.ok) return;
        const user = await res.json();
        if (shouldAskTerms(user)) router.replace("/terms-update");
        else confirmedCurrent = true;
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [pathname, router]);

  return null;
}

/** 同意したあと・ログアウトしたあとに呼ぶ(次の確認をやり直す) */
export function resetTermsGate(accepted: boolean) {
  confirmedCurrent = accepted;
}
