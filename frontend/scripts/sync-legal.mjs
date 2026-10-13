#!/usr/bin/env node
// 公開する規約・プライバシーポリシーを、docs/legal の下書きから作る(frontend/src/content/legal.ts。手で直さない)。
// 下書きの注意書き・【要確認…】の印・値が未入力の行を除く。使い方: cd frontend && node scripts/sync-legal.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** 公開用の本文にする。下書きの印と未入力の行を取り除く */
export function publish(markdown) {
  return markdown
    .split("\n")
    .filter((line) => !line.startsWith("> **下書きです。**"))
    .filter((line) => !line.includes("【要入力"))
    .map((line) => line.replace(/（下書き）/g, "").replace(/【[^】]*】/g, "").replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function build() {
  const terms = publish(readFileSync(join(root, "docs/legal/terms.md"), "utf8"));
  const privacy = publish(readFileSync(join(root, "docs/legal/privacy.md"), "utf8"));
  const date = /制定日: (\d{4})年(\d{1,2})月(\d{1,2})日/.exec(terms);
  const version = date ? `${date[1]}-${date[2].padStart(2, "0")}-${date[3].padStart(2, "0")}` : "unknown";

  return [
    "// このファイルは frontend/scripts/sync-legal.mjs が docs/legal から書き出す。手で直さない。",
    "",
    `export const LEGAL_VERSION = ${JSON.stringify(version)};`,
    `export const TERMS_MD = ${JSON.stringify(terms)};`,
    `export const PRIVACY_MD = ${JSON.stringify(privacy)};`,
    "",
  ].join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(join(root, "frontend/src/content/legal.ts"), build());
  console.log("書き出しました: frontend/src/content/legal.ts");
}
