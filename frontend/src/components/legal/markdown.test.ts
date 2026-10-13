import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { LEGAL_VERSION, PRIVACY_MD, TERMS_MD } from "@/content/legal";
import { build } from "../../../scripts/sync-legal.mjs";

import { parseInline, parseMarkdown } from "./markdown";

describe("parseInline", () => {
  it("太字・コード・リンクを分ける", () => {
    expect(parseInline("a **b** `c` [d](https://e.test) f")).toEqual([
      { type: "text", text: "a " },
      { type: "bold", text: "b" },
      { type: "text", text: " " },
      { type: "code", text: "c" },
      { type: "text", text: " " },
      { type: "link", text: "d", href: "https://e.test" },
      { type: "text", text: " f" },
    ]);
  });
});

describe("parseMarkdown", () => {
  it("見出し・段落・区切り線", () => {
    expect(parseMarkdown("# 題\n\n## 章\n\n本文の1行目\n続き\n\n---\n")).toEqual([
      { type: "heading", level: 1, inlines: [{ type: "text", text: "題" }] },
      { type: "heading", level: 2, inlines: [{ type: "text", text: "章" }] },
      { type: "paragraph", inlines: [{ type: "text", text: "本文の1行目 続き" }] },
      { type: "hr" },
    ]);
  });

  it("番号つきの一覧と、下げた字下げの入れ子", () => {
    const blocks = parseMarkdown("1. 一\n2. 二\n   1. 二の一\n   2. 二の二\n3. 三");
    expect(blocks).toHaveLength(1);
    const list = blocks[0];
    expect(list.type).toBe("list");
    if (list.type !== "list") return;
    expect(list.ordered).toBe(true);
    expect(list.items).toHaveLength(3);
    expect(list.items[1].children?.[0]).toMatchObject({ type: "list", ordered: true });
    expect(list.items[1].children?.[0].type === "list" && list.items[1].children[0].items).toHaveLength(2);
  });

  it("点の一覧", () => {
    expect(parseMarkdown("- あ\n- い")).toEqual([
      { type: "list", ordered: false, items: [{ inlines: [{ type: "text", text: "あ" }] }, { inlines: [{ type: "text", text: "い" }] }] },
    ]);
  });

  it("表: 見出しの行と、中身の行", () => {
    expect(parseMarkdown("| 項目 | 内容 |\n|---|---|\n| あ | い |\n| う | え |")).toEqual([
      {
        type: "table",
        header: [[{ type: "text", text: "項目" }], [{ type: "text", text: "内容" }]],
        rows: [
          [[{ type: "text", text: "あ" }], [{ type: "text", text: "い" }]],
          [[{ type: "text", text: "う" }], [{ type: "text", text: "え" }]],
        ],
      },
    ]);
  });

  it("引用", () => {
    expect(parseMarkdown("> 注意")).toEqual([{ type: "quote", inlines: [{ type: "text", text: "注意" }] }]);
  });
});

describe("公開する規約・プライバシーポリシー", () => {
  it("docs/legal の下書きから作った最新の内容と同じ(下書きを直したら node scripts/sync-legal.mjs)", () => {
    expect(build()).toContain(JSON.stringify(TERMS_MD));
    expect(build()).toContain(JSON.stringify(PRIVACY_MD));
  });

  it("下書きの印・未入力の欄が、公開の本文に残らない", () => {
    for (const text of [TERMS_MD, PRIVACY_MD]) {
      expect(text).not.toMatch(/【|下書き|要入力|要確認/);
    }
  });

  it("登録のとき残す版(config/legal.php)が、公開している規約の制定日と同じ", () => {
    const config = readFileSync(join(process.cwd(), "../config/legal.php"), "utf8");
    expect(/'version' => '([^']+)'/.exec(config)?.[1]).toBe(LEGAL_VERSION);
  });

  it("運営者・メール・裁判所・制定日がそろっている", () => {
    expect(TERMS_MD).toContain("栫 勝宏");
    expect(TERMS_MD).toContain("info@spra.jp");
    expect(TERMS_MD).toContain("奈良地方裁判所");
    expect(TERMS_MD).toContain("2026年10月14日");
    expect(PRIVACY_MD).toContain("奈良県奈良市");
    expect(PRIVACY_MD).toContain("ランキング");
  });

  it("どの章も、最後まで解釈できる(見出しがあり、表と一覧が壊れない)", () => {
    for (const text of [TERMS_MD, PRIVACY_MD]) {
      const blocks = parseMarkdown(text);
      expect(blocks[0]).toMatchObject({ type: "heading", level: 1 });
      expect(blocks.filter((b) => b.type === "heading").length).toBeGreaterThan(8);
      expect(JSON.stringify(blocks)).not.toContain("|---");
    }
  });
});
