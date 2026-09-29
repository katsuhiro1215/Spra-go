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
  "back": { src: "/spru/outing/back.webp", width: 200, height: 337 },
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
  "trophy": { src: "/spru/badges/trophy.webp", width: 134, height: 163 },
  "crown": { src: "/spru/badges/crown.webp", width: 149, height: 143 },
  "medal-bronze": { src: "/spru/badges/medal-bronze.webp", width: 79, height: 80 },
  "medal-silver": { src: "/spru/badges/medal-silver.webp", width: 80, height: 80 },
  "medal-gold": { src: "/spru/badges/medal-gold.webp", width: 83, height: 83 },
  "passport": { src: "/spru/badges/passport.webp", width: 49, height: 69 },
  "beginner": { src: "/spru/badges/beginner.webp", width: 82, height: 80 },
  "intermediate": { src: "/spru/badges/intermediate.webp", width: 83, height: 80 },
  "advanced": { src: "/spru/badges/advanced.webp", width: 85, height: 84 },
  "boss": { src: "/spru/badges/boss.webp", width: 94, height: 83 },
  "boss-battle": { src: "/spru/badges/boss-battle.webp", width: 130, height: 132 },
  "streak-3": { src: "/spru/badges/streak-3.webp", width: 127, height: 121 },
  "streak-7": { src: "/spru/badges/streak-7.webp", width: 135, height: 131 },
  "streak-30": { src: "/spru/badges/streak-30.webp", width: 158, height: 143 },
} as const satisfies Record<string, SpruImage>;

/** パスポートの国スタンプ。キーは国のコードの小文字 */
export const STAMP_IMAGES = {
  "jp": { src: "/spru/stamps/jp.webp", width: 202, height: 202 },
  "us": { src: "/spru/stamps/us.webp", width: 203, height: 202 },
  "id": { src: "/spru/stamps/id.webp", width: 203, height: 202 },
  "fr": { src: "/spru/stamps/fr.webp", width: 204, height: 201 },
  "it": { src: "/spru/stamps/it.webp", width: 202, height: 202 },
  "gb": { src: "/spru/stamps/gb.webp", width: 202, height: 202 },
  "es": { src: "/spru/stamps/es.webp", width: 200, height: 200 },
  "kr": { src: "/spru/stamps/kr.webp", width: 203, height: 190 },
} as const satisfies Record<string, SpruImage>;

/** スプルの家(入口の1枚の絵)。町のマスには置かない */
export const HOUSE_IMAGES = {
  "home": { src: "/spru/house/home.webp", width: 552, height: 528 },
} as const satisfies Record<string, SpruImage>;

/** 町のアイテム・おみやげ・目印の画像(docs/design/2026-09-28-town-items-design.md 7章)。キーは絵のキー。無い物はプログラムの絵で描く */
export const SPRU_ITEMS = {
  "flowerbed": { src: "/spru/items/flowerbed.webp", width: 184, height: 149 },
  "bench": { src: "/spru/items/bench.webp", width: 169, height: 154 },
  "bicycle": { src: "/spru/items/bicycle.webp", width: 177, height: 165 },
  "boat_small": { src: "/spru/items/boat_small.webp", width: 190, height: 130 },
  "pier": { src: "/spru/items/pier.webp", width: 184, height: 158 },
  "komodo": { src: "/spru/items/komodo.webp", width: 173, height: 139 },
  "bison": { src: "/spru/items/bison.webp", width: 160, height: 169 },
  "tulip": { src: "/spru/items/tulip.webp", width: 164, height: 156 },
  "rock": { src: "/spru/items/rock.webp", width: 198, height: 137 },
  "sunflower": { src: "/spru/items/sunflower.webp", width: 166, height: 194 },
  "bush": { src: "/spru/items/bush.webp", width: 160, height: 153 },
  "flower_pots": { src: "/spru/items/flower_pots.webp", width: 170, height: 148 },
  "spru_house": { src: "/spru/items/spru_house.webp", width: 244, height: 259 },
  "torii": { src: "/spru/items/torii.webp", width: 205, height: 220 },
  "tree": { src: "/spru/items/tree.webp", width: 214, height: 228 },
  "chochin": { src: "/spru/items/chochin.webp", width: 135, height: 191 },
  "vending": { src: "/spru/items/vending.webp", width: 147, height: 207 },
  "cottage": { src: "/spru/items/cottage.webp", width: 262, height: 220 },
  "stone_lantern": { src: "/spru/items/stone_lantern.webp", width: 132, height: 195 },
  "bamboo": { src: "/spru/items/bamboo.webp", width: 177, height: 228 },
  "bamboo_grove": { src: "/spru/items/bamboo_grove.webp", width: 238, height: 235 },
  "sakura": { src: "/spru/items/sakura.webp", width: 252, height: 254 },
  "palm": { src: "/spru/items/palm.webp", width: 206, height: 246 },
  "parasol": { src: "/spru/items/parasol.webp", width: 203, height: 211 },
  "stall": { src: "/spru/items/stall.webp", width: 232, height: 237 },
  "momiji": { src: "/spru/items/momiji.webp", width: 246, height: 270 },
  "pine": { src: "/spru/items/pine.webp", width: 241, height: 267 },
  "well": { src: "/spru/items/well.webp", width: 212, height: 243 },
  "street_lamp": { src: "/spru/items/street_lamp.webp", width: 64, height: 236 },
  "mailbox": { src: "/spru/items/mailbox.webp", width: 138, height: 197 },
  "red_house": { src: "/spru/items/red_house.webp", width: 250, height: 234 },
  "dol_hareubang": { src: "/spru/items/dol_hareubang.webp", width: 149, height: 191 },
  "phone_box": { src: "/spru/items/phone_box.webp", width: 128, height: 228 },
  "eiffel": { src: "/spru/items/eiffel.webp", width: 139, height: 213 },
  "fountain": { src: "/spru/items/fountain.webp", width: 498, height: 357 },
  "pagoda": { src: "/spru/items/pagoda.webp", width: 375, height: 489 },
  "castle": { src: "/spru/items/castle.webp", width: 499, height: 443 },
  "boat_large": { src: "/spru/items/boat_large.webp", width: 482, height: 301 },
  "tower": { src: "/spru/items/tower.webp", width: 345, height: 469 },
  "lighthouse": { src: "/spru/items/lighthouse.webp", width: 389, height: 421 },
  "bakery": { src: "/spru/items/bakery.webp", width: 470, height: 414 },
  "japanese_house": { src: "/spru/items/japanese_house.webp", width: 497, height: 432 },
  "cafe": { src: "/spru/items/cafe.webp", width: 479, height: 412 },
  "borobudur": { src: "/spru/items/borobudur.webp", width: 506, height: 417 },
  "bulguksa": { src: "/spru/items/bulguksa.webp", width: 511, height: 387 },
  "liberty": { src: "/spru/items/liberty.webp", width: 384, height: 485 },
  "stonehenge": { src: "/spru/items/stonehenge.webp", width: 507, height: 325 },
  "mont_saint_michel": { src: "/spru/items/mont_saint_michel.webp", width: 507, height: 492 },
  "kinkakuji": { src: "/spru/items/kinkakuji.webp", width: 511, height: 507 },
  "arc_de_triomphe": { src: "/spru/items/arc_de_triomphe.webp", width: 410, height: 466 },
  "big_ben": { src: "/spru/items/big_ben.webp", width: 388, height: 590 },
  "sungnyemun": { src: "/spru/items/sungnyemun.webp", width: 508, height: 441 },
} as const satisfies Record<string, SpruImage>;

