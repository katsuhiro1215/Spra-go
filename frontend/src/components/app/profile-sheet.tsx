"use client";

import { useState, type FormEvent } from "react";
import { AlertDialog as AlertDialogPrimitive, Dialog as DialogPrimitive } from "radix-ui";

import { AvatarBadge } from "@/components/app/avatar-badge";
import { AVATAR_KEYS, avatarKeyOf, firstUnusedAvatar, type AvatarKey } from "@/components/app/avatars";
import { apiFetch } from "@/lib/api";
import { AutoFurigana } from "@/components/app/auto-furigana";

export type SheetProfile = { id: number; name: string; avatar: string | null };

/**
 * プレイヤーの追加・編集のパネル(設計書4-1)。target が null なら追加、あれば編集。
 * 開くたびに key を変えて作り直す前提(名前・アバターは開いたときの値から始める)
 */
export function ProfileSheet({
  open,
  target,
  usedAvatars,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  target: SheetProfile | null;
  usedAvatars: (string | null)[];
  onClose: () => void;
  onSaved: (profile: SheetProfile) => void;
  onDeleted: (id: number) => void;
}) {
  const [name, setName] = useState(target?.name ?? "");
  const [avatar, setAvatar] = useState<AvatarKey>(target ? avatarKeyOf(target.avatar) : firstUnusedAvatar(usedAvatars));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch(target ? `/api/profiles/${target.id}` : "/api/profiles", {
        method: target ? "PATCH" : "POST",
        body: JSON.stringify({ name, avatar }),
      });
      if (!res.ok) {
        setError(target ? "変更に失敗しました。" : "プロフィールの作成に失敗しました。");
        return;
      }
      onSaved(await res.json());
      onClose();
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!target) return;
    setError(null);
    try {
      const res = await apiFetch(`/api/profiles/${target.id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("削除に失敗しました。");
        return;
      }
      onDeleted(target.id);
      onClose();
    } catch {
      setError("通信エラーが発生しました。");
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(38,48,28,0.45)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-[22px] bg-[#fffaf0] px-5 pt-3 pb-8 text-[#3b3226] shadow-[0_-8px_24px_rgba(0,0,0,0.2)] outline-none duration-200 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom"
        >
          <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#e0d6c2]" />
          <DialogPrimitive.Title className="text-center text-lg font-black">
            {target ? "プロフィールを編集" : "プレイヤーを追加"}
          </DialogPrimitive.Title>

          <form onSubmit={handleSubmit} className="mt-3 flex flex-col">
            <label htmlFor="profile-name" className="text-sm font-black">
              なまえ
            </label>
            <input
              id="profile-name"
              type="text"
              required
              maxLength={255}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: お父さん"
              className="mt-1.5 h-11 rounded-xl border-2 border-[#e8dfcf] bg-white px-3 text-sm outline-none focus-visible:border-[#2b6fa3]"
            />

            <p id="avatar-label" className="mt-4 text-sm font-black">
              アバターをえらぶ
            </p>
            <div role="radiogroup" aria-labelledby="avatar-label" className="mt-2 grid grid-cols-3 gap-3">
              {AVATAR_KEYS.map((key, index) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={avatar === key}
                  aria-label={`アバター${index + 1}`}
                  onClick={() => setAvatar(key)}
                  className="flex justify-center rounded-2xl py-1 outline-none focus-visible:ring-4 focus-visible:ring-[#9fd8ff]"
                >
                  <AvatarBadge avatar={key} size={72} selected={avatar === key} />
                </button>
              ))}
            </div>

            {error && <p className="mt-3 text-sm font-bold text-[#c2402c]">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 h-[52px] rounded-2xl border-b-4 border-[#285a19] bg-[#3b7f26] text-base font-black text-white disabled:opacity-60"
            >
              {target ? "保存する" : "追加する"}
            </button>
          </form>

          {target && (
            <AlertDialogPrimitive.Root>
              <AlertDialogPrimitive.Trigger asChild>
                <button type="button" className="mx-auto mt-4 block text-sm font-bold text-[#c2402c] underline underline-offset-2">
                  <AutoFurigana text="このプロフィールを削除" />
                </button>
              </AlertDialogPrimitive.Trigger>
              <AlertDialogPrimitive.Portal>
                <AlertDialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-[rgba(38,48,28,0.45)]" />
                <AlertDialogPrimitive.Content className="fixed top-1/2 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-[340px] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-3xl bg-[#fffaf0] p-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.25)] outline-none">
                  <AlertDialogPrimitive.Title className="text-lg font-black">
                    「{target.name}」を削除する？
                  </AlertDialogPrimitive.Title>
                  <AlertDialogPrimitive.Description className="text-sm font-bold text-[#6b5d45]">
                    <AutoFurigana text="冒険の記録も消えます" />
                  </AlertDialogPrimitive.Description>
                  <div className="mt-1 flex gap-2">
                    <AlertDialogPrimitive.Cancel className="h-12 flex-1 rounded-2xl border-2 border-b-4 border-[#e8dfcf] bg-white text-base font-black">
                      やめる
                    </AlertDialogPrimitive.Cancel>
                    <AlertDialogPrimitive.Action
                      onClick={handleDelete}
                      className="h-12 flex-1 rounded-2xl border-b-4 border-[#8f2f1f] bg-[#c2402c] text-base font-black text-white"
                    >
                      <AutoFurigana text="削除する" />
                    </AlertDialogPrimitive.Action>
                  </div>
                </AlertDialogPrimitive.Content>
              </AlertDialogPrimitive.Portal>
            </AlertDialogPrimitive.Root>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
