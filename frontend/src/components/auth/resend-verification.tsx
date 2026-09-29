"use client";

import { useState } from "react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { apiFetch } from "@/lib/api";

import { resendMessage } from "./auth-flow";

/** 確認メールをもう一度送るボタン(docs/design/2026-09-29-email-verify-reset-design.md 3-4・3-5)。送ったあとは結果の文を出す */
export function ResendVerificationButton({ className }: { className?: string }) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function resend() {
    setSending(true);
    setMessage(null);
    try {
      const res = await apiFetch("/email/verification-notification", { method: "POST" });
      setMessage(resendMessage(res.status));
    } catch {
      setMessage(resendMessage(0));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <AppButton type="button" variant="primary" size="sm" disabled={sending} onClick={resend} className="normal-case">
        {sending ? "送っています..." : "メールをもう一度送る"}
      </AppButton>
      {message && (
        <p role="status" className="text-xs font-bold text-[#6b5d45]">
          <AutoFurigana text={message} />
        </p>
      )}
    </div>
  );
}
