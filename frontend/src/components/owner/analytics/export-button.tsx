"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { exportFileName } from "@/lib/analytics";

/** CSVの書き出し(docs/design/2026-10-03-analytics-design.md 6-3)。取って、ブラウザの保存(Blob)で保存する */
export function ExportButton({ kind, days, label }: { kind: "daily" | "cohorts" | "hard-questions" | "users"; days?: number; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function download() {
    setBusy(true);
    setError(false);

    try {
      const res = await apiFetch(`/api/owner/analytics/export/${kind}${days ? `?days=${days}` : ""}`);
      if (!res.ok) throw new Error();

      const url = URL.createObjectURL(await res.blob());
      const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
      const link = document.createElement("a");
      link.href = url;
      link.download = exportFileName(kind, today);
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button variant="outline" size="sm" disabled={busy} onClick={download}>
        {busy ? "書き出し中..." : label}
      </Button>
      {error && <span className="text-xs text-destructive">書き出せませんでした</span>}
    </span>
  );
}
