import Link from "next/link";

const navItems = [
  { href: "/owner/dashboard", label: "ダッシュボード" },
  { href: "/owner/dashboard/countries", label: "国" },
  { href: "/owner/dashboard/quizzes", label: "クイズ" },
  { href: "/owner/dashboard/events", label: "イベント" },
  { href: "/owner/dashboard/content", label: "コンテンツ" },
  { href: "/owner/dashboard/ai", label: "AI生成" },
  { href: "/owner/dashboard/system", label: "システム" },
];

export default function OwnerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-border bg-muted/30 p-4">
        <div className="mb-6 px-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Owner
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
        <header className="flex h-14 items-center border-b border-border px-6">
          <span className="text-sm text-muted-foreground">
            Owner Dashboard
          </span>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
