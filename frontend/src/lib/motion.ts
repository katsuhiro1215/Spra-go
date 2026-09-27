/** 動きを減らす設定。描画中ではなく、effect や操作のときに呼ぶ */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
