import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// 名前の表記は「Spra Go」(docs/design/2026-09-29-spru-icons-design.md 7章)。「スプラ」を単独で使わず、言葉を付ける
const OLD_NAME = ["Spra", "Go"].join("");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe("アプリの名前の表記", () => {
  it("画面の文字に、空白のない古い表記が残っていない", () => {
    const left = files("src").filter((path) => /\.(tsx?|json)$/.test(path) && readFileSync(path, "utf8").includes(OLD_NAME));
    expect(left).toEqual([]);
  });
});
