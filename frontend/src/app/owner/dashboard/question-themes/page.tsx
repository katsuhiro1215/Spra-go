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
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";

type QuestionTheme = {
  id: number;
  key: string;
  label: string;
  description: string | null;
};

type FormValues = { key: string; label: string; description: string };

const emptyForm: FormValues = { key: "", label: "", description: "" };

export default function Page() {
  const [themes, setThemes] = useState<QuestionTheme[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionTheme | null>(null);
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<QuestionTheme | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function loadThemes() {
    const res = await apiFetch("/api/owner/question-themes");
    if (!res.ok) {
      setError("出題テーマの取得に失敗しました。");
      return;
    }
    setThemes(await res.json());
  }

  useEffect(() => {
    (async () => {
      loadThemes();
    })();
  }, []);

  function openCreate() {
    setEditing(null);
    setValues(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(theme: QuestionTheme) {
    setEditing(theme);
    setValues({
      key: theme.key,
      label: theme.label,
      description: theme.description ?? "",
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const payload = {
      key: values.key,
      label: values.label,
      description: values.description || null,
    };

    try {
      const res = editing
        ? await apiFetch(`/api/owner/question-themes/${editing.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await apiFetch("/api/owner/question-themes", {
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
      await loadThemes();
    } catch {
      setFormError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);

    const res = await apiFetch(`/api/owner/question-themes/${deleteTarget.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      setDeleteError("削除に失敗しました。");
      return;
    }

    setDeleteTarget(null);
    await loadThemes();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">出題テーマ管理</h1>
          <p className="text-sm text-muted-foreground">
            {themes ? `全${themes.length}件` : "読み込み中..."}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> テーマを追加
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {themes && (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {themes.map((theme) => (
            <div
              key={theme.id}
              className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">{theme.label}</p>
                <p className="text-xs text-muted-foreground">
                  {theme.key}
                  {theme.description ? ` ・ ${theme.description}` : ""}
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(theme)}>
                    編集
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteTarget(theme)}
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
            <DialogTitle>{editing ? "テーマを編集" : "テーマを追加"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="theme-key">
                key(英数字。例: flag_to_country)
              </Label>
              <Input
                id="theme-key"
                required
                value={values.key}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, key: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="theme-label">表示名</Label>
              <Input
                id="theme-label"
                required
                value={values.label}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, label: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="theme-description">説明(任意)</Label>
              <Textarea
                id="theme-description"
                value={values.description}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
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
              「{deleteTarget?.label}」を削除しますか？
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
