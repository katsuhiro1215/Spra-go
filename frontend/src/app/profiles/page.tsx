"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button as AppButton } from "@/components/app/button";
import { CharacterPlaceholder } from "@/components/app/character-placeholder";
import { Furigana } from "@/components/app/furigana";
import { SceneBackground } from "@/components/app/scene-background";
import { apiFetch } from "@/lib/api";

type Profile = {
  id: number;
  name: string;
};

// キャラクターごとの色バリエーション(本格キャラクターデザインが入るまでの暫定、
// docs/design/ui-ux-proposal.md参照)
const avatarPalette = [
  { from: "#38bdf8", to: "#0ea5e9" }, // 空色
  { from: "#34d399", to: "#059669" }, // 緑
  { from: "#fbbf24", to: "#d97706" }, // 黄
  { from: "#fb7185", to: "#e11d48" }, // 桃
  { from: "#a78bfa", to: "#7c3aed" }, // 紫
  { from: "#818cf8", to: "#4f46e5" }, // 藍
];

export default function Page() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [managing, setManaging] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    apiFetch("/api/user")
      .then(async (res) => {
        if (!active) return;

        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const profilesRes = await apiFetch("/api/profiles");
        if (!active) return;
        setProfiles(await profilesRes.json());
      })
      .catch(() => {
        if (active) router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [router]);

  async function selectProfile(profile: Profile) {
    if (managing) {
      startEdit(profile);
      return;
    }

    const res = await apiFetch(`/api/profiles/${profile.id}/select`, {
      method: "POST",
    });

    if (res.ok) {
      router.push("/");
    }
  }

  function startEdit(profile: Profile) {
    setEditingId(profile.id);
    setEditingName(profile.name);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
    setEditError(null);
  }

  async function saveEdit(profile: Profile) {
    setEditError(null);

    try {
      const res = await apiFetch(`/api/profiles/${profile.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editingName }),
      });

      if (!res.ok) {
        setEditError("名前の変更に失敗しました。");
        return;
      }

      const updated = await res.json();
      setProfiles(
        (prev) =>
          prev?.map((p) => (p.id === updated.id ? updated : p)) ?? null,
      );
      cancelEdit();
    } catch {
      setEditError("通信エラーが発生しました。");
    }
  }

  async function deleteProfile(profile: Profile) {
    if (
      !window.confirm(`「${profile.name}」を削除します。よろしいですか？`)
    ) {
      return;
    }

    const res = await apiFetch(`/api/profiles/${profile.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setProfiles((prev) => prev?.filter((p) => p.id !== profile.id) ?? null);
      if (editingId === profile.id) cancelEdit();
    }
  }

  async function handleAddProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await apiFetch("/api/profiles", {
        method: "POST",
        body: JSON.stringify({ name: newName }),
      });

      if (!res.ok) {
        setError("プロフィールの作成に失敗しました。");
        return;
      }

      const profile = await res.json();
      setProfiles((prev) => [...(prev ?? []), profile]);
      setNewName("");
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden px-6 py-12">
      <SceneBackground />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-2xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
            だれが<Furigana text="冒険" reading="ぼうけん" />する？
          </h1>
          {profiles && profiles.length > 0 && (
            <button
              onClick={() => {
                setManaging((prev) => !prev);
                cancelEdit();
              }}
              className="text-xs text-white/70 underline underline-offset-2 hover:text-white"
            >
              {managing ? "完了" : "プロフィールを編集"}
            </button>
          )}
        </div>

        {!profiles ? (
          <p className="text-sm text-white/85">読み込み中...</p>
        ) : (
          <div className="flex flex-wrap items-start justify-center gap-6">
            {profiles.map((profile, index) => (
              <div key={profile.id} className="flex flex-col items-center gap-2">
                {editingId === profile.id ? (
                  <div className="flex w-28 flex-col items-center gap-1.5">
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full rounded-lg border-2 border-white/40 bg-white/90 px-2 py-1 text-center text-sm text-slate-900 outline-none focus-visible:border-sky-400"
                    />
                    <div className="flex gap-1">
                      <AppButton
                        variant="primary"
                        size="sm"
                        className="normal-case"
                        onClick={() => saveEdit(profile)}
                      >
                        保存
                      </AppButton>
                      <AppButton
                        variant="ghost"
                        size="sm"
                        className="text-white normal-case"
                        onClick={cancelEdit}
                      >
                        取消
                      </AppButton>
                    </div>
                    <button
                      onClick={() => deleteProfile(profile)}
                      className="text-xs text-rose-200 underline underline-offset-2 hover:text-rose-100"
                    >
                      このプロフィールを削除
                    </button>
                    {editError && (
                      <p className="text-xs font-medium text-rose-200">
                        {editError}
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => selectProfile(profile)}
                    className="flex flex-col items-center gap-2 focus-visible:outline-none"
                  >
                    <div className="relative h-20 w-20 transition-transform hover:scale-110">
                      <CharacterPlaceholder
                        className="h-full w-full"
                        colorFrom={avatarPalette[index % avatarPalette.length].from}
                        colorTo={avatarPalette[index % avatarPalette.length].to}
                      />
                      {managing && (
                        <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm shadow">
                          ✎
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-white drop-shadow">
                      {profile.name}
                    </span>
                  </button>
                )}
              </div>
            ))}

            {profiles.length === 0 && (
              <p className="text-sm text-white/85">
                まだプレイヤーがいません。下から最初のプレイヤーを作ろう！
              </p>
            )}
          </div>
        )}

        <form
          onSubmit={handleAddProfile}
          className="flex w-full max-w-xs flex-col gap-3 rounded-2xl border border-white/30 bg-black/30 p-4 shadow-xl backdrop-blur-sm"
        >
          <label htmlFor="new-profile" className="text-sm font-medium text-white/90">
            {profiles && profiles.length === 0
              ? "最初のプレイヤーを作ろう"
              : "プレイヤーを追加"}
          </label>
          <div className="flex gap-2">
            <input
              id="new-profile"
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="例: お父さん"
              className="h-10 flex-1 rounded-xl border-2 border-white/40 bg-white/90 px-3 text-sm text-slate-900 outline-none focus-visible:border-sky-400"
            />
            <AppButton type="submit" variant="primary" disabled={submitting} className="normal-case">
              追加
            </AppButton>
          </div>
          {error && <p className="text-sm font-medium text-rose-200">{error}</p>}
        </form>
      </div>
    </div>
  );
}
