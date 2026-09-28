// 下のメニュー(docs/design/2026-09-28-app-chrome-design.md 4-5、名前は docs/design/2026-09-28-travel-tickets-design.md 5-1、
// 絵は docs/design/2026-09-29-spru-icons-design.md 4-1)。
// 画面を描かない部分だけをここに置く。「じぶん」はページを移らずパネルを開くボタンなので、ここには入れない

import type { SpruIconKey } from "@/components/spru/spru-assets";

export type NavKey = "learn" | "trip" | "town" | "shop";

export const NAV_ITEMS: { key: NavKey; href: string; label: string; icon: SpruIconKey }[] = [
  { key: "learn", href: "/learn", label: "学ぶ", icon: "nav-learn" },
  { key: "trip", href: "/trip", label: "せかい", icon: "nav-trip" },
  { key: "town", href: "/", label: "まち", icon: "nav-town" },
  { key: "shop", href: "/shop", label: "ショップ", icon: "nav-shop" },
];

/** そのページにいるとき選択中にする。まち(/)はちょうど町のときだけ、ほかはそのページとその下 */
export function isNavActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
