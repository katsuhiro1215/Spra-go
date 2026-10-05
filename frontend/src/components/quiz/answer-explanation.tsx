"use client";

import { useState } from "react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";

import { hasDetails, isBlankExplanation } from "./explanation";
import type { QuestionExplanation } from "./types";

/**
 * 答えのカードに出す、問題の解説(docs/design/2026-10-06-question-explanation-design.md 5章)。
 * 要約(summary)を出し、例文・使いどころ・似た語があれば「くわしく見る」で開く。解説のない問題は、何も出さない。
 * 問題が変わるたびに閉じた状態に戻したいので、呼ぶ側が key を付けて作り直す。
 * plain は、ふりがなを付けない語(難読地名の問われた漢字)
 */
export function AnswerExplanation({
  explanation,
  plain,
}: {
  explanation: QuestionExplanation | null;
  plain?: string[];
}) {
  const [open, setOpen] = useState(false);

  if (!explanation || isBlankExplanation(explanation)) return null;

  const { summary, example, usage, related } = explanation;

  return (
    <div className="flex w-full flex-col items-start gap-1 rounded-2xl bg-[#f5ecd5] px-4 py-3 text-left">
      {summary && (
        <p className="text-sm font-bold leading-relaxed">
          <AutoFurigana text={summary} plain={plain} />
        </p>
      )}
      {hasDetails(explanation) && (
        <>
          <AppButton
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
            className="-ml-3 text-[#2b6fa3]"
          >
            {open ? "とじる ▲" : "くわしく見る ▼"}
          </AppButton>
          {open && (
            <div className="flex w-full flex-col gap-3 text-sm">
              {example?.text && (
                <section>
                  <h3 className="text-xs font-black text-[#7a6a4a]">れいぶん</h3>
                  <p lang="en" className="font-bold">
                    {example.text}
                  </p>
                  {example.translation && (
                    <p className="text-[#6b5d45]">
                      <AutoFurigana text={example.translation} plain={plain} />
                    </p>
                  )}
                </section>
              )}
              {usage && (
                <section>
                  <h3 className="text-xs font-black text-[#7a6a4a]">つかいどころ</h3>
                  <p className="font-bold leading-relaxed">
                    <AutoFurigana text={usage} plain={plain} />
                  </p>
                </section>
              )}
              {related && related.length > 0 && (
                <section>
                  <h3 className="text-xs font-black text-[#7a6a4a]">にた ことば</h3>
                  <ul className="flex flex-col gap-1">
                    {related.map((item) => (
                      <li key={item.term} className="font-bold">
                        {item.term}
                        {item.note && (
                          <span className="ml-2 font-normal text-[#6b5d45]">
                            <AutoFurigana text={item.note} plain={plain} />
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
