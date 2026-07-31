"use client";

import { useEffect, useState, type FormEvent } from "react";
import { MoreHorizontal, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

const CONTENT_TYPES = [
  "単語",
  "会話",
  "文化",
  "歴史",
  "地理",
  "国旗",
  "世界遺産",
] as const;

type ContentType = (typeof CONTENT_TYPES)[number];

type Country = { id: number; name: string };

type ContentItem = {
  id: number;
  title: string;
  type: ContentType;
  country_id: number | null;
  country: Country | null;
};

type FormValues = { title: string; type: ContentType; country_id: string };

const emptyForm: FormValues = { title: "", type: "単語", country_id: "" };

export default function Page() {
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ContentItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function loadItems() {
    const res = await apiFetch("/api/owner/content");
    if (!res.ok) {
      setError("コンテンツの取得に失敗しました。");
      return;
    }
    setItems(await res.json());
  }

  useEffect(() => {
    (async () => {
      loadItems();
      apiFetch("/api/owner/countries").then(async (res) => {
        if (res.ok) setCountries(await res.json());
      });
    })();
  }, []);

  function openCreate() {
    setEditing(null);
    setValues(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(item: ContentItem) {
    setEditing(item);
    setValues({
      title: item.title,
      type: item.type,
      country_id: item.country_id ? String(item.country_id) : "",
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const payload = {
      title: values.title,
      type: values.type,
      country_id: values.country_id ? Number(values.country_id) : null,
    };

    try {
      const res = editing
        ? await apiFetch(`/api/owner/content/${editing.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await apiFetch("/api/owner/content", {
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

    const res = await apiFetch(`/api/owner/content/${deleteTarget.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      setDeleteError("削除に失敗しました。");
      return;
    }

    setDeleteTarget(null);
    await loadItems();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">コンテンツ管理</h1>
          <p className="text-sm text-muted-foreground">
            {items ? `全${items.length}件` : "読み込み中..."}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> コンテンツを追加
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
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.country?.name ?? "-"}
                </p>
              </div>

              <Badge variant="secondary">{item.type}</Badge>

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
              {editing ? "コンテンツを編集" : "コンテンツを追加"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="content-title">タイトル</Label>
              <Input
                id="content-title"
                required
                value={values.title}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>種別</Label>
              <Select
                value={values.type}
                onValueChange={(v) =>
                  setValues((prev) => ({ ...prev, type: v as ContentType }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>国(任意)</Label>
              <Select
                value={values.country_id || "none"}
                onValueChange={(v) =>
                  setValues((prev) => ({
                    ...prev,
                    country_id: v === "none" ? "" : v,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">なし</SelectItem>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={String(country.id)}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
              「{deleteTarget?.title}」を削除しますか？
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
