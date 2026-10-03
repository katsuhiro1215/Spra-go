import { describe, expect, it } from "vitest";

import { kindLabel, REPORT_REASONS, statusLabel, WRITTEN_KINDS } from "./feedback";

describe("ご意見のラベル", () => {
  it("種類と状態を日本語にする。知らない値はそのまま出す", () => {
    expect(kindLabel("bug")).toBe("不具合");
    expect(kindLabel("question_report")).toBe("問題の報告");
    expect(kindLabel("???")).toBe("???");
    expect(statusLabel("new")).toBe("新着");
    expect(statusLabel("done")).toBe("対応済み");
  });

  it("保護者が選べる種類は3つで、問題の報告は含まない", () => {
    expect(WRITTEN_KINDS.map((k) => k.value)).toEqual(["bug", "request", "other"]);
  });

  it("「へん」の理由は、サーバーの3つと同じ", () => {
    expect(REPORT_REASONS.map((r) => r.value)).toEqual(["wrong_answer", "unreadable", "other"]);
  });
});
