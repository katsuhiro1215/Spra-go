import { describe, expect, it } from "vitest";

import { fixedImageSize } from "./image-size";

describe("高さを決めて出す画像の大きさ", () => {
  it("高さはそのまま、幅は元の縦横の比から整数に丸める", () => {
    expect(fixedImageSize({ width: 132, height: 214 }, 20)).toEqual({ width: 12, height: 20 });
    expect(fixedImageSize({ width: 300, height: 200 }, 72)).toEqual({ width: 108, height: 72 });
  });

  it("幅と高さはいつも整数(画面の大きさと属性がずれると Next.js の開発時の警告が出るため)", () => {
    const size = fixedImageSize({ width: 97, height: 131 }, 24);
    expect(Number.isInteger(size.width)).toBe(true);
    expect(Number.isInteger(size.height)).toBe(true);
  });
});
