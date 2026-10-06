// パスポートの「日本のバッジ」の判定(docs/design/2026-10-06-passport-prefecture-badges-design.md 4章)。画面を描かない部分だけをここに置く

/** GET /api/passport の prefecture_badges の1件 */
export type PrefectureBadge = {
  key: string;
  name: string;
  region: string;
  region_name: string;
  badge: string;
  earned: boolean;
  master: boolean;
  course_id: number | null;
};

export type PrefectureBadgeGroup = { region: string; name: string; badges: PrefectureBadge[] };

/** 地方ごとにまとめる。地方の順と、地方の中の順は、もとの並びのまま */
export function groupBadgesByRegion(badges: PrefectureBadge[]): PrefectureBadgeGroup[] {
  const groups: PrefectureBadgeGroup[] = [];
  for (const badge of badges) {
    let group = groups.find((g) => g.region === badge.region);
    if (!group) {
      group = { region: badge.region, name: badge.region_name, badges: [] };
      groups.push(group);
    }
    group.badges.push(badge);
  }
  return groups;
}

/** 「はかせ もらった数/全部・マスター もらった数/全部」(例 はかせ 12/47・マスター 3/47) */
export function badgeCountText(badges: PrefectureBadge[]): string {
  const hakase = badges.filter((b) => b.earned).length;
  const master = badges.filter((b) => b.master).length;
  return `はかせ ${hakase}/${badges.length}・マスター ${master}/${badges.length}`;
}

/** マスターの県のバッジに付ける、金のふち(絵は、はかせと同じ) */
export function badgeRingClass(badge: PrefectureBadge): string {
  return badge.master ? "rounded-full ring-2 ring-[#d9a520] ring-offset-1" : "";
}
