"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { MoreHorizontal, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

const DIFFICULTIES = ["初級", "中級", "上級"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

type Category = { id: number; parent_id: number | null; name: string };
type QuestionTheme = { id: number; key: string; label: string };
type Country = { id: number; code: string; name: string };
type Region = { id: number; country_id: number; parent_id: number | null; name: string };

type Stage = {
  id: number;
  category_id: number;
  difficulty: Difficulty;
  stage_number: number;
  question_theme_id: number | null;
  question_theme: QuestionTheme | null;
  country_id: number | null;
  country: Country | null;
  region_id: number | null;
  region: Region | null;
  question_count: number;
  is_boss: boolean;
  title_reward: string | null;
};

type FormValues = {
  stage_number: string;
  question_theme_id: string;
  country_id: string;
  region_id: string;
  question_count: string;
  is_boss: boolean;
  title_reward: string;
};

const emptyForm: FormValues = {
  stage_number: "1",
  question_theme_id: "",
  country_id: "",
  region_id: "",
  question_count: "10",
  is_boss: false,
  title_reward: "",
};

export default function Page() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [themes, setThemes] = useState<QuestionTheme[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");

  const [stages, setStages] = useState<Stage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Stage | null>(null);
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Stage | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/owner/categories").then(async (res) => {
      if (res.ok) {
        const all: Category[] = await res.json();
        setCategories(all.filter((c) => c.parent_id === null));
      }
    });
    apiFetch("/api/owner/question-themes").then(async (res) => {
      if (res.ok) setThemes(await res.json());
    });
    apiFetch("/api/owner/countries").then(async (res) => {
      if (res.ok) setCountries(await res.json());
    });
    apiFetch("/api/owner/regions").then(async (res) => {
      if (res.ok) setRegions(await res.json());
    });
  }, []);

  async function loadStages() {
    if (!categoryId || !difficulty) return;
    const res = await apiFetch(
      `/api/owner/stages?category_id=${categoryId}&difficulty=${encodeURIComponent(difficulty)}`,
    );
    if (!res.ok) {
      setError("ステージの取得に失敗しました。");
      return;
    }
    setStages(await res.json());
  }

  useEffect(() => {
    setStages(null);
    setError(null);
    loadStages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, difficulty]);

  function openCreate() {
    const nextNumber =
      (stages ?? []).reduce((max, s) => Math.max(max, s.stage_number), 0) + 1;
    setEditing(null);
    setValues({ ...emptyForm, stage_number: String(nextNumber) });
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(stage: Stage) {
    setEditing(stage);
    setValues({
      stage_number: String(stage.stage_number),
      question_theme_id: stage.question_theme_id
        ? String(stage.question_theme_id)
        : "",
      country_id: stage.country_id ? String(stage.country_id) : "",
      region_id: stage.region_id ? String(stage.region_id) : "",
      question_count: String(stage.question_count),
      is_boss: stage.is_boss,
      title_reward: stage.title_reward ?? "",
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const payload = {
      category_id: Number(categoryId),
      difficulty,
      stage_number: Number(values.stage_number),
      question_theme_id: values.question_theme_id
        ? Number(values.question_theme_id)
        : null,
      country_id: values.country_id ? Number(values.country_id) : null,
      region_id: values.region_id ? Number(values.region_id) : null,
      question_count: Number(values.question_count) || 10,
      is_boss: values.is_boss,
      title_reward: values.title_reward || null,
    };

    try {
      const res = editing
        ? await apiFetch(`/api/owner/stages/${editing.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await apiFetch("/api/owner/stages", {
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
      await loadStages();
    } catch {
      setFormError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);

    const res = await apiFetch(`/api/owner/stages/${deleteTarget.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      setDeleteError("削除に失敗しました。");
      return;
    }

    setDeleteTarget(null);
    await loadStages();
  }

  const ready = Boolean(categoryId && difficulty);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">ステージ管理</h1>
          <p className="text-sm text-muted-foreground">
            カテゴリーと難易度を選んでください
          </p>
        </div>
        <Button onClick={openCreate} disabled={!ready}>
          <Plus /> Stageを追加
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="カテゴリー" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={String(category.id)}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={difficulty}
          onValueChange={(v) => setDifficulty(v as Difficulty)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="難易度" />
          </SelectTrigger>
          <SelectContent>
            {DIFFICULTIES.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!ready && (
        <p className="text-sm text-muted-foreground">
          カテゴリーと難易度を選ぶとステージ一覧が表示されます。
        </p>
      )}

      {ready && stages === null && !error && (
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      )}

      {ready && stages && stages.length === 0 && (
        <p className="text-sm text-muted-foreground">
          まだStageがありません。
        </p>
      )}

      {ready && stages && stages.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50"
            >
              <Link
                href={`/owner/dashboard/stages/${stage.id}`}
                className="flex-1"
              >
                <p className="text-sm font-medium hover:underline">
                  Stage {stage.stage_number}
                  {stage.is_boss && (
                    <Badge variant="destructive" className="ml-2">
                      BOSS
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stage.question_theme?.label ?? "テーマ未設定"} ・ 全
                  {stage.question_count}問
                  {stage.country ? ` ・ ${stage.country.name}` : ""}
                  {stage.region ? ` (${stage.region.name})` : ""}
                  {stage.title_reward ? ` ・ 称号:${stage.title_reward}` : ""}
                </p>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(stage)}>
                    編集
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteTarget(stage)}
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
            <DialogTitle>{editing ? "Stageを編集" : "Stageを追加"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stage-number">Stage番号</Label>
              <Input
                id="stage-number"
                type="number"
                min={1}
                required
                value={values.stage_number}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    stage_number: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>出題テーマ(任意)</Label>
              <Select
                value={values.question_theme_id || "none"}
                onValueChange={(v) =>
                  setValues((prev) => ({
                    ...prev,
                    question_theme_id: v === "none" ? "" : v,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">なし</SelectItem>
                  {themes.map((theme) => (
                    <SelectItem key={theme.id} value={String(theme.id)}>
                      {theme.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>国(任意。この国の達成率に合算されます)</Label>
              <Select
                value={values.country_id || "none"}
                onValueChange={(v) =>
                  setValues((prev) => ({
                    ...prev,
                    country_id: v === "none" ? "" : v,
                    region_id: "",
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

            {values.country_id && (
              <div className="flex flex-col gap-1.5">
                <Label>地域(任意。指定した地域のページにも表示されます)</Label>
                <Select
                  value={values.region_id || "none"}
                  onValueChange={(v) =>
                    setValues((prev) => ({
                      ...prev,
                      region_id: v === "none" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">なし</SelectItem>
                    {regions
                      .filter(
                        (region) =>
                          region.country_id === Number(values.country_id),
                      )
                      .map((region) => (
                        <SelectItem key={region.id} value={String(region.id)}>
                          {region.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stage-question-count">問題数</Label>
              <Input
                id="stage-question-count"
                type="number"
                min={1}
                required
                value={values.question_count}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    question_count: e.target.value,
                  }))
                }
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={values.is_boss}
                onCheckedChange={(checked) =>
                  setValues((prev) => ({
                    ...prev,
                    is_boss: checked === true,
                  }))
                }
              />
              ボスStageにする
            </label>

            {values.is_boss && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="stage-title-reward">クリア称号</Label>
                <Input
                  id="stage-title-reward"
                  placeholder="例: イタリア博士"
                  value={values.title_reward}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      title_reward: e.target.value,
                    }))
                  }
                />
              </div>
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
              「Stage {deleteTarget?.stage_number}」を削除しますか？
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
