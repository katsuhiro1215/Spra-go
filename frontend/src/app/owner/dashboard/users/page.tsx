"use client";

import { useEffect, useState } from "react";

import { ExportButton } from "@/components/owner/analytics/export-button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { formatCount, formatMinutes } from "@/lib/analytics";
import { appLabel, matchesAppFilter, type AppFilter, type AppUse } from "@/lib/apps";

type User = {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  created_at: string;
  registered_on: string;
  players: number;
  last_played_on: string | null;
  answers: number;
  play_minutes: number;
  apps: AppUse[];
};

const FILTERS: { key: AppFilter; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "go", label: "Goだけ" },
  { key: "tane", label: "Taneだけ" },
  { key: "multiple", label: "複数のアプリ" },
];

export default function Page() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AppFilter>("all");
  const shown = users?.filter((u) => matchesAppFilter(u.apps, filter)) ?? null;

  useEffect(() => {
    apiFetch("/api/owner/users")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        setUsers(await res.json());
      })
      .catch(() => setError("User一覧の取得に失敗しました。"));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold">User一覧</h1>
          <p className="text-sm text-muted-foreground">
            {shown && users ? (filter === "all" ? `全${users.length}件` : `${shown.length}件(全${users.length}件中)`) : "読み込み中..."}
          </p>
        </div>
        <ExportButton kind="users" label="CSVで書き出す" />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1 text-xs ${filter === f.key ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {shown && (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {shown.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  登録日 {user.registered_on} ・ プレイヤー {user.players}人 ・ 最後に遊んだ日 {user.last_played_on ?? "—"} ・ 解いた問題 {formatCount(user.answers)}問 ・ 遊んだ時間 {formatMinutes(user.play_minutes)}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-1">
                {user.apps.map((a) => (
                  <Badge key={a.app} variant="secondary" title={`使い始め ${a.first_used_at.slice(0, 10)} ・ 最後 ${a.last_used_at.slice(0, 10)}`}>
                    {appLabel(a.app)}
                  </Badge>
                ))}
              </div>
              <Badge variant={user.email_verified_at ? "outline" : "secondary"}>
                {user.email_verified_at ? "確認済み" : "未確認"}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
