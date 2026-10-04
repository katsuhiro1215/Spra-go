// 国旗クイズの画面の判定(docs/design/2026-10-05-flag-quiz-design.md 7章)。画面を描かない部分だけをここに置く

export const WORLD_COURSE_NAME = "世界ぜんぶ";
export const WORLD_COURSE_NOTE = "ちょうむずかしい";

/** コースのカードに出す絵(国旗。世界ぜんぶは地球) */
export const COURSE_FLAGS: Record<string, string> = {
  アジア: "/flag/Japan.svg",
  ヨーロッパ: "/flag/France.svg",
  アフリカ: "/flag/South-Africa.svg",
  北アメリカ: "/flag/United-States.svg",
  南アメリカ: "/flag/Brazil.svg",
  オセアニア: "/flag/Australia.svg",
  [WORLD_COURSE_NAME]: "/globe.svg",
};

/** 国旗の絵のある選択肢が1つでもあれば、国旗の選択肢として描く */
export function hasImageChoices<T extends { meta?: { image?: string } | null }>(choices: T[]): boolean {
  return choices.some((choice) => Boolean(choice.meta?.image));
}

/** 国旗の絵は、切り取らずに全体を見せる(写真は、これまでどおり切り取り) */
export function isFlagImage(src: string): boolean {
  return src.startsWith("/flag/");
}
