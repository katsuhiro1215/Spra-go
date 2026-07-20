import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Difficulty, quizzes } from "./data";

const difficultyClass: Record<Difficulty, string> = {
  初級: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
  中級: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  上級: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-400",
};

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">クイズ管理</h1>
          <p className="text-sm text-muted-foreground">
            全{quizzes.length}件
          </p>
        </div>
        <Button>+ クイズを追加</Button>
      </div>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {quizzes.map((quiz) => (
          <div
            key={quiz.id}
            className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50"
          >
            <div className="relative h-6 w-9 shrink-0 overflow-hidden rounded-sm border border-border">
              <Image
                src={`/flag/${quiz.countryCode}.svg`}
                alt={quiz.countryName}
                fill
                className="object-cover"
              />
            </div>

            <div className="flex-1">
              <p className="text-sm font-medium">{quiz.title}</p>
              <p className="text-xs text-muted-foreground">
                {quiz.countryName} ・ 全{quiz.questionCount}問
              </p>
            </div>

            <Badge variant="outline" className={difficultyClass[quiz.difficulty]}>
              {quiz.difficulty}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
