"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
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

const DIFFICULTIES = ["初級", "中級", "上級"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

const difficultyClass: Record<Difficulty, string> = {
  初級: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
  中級: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  上級: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-400",
};

type Country = { id: number; code: string; name: string };
type Category = { id: number; parent_id: number | null; name: string };

type Quiz = {
  id: number;
  title: string;
  description: string | null;
  difficulty: Difficulty;
  country_id: number | null;
  country: Country | null;
  categories: Category[];
  questions_count: number;
};

type FormValues = {
  title: string;
  description: string;
  difficulty: Difficulty;
  country_id: string;
  category_ids: number[];
};

const emptyForm: FormValues = {
  title: "",
  description: "",
  difficulty: "初級",
  country_id: "",
  category_ids: [],
};

function categoryDepth(category: Category, byId: Map<number, Category>): number {
  let depth = 0;
  let current = category;
  while (current.parent_id !== null) {
    const parent = byId.get(current.parent_id);
    if (!parent) break;
    depth += 1;
    current = parent;
  }
  return depth;
}

export default function Page() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Quiz | null>(null);
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Quiz | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function loadQuizzes() {
    const res = await apiFetch("/api/owner/quizzes");
    if (!res.ok) {
      setError("クイズの取得に失敗しました。");
      return;
    }
    setQuizzes(await res.json());
  }

  useEffect(() => {
    (async () => {
      loadQuizzes();
      apiFetch("/api/owner/countries").then(async (res) => {
        if (res.ok) setCountries(await res.json());
      });
      apiFetch("/api/owner/categories").then(async (res) => {
        if (res.ok) setCategories(await res.json());
      });
    })();
  }, []);

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  function openCreate() {
    setEditing(null);
    setValues(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(quiz: Quiz) {
    setEditing(quiz);
    setValues({
      title: quiz.title,
      description: quiz.description ?? "",
      difficulty: quiz.difficulty,
      country_id: quiz.country_id ? String(quiz.country_id) : "",
      category_ids: quiz.categories.map((c) => c.id),
    });
    setFormError(null);
    setDialogOpen(true);
  }

  function toggleCategory(id: number) {
    setValues((prev) => ({
      ...prev,
      category_ids: prev.category_ids.includes(id)
        ? prev.category_ids.filter((c) => c !== id)
        : [...prev.category_ids, id],
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const payload = {
      title: values.title,
      description: values.description || null,
      difficulty: values.difficulty,
      country_id: values.country_id ? Number(values.country_id) : null,
      category_ids: values.category_ids,
    };

    try {
      const res = editing
        ? await apiFetch(`/api/owner/quizzes/${editing.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await apiFetch("/api/owner/quizzes", {
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

      const quiz = await res.json();
      setDialogOpen(false);

      if (!editing) {
        router.push(`/owner/dashboard/quizzes/${quiz.id}`);
        return;
      }

      await loadQuizzes();
    } catch {
      setFormError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);

    const res = await apiFetch(`/api/owner/quizzes/${deleteTarget.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      setDeleteError("削除に失敗しました。");
      return;
    }

    setDeleteTarget(null);
    await loadQuizzes();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">クイズ管理</h1>
          <p className="text-sm text-muted-foreground">
            {quizzes ? `全${quizzes.length}件` : "読み込み中..."}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> クイズを追加
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {quizzes && (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50"
            >
              {quiz.country ? (
                <div className="relative h-6 w-9 shrink-0 overflow-hidden rounded-sm border border-border">
                  <Image
                    src={`/flag/${quiz.country.code}.svg`}
                    alt={quiz.country.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="h-6 w-9 shrink-0" />
              )}

              <Link
                href={`/owner/dashboard/quizzes/${quiz.id}`}
                className="flex-1"
              >
                <p className="text-sm font-medium hover:underline">
                  {quiz.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {quiz.country?.name ?? "国なし"} ・ 全{quiz.questions_count}問
                  {quiz.categories.length > 0 &&
                    ` ・ ${quiz.categories.map((c) => c.name).join(", ")}`}
                </p>
              </Link>

              <Badge
                variant="outline"
                className={difficultyClass[quiz.difficulty]}
              >
                {quiz.difficulty}
              </Badge>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(quiz)}>
                    編集
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteTarget(quiz)}
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
            <DialogTitle>{editing ? "クイズを編集" : "クイズを追加"}</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quiz-title">タイトル</Label>
              <Input
                id="quiz-title"
                required
                value={values.title}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quiz-description">説明</Label>
              <Textarea
                id="quiz-description"
                value={values.description}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>難易度</Label>
              <Select
                value={values.difficulty}
                onValueChange={(v) =>
                  setValues((prev) => ({
                    ...prev,
                    difficulty: v as Difficulty,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
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

            <div className="flex flex-col gap-1.5">
              <Label>カテゴリー(複数選択可)</Label>
              <div className="flex flex-col gap-1.5 rounded-md border border-border p-2">
                {categories.map((category) => (
                  <label
                    key={category.id}
                    className="flex items-center gap-2 text-sm"
                    style={{
                      paddingLeft: `${categoryDepth(category, categoryById) * 16}px`,
                    }}
                  >
                    <Checkbox
                      checked={values.category_ids.includes(category.id)}
                      onCheckedChange={() => toggleCategory(category.id)}
                    />
                    {category.name}
                  </label>
                ))}
              </div>
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
              質問・選択肢もすべて削除されます。この操作は取り消せません。
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
