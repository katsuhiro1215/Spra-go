import { describe, expect, it } from "vitest";

import { bgmForPath } from "./bgm-route";

describe("bgmForPath: 画面ごとに、どのBGMを鳴らすか", () => {
  it("ホーム・町・学ぶ・世界・ショップ・バッグなどは、ホームの曲", () => {
    for (const path of ["/", "/learn", "/world", "/shop", "/bag", "/profiles", "/passport", "/trip", "/zukan", "/words", "/family", "/travel/12"]) {
      expect(bgmForPath(path), path).toBe("home");
    }
  });

  it("クイズの画面は、画面ごとにBGMを決める(ここでは何もしない)", () => {
    for (const path of ["/play/3", "/quiz/5", "/review", "/world/JP", "/world/JP/quiz-preview"]) {
      expect(bgmForPath(path), path).toBe("page");
    }
  });

  it("ミニゲームは、ミニゲームの曲", () => {
    for (const path of ["/games/catch", "/games/flag-catch", "/games/puzzle-flag"]) {
      expect(bgmForPath(path), path).toBe("minigame");
    }
  });

  it("宇宙(うちゅう旅行・宇宙パズル・うちゅうずかん)は、宇宙の曲", () => {
    for (const path of ["/games/space-trip", "/games/puzzle-space", "/space/cards"]) {
      expect(bgmForPath(path), path).toBe("space");
    }
  });

  it("ログイン・登録・Owner/Adminなどは、BGMなし(鳴っていたら止める)", () => {
    for (const path of ["/login", "/register", "/forgot-password", "/owner/dashboard", "/admin/login", "/about", "/blog"]) {
      expect(bgmForPath(path), path).toBe("none");
    }
  });

  it("末尾のスラッシュやクエリは気にしない", () => {
    expect(bgmForPath("/learn/")).toBe("home");
    expect(bgmForPath("/play/3/")).toBe("page");
  });
});
