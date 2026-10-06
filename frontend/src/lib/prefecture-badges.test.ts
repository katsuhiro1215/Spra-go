import { describe, expect, it } from "vitest";

import { badgeCountText, badgeRingClass, groupBadgesByRegion, type PrefectureBadge } from "./prefecture-badges";

const badge = (key: string, region: string, regionName: string, earned: boolean, courseId: number | null = null, master = false): PrefectureBadge => ({
  key,
  name: key,
  region,
  region_name: regionName,
  badge: `/badge/pref/${key}.webp`,
  earned,
  master,
  course_id: courseId,
});

describe("日本のバッジ", () => {
  it("地方ごとにまとめる。地方の順と、地方の中の順は、返事に出てきた順のまま", () => {
    const groups = groupBadgesByRegion([
      badge("hokkaido", "hokkaido-tohoku", "北海道・東北", false),
      badge("aomori", "hokkaido-tohoku", "北海道・東北", true),
      badge("ibaraki", "kanto", "関東", false),
    ]);

    expect(groups.map((group) => [group.region, group.name])).toEqual([
      ["hokkaido-tohoku", "北海道・東北"],
      ["kanto", "関東"],
    ]);
    expect(groups[0].badges.map((b) => b.key)).toEqual(["hokkaido", "aomori"]);
    expect(groups[1].badges.map((b) => b.key)).toEqual(["ibaraki"]);
  });

  it("空なら、空", () => {
    expect(groupBadgesByRegion([])).toEqual([]);
  });

  it("もらった数の文は「はかせ もらった数/全部・マスター もらった数/全部」", () => {
    expect(badgeCountText([])).toBe("はかせ 0/0・マスター 0/0");
    expect(
      badgeCountText([badge("a", "r", "R", true, null, true), badge("b", "r", "R", false), badge("c", "r", "R", true)]),
    ).toBe("はかせ 2/3・マスター 1/3");
  });

  it("マスターの県だけ、金のふちのクラスが付く", () => {
    expect(badgeRingClass(badge("a", "r", "R", true, null, true))).toContain("ring-[#d9a520]");
    expect(badgeRingClass(badge("a", "r", "R", true))).toBe("");
    expect(badgeRingClass(badge("a", "r", "R", false))).toBe("");
  });
});
