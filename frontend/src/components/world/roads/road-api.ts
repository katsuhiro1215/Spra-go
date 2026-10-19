import { apiFetch } from "@/lib/api";

import type { Tile } from "../types";
import type { Edit } from "./road-edit";

/** 道を引く・消すをサーバーに送る(docs/design/2026-10-19-town-roads-design.md 4章)。全部通るか、全部通らないか */
export async function sendRoads(edit: Edit): Promise<{ ok: true; custom: Tile[] } | { ok: false; message: string }> {
  const res = await apiFetch("/api/world/roads", { method: "POST", body: JSON.stringify(edit) }).catch(() => null);
  if (!res) return { ok: false, message: "通信エラーが発生しました。" };
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: data.message ?? "道をひけなかったよ。" };
  return { ok: true, custom: data.custom_paths as Tile[] };
}
