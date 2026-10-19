/** 画像のアイテム・目印の物ごとの調整(設計書 2026-09-28-town-items 7-2)。scale は大きさの倍率、dx・dy はずらす量(SVGの単位)。必要な物だけ書く */
export type ItemImageFit = { scale?: number; dx?: number; dy?: number };

export const ITEM_IMAGE_FIT: Partial<Record<string, ItemImageFit>> = {
  // 細い塔は絵の幅が狭く、そのままだと低く見える。高さを五重塔(約146)・ビッグ・ベンに合わせる(2026-10-12)
  tower: { scale: 1.386 },
  liberty: { scale: 1.25 },
  // 2×2の家(新しい絵 spru-house/spru_house_lv1_01。2026-10-19 Ownerの指定。大きさ・角度はSpra Worldの試作と同じ)。
  // 試作は、見える部分の真ん中を、敷地の真ん中より左に 49px(1254px の絵で。1マスの幅64に合わせると約5.7)ずらしている
  spru_house: { dx: -5.7 },
  // 家はSpruの家(絵の幅307px=約69単位)と同じ幅にそろえる。少し余白があるほうが自然(2026-10-20 Ownerの指定)
  cottage: { scale: 1.172 },
  red_house: { scale: 1.228 },
  seed_storehouse: { scale: 1.274 },
  resident_cottage: { scale: 1.190 },
  leaf_cottage: { scale: 1.181 },
  blue_flower_cottage: { scale: 1.150 },
  forest_flower_house: { scale: 1.195 },
  human_house: { scale: 0.616 },
  // お店(2×2)は、幅約80単位にそろえる。書き出した絵は約75〜105で、90前後は大きいと感じる(2026-10-20 Ownerの指定。80/(幅px×0.225))
  bakery: { scale: 0.889 },
  fish_shop: { scale: 0.889 },
  greengrocer: { scale: 0.889 },
  meat_shop: { scale: 0.889 },
  produce_shop: { scale: 0.876 },
  flower_shop: { scale: 0.900 },
  clinic: { scale: 0.773 },
  small_school: { scale: 0.958 },
  post_office: { scale: 0.891 },
  station_hut: { scale: 0.943 },
  fire_station: { scale: 0.847 },
  koban: { scale: 0.808 },
  cafe: { scale: 0.951 },
};

/** 夜の明かりの光の輪(設計書7-3)。x・y は画像の左上からの割合(0〜1)、r は半径(SVGの単位) */
export type ImageLight = { x: number; y: number; r: number };

/** 光る物の明かり。アイテムも目印も同じキーで書く(石灯籠は両方で使う) */
export const IMAGE_LIGHTS: Partial<Record<string, ImageLight[]>> = {
  chochin: [{ x: 0.71, y: 0.5, r: 9 }],
  stone_lantern: [{ x: 0.5, y: 0.41, r: 7 }],
  street_lamp: [{ x: 0.48, y: 0.16, r: 7 }],
  leaf_lamp: [{ x: 0.2, y: 0.45, r: 7 }],
  tower: [{ x: 0.5, y: 0.05, r: 7 }],
  liberty: [{ x: 0.34, y: 0.03, r: 7 }],
  lighthouse: [{ x: 0.45, y: 0.18, r: 10 }],
  // 2×2の家(新しい絵 spru_house_lv1_01): 左のランタンと、右の丸い窓
  spru_house: [
    { x: 0.07, y: 0.59, r: 11 },
    { x: 0.79, y: 0.715, r: 12 },
  ],
  big_ben: [
    { x: 0.526, y: 0.416, r: 6 },
    { x: 0.725, y: 0.416, r: 6 },
  ],
};
