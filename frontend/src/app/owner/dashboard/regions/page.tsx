"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ChevronRight, MoreHorizontal, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

type Country = { id: number; code: string; name: string };

type RegionDTO = {
  id: number;
  country_id: number;
  parent_id: number | null;
  name: string;
  order: number;
};

type RegionNode = RegionDTO & { children: RegionNode[] };

function buildTree(items: RegionDTO[]): RegionNode[] {
  const nodes = new Map<number, RegionNode>();
  items.forEach((item) => nodes.set(item.id, { ...item, children: [] }));

  const roots: RegionNode[] = [];
  items.forEach((item) => {
    const node = nodes.get(item.id)!;
    if (item.parent_id === null) {
      roots.push(node);
    } else {
      nodes.get(item.parent_id)?.children.push(node);
    }
  });

  return roots;
}

type FormState = {
  open: boolean;
  mode: "create" | "edit";
  parentId: number | null;
  region: RegionDTO | null;
};

export default function Page() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [countryId, setCountryId] = useState<string>("");
  const [regions, setRegions] = useState<RegionDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    open: false,
    mode: "create",
    parentId: null,
    region: null,
  });
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<RegionDTO | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/owner/countries").then(async (res) => {
      if (res.ok) setCountries(await res.json());
    });
  }, []);

  async function loadRegions() {
    if (!countryId) return;
    const res = await apiFetch(`/api/owner/regions?country_id=${countryId}`);
    if (!res.ok) {
      setError("地域の取得に失敗しました。");
      return;
    }
    setRegions(await res.json());
  }

  useEffect(() => {
    setRegions(null);
    setError(null);
    loadRegions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryId]);

  function openCreate(parentId: number | null) {
    setForm({ open: true, mode: "create", parentId, region: null });
    setName("");
    setFormError(null);
  }

  function openEdit(region: RegionDTO) {
    setForm({
      open: true,
      mode: "edit",
      parentId: region.parent_id,
      region,
    });
    setName(region.name);
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res =
        form.mode === "create"
          ? await apiFetch("/api/owner/regions", {
              method: "POST",
              body: JSON.stringify({
                name,
                country_id: Number(countryId),
                parent_id: form.parentId,
              }),
            })
          : await apiFetch(`/api/owner/regions/${form.region!.id}`, {
              method: "PATCH",
              body: JSON.stringify({ name }),
            });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.message ?? "保存に失敗しました。");
        return;
      }

      setForm((prev) => ({ ...prev, open: false }));
      await loadRegions();
    } catch {
      setFormError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);

    const res = await apiFetch(`/api/owner/regions/${deleteTarget.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      setDeleteError(data.message ?? "削除に失敗しました。");
      return;
    }

    setDeleteTarget(null);
    await loadRegions();
  }

  const tree = regions ? buildTree(regions) : [];
  const ready = Boolean(countryId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">地域管理</h1>
          <p className="text-sm text-muted-foreground">
            国を選ぶとその国の地域(地方/都道府県/都市)を管理できます
          </p>
        </div>
        <Button onClick={() => openCreate(null)} disabled={!ready}>
          <Plus /> 地域を追加
        </Button>
      </div>

      <Select value={countryId} onValueChange={setCountryId}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="国" />
        </SelectTrigger>
        <SelectContent>
          {countries.map((country) => (
            <SelectItem key={country.id} value={String(country.id)}>
              {country.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!ready && (
        <p className="text-sm text-muted-foreground">
          国を選ぶと地域一覧が表示されます。
        </p>
      )}

      {ready && regions === null && !error && (
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      )}

      {ready && regions && regions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          まだ地域がありません。
        </p>
      )}

      {ready && regions && regions.length > 0 && (
        <div className="flex flex-col rounded-lg border border-border p-2">
          {tree.map((node) => (
            <RegionRow
              key={node.id}
              node={node}
              depth={0}
              onAddChild={openCreate}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <Dialog
        open={form.open}
        onOpenChange={(open) => setForm((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form.mode === "create" ? "地域を追加" : "地域を編集"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="region-name">名前</Label>
              <Input
                id="region-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
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

function RegionRow({
  node,
  depth,
  onAddChild,
  onEdit,
  onDelete,
}: {
  node: RegionNode;
  depth: number;
  onAddChild: (parentId: number) => void;
  onEdit: (region: RegionDTO) => void;
  onDelete: (region: RegionDTO) => void;
}) {
  const hasChildren = node.children.length > 0;

  return (
    <Collapsible defaultOpen={depth === 0}>
      <div
        className="flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-muted/50"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {hasChildren ? (
          <CollapsibleTrigger asChild>
            <button className="flex size-5 items-center justify-center text-muted-foreground [&[data-state=open]>svg]:rotate-90">
              <ChevronRight className="size-4 transition-transform" />
            </button>
          </CollapsibleTrigger>
        ) : (
          <span className="size-5" />
        )}

        <span className="flex-1 text-sm">{node.name}</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAddChild(node.id)}>
              子地域を追加
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(node)}>
              編集
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(node)}
            >
              削除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {hasChildren && (
        <CollapsibleContent>
          {node.children.map((child) => (
            <RegionRow
              key={child.id}
              node={child}
              depth={depth + 1}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}
