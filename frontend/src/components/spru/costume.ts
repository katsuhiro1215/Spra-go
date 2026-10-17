import { COSTUME_IMAGES, type SpruImage } from "./spru-assets";

/** 着られる衣装(タネ交換所で買う12着)のキー。季節のあいさつ用の4つ(halloween・christmas・valentine・summer)は含まない */
const WEARABLE = /^(halloween|christmas)-/;

/** 着ている衣装の絵。着ていない・知らないキーなら null(ふつうのスプルの絵を使う) */
export function costumeImage(key: string | null | undefined): SpruImage | null {
  if (!key || !WEARABLE.test(key)) return null;
  return (COSTUME_IMAGES as Record<string, SpruImage>)[key] ?? null;
}
