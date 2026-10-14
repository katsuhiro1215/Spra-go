import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// 国コード(JP・GBなど、データベースでは大文字)を、そのまま /flag/ の道に入れない。
// 本番(Linux)はファイル名の大文字・小文字を区別するので、必ず flagSrc() を通す(2026-10-14 クイズの国旗が出ない不具合の再発防止)
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

describe("国旗の道", () => {
  it("国コードを、flagSrc を通さずに /flag/ の道へ入れている所がない", () => {
    const offenders = sourceFiles(join(process.cwd(), "src"))
      .filter((path) => !path.endsWith(join("lib", "flag.ts")))
      .flatMap((path) =>
        readFileSync(path, "utf8")
          .split("\n")
          .map((line, i) => ({ path, line, no: i + 1 }))
          .filter(({ line }) => /\/flag\/\$\{[^}]*\bcode\b[^}]*\}/.test(line)),
      )
      .map(({ path, no }) => `${path.replace(process.cwd() + "/", "")}:${no}`);

    expect(offenders).toEqual([]);
  });
});
