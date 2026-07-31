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
import { apiFetch } from "@/lib/api";

type EventStatus = "開催中" | "開催予定" | "終了";

type EventItem = {
  id: number;
  title: string;
  starts_at: string;
  ends_at: string;
  status: EventStatus;
};

const statusVariant: Record<EventStatus, "default" | "outline" | "secondary"> = {
  開催中: "default",
  開催予定: "outline",
  終了: "secondary",
};

type FormValues = { title: string; starts_at: string; ends_at: string };

const emptyForm: FormValues = { title: "", starts_at: "", ends_at: "" };

export default function Page() {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function loadEvents() {
    const res = await apiFetch("/api/owner/events");
    if (!res.ok) {
      setError("イベントの取得に失敗しました。");
      return;
    }
    setEvents(await res.json());
  }

  useEffect(() => {
    (async () => {
      loadEvents();
    })();
  }, []);

  function openCreate() {
    setEditing(null);
    setValues(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(event: EventItem) {
    setEditing(event);
    setValues({
      title: event.title,
      starts_at: event.starts_at,
      ends_at: event.ends_at,
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = editing
        ? await apiFetch(`/api/owner/events/${editing.id}`, {
            method: "PATCH",
            body: JSON.stringify(values),
          })
        : await apiFetch("/api/owner/events", {
            method: "POST",
            body: JSON.stringify(values),
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
      await loadEvents();
    } catch {
      setFormError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);

    const res = await apiFetch(`/api/owner/events/${deleteTarget.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      setDeleteError("削除に失敗しました。");
      return;
    }

    setDeleteTarget(null);
    await loadEvents();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">イベント管理</h1>
          <p className="text-sm text-muted-foreground">
            {events ? `全${events.length}件` : "読み込み中..."}
          </p>
          <p className="mt-1 text-xs text-amber-600">
            ⚠
            期間の記録のみで、プレイヤー画面への表示やボーナス効果はまだ実装されていません（企画待ち、TASKS.md参照）。
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> イベントを追加
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {events && (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {event.starts_at} 〜 {event.ends_at}
                </p>
              </div>

              <Badge variant={statusVariant[event.status]}>
                {event.status}
              </Badge>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="その他の操作">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(event)}>
                    編集
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteTarget(event)}
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
            <DialogTitle>{editing ? "イベントを編集" : "イベントを追加"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-title">タイトル</Label>
              <Input
                id="event-title"
                required
                value={values.title}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-starts">開始日</Label>
              <Input
                id="event-starts"
                type="date"
                required
                value={values.starts_at}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, starts_at: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-ends">終了日</Label>
              <Input
                id="event-ends"
                type="date"
                required
                value={values.ends_at}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, ends_at: e.target.value }))
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
