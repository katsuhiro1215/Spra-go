import Image from "next/image";
import Link from "next/link";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { achievementRatio, achievementText } from "@/components/learn/country-cards";
import { COURSE_IMAGES, WORLD_COURSE_NAME, WORLD_COURSE_NOTE } from "@/lib/flag-quiz";
import { courseBadgeState, courseCardKind } from "@/lib/prefecture-quiz";

/**
 * GET /api/categories/{id}/courses の1件。
 * group: さらにコースを持つ(都道府県クイズの地方)。badge: 県のバッジの絵。title: そのコースの上級のボスの称号。earned: その称号をもらったか
 */
export type Course = {
  id: number;
  name: string;
  cleared: number;
  total: number;
  group?: boolean;
  badge?: string | null;
  title?: string | null;
  earned?: boolean;
};

const CARD =
  "relative flex flex-col items-center gap-2 rounded-2xl border-2 border-b-4 border-[#e8dfcf] bg-[#fffaf0] p-3 text-center shadow-lg transition-transform active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b6fa3] focus-visible:ring-offset-2";

/** コースの選択(国旗クイズの大陸ごとのコース、都道府県クイズの地方・県。docs/design/2026-10-05-flag-quiz-design.md 7-3、docs/design/2026-10-05-prefecture-quiz-design.md 7-1) */
export function CourseSelect({ courses }: { courses: Course[] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {courses.map((course) => {
        const text = achievementText(course);
        const kind = courseCardKind(course);
        const badge = courseBadgeState(course);
        const src = COURSE_IMAGES[course.name];

        return (
          <Link key={course.id} href={`/play/${course.id}`} className={CARD}>
            {kind === "prefecture" && course.badge && (
              <span className="relative block aspect-square w-24">
                <Image
                  src={course.badge}
                  alt=""
                  fill
                  sizes="96px"
                  className={badge === "locked" ? "object-contain opacity-60 grayscale" : "object-contain drop-shadow"}
                />
                {badge === "earned" && (
                  <span className="absolute -right-1 -bottom-1 rounded-full bg-[#3b7f26] px-1.5 py-0.5 text-[10px] font-black text-white">
                    <AutoFurigana text="ゲット" />
                  </span>
                )}
              </span>
            )}
            {kind === "plain" && src && (
              <span className="relative block aspect-[3/2] w-full">
                <Image src={src} alt="" fill sizes="(max-width: 480px) 45vw, 220px" className="object-contain" />
              </span>
            )}
            <span className="text-base font-black text-[#3b3226]">
              <AutoFurigana text={course.name} />
            </span>
            {course.name === WORLD_COURSE_NAME && (
              <span className="rounded-full bg-[#c2402c] px-2 py-0.5 text-[10px] font-black text-white">
                <AutoFurigana text={WORLD_COURSE_NOTE} />
              </span>
            )}
            <span className="h-2 w-full overflow-hidden rounded-full bg-[#e8dfcf]" aria-hidden>
              <span className="block h-full rounded-full bg-[#5bb33e]" style={{ width: `${achievementRatio(course) * 100}%` }} />
            </span>
            {text && <span className="text-xs font-bold text-[#6b5d45]">{text}</span>}
          </Link>
        );
      })}
    </div>
  );
}
