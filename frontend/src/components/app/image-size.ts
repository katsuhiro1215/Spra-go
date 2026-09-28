/**
 * 高さを決めて出す画像の幅と高さ(整数)。属性とCSSの両方にこの値を使うと、
 * 画面の大きさと属性がずれて出る Next.js の開発時の警告(幅か高さの片方だけ変更)が出ない
 */
export function fixedImageSize(asset: { width: number; height: number }, height: number): { width: number; height: number } {
  return { width: Math.round((asset.width * height) / asset.height), height };
}
