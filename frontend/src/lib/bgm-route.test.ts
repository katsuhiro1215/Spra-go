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

  it("ミニゲーム・ログイン・登録・Owner/Adminなどは、BGMなし(鳴っていたら止める)", () => {
    for (const path of ["/games/catch", "/games/puzzle-flag", "/space", "/space/cards", "/login", "/register", "/forgot-password", "/owner/dashboard", "/admin/login", "/about", "/blog"]) {
      expect(bgmForPath(path), path).toBe("none");
    }
  });

  it("末尾のスラッシュやクエリは気にしない", () => {
    expect(bgmForPath("/learn/")).toBe("home");
    expect(bgmForPath("/play/3/")).toBe("page");
  });
});
