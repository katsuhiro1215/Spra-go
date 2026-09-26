"use client";

import { useEffect, useState, type FormEvent } from "react";
import { MoreHorizontal, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";

const TYPES = [
  { value: "potion", label: "回復薬" },
  { value: "plane", label: "航空券" },
  { value: "background", label: "背景" },
  { value: "character", label: "キャラクター" },
  { value: "title", label: "称号" },
  { value: "decoration", label: "町のアイテム" },
] as const;

// config/world.php の asset_keys と一致させる
const ASSET_KEYS = [
  { value: "bench", label: "ベンチ" },
  { value: "flowerbed", label: "花だん" },
  { value: "chochin", label: "ちょうちん" },
  { value: "tree", label: "木" },
  { value: "sakura", label: "桜の木" },
  { value: "vending", label: "自動販売機" },
  { value: "bicycle", label: "自転車" },
  { value: "stall", label: "屋台" },
] as const;
type ItemType = (typeof TYPES)[number]["value"];

function typeLabel(type: string): string {
  return TYPES.find((t) => t.value === type)?.label ?? type;
}

type ShopItem = {
  id: number;
  name: string;
  price: number;
  type: ItemType;
  min_level: number;
  meta: { heal?: number; asset_key?: string } | null;
};

type FormValues = {
  name: string;
  price: string;
  type: ItemType;
  heal: string;
  minLevel: string;
  assetKey: string;
};

const emptyForm: FormValues = {
  name: "",
  price: "0",
  type: "potion",
  heal: "",
  minLevel: "1",
  assetKey: "bench",
};

export default function Page() {
  const [items, setItems] = useState<ShopItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ShopItem | null>(null);
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ShopItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function loadItems() {
    const res = await apiFetch("/api/owner/shop-items");
    if (!res.ok) {
      setError("アイテムの取得に失敗しました。");
      return;
    }
    setItems(await res.json());
  }

  useEffect(() => {
    (async () => {
      loadItems();
    })();
  }, []);

  function openCreate() {
    setEditing(null);
    setValues(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(item: ShopItem) {
    setEditing(item);
    setValues({
      name: item.name,
      price: String(item.price),
      type: item.type,
      heal: item.meta?.heal ? String(item.meta.heal) : "",
      minLevel: String(item.min_level ?? 1),
      assetKey: item.meta?.asset_key ?? "bench",
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const payload = {
      name: values.name,
      price: Number(values.price) || 0,
      type: values.type,
      min_level: Number(values.minLevel) || 1,
      meta:
        values.type === "potion" && values.heal
          ? { heal: Number(values.heal) }
          : values.type === "decoration"
            ? { asset_key: values.assetKey }
            : null,
    };

    try {
      const res = editing
        ? await apiFetch(`/api/owner/shop-items/${editing.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await apiFetch("/api/owner/shop-items", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const data = await res.json();
        const firstError = Object.values(data.errors ?? {})[0] as
          | string[]
          | undefined;
        setFormError(firstError?.[0] ?? data.message ?? "保存に失敗しました。");
        return;
      }

      setDialogOpen(false);
      await loadItems();
    } catch {
      setFormError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);

    const res = await apiFetch(`/api/owner/shop-items/${deleteTarget.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      // 確認ダイアログは押した時点で閉じるため、一覧側にも理由(プレイヤーが持っている等)を出す
      const data = await res.json().catch(() => ({}));
      const message = data.message ?? "削除に失敗しました。";
      setDeleteError(message);
      setError(message);
      return;
    }

    setError(null);
    setDeleteTarget(null);
    await loadItems();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">ショップ管理</h1>
          <p className="text-sm text-muted-foreground">
            {items ? `全${items.length}件` : "読み込み中..."}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> アイテムを追加
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {items && (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {typeLabel(item.type)} ・ {item.price}
                  {item.type === "decoration" ? "pt" : "Coin"}
                  {item.meta?.heal ? ` ・ 回復量:${item.meta.heal}` : ""}
                  {item.type === "decoration" ? ` ・ Lv.${item.min_level}〜` : ""}
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="その他の操作">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(item)}>
                    編集
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteTarget(item)}
                  >
                    削除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "アイテムを編集" : "アイテムを追加"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-name">名前</Label>
              <Input
                id="item-name"
                required
                value={values.name}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>種類</Label>
              <Select
                value={values.type}
                onValueChange={(v) =>
                  setValues((prev) => ({ ...prev, type: v as ItemType }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-price">
                {values.type === "decoration" ? "価格(学習ポイント)" : "価格(Coin)"}
              </Label>
              <Input
                id="item-price"
                type="number"
                min={0}
                required
                value={values.price}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, price: e.target.value }))
                }
              />
            </div>

            {values.type === "potion" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item-heal">回復量(HP)</Label>
                <Input
                  id="item-heal"
                  type="number"
                  min={1}
                  required
                  value={values.heal}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, heal: e.target.value }))
                  }
                />
              </div>
            )}

            {values.type === "decoration" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="item-min-level">必要レベル</Label>
                  <Input
                    id="item-min-level"
                    type="number"
                    min={1}
                    max={99}
                    required
                    value={values.minLevel}
                    onChange={(e) => setValues((prev) => ({ ...prev, minLevel: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="item-asset-key">絵</Label>
                  <Select
                    value={values.assetKey}
                    onValueChange={(value) => setValues((prev) => ({ ...prev, assetKey: value }))}
                  >
                    <SelectTrigger id="item-asset-key" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_KEYS.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              「{deleteTarget?.name}」を削除しますか？
            </AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
