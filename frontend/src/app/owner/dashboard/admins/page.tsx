"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";

type Admin = {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  created_at: string;
};

export default function Page() {
  const [admins, setAdmins] = useState<Admin[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/owner/admins")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        setAdmins(await res.json());
      })
      .catch(() => setError("Admin一覧の取得に失敗しました。"));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Admin一覧</h1>
        <p className="text-sm text-muted-foreground">
          {admins ? `全${admins.length}件` : "読み込み中..."}
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {admins && (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {admins.map((admin) => (
            <div
              key={admin.id}
              className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">{admin.name}</p>
                <p className="text-xs text-muted-foreground">
                  {admin.email}
                </p>
              </div>
              <Badge variant={admin.email_verified_at ? "outline" : "secondary"}>
                {admin.email_verified_at ? "確認済み" : "未確認"}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
