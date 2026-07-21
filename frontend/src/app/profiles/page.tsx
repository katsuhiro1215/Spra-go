"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
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
      router.push("/dashboard");
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
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 p-8">
      <h1 className="text-2xl font-semibold">プロフィールを選択</h1>

      {!profiles ? (
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      ) : (
        <div className="flex flex-wrap items-start justify-center gap-6">
          {profiles.map((profile, index) => (
            <button
              key={profile.id}
              onClick={() => selectProfile(profile)}
              className="flex flex-col items-center gap-2"
            >
              <div
                className={`flex h-20 w-20 items-center justify-center rounded-lg text-2xl font-semibold text-white ${
                  avatarColors[index % avatarColors.length]
                } transition-transform hover:scale-105`}
              >
                {profile.name.slice(0, 1)}
              </div>
              <span className="text-sm">{profile.name}</span>
            </button>
          ))}

          {profiles.length === 0 && (
            <p className="text-sm text-muted-foreground">
              まだプロフィールがありません。下のフォームから追加してください。
            </p>
          )}
        </div>
      )}

      <form
        onSubmit={handleAddProfile}
        className="flex w-full max-w-xs flex-col gap-3"
      >
        <label htmlFor="new-profile" className="text-sm font-medium">
          プロフィールを追加
        </label>
        <div className="flex gap-2">
          <input
            id="new-profile"
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="例: お父さん"
            className="h-10 flex-1 rounded-md border border-zinc-300 bg-transparent px-3 text-sm dark:border-zinc-700"
          />
          <Button type="submit" disabled={submitting}>
            追加
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </div>
  );
}
