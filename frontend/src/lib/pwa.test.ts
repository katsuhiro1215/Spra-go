import { describe, expect, it } from "vitest";

import { detectPlatform, shouldShowInstallGuide } from "./pwa";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IPAD_DESKTOP_MODE = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

describe("detectPlatform", () => {
  it("iPhone・Android・それ以外を見分ける", () => {
    expect(detectPlatform(IPHONE)).toBe("ios");
    expect(detectPlatform(ANDROID)).toBe("android");
    expect(detectPlatform(DESKTOP)).toBe("other");
  });

  it("iPad(デスクトップ表示)は、タッチの点が複数あるときだけiOSとみなす", () => {
    expect(detectPlatform(IPAD_DESKTOP_MODE)).toBe("other");
    expect(detectPlatform(IPAD_DESKTOP_MODE, 5)).toBe("ios");
  });
});

describe("shouldShowInstallGuide", () => {
  const base = { standalone: false, dismissed: false, platform: "ios" as const };

  it("スマホで、まだ追加していなくて、閉じていなければ出す", () => {
    expect(shouldShowInstallGuide(base)).toBe(true);
    expect(shouldShowInstallGuide({ ...base, platform: "android" })).toBe(true);
  });

  it("すでにホーム画面から開いている・「あとで」を押した・パソコンのときは出さない", () => {
    expect(shouldShowInstallGuide({ ...base, standalone: true })).toBe(false);
    expect(shouldShowInstallGuide({ ...base, dismissed: true })).toBe(false);
    expect(shouldShowInstallGuide({ ...base, platform: "other" })).toBe(false);
  });
});
