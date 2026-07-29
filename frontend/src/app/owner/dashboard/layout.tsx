"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

const topNavItem = { href: "/owner/dashboard", label: "ダッシュボード" };

const navGroups = [
  {
    label: "冒険データ",
    items: [
      { href: "/owner/dashboard/categories", label: "カテゴリー" },
      { href: "/owner/dashboard/countries", label: "国" },
      { href: "/owner/dashboard/languages", label: "言語" },
      { href: "/owner/dashboard/regions", label: "地域" },
    ],
  },
  {
    label: "クイズ運用",
    items: [
      { href: "/owner/dashboard/quizzes", label: "クイズ" },
      { href: "/owner/dashboard/stages", label: "ステージ" },
      { href: "/owner/dashboard/question-themes", label: "出題テーマ" },
    ],
  },
  {
    label: "収益・運営",
    items: [
      { href: "/owner/dashboard/shop-items", label: "ショップ" },
      { href: "/owner/dashboard/events", label: "イベント" },
      { href: "/owner/dashboard/content", label: "コンテンツ" },
    ],
  },
  {
    label: "システム",
    items: [
      { href: "/owner/dashboard/ai", label: "AI生成" },
      { href: "/owner/dashboard/system", label: "システム" },
      { href: "/owner/dashboard/admins", label: "Admin" },
      { href: "/owner/dashboard/users", label: "User" },
    ],
  },
];

type Owner = {
  id: number;
  name: string;
  email: string;
};

export default function OwnerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    apiFetch("/api/owner/user")
      .then(async (res) => {
        if (!active) return;

        if (!res.ok) {
          router.replace("/owner/login");
          return;
        }

        setOwner(await res.json());
        setChecking(false);
      })
      .catch(() => {
        if (active) router.replace("/owner/login");
      });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogout() {
    await apiFetch("/owner/logout", { method: "POST" });
    router.replace("/owner/login");
  }

  if (checking || !owner) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-border bg-muted/30 p-4">
        <div className="mb-6 px-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Owner
        </div>
        <nav className="flex flex-col gap-4">
          <Link
            href={topNavItem.href}
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            {topNavItem.label}
          </Link>

          {navGroups.map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              <div className="px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {group.label}
              </div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-6">
          <span className="text-sm text-muted-foreground">
            Owner Dashboard
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm">{owner.name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              ログアウト
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
