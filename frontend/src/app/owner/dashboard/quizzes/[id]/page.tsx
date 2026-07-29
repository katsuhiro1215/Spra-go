"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Plus, X } from "lucide-react";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";

const DIFFICULTIES = ["初級", "中級", "上級"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

const difficultyClass: Record<Difficulty, string> = {
  初級: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
  中級: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  上級: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-400",
};

type Country = { id: number; code: string; name: string };
type Category = { id: number; parent_id: number | null; name: string };
type Choice = { id: number; label: string; is_correct: boolean; order: number };
type QuestionItem = {
  id: number;
  prompt: string;
  order: number;
  country_id: number | null;
  country: Country | null;
  choices: Choice[];
};

type QuizDetail = {
  id: number;
  title: string;
  description: string | null;
  difficulty: Difficulty;
  country_id: number | null;
  country: Country | null;
  categories: Category[];
  questions: QuestionItem[];
};

type QuizFormValues = {
  title: string;
  description: string;
  difficulty: Difficulty;
  country_id: string;
  category_ids: number[];
};

type QuestionFormValues = {
  prompt: string;
  country_id: string;
  choices: string[];
  correctIndex: string;
};

const emptyQuestionForm: QuestionFormValues = {
  prompt: "",
  country_id: "",
  choices: ["", "", "", ""],
  correctIndex: "0",
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

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [metaDialogOpen, setMetaDialogOpen] = useState(false);
  const [metaValues, setMetaValues] = useState<QuizFormValues | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [metaSubmitting, setMetaSubmitting] = useState(false);
  const [deleteQuizOpen, setDeleteQuizOpen] = useState(false);
  const [deleteQuizError, setDeleteQuizError] = useState<string | null>(null);

  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(
    null,
  );
  const [questionValues, setQuestionValues] =
    useState<QuestionFormValues>(emptyQuestionForm);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [deleteQuestionTarget, setDeleteQuestionTarget] =
    useState<QuestionItem | null>(null);

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  async function loadQuiz() {
    const res = await apiFetch(`/api/owner/quizzes/${id}`);
    if (!res.ok) {
      setError("クイズの取得に失敗しました。");
      return;
    }
    setQuiz(await res.json());
  }

  useEffect(() => {
    loadQuiz();
    apiFetch("/api/owner/countries").then(async (res) => {
      if (res.ok) setCountries(await res.json());
    });
    apiFetch("/api/owner/categories").then(async (res) => {
      if (res.ok) setCategories(await res.json());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function openMetaEdit() {
    if (!quiz) return;
    setMetaValues({
      title: quiz.title,
      description: quiz.description ?? "",
      difficulty: quiz.difficulty,
      country_id: quiz.country_id ? String(quiz.country_id) : "",
      category_ids: quiz.categories.map((c) => c.id),
    });
    setMetaError(null);
    setMetaDialogOpen(true);
  }

  function toggleCategory(categoryId: number) {
    setMetaValues((prev) =>
      prev
        ? {
            ...prev,
            category_ids: prev.category_ids.includes(categoryId)
              ? prev.category_ids.filter((c) => c !== categoryId)
              : [...prev.category_ids, categoryId],
          }
        : prev,
    );
  }

  async function handleMetaSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!metaValues) return;
    setMetaSubmitting(true);
    setMetaError(null);

    try {
      const res = await apiFetch(`/api/owner/quizzes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: metaValues.title,
          description: metaValues.description || null,
          difficulty: metaValues.difficulty,
          country_id: metaValues.country_id
            ? Number(metaValues.country_id)
            : null,
          category_ids: metaValues.category_ids,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        const firstError = Object.values(data.errors ?? {})[0] as
          | string[]
          | undefined;
        setMetaError(firstError?.[0] ?? data.message ?? "保存に失敗しました。");
        return;
      }

      setMetaDialogOpen(false);
      await loadQuiz();
    } catch {
      setMetaError("通信エラーが発生しました。");
    } finally {
      setMetaSubmitting(false);
    }
  }

  async function handleDeleteQuiz() {
    setDeleteQuizError(null);
    const res = await apiFetch(`/api/owner/quizzes/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      setDeleteQuizError("削除に失敗しました。");
      return;
    }

    router.push("/owner/dashboard/quizzes");
  }

  function openCreateQuestion() {
    setEditingQuestion(null);
    setQuestionValues(emptyQuestionForm);
    setQuestionError(null);
    setQuestionDialogOpen(true);
  }

  function openEditQuestion(question: QuestionItem) {
    setEditingQuestion(question);
    const sorted = [...question.choices].sort((a, b) => a.order - b.order);
    setQuestionValues({
      prompt: question.prompt,
      country_id: question.country_id ? String(question.country_id) : "",
      choices: sorted.map((c) => c.label),
      correctIndex: String(sorted.findIndex((c) => c.is_correct)),
    });
    setQuestionError(null);
    setQuestionDialogOpen(true);
  }

  function addChoice() {
    setQuestionValues((prev) =>
      prev.choices.length >= 10
        ? prev
        : { ...prev, choices: [...prev.choices, ""] },
    );
  }

  function removeChoice(index: number) {
    setQuestionValues((prev) => {
      if (prev.choices.length <= 4) return prev;

      const choices = prev.choices.filter((_, i) => i !== index);
      let correctIndex = Number(prev.correctIndex);
      if (index === correctIndex) correctIndex = 0;
      else if (index < correctIndex) correctIndex -= 1;

      return { ...prev, choices, correctIndex: String(correctIndex) };
    });
  }

  async function handleQuestionSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setQuestionSubmitting(true);
    setQuestionError(null);

    const payload = {
      prompt: questionValues.prompt,
      country_id: questionValues.country_id
        ? Number(questionValues.country_id)
        : null,
      choices: questionValues.choices.map((label, index) => ({
        label,
        is_correct: String(index) === questionValues.correctIndex,
      })),
    };

    try {
      const res = editingQuestion
        ? await apiFetch(
            `/api/owner/quizzes/${id}/questions/${editingQuestion.id}`,
            { method: "PATCH", body: JSON.stringify(payload) },
          )
        : await apiFetch(`/api/owner/quizzes/${id}/questions`, {
            method: "POST",
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const data = await res.json();
        const firstError = Object.values(data.errors ?? {})[0] as
          | string[]
          | undefined;
        setQuestionError(
          firstError?.[0] ?? data.message ?? "保存に失敗しました。",
        );
        return;
      }

      setQuestionDialogOpen(false);
      await loadQuiz();
    } catch {
      setQuestionError("通信エラーが発生しました。");
    } finally {
      setQuestionSubmitting(false);
    }
  }

  async function handleDeleteQuestion() {
    if (!deleteQuestionTarget) return;

    const res = await apiFetch(
      `/api/owner/quizzes/${id}/questions/${deleteQuestionTarget.id}`,
      { method: "DELETE" },
    );

    if (res.ok) {
      setDeleteQuestionTarget(null);
      await loadQuiz();
    }
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!quiz) {
    return <p className="text-sm text-muted-foreground">読み込み中...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold">{quiz.title}</h1>
          {quiz.description && (
            <p className="text-sm text-muted-foreground">
              {quiz.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={difficultyClass[quiz.difficulty]}
            >
              {quiz.difficulty}
            </Badge>
            {quiz.country && <Badge variant="secondary">{quiz.country.name}</Badge>}
            {quiz.categories.map((c) => (
              <Badge key={c.id} variant="secondary">
                {c.name}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={openMetaEdit}>
            編集
          </Button>
          <Button variant="outline" onClick={() => setDeleteQuizOpen(true)}>
            削除
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          質問({quiz.questions.length}件)
        </h2>
        <Button onClick={openCreateQuestion}>
          <Plus /> 質問を追加
        </Button>
      </div>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {quiz.questions.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">
            まだ質問がありません。
          </p>
        )}
        {quiz.questions.map((question) => {
          const correct = question.choices.find((c) => c.is_correct);
          return (
            <div
              key={question.id}
              className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50"
            >
              {question.country ? (
                <div className="relative h-6 w-9 shrink-0 overflow-hidden rounded-sm border border-border">
                  <Image
                    src={`/flag/${question.country.code}.svg`}
                    alt={question.country.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="h-6 w-9 shrink-0" />
              )}

              <div className="flex-1">
                <p className="text-sm font-medium">{question.prompt}</p>
                <p className="text-xs text-muted-foreground">
                  正解: {correct?.label ?? "-"}
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEditQuestion(question)}>
                    編集
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteQuestionTarget(question)}
                  >
                    削除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>

      {/* クイズ編集ダイアログ */}
      <Dialog open={metaDialogOpen} onOpenChange={setMetaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>クイズを編集</DialogTitle>
          </DialogHeader>

          {metaValues && (
            <form
              onSubmit={handleMetaSubmit}
              className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="quiz-title">タイトル</Label>
                <Input
                  id="quiz-title"
                  required
                  value={metaValues.title}
                  onChange={(e) =>
                    setMetaValues((prev) =>
                      prev ? { ...prev, title: e.target.value } : prev,
                    )
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="quiz-description">説明</Label>
                <Textarea
                  id="quiz-description"
                  value={metaValues.description}
                  onChange={(e) =>
                    setMetaValues((prev) =>
                      prev ? { ...prev, description: e.target.value } : prev,
                    )
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>難易度</Label>
                <Select
                  value={metaValues.difficulty}
                  onValueChange={(v) =>
                    setMetaValues((prev) =>
                      prev ? { ...prev, difficulty: v as Difficulty } : prev,
                    )
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
                  value={metaValues.country_id || "none"}
                  onValueChange={(v) =>
                    setMetaValues((prev) =>
                      prev
                        ? { ...prev, country_id: v === "none" ? "" : v }
                        : prev,
                    )
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
                        checked={metaValues.category_ids.includes(category.id)}
                        onCheckedChange={() => toggleCategory(category.id)}
                      />
                      {category.name}
                    </label>
                  ))}
                </div>
              </div>

              {metaError && (
                <p className="text-sm text-destructive">{metaError}</p>
              )}

              <DialogFooter>
                <Button type="submit" disabled={metaSubmitting}>
                  {metaSubmitting ? "保存中..." : "保存"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* クイズ削除確認 */}
      <AlertDialog open={deleteQuizOpen} onOpenChange={setDeleteQuizOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>「{quiz.title}」を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              質問・選択肢もすべて削除されます。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteQuizError && (
            <p className="text-sm text-destructive">{deleteQuizError}</p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuiz}>
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 質問追加・編集ダイアログ */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? "質問を編集" : "質問を追加"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleQuestionSubmit}
            className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="question-prompt">設問文</Label>
              <Textarea
                id="question-prompt"
                required
                value={questionValues.prompt}
                onChange={(e) =>
                  setQuestionValues((prev) => ({
                    ...prev,
                    prompt: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>国(任意。「この国旗は？」のように国旗を表示したい場合に選択)</Label>
              <Select
                value={questionValues.country_id || "none"}
                onValueChange={(v) =>
                  setQuestionValues((prev) => ({
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

            <div className="flex flex-col gap-2">
              <Label>
                選択肢(正解を1つ選択。4〜10個、出題時はこの中から正解+ランダム3個の4択になります)
              </Label>
              <RadioGroup
                value={questionValues.correctIndex}
                onValueChange={(v) =>
                  setQuestionValues((prev) => ({ ...prev, correctIndex: v }))
                }
                className="flex flex-col gap-2"
              >
                {questionValues.choices.map((choice, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <RadioGroupItem
                      value={String(index)}
                      id={`choice-${index}`}
                    />
                    <Input
                      required
                      placeholder={`選択肢 ${index + 1}`}
                      value={choice}
                      onChange={(e) =>
                        setQuestionValues((prev) => ({
                          ...prev,
                          choices: prev.choices.map((c, i) =>
                            i === index ? e.target.value : c,
                          ),
                        }))
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={questionValues.choices.length <= 4}
                      onClick={() => removeChoice(index)}
                    >
                      <X />
                    </Button>
                  </div>
                ))}
              </RadioGroup>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={questionValues.choices.length >= 10}
                onClick={addChoice}
                className="self-start"
              >
                <Plus /> 選択肢を追加
              </Button>
            </div>

            {questionError && (
              <p className="text-sm text-destructive">{questionError}</p>
            )}

            <DialogFooter>
              <Button type="submit" disabled={questionSubmitting}>
                {questionSubmitting ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 質問削除確認 */}
      <AlertDialog
        open={deleteQuestionTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteQuestionTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>この質問を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuestion}>
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
