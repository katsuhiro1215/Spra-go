"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

const navItems = [{ href: "/admin/dashboard", label: "ダッシュボード" }];

type Admin = {
  id: number;
  name: string;
  email: string;
};

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    apiFetch("/api/admin/user")
      .then(async (res) => {
        if (!active) return;

        if (!res.ok) {
          router.replace("/admin/login");
          return;
        }

        setAdmin(await res.json());
        setChecking(false);
      })
      .catch(() => {
        if (active) router.replace("/admin/login");
      });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogout() {
    await apiFetch("/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  if (checking || !admin) {
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
          Admin
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-6">
          <span className="text-sm text-muted-foreground">
            Admin Dashboard
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm">{admin.name}</span>
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
