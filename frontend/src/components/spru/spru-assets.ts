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

export type SpruImageKey = keyof typeof SPRU_IMAGES;
export type SpruFaceKey = keyof typeof SPRU_FACES;
export type SpruSceneKey = keyof typeof SPRU_SCENES;

/** 立ち姿(3/4)の元画像の高さ。ほかの画像はこれとの比で大きさをそろえる(素材集の中で縮尺が同じため) */
export const SPRU_STAND_HEIGHT = 208;
