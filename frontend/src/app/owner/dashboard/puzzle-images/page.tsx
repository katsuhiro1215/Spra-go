"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type Flag = { image: string; label: string; enabled: boolean };
type Grids = Record<string, Flag[]>;

const GRID_LABELS: Record<string, string> = { "2x2": "初級（4分割）", "3x3": "中級（9分割）", "4x4": "上級（16分割）" };

/** 国旗パズルに出す旗を、盤の大きさごとにOn/Offする。Offにした旗は、その大きさのパズルに出ない */
export default function Page() {
  const [grids, setGrids] = useState<Grids | null>(null);
  const [grid, setGrid] = useState("2x2");
  const [showOffOnly, setShowOffOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/owner/puzzle-images")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        setGrids((await res.json()).grids);
      })
      .catch(() => setError("旗の一覧の取得に失敗しました。"));
  }, []);

  async function toggle(flag: Flag) {
    setError(null);
    const enabled = !flag.enabled;
    setGrids((prev) => prev && { ...prev, [grid]: prev[grid].map((f) => (f.image === flag.image ? { ...f, enabled } : f)) });
    const res = await apiFetch("/api/owner/puzzle-images", { method: "PUT", body: JSON.stringify({ grid, image: flag.image, enabled }) }).catch(() => null);
    if (!res?.ok) {
      setGrids((prev) => prev && { ...prev, [grid]: prev[grid].map((f) => (f.image === flag.image ? { ...f, enabled: flag.enabled } : f)) });
      setError("保存に失敗しました。");
    }
  }

  const flags = grids?.[grid] ?? [];
  const offCount = flags.filter((f) => !f.enabled).length;
  const shown = showOffOnly ? flags.filter((f) => !f.enabled) : flags;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">パズルの旗</h1>
        <p className="text-sm text-muted-foreground">
          国旗パズルに出す旗を、盤の大きさごとに選びます。旗をクリックすると、Off（出さない）とOn（出す）が切り替わります。すぐ反映されます。
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {grids && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {Object.keys(grids).map((key) => (
              <Button key={key} variant={key === grid ? "default" : "outline"} size="sm" onClick={() => setGrid(key)}>
                {GRID_LABELS[key] ?? key}
              </Button>
            ))}
            <span className="ml-2 text-sm text-muted-foreground">
              {flags.length}か国中、Off {offCount}
            </span>
            <label className="ml-2 flex items-center gap-1 text-sm">
              <input type="checkbox" checked={showOffOnly} onChange={(e) => setShowOffOnly(e.target.checked)} />
              Offだけ見る
            </label>
          </div>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {shown.map((flag) => (
              <li key={flag.image}>
                <button
                  type="button"
                  onClick={() => toggle(flag)}
                  aria-pressed={flag.enabled}
                  className={cn(
                    "flex w-full flex-col items-center gap-1 rounded-lg border p-2 text-xs",
                    flag.enabled ? "bg-card" : "border-destructive/50 bg-destructive/10 opacity-60",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={flag.image} alt="" className="h-14 w-full object-contain" />
                  <span className="font-medium">{flag.label}</span>
                  <span className={flag.enabled ? "text-muted-foreground" : "font-semibold text-destructive"}>{flag.enabled ? "On" : "Off"}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
