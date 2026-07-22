"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button as AppButton } from "@/components/app/button";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

type Profile = {
  id: number;
  name: string;
};

type Category = {
  id: number;
  parent_id: number | null;
  name: string;
};

const tileVariants = ["primary", "secondary", "warning", "danger"] as const;

export default function Page() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);
  const [categories, setCategories] = useState<Category[] | null>(null);

  useEffect(() => {
    let active = true;

    apiFetch("/api/user")
      .then(async (userRes) => {
        if (!active) return;

        if (!userRes.ok) {
          router.replace("/login");
          return;
        }

        const activeRes = await apiFetch("/api/profiles/active");
        if (!active) return;

        const activeProfile = await activeRes.json();
        if (!activeProfile) {
          router.replace("/profiles");
          return;
        }

        setProfile(activeProfile);
        setChecking(false);

        const categoriesRes = await apiFetch("/api/categories");
        if (!active) return;
        if (categoriesRes.ok) {
          setCategories(await categoriesRes.json());
        }
      })
      .catch(() => {
        if (active) router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogout() {
    await apiFetch("/logout", { method: "POST" });
    router.replace("/login");
  }

  if (checking || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  const rootCategories = (categories ?? []).filter(
    (c) => c.parent_id === null,
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b border-border px-6">
        <span className="text-sm text-muted-foreground">
          {profile.name} としてプレイ中
        </span>
        <div className="flex items-center gap-3">
          <Link href="/profiles" className="text-sm hover:underline">
            プロフィール切替
          </Link>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            ログアウト
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center gap-8 px-6 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold">どこから冒険する？</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            好きな入口を選んでね
          </p>
        </div>

        {!categories ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : (
          <div className="grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {rootCategories.map((category, index) => (
              <Link key={category.id} href={`/play/${category.id}`}>
                <AppButton
                  variant={tileVariants[index % tileVariants.length]}
                  size="lg"
                  className="w-full"
                >
                  {category.name}
                </AppButton>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
