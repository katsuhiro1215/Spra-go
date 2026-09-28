// 下のメニュー(docs/design/2026-09-28-app-chrome-design.md 4-5)。画面を描かない部分だけをここに置く。
// 「じぶん」はページを移らずパネルを開くボタンなので、ここには入れない

export type NavKey = "learn" | "trip" | "world" | "shop";

export const NAV_ITEMS: { key: NavKey; href: string; label: string }[] = [
  { key: "learn", href: "/learn", label: "学ぶ" },
  { key: "trip", href: "/trip", label: "旅する" },
  { key: "world", href: "/", label: "世界" },
  { key: "shop", href: "/shop", label: "ショップ" },
];

/** そのページにいるとき選択中にする。世界(/)はちょうど町のときだけ、ほかはそのページとその下 */
export function isNavActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
