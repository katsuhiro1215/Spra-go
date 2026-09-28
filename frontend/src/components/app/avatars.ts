import { SPRU_AVATARS, type SpruImage } from "@/components/spru/spru-assets";

/** アバターの名前(サーバーの UserProfile::AVATARS と同じ並び。設計書5章) */
export const AVATAR_KEYS = ["avatar-1", "avatar-2", "avatar-3", "avatar-4", "avatar-5", "avatar-6"] as const;

export type AvatarKey = (typeof AVATAR_KEYS)[number];

// Ownerのアバター6種(docs/design/2026-09-29-spru-icons-design.md 3-3・4-9)。赤・橙・黄・青・紫・桃の順
const AVATAR_IMAGES: Record<AvatarKey, SpruImage> = SPRU_AVATARS;

/** サーバーの値をアバターの名前にそろえる。空・知らない名前は1つ目 */
export function avatarKeyOf(key: string | null): AvatarKey {
  return AVATAR_KEYS.find((k) => k === key) ?? AVATAR_KEYS[0];
}

/** アバターの絵。空・知らない名前は1つ目の絵 */
export function avatarImage(key: string | null): SpruImage {
  return AVATAR_IMAGES[avatarKeyOf(key)];
}

/** 家族の中でまだ誰も使っていないアバターの1つ目。全部使われていたら1つ目(サーバーの nextAvatarFor と同じ決め方) */
export function firstUnusedAvatar(used: (string | null)[]): AvatarKey {
  return AVATAR_KEYS.find((k) => !used.includes(k)) ?? AVATAR_KEYS[0];
}
