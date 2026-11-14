import { COSTUME_IMAGES, type SpruImage } from "./spru-assets";

/** 季節のあいさつ用(きせかえとして買えない、ハイフン無しの完全一致キー)。それ以外の COSTUME_IMAGES は全部「着られる衣装」 */
const NOT_WEARABLE = new Set(["halloween", "christmas", "valentine", "summer"]);

/** 着ている衣装の絵。着ていない・知らないキーなら null(ふつうのスプラの絵を使う) */
export function costumeImage(key: string | null | undefined): SpruImage | null {
  if (!key || NOT_WEARABLE.has(key)) return null;
  return (COSTUME_IMAGES as Record<string, SpruImage>)[key] ?? null;
}
