"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";

type Category = {
  id: number;
  parent_id: number | null;
  name: string;
};

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [category, setCategory] = useState<Category | null | undefined>(
    undefined,
  );

  useEffect(() => {
    apiFetch("/api/categories")
      .then(async (res) => {
        if (!res.ok) {
          router.replace("/login");
          return;
        }
        const categories: Category[] = await res.json();
        setCategory(categories.find((c) => String(c.id) === id) ?? null);
      })
      .catch(() => router.replace("/login"));
  }, [id, router]);

  if (category === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2">
      <h1 className="text-2xl font-bold">{category?.name ?? "見つかりません"}</h1>
      <p className="text-sm text-muted-foreground">準備中です。お楽しみに。</p>
    </div>
  );
}
