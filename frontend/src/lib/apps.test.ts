import { describe, expect, it } from "vitest";

import { appLabel, matchesAppFilter, type AppUse } from "./apps";

const use = (app: string): AppUse => ({ app, first_used_at: "2026-10-14T00:00:00Z", last_used_at: "2026-10-14T00:00:00Z" });

describe("matchesAppFilter", () => {
  it("すべては、どのユーザーも通す(アプリの記録がない人も)", () => {
    expect(matchesAppFilter([], "all")).toBe(true);
    expect(matchesAppFilter([use("go")], "all")).toBe(true);
  });

  it("Goだけ・Taneだけは、そのアプリ1つだけを使っている人", () => {
    expect(matchesAppFilter([use("go")], "go")).toBe(true);
    expect(matchesAppFilter([use("go"), use("tane")], "go")).toBe(false);
    expect(matchesAppFilter([use("tane")], "go")).toBe(false);
    expect(matchesAppFilter([use("tane")], "tane")).toBe(true);
  });

  it("複数は、2つ以上のアプリを使っている人", () => {
    expect(matchesAppFilter([use("go"), use("tane")], "multiple")).toBe(true);
    expect(matchesAppFilter([use("go")], "multiple")).toBe(false);
    expect(matchesAppFilter([], "multiple")).toBe(false);
  });
});

describe("appLabel", () => {
  it("知っているアプリは表示名、知らないものはキーのまま", () => {
    expect(appLabel("tane")).toBe("Tane");
    expect(appLabel("future")).toBe("future");
  });
});
