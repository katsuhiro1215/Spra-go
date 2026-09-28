import { describe, expect, it } from "vitest";

import { stageNodeClasses, stageNodeImage } from "./stage-node";

// WCAG のコントラスト比(相対輝度から計算)
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// クラスの文字列から、背景と文字の色を取り出す
function colors(classes: string): { bg: string; ink: string } {
  const bg = classes.match(/(?:^| )bg-\[(#[0-9a-f]{6})\]/i)?.[1];
  const ink = classes.includes("text-white") ? "#ffffff" : classes.match(/(?:^| )text-\[(#[0-9a-f]{6})\]/i)?.[1];
  if (!bg || !ink) throw new Error(`色が読めない: ${classes}`);
  return { bg, ink };
}

const base = { locked: false, cleared: false, is_boss: false };

describe("ステージの丸の色", () => {
  it("ボスの丸の番号は、背景とのコントラストが基準(4.5)以上", () => {
    const { bg, ink } = colors(stageNodeClasses({ ...base, is_boss: true }, false));
    expect(contrast(bg, ink)).toBeGreaterThanOrEqual(4.5);
  });

  it("ふつう・クリア済み・選んでいる丸も、番号のコントラストが基準(4.5)以上", () => {
    for (const classes of [
      stageNodeClasses(base, false),
      stageNodeClasses({ ...base, cleared: true }, false),
      stageNodeClasses(base, true),
    ]) {
      const { bg, ink } = colors(classes);
      expect(contrast(bg, ink)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("選んでいるときは、ボスやクリア済みより選んでいる色を優先する", () => {
    expect(stageNodeClasses({ ...base, is_boss: true }, true)).toBe(stageNodeClasses(base, true));
    expect(stageNodeClasses({ ...base, cleared: true }, true)).toBe(stageNodeClasses(base, true));
  });

  it("ロック中は、クリア済みやボスよりロックの色を優先する", () => {
    const locked = stageNodeClasses({ ...base, locked: true }, false);
    expect(stageNodeClasses({ ...base, locked: true, is_boss: true }, false)).toBe(locked);
  });
});

describe("ステージの丸の絵(docs/design/2026-09-29-spru-icons-design.md 4-4)", () => {
  it("鍵がかかっていれば、ボスでもクリア済みでも鍵の絵", () => {
    expect(stageNodeImage({ ...base, locked: true })).toBe("locked");
    expect(stageNodeImage({ ...base, locked: true, is_boss: true })).toBe("locked");
    expect(stageNodeImage({ ...base, locked: true, cleared: true })).toBe("locked");
  });

  it("クリア済みは、ボスでもクリアの絵", () => {
    expect(stageNodeImage({ ...base, cleared: true })).toBe("cleared");
    expect(stageNodeImage({ ...base, cleared: true, is_boss: true })).toBe("cleared");
  });

  it("まだのボスは絵を使わない(赤い丸とボスの印のまま)", () => {
    expect(stageNodeImage({ ...base, is_boss: true })).toBeNull();
  });

  it("それ以外は、遊べる絵", () => {
    expect(stageNodeImage(base)).toBe("open");
  });
});
