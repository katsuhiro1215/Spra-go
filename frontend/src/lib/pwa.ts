// ホーム画面に追加する案内の計算(docs/design/2026-10-03-closed-beta-design.md 6-1)。画面を描かない部分だけをここに置く

export type Platform = "ios" | "android" | "other";

/** 端末の見分け。iPad は「パソコン用の表示」だと Mac を名乗るので、タッチの点が複数あるときだけiOSとみなす */
export function detectPlatform(userAgent: string, maxTouchPoints = 0): Platform {
  if (/iPhone|iPad|iPod/.test(userAgent)) return "ios";
  if (/Android/.test(userAgent)) return "android";
  if (/Macintosh/.test(userAgent) && maxTouchPoints > 1) return "ios";
  return "other";
}

/** 案内を出すか。ホーム画面から開いている・「あとで」を押した・パソコンなら出さない */
export function shouldShowInstallGuide(input: { standalone: boolean; dismissed: boolean; platform: Platform }): boolean {
  return !input.standalone && !input.dismissed && input.platform !== "other";
}

/** 「あとで」を覚えておく場所の名前(localStorage) */
export const INSTALL_DISMISSED_KEY = "spra-install-guide-dismissed";
