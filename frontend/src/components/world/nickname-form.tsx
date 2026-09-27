"use client";

import { useState, type FormEvent } from "react";

import { AutoFurigana } from "@/components/app/auto-furigana";

import { checkNickname, NICKNAME_MAX } from "./companions";

/** 名前の入力欄(仲間のカードと、最初の仲間の名前付けで共通。設計書3-2) */
export function NicknameForm({
  initial,
  placeholder,
  submitLabel,
  cancelLabel,
  onSubmit,
  onCancel,
}: {
  initial: string;
  placeholder: string;
  submitLabel: string;
  cancelLabel: string;
  // 失敗したときはその理由を返す(成功なら null)
  onSubmit: (nickname: string | null) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const checked = checkNickname(value);
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    setBusy(true);
    try {
      setError(await onSubmit(checked.value));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor="nickname-input" className="text-sm font-bold text-[#6b5d45]">
        <AutoFurigana text={`名前（${NICKNAME_MAX}文字まで）`} />
      </label>
      <input
        id="nickname-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        // 長く打ったときも、止めずにわけを見せるため、入力は少し長めまで受ける
        maxLength={NICKNAME_MAX * 2}
        aria-invalid={error !== null}
        aria-describedby={error ? "nickname-error" : undefined}
        className="h-12 rounded-xl border-2 border-[#d9ccb0] bg-white px-3 text-base font-bold focus:border-[#3b7f26] focus:outline-none"
      />
      {error && (
        <p id="nickname-error" role="alert" className="text-sm font-bold text-[#a33a22]">
          <AutoFurigana text={error} />
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="h-12 flex-1 rounded-2xl bg-[#3b7f26] text-base font-black text-white disabled:opacity-60"
        >
          <AutoFurigana text={submitLabel} />
        </button>
        <button type="button" onClick={onCancel} className="h-12 flex-1 rounded-2xl bg-[#efe5cf] text-base font-black">
          <AutoFurigana text={cancelLabel} />
        </button>
      </div>
    </form>
  );
}
