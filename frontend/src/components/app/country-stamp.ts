import { STAMP_IMAGES, type StampKey } from "@/components/spru/spru-assets";

/** 国のコードから、パスポートの国スタンプの画像のキーを返す。DBのコードは大文字・小文字が混ざるので小文字にそろえる。スタンプのない国は null */
export function countryStampKey(code: string): StampKey | null {
  const key = code.toLowerCase();
  return Object.hasOwn(STAMP_IMAGES, key) ? (key as StampKey) : null;
}
