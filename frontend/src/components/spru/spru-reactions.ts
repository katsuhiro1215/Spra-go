import type { SpruImage } from "./spru-assets";

/**
 * Spra Go用のリアクション12コマ(喜ぶ・跳ねる・「いて！」など)。素材集(spru-assets.ts)とは別に持つ。
 * 立ち姿の高さを素材集の立ち姿(208)に合わせてあるので、SpruFigure の standHeight でそのまま大きさがそろう。
 * 原本は company/spra/spra-world/assets/approved/mascot/spru/reactions/(manifest.json に倍率を記録)
 */
export const SPRU_REACTIONS = {
  "react-jump": { src: "/spru/reactions/jump.webp", width: 170, height: 203 },
  "react-hooray": { src: "/spru/reactions/hooray.webp", width: 148, height: 211 },
  "react-fist": { src: "/spru/reactions/fist.webp", width: 141, height: 205 },
  "react-landing": { src: "/spru/reactions/landing.webp", width: 156, height: 190 },
  "react-clap": { src: "/spru/reactions/clap.webp", width: 136, height: 212 },
  "react-twirl": { src: "/spru/reactions/twirl.webp", width: 140, height: 208 },
  "react-sparkle": { src: "/spru/reactions/sparkle.webp", width: 142, height: 206 },
  "react-proud": { src: "/spru/reactions/proud.webp", width: 139, height: 209 },
  "react-ouch": { src: "/spru/reactions/ouch.webp", width: 142, height: 180 },
  "react-slip": { src: "/spru/reactions/slip.webp", width: 146, height: 179 },
  "react-trouble": { src: "/spru/reactions/trouble.webp", width: 137, height: 188 },
  "react-sad": { src: "/spru/reactions/sad.webp", width: 134, height: 175 },
} as const satisfies Record<string, SpruImage>;

export type SpruReactionKey = keyof typeof SPRU_REACTIONS;
