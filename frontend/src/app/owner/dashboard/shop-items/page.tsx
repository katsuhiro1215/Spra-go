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
import { ITEM_ART_KEYS, artOptionLabel } from "@/components/world/art-keys";
import { CATEGORY_LABELS, ITEM_CATEGORIES } from "@/components/world/categories";
import { apiFetch } from "@/lib/api";
import { SIZE_OPTIONS, artLabel, filterItems, noFilter, sizeText, unusedArtKeys, type ListFilter } from "./filter";

const TYPES = [
  { value: "potion", label: "回復薬" },
  { value: "plane", label: "航空券" },
  { value: "background", label: "背景" },
  { value: "character", label: "キャラクター" },
  { value: "title", label: "称号" },
  { value: "decoration", label: "町のアイテム" },
] as const;

// 絵の一覧は config/world.php の asset_keys と同じ(components/world/art-keys.test.ts で確かめている)
const ASSET_KEYS = ITEM_ART_KEYS.map((value) => ({ value, label: artOptionLabel(value) }));
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
  category: string | null;
  w: number | null;
  h: number | null;
  owned_count: number;
  meta: { heal?: number; asset_key?: string; not_for_sale?: boolean; souvenir_of?: string } | null;
};

function categoryLabel(category: string | null): string {
  return category ? (CATEGORY_LABELS as Record<string, string>)[category] ?? category : "";
}

/** 絵の小さな見本。絵がないアイテム(回復薬など)や、絵のファイルがないときは、空の枠を出す */
function Thumb({ item, size }: { item: ShopItem; size: number }) {
  const [broken, setBroken] = useState(false);
  const key = item.meta?.asset_key;
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-md bg-muted"
      style={{ width: size, height: size }}
    >
      {key && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/spru/items/${key}.webp`}
          alt={item.name}
          className="max-h-full max-w-full object-contain"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="text-xs text-muted-foreground">{key ? "絵なし" : "—"}</span>
      )}
    </div>
  );
}

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

  const [filter, setFilter] = useState<ListFilter>(noFilter);
  const [detail, setDetail] = useState<ShopItem | null>(null);

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

  const shown = items ? filterItems(items, filter) : [];
  const unused = items ? unusedArtKeys(items) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">アイテム管理</h1>
          <p className="text-sm text-muted-foreground">
            {items ? `全${items.length}件中 ${shown.length}件を表示` : "読み込み中..."}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> アイテムを追加
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Input
          className="w-48"
          placeholder="名前・絵のキーで検索"
          value={filter.query}
          onChange={(e) => setFilter((prev) => ({ ...prev, query: e.target.value }))}
        />
        <FilterSelect
          value={filter.type}
          onChange={(type) => setFilter((prev) => ({ ...prev, type }))}
          all="すべての種類"
          options={TYPES.map((t) => ({ value: t.value, label: t.label }))}
        />
        <FilterSelect
          value={filter.category}
          onChange={(category) => setFilter((prev) => ({ ...prev, category }))}
          all="すべてのカテゴリ"
          options={ITEM_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
        />
        <FilterSelect
          value={filter.size}
          onChange={(size) => setFilter((prev) => ({ ...prev, size }))}
          all="すべての大きさ"
          options={SIZE_OPTIONS.filter((o) => o.value !== "all").map((o) => ({ value: o.value, label: o.label }))}
        />
      </div>

      {items && unused.length > 0 && (
        <p className="text-xs text-muted-foreground">
          絵はあるのに、どのアイテムにも使っていない絵が{unused.length}点あります:{" "}
          {unused.map((key) => artLabel(key)).join("、")}
        </p>
      )}

      {items && (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {shown.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              条件に合うアイテムがありません。
            </p>
          )}
          {shown.map((item) => {
            const size = sizeText(item);
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 px-4 py-2 hover:bg-muted/50"
              >
                <button
                  type="button"
                  className="flex flex-1 items-center gap-4 text-left"
                  onClick={() => setDetail(item)}
                >
                  <Thumb item={item} size={48} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {typeLabel(item.type)}
                      {item.category ? ` ・ ${categoryLabel(item.category)}` : ""}
                      {size ? ` ・ ${size}` : ""} ・ {item.price}
                      {item.type === "decoration" ? "pt" : "Coin"}
                      {item.meta?.heal ? ` ・ 回復量:${item.meta.heal}` : ""}
                      {item.type === "decoration" ? ` ・ Lv.${item.min_level}〜` : ""}
                      {item.meta?.not_for_sale ? " ・ 非売品" : ""}
                    </p>
                  </div>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="その他の操作">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setDetail(item)}>詳細</DropdownMenuItem>
                    {!item.meta?.not_for_sale && (
                      <DropdownMenuItem onClick={() => openEdit(item)}>
                        編集
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteTarget(item)}
                    >
                      削除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent>
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.name}</DialogTitle>
              </DialogHeader>
              <div className="flex justify-center">
                <Thumb item={detail} size={200} />
              </div>
              <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-sm">
                <Detail label="種類" value={typeLabel(detail.type)} />
                {detail.category && <Detail label="カテゴリ" value={categoryLabel(detail.category)} />}
                {sizeText(detail) && (
                  <Detail
                    label="広さ"
                    value={`${sizeText(detail)}マス${detail.w !== detail.h ? "(長方形)" : ""}`}
                  />
                )}
                <Detail label="価格" value={`${detail.price}${detail.type === "decoration" ? "pt" : "Coin"}`} />
                {detail.type === "decoration" && <Detail label="必要レベル" value={`Lv.${detail.min_level}〜`} />}
                {detail.meta?.heal ? <Detail label="回復量" value={`${detail.meta.heal}`} /> : null}
                {detail.meta?.asset_key && (
                  <Detail label="絵のキー" value={`${detail.meta.asset_key}(${artLabel(detail.meta.asset_key)})`} />
                )}
                {detail.meta?.souvenir_of && <Detail label="おみやげ" value={`${detail.meta.souvenir_of}で入手`} />}
                {detail.meta?.not_for_sale && <Detail label="販売" value="非売品(種から咲く・旅で入手)" />}
                <Detail label="持っている数" value={`${detail.owned_count}個(全プレイヤーの合計)`} />
              </dl>
              <DialogFooter>
                {!detail.meta?.not_for_sale && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const target = detail;
                      setDetail(null);
                      openEdit(target);
                    }}
                  >
                    編集
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function FilterSelect({
  value,
  onChange,
  all,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  all: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{all}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
