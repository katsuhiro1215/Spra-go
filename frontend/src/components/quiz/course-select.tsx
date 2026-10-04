import Image from "next/image";
import Link from "next/link";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { achievementRatio, achievementText } from "@/components/learn/country-cards";
import { COURSE_FLAGS, WORLD_COURSE_NAME, WORLD_COURSE_NOTE } from "@/lib/flag-quiz";

/** GET /api/categories/{id}/courses の1件 */
export type Course = { id: number; name: string; cleared: number; total: number };

/** コースの選択(国旗クイズの、大陸ごとのコース。docs/design/2026-10-05-flag-quiz-design.md 7-3) */
export function CourseSelect({ courses }: { courses: Course[] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {courses.map((course) => {
        const text = achievementText(course);
        const src = COURSE_FLAGS[course.name];

        return (
          <Link
            key={course.id}
            href={`/play/${course.id}`}
            className="relative flex flex-col items-center gap-2 rounded-2xl border-2 border-b-4 border-[#e8dfcf] bg-[#fffaf0] p-3 text-center shadow-lg transition-transform active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b6fa3] focus-visible:ring-offset-2"
          >
            {src && (
              <span className="relative block aspect-[3/2] w-full max-w-28 overflow-hidden rounded-md border border-[#e8dfcf] bg-white">
                <Image src={src} alt="" fill sizes="112px" className="object-contain" />
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
