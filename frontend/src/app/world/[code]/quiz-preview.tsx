"use client";

import { useState } from "react";
import Link from "next/link";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { CharacterPlaceholder } from "@/components/app/character-placeholder";

type Choice = { id: number; label: string; is_correct: boolean };
type Question = { id: number; prompt: string; choices: Choice[] };
type SampleQuiz = {
  country: { code: string; name: string; mood_emoji: string | null };
  questions: Question[];
};

export function QuizPreview({ data }: { data: SampleQuiz }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | null>(
    null,
  );
  const [score, setScore] = useState(0);

  const { questions } = data;
  const finished = currentIndex >= questions.length;
  const question = questions[currentIndex];

  function handleSelect(choice: Choice) {
    if (selectedChoiceId !== null) return;
    setSelectedChoiceId(choice.id);
    if (choice.is_correct) setScore((prev) => prev + 1);
  }

  function handleNext() {
    setCurrentIndex((prev) => prev + 1);
    setSelectedChoiceId(null);
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/30 bg-black/30 p-6 text-center shadow-xl backdrop-blur-sm">
        <CharacterPlaceholder className="h-20 w-20" />
        <p className="text-lg font-bold text-white">
          {score} / {questions.length} 問正解！
        </p>
        <p className="text-sm text-white/85">
          続きは無料登録して、{data.country.name}
          をもっと冒険しよう。国旗・地理・言語など全ジャンルが遊び放題です。
        </p>
        <Link href="/register" className="w-full">
          <AppButton variant="primary" size="lg" className="w-full normal-case">
            無料ではじめる
          </AppButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/30 bg-black/30 p-6 shadow-xl backdrop-blur-sm">
      <p className="text-xs font-medium text-white/70">
        体験クイズ {currentIndex + 1} / {questions.length}
      </p>
      <h2 className="text-lg font-bold text-white">
        <AutoFurigana text={question.prompt} />
      </h2>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {question.choices.map((choice) => {
          let variant: "default" | "secondary" | "danger" = "default";
          if (selectedChoiceId !== null) {
            if (choice.is_correct) variant = "secondary";
            else if (choice.id === selectedChoiceId) variant = "danger";
          }

          return (
            <AppButton
              key={choice.id}
              variant={variant}
              disabled={selectedChoiceId !== null}
              onClick={() => handleSelect(choice)}
              className="w-full normal-case"
            >
              <AutoFurigana text={choice.label} />
            </AppButton>
          );
        })}
      </div>

      {selectedChoiceId !== null && (
        <AppButton variant="primary" onClick={handleNext} className="normal-case">
          {currentIndex + 1 === questions.length ? "結果を見る ▶" : "次の問題 ▶"}
        </AppButton>
      )}
    </div>
  );
}
