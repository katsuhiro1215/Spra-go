"use client";

import { use, useEffect, useState } from "react";
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
import { apiFetch } from "@/lib/api";

type Difficulty = "初級" | "中級" | "上級";

const difficultyClass: Record<Difficulty, string> = {
  初級: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
  中級: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  上級: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-400",
};

type Category = { id: number; name: string };
type QuestionTheme = { id: number; key: string; label: string };

type StageDetail = {
  id: number;
  category_id: number;
  difficulty: Difficulty;
  stage_number: number;
  question_theme: QuestionTheme | null;
  question_count: number;
  is_boss: boolean;
  title_reward: string | null;
  category: Category;
};

type Quiz = { id: number; title: string; difficulty: Difficulty };

type QuestionItem = {
  id: number;
  quiz_id: number;
  type: string;
  prompt: string;
  quiz: Quiz;
};

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [stage, setStage] = useState<StageDetail | null>(null);
  const [assigned, setAssigned] = useState<QuestionItem[] | null>(null);
  const [candidates, setCandidates] = useState<QuestionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  async function loadStage() {
    const res = await apiFetch(`/api/owner/stages/${id}`);
    if (!res.ok) {
      setError("Stageの取得に失敗しました。");
      return;
    }
    setStage(await res.json());
  }

  async function loadAssigned() {
    const res = await apiFetch(`/api/owner/stages/${id}/questions`);
    if (res.ok) setAssigned(await res.json());
  }

  async function loadCandidates() {
    const res = await apiFetch(`/api/owner/stages/${id}/candidate-questions`);
    if (res.ok) setCandidates(await res.json());
  }

  useEffect(() => {
    loadStage();
    loadAssigned();
    loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function openPicker() {
    setSelectedIds([]);
    setPickerError(null);
    setPickerOpen(true);
  }

  function toggleSelected(questionId: number) {
    setSelectedIds((prev) =>
      prev.includes(questionId)
        ? prev.filter((v) => v !== questionId)
        : [...prev, questionId],
    );
  }

  async function handleAssign() {
    if (selectedIds.length === 0) return;
    setSubmitting(true);
    setPickerError(null);

    try {
      const res = await apiFetch(`/api/owner/stages/${id}/questions`, {
        method: "POST",
        body: JSON.stringify({ question_ids: selectedIds }),
      });

      if (!res.ok) {
        setPickerError("割り当てに失敗しました。");
        return;
      }

      setPickerOpen(false);
      await Promise.all([loadAssigned(), loadCandidates()]);
    } catch {
      setPickerError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(questionId: number) {
    const res = await apiFetch(
      `/api/owner/stages/${id}/questions/${questionId}`,
      { method: "DELETE" },
    );

    if (res.ok) {
      await Promise.all([loadAssigned(), loadCandidates()]);
    }
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!stage) {
    return <p className="text-sm text-muted-foreground">読み込み中...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">
          {stage.category.name} Stage {stage.stage_number}
          {stage.is_boss && (
            <Badge variant="destructive" className="ml-2">
              BOSS
            </Badge>
          )}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={difficultyClass[stage.difficulty]}>
            {stage.difficulty}
          </Badge>
          {stage.question_theme && (
            <Badge variant="secondary">{stage.question_theme.label}</Badge>
          )}
          <span className="text-sm text-muted-foreground">
            目標 {stage.question_count}問
          </span>
          {stage.title_reward && (
            <span className="text-sm text-muted-foreground">
              称号:{stage.title_reward}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          割り当て済み問題({assigned?.length ?? 0}件)
        </h2>
        <Button onClick={openPicker}>
          <Plus /> 問題を追加
        </Button>
      </div>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {assigned && assigned.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">
            まだ問題が割り当てられていません。
          </p>
        )}
        {assigned === null && (
          <p className="p-4 text-sm text-muted-foreground">読み込み中...</p>
        )}
        {assigned?.map((question) => (
          <div
            key={question.id}
            className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50"
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{question.prompt}</p>
              <p className="text-xs text-muted-foreground">
                {question.quiz.title}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleRemove(question.id)}
                >
                  Stageから外す
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>問題を追加</DialogTitle>
          </DialogHeader>

          <div className="flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto rounded-md border border-border p-2">
            {candidates && candidates.length === 0 && (
              <p className="p-2 text-sm text-muted-foreground">
                追加できる問題がありません。同じカテゴリーの公開クイズに問題を作成してください。
              </p>
            )}
            {candidates?.map((question) => (
              <label
                key={question.id}
                className="flex items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={selectedIds.includes(question.id)}
                  onCheckedChange={() => toggleSelected(question.id)}
                />
                <span className="flex-1">
                  {question.prompt}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {question.quiz.title}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {pickerError && (
            <p className="text-sm text-destructive">{pickerError}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              disabled={submitting || selectedIds.length === 0}
              onClick={handleAssign}
            >
              {submitting
                ? "追加中..."
                : `選択した問題を追加(${selectedIds.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
