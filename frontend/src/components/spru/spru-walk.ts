// このファイルは tools/spru-assets/walk.py が書き出す。手で直さない
export type WalkDirection = "lower_left" | "lower_right" | "upper_left" | "upper_right";
export type WalkFrame = "passing" | "step_l" | "step_r";

/** 歩くスプルの絵の大きさ。12枚とも同じ大きさで、足元は下の真ん中 */
export const SPRU_WALK_SIZE = { width: 127, height: 200 } as const;

export const SPRU_WALK: Record<`${WalkDirection}_${WalkFrame}`, string> = {
  "lower_left_passing": "/spru/walk/lower_left_passing.webp",
  "lower_left_step_l": "/spru/walk/lower_left_step_l.webp",
  "lower_left_step_r": "/spru/walk/lower_left_step_r.webp",
  "lower_right_passing": "/spru/walk/lower_right_passing.webp",
  "lower_right_step_l": "/spru/walk/lower_right_step_l.webp",
  "lower_right_step_r": "/spru/walk/lower_right_step_r.webp",
  "upper_left_passing": "/spru/walk/upper_left_passing.webp",
  "upper_left_step_l": "/spru/walk/upper_left_step_l.webp",
  "upper_left_step_r": "/spru/walk/upper_left_step_r.webp",
  "upper_right_passing": "/spru/walk/upper_right_passing.webp",
  "upper_right_step_l": "/spru/walk/upper_right_step_l.webp",
  "upper_right_step_r": "/spru/walk/upper_right_step_r.webp",
};
