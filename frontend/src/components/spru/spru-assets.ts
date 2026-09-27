// このファイルは tools/spru-assets/extract.py が書き出す。手で直さない
export type SpruImage = { src: string; width: number; height: number };

export const SPRU_IMAGES = {
  "front": { src: "/spru/basic/front.webp", width: 132, height: 214 },
  "three-quarter": { src: "/spru/basic/three-quarter.webp", width: 119, height: 208 },
  "normal": { src: "/spru/expressions/normal.webp", width: 133, height: 181 },
  "smile": { src: "/spru/expressions/smile.webp", width: 133, height: 194 },
  "laugh": { src: "/spru/expressions/laugh.webp", width: 135, height: 198 },
  "surprised": { src: "/spru/expressions/surprised.webp", width: 132, height: 195 },
  "think": { src: "/spru/expressions/think.webp", width: 134, height: 202 },
  "effort": { src: "/spru/expressions/effort.webp", width: 136, height: 201 },
  "happy": { src: "/spru/expressions/happy.webp", width: 137, height: 201 },
  "sad": { src: "/spru/expressions/sad.webp", width: 125, height: 195 },
  "cry": { src: "/spru/expressions/cry.webp", width: 132, height: 196 },
  "shy": { src: "/spru/expressions/shy.webp", width: 127, height: 207 },
  "excited": { src: "/spru/expressions/excited.webp", width: 116, height: 181 },
  "walk": { src: "/spru/actions/walk.webp", width: 105, height: 171 },
  "run": { src: "/spru/actions/run.webp", width: 96, height: 169 },
  "jump": { src: "/spru/actions/jump.webp", width: 101, height: 177 },
  "wave": { src: "/spru/actions/wave.webp", width: 115, height: 184 },
  "sit": { src: "/spru/actions/sit.webp", width: 113, height: 173 },
  "sleep": { src: "/spru/actions/sleep.webp", width: 140, height: 112 },
  "startled": { src: "/spru/actions/startled.webp", width: 110, height: 173 },
  "cheer": { src: "/spru/actions/cheer.webp", width: 124, height: 171 },
  "dash": { src: "/spru/actions/dash.webp", width: 106, height: 155 },
  "palms": { src: "/spru/actions/palms.webp", width: 104, height: 176 },
  "water": { src: "/spru/actions/water.webp", width: 138, height: 212 },
  "sow-shake": { src: "/spru/actions/sow-shake.webp", width: 98, height: 161 },
  "sow-fly": { src: "/spru/actions/sow-fly.webp", width: 93, height: 147 },
} as const satisfies Record<string, SpruImage>;

export const SPRU_FACES = {
  "normal": { src: "/spru/faces/normal.webp", width: 106, height: 106 },
  "smile": { src: "/spru/faces/smile.webp", width: 106, height: 106 },
  "laugh": { src: "/spru/faces/laugh.webp", width: 108, height: 108 },
  "surprised": { src: "/spru/faces/surprised.webp", width: 106, height: 106 },
  "think": { src: "/spru/faces/think.webp", width: 107, height: 107 },
  "effort": { src: "/spru/faces/effort.webp", width: 109, height: 109 },
  "happy": { src: "/spru/faces/happy.webp", width: 110, height: 110 },
  "sad": { src: "/spru/faces/sad.webp", width: 100, height: 100 },
  "cry": { src: "/spru/faces/cry.webp", width: 106, height: 106 },
  "shy": { src: "/spru/faces/shy.webp", width: 102, height: 102 },
  "excited": { src: "/spru/faces/excited.webp", width: 93, height: 93 },
} as const satisfies Record<string, SpruImage>;

export const SPRU_SCENES = {
  "challenge": { src: "/spru/scenes/challenge.webp", width: 218, height: 168 },
  "grow": { src: "/spru/scenes/grow.webp", width: 180, height: 175 },
} as const satisfies Record<string, SpruImage>;

export const SPRU_BLOOM = {
  "flower": { src: "/spru/bloom/flower.webp", width: 45, height: 53 },
  "bud": { src: "/spru/bloom/bud.webp", width: 25, height: 29 },
} as const satisfies Record<string, SpruImage>;

export const GARDEN_IMAGES = {
  "seed": { src: "/spru/garden/seed.webp", width: 65, height: 112 },
  "sprout": { src: "/spru/garden/sprout.webp", width: 62, height: 120 },
} as const satisfies Record<string, SpruImage>;

