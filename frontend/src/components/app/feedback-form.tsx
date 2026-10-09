"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/app/button";
import { apiFetch } from "@/lib/api";
import { WRITTEN_KINDS } from "@/lib/feedback";
import { AutoFurigana } from "@/components/app/auto-furigana";

const MAX_LENGTH = 2000;

/** 保護者のご意見フォーム(docs/design/2026-10-03-closed-beta-design.md 5-3)。保護者向けの文章なので、ふりがなは付けない */
export function FeedbackForm({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<string>("request");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);

    try {
      const res = await apiFetch("/api/feedback", {
        method: "POST",
        body: JSON.stringify({ kind, body, page: window.location.pathname }),
      });

      if (res.status === 201) {
        setBody("");
        setOpen(false);
        setMessage("ありがとうございます。いただいたご意見は、今後の改良に役立てます。");
      } else if (res.status === 429) {
        setError("たくさん送っていただきありがとうございます。しばらくしてからまたお願いします。");
      } else {
        setError("送れませんでした。時間をおいて、もう一度お試しください。");
      }
    } catch {
      setError("送れませんでした。通信を確かめて、もう一度お試しください。");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={`flex w-full flex-col items-center gap-2 ${className ?? ""}`}>
      {message && <p className="rounded-2xl bg-[#fffaf0] px-4 py-2 text-center text-xs font-bold text-[#3b3226]">{message}</p>}

      {!open ? (
        <Button
          variant="default"
          size="sm"
          className="normal-case"
          onClick={() => {
            setMessage(null);
            setOpen(true);
          }}
        >
          <AutoFurigana text="ご意見・ご要望をおくる" />
        </Button>
      ) : (
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 rounded-2xl bg-[#fffaf0] p-4 text-left text-[#3b3226] shadow-lg">
          <fieldset className="flex flex-wrap gap-2">
            <legend className="mb-1 text-sm font-black"><AutoFurigana text="ご意見の種類" /></legend>
            {WRITTEN_KINDS.map((item) => (
              <label
                key={item.value}
                className={`cursor-pointer rounded-full border-2 px-3 py-1 text-xs font-black ${
                  kind === item.value ? "border-[#2b6fa3] bg-white" : "border-[#e8dfcf] bg-[#fffaf0]"
                }`}
              >
                <input
                  type="radio"
                  name="feedback-kind"
                  value={item.value}
                  checked={kind === item.value}
                  onChange={() => setKind(item.value)}
                  className="sr-only"
                />
                {item.label}
              </label>
            ))}
          </fieldset>

          <div className="flex flex-col gap-1">
            <label htmlFor="feedback-body" className="text-sm font-black">
              <AutoFurigana text="ご意見・ご要望" />
            </label>
            <textarea
              id="feedback-body"
              required
              maxLength={MAX_LENGTH}
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="rounded-xl border-2 border-[#e8dfcf] bg-white p-3 text-sm text-[#3b3226] outline-none focus-visible:border-[#2b6fa3]"
            />
            <p className="text-right text-xs text-[#6b5d45]">
              {body.length} / {MAX_LENGTH}
            </p>
          </div>

          {error && <p className="text-sm font-medium text-[#c2402c]">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm" disabled={sending || body.trim() === ""} className="normal-case">
              {sending ? "送信中..." : "送る"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} className="normal-case">
              やめる
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
