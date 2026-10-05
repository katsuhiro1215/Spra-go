// 国旗クイズの画面の判定(docs/design/2026-10-05-flag-quiz-design.md 7章)。画面を描かない部分だけをここに置く

export const WORLD_COURSE_NAME = "世界ぜんぶ";
export const WORLD_COURSE_NOTE = "ちょうむずかしい";

/**
 * コースのカードに出す絵(大陸の地図とスプルのバッジ。3:2、540×360のWebP)。
 * 元の絵は company/spra/mascot/assets/course/course_{キー}_01.png
 */
export const COURSE_IMAGES: Record<string, string> = {
  アジア: "/course/asia.webp",
  ヨーロッパ: "/course/europe.webp",
  アフリカ: "/course/africa.webp",
  北アメリカ: "/course/north_america.webp",
  南アメリカ: "/course/south_america.webp",
  オセアニア: "/course/oceania.webp",
  [WORLD_COURSE_NAME]: "/course/world.webp",
};

/** 国旗の絵のある選択肢が1つでもあれば、国旗の選択肢として描く */
export function hasImageChoices<T extends { meta?: { image?: string } | null }>(choices: T[]): boolean {
  return choices.some((choice) => Boolean(choice.meta?.image));
}

/** 国旗の絵は、切り取らずに全体を見せる(写真は、これまでどおり切り取り) */
export function isFlagImage(src: string): boolean {
  return src.startsWith("/flag/");
}