export const COMPANION_IMAGES = {
  "lumi": { src: "/spru/companions/lumi.webp", width: 86, height: 144 },
  "momo": { src: "/spru/companions/momo.webp", width: 85, height: 142 },
  "kuru": { src: "/spru/companions/kuru.webp", width: 88, height: 154 },
  "piko": { src: "/spru/companions/piko.webp", width: 85, height: 147 },
  "ruru": { src: "/spru/companions/ruru.webp", width: 82, height: 153 },
} as const satisfies Record<string, SpruImage>;

export const OUTING_IMAGES = {
  "walk": { src: "/spru/outing/walk.webp", width: 93, height: 160 },
  "run": { src: "/spru/outing/run.webp", width: 82, height: 111 },
  "back": { src: "/spru/outing/back.webp", width: 66, height: 95 },
  "apple": { src: "/spru/outing/apple.webp", width: 80, height: 136 },
  "heart": { src: "/spru/outing/heart.webp", width: 88, height: 137 },
  "star": { src: "/spru/outing/star.webp", width: 90, height: 135 },
} as const satisfies Record<string, SpruImage>;

export const COSTUME_IMAGES = {
  "halloween": { src: "/spru/costumes/halloween.webp", width: 154, height: 253 },
  "christmas": { src: "/spru/costumes/christmas.webp", width: 142, height: 249 },
  "valentine": { src: "/spru/costumes/valentine.webp", width: 122, height: 252 },
  "summer": { src: "/spru/costumes/summer.webp", width: 143, height: 250 },
} as const satisfies Record<string, SpruImage>;

export const BADGE_IMAGES = {
  "streak": { src: "/spru/badges/streak.webp", width: 88, height: 99 },
  "points": { src: "/spru/badges/points.webp", width: 104, height: 98 },
  "coins": { src: "/spru/badges/coins.webp", width: 108, height: 101 },
  "hp": { src: "/spru/badges/hp.webp", width: 135, height: 111 },
  "star": { src: "/spru/badges/star.webp", width: 149, height: 146 },
  "medal": { src: "/spru/badges/medal.webp", width: 145, height: 146 },
  "trophy": { src: "/spru/badges/trophy.webp", width: 134, height: 163 },
  "crown": { src: "/spru/badges/crown.webp", width: 149, height: 143 },
} as const satisfies Record<string, SpruImage>;

export type SpruImageKey = keyof typeof SPRU_IMAGES;
export type SpruFaceKey = keyof typeof SPRU_FACES;
export type SpruSceneKey = keyof typeof SPRU_SCENES;
export type SpruBloomKey = keyof typeof SPRU_BLOOM;
export type GardenImageKey = keyof typeof GARDEN_IMAGES;
export type CompanionKey = keyof typeof COMPANION_IMAGES;
export type OutingKey = keyof typeof OUTING_IMAGES;
export type CostumeKey = keyof typeof COSTUME_IMAGES;
export type BadgeKey = keyof typeof BADGE_IMAGES;

/** 立ち姿(3/4)の元画像の高さ。ほかの画像はこれとの比で大きさをそろえる(素材集の中で縮尺が同じため) */
export const SPRU_STAND_HEIGHT = 208;

/** 各画像の中のSの先の位置(つぼみ・花を重ねる)。種まきの画像は花が描かれているので無い */
export const SPRU_TIPS: Partial<Record<SpruImageKey, { x: number; y: number }>> = {
  "front": { x: 90, y: 0 },
  "three-quarter": { x: 65, y: 1 },
  "normal": { x: 53, y: 0 },
  "smile": { x: 72, y: 0 },
  "laugh": { x: 72, y: 1 },
  "surprised": { x: 74, y: 1 },
  "think": { x: 78, y: 0 },
  "effort": { x: 79, y: 2 },
  "happy": { x: 76, y: 1 },
  "sad": { x: 68, y: 1 },
  "cry": { x: 75, y: 1 },
  "shy": { x: 73, y: 1 },
  "excited": { x: 69, y: 0 },
  "walk": { x: 73, y: 0 },
  "run": { x: 58, y: 2 },
  "jump": { x: 42, y: 1 },
  "wave": { x: 46, y: 1 },
  "sit": { x: 86, y: 1 },
  "sleep": { x: 60, y: 1 },
  "startled": { x: 63, y: 2 },
  "cheer": { x: 49, y: 1 },
  "dash": { x: 52, y: 1 },
  "palms": { x: 64, y: 1 },
  "water": { x: 82, y: 1 },
};
