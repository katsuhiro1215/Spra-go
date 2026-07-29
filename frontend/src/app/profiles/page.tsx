"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button as AppButton } from "@/components/app/button";
import { SceneBackground } from "@/components/app/scene-background";
import { apiFetch } from "@/lib/api";

type Profile = {
  id: number;
  name: string;
};

const avatarColors = [
  "bg-sky-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-indigo-500",
];

export default function Page() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    const res = await apiFetch(`/api/profiles/${profile.id}/select`, {
      method: "POST",
    });

    if (res.ok) {
      router.push("/");
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
        <h1 className="text-2xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
          だれが冒険する？
        </h1>

        {!profiles ? (
          <p className="text-sm text-white/85">読み込み中...</p>
        ) : (
          <div className="flex flex-wrap items-start justify-center gap-6">
            {profiles.map((profile, index) => (
              <button
                key={profile.id}
                onClick={() => selectProfile(profile)}
                className="flex flex-col items-center gap-2 focus-visible:outline-none"
              >
                <div
                  className={`flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/40 text-2xl font-bold text-white shadow-lg ${
                    avatarColors[index % avatarColors.length]
                  } transition-transform hover:scale-110 hover:border-white/80`}
                >
                  {profile.name.slice(0, 1)}
                </div>
                <span className="text-sm font-medium text-white drop-shadow">
                  {profile.name}
                </span>
              </button>
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