/** 画面のアイコン(下のメニュー・音・じぶん・町・入口。docs/design/2026-09-29-spru-icons-design.md 3-3) */
export const SPRU_ICONS = {
  "login": { src: "/spru/icons/login.webp", width: 191, height: 242 },
  "switch-profile": { src: "/spru/icons/switch-profile.webp", width: 183, height: 231 },
  "add-player": { src: "/spru/icons/add-player.webp", width: 185, height: 230 },
  "nav-learn": { src: "/spru/icons/nav-learn.webp", width: 217, height: 220 },
  "nav-trip": { src: "/spru/icons/nav-trip.webp", width: 196, height: 221 },
  "nav-town": { src: "/spru/icons/nav-town.webp", width: 205, height: 220 },
  "nav-shop": { src: "/spru/icons/nav-shop.webp", width: 211, height: 217 },
  "sound-on": { src: "/spru/icons/sound-on.webp", width: 192, height: 186 },
  "sound-off": { src: "/spru/icons/sound-off.webp", width: 192, height: 187 },
  "bag": { src: "/spru/icons/bag.webp", width: 192, height: 195 },
  "logout": { src: "/spru/icons/logout.webp", width: 192, height: 185 },
  "continue": { src: "/spru/icons/continue.webp", width: 192, height: 200 },
  "family": { src: "/spru/icons/family.webp", width: 192, height: 185 },
  "letter": { src: "/spru/icons/letter.webp", width: 192, height: 195 },
  "key": { src: "/spru/icons/key.webp", width: 192, height: 193 },
} as const satisfies Record<string, SpruImage>;

/** ステージの丸(鍵・遊べる・クリア) */
export const SPRU_STAGES = {
  "locked": { src: "/spru/stages/locked.webp", width: 189, height: 192 },
  "open": { src: "/spru/stages/open.webp", width: 195, height: 189 },
  "cleared": { src: "/spru/stages/cleared.webp", width: 188, height: 202 },
} as const satisfies Record<string, SpruImage>;

/** プレイヤーのアバター6種。キーはサーバーの UserProfile::AVATARS と同じ */
export const SPRU_AVATARS = {
  "avatar-1": { src: "/spru/avatars/avatar-1.webp", width: 288, height: 309 },
  "avatar-2": { src: "/spru/avatars/avatar-2.webp", width: 288, height: 289 },
  "avatar-3": { src: "/spru/avatars/avatar-3.webp", width: 288, height: 298 },
  "avatar-4": { src: "/spru/avatars/avatar-4.webp", width: 288, height: 294 },
  "avatar-5": { src: "/spru/avatars/avatar-5.webp", width: 288, height: 289 },
  "avatar-6": { src: "/spru/avatars/avatar-6.webp", width: 288, height: 289 },
} as const satisfies Record<string, SpruImage>;

/** 旅(出発の場面の船・飛行機は左向き、チケット) */
export const SPRU_TRAVEL = {
  "ship": { src: "/spru/travel/ship.webp", width: 179, height: 159 },
  "plane": { src: "/spru/travel/plane.webp", width: 177, height: 155 },
  "ticket": { src: "/spru/travel/ticket.webp", width: 192, height: 127 },
} as const satisfies Record<string, SpruImage>;

/** ページの絵(見つからないページの迷子のスプル) */
export const SPRU_PAGES = {
  "lost": { src: "/spru/pages/lost.webp", width: 192, height: 178 },
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
export type StampKey = keyof typeof STAMP_IMAGES;
export type HouseImageKey = keyof typeof HOUSE_IMAGES;
export type SpruIconKey = keyof typeof SPRU_ICONS;
export type SpruStageKey = keyof typeof SPRU_STAGES;

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
